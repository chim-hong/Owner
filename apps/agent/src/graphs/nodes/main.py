from langchain.messages import AIMessage, HumanMessage
from langgraph.func import END, START, RetryPolicy
from langgraph.graph import StateGraph
from src.schema.main import (
    IntentRecognitionOutput,
    IntentRecognitionResult,
    MainAgentState,
)
from src.schema.utils import CallLLM
from src.tools.registry import TOOLS_REGISTRY
from src.utils.llm import call_llm
from src.utils.main import get_prompt, get_tool_registry


def get_result(intent_type, intent_recognition):
    return [
        intent for intent in intent_recognition if intent.intent_type == intent_type
    ][0].result


def get_available_tools(intent_recognition: list[IntentRecognitionResult] | None):
    if intent_recognition is None:
        return []
    tool_names = [item.intent_type for item in intent_recognition]
    # 这里保留权限/资源校验入口：后续可根据 user、thread、project、tenant 等上下文过滤。
    tools = [
        tool_registry
        for tool_registry in TOOLS_REGISTRY.values()
        if tool_registry["intent"] in tool_names
    ]
    return tools


def intent_recognition(state: MainAgentState):
    query = state["input"]
    prompt = get_prompt("intent_recognition")
    content = prompt.format(query=query)
    message = HumanMessage(content=content)
    messages = [*state["messages"], message]
    config = CallLLM(
        messages=messages, structured_output=IntentRecognitionOutput, tools=None
    )
    result = call_llm(config)

    return {"messages": [message], "intent_recognition": result}


def tool_call(state: MainAgentState):
    intent_recognition = state["intent_recognition"].intents
    # 过滤出该用户有权限的tools
    available_tools = get_available_tools(intent_recognition)
    if not intent_recognition:
        return {"tool_call": []}

    def format_tools():
        format_tools = []
        for tool_registry in available_tools:
            result = get_result(tool_registry["intent"], intent_recognition)
            print("result", result)
            item = {
                "name": tool_registry["name"],
                "description": tool_registry["description"],
            }
            if result:
                item["args"] = {"project_name": result.key}
            format_tools.append(item)
        return format_tools

    final_tools = format_tools()

    print("final_tools", final_tools)

    message = HumanMessage(content="根据识别出的项目意图选择工具。")
    result_message = AIMessage(content=f"tool_call的结果：{final_tools}")
    return {"messages": [message, result_message], "tool_call": final_tools}


def tool_action(state: MainAgentState):
    """执行tool"""
    _tools = state["tool_call"]
    intent_recognition = state["intent_recognition"].intents
    tool_results = []
    if _tools:
        # 校验工具权限
        # 校验资源权限
        for tool in _tools:
            tool_registry = get_tool_registry(tool["name"])
            handler = tool_registry["handler"]
            project_name = tool.get("args", {}).get("project_name")
            input_schema = None
            if "project_detail" in tool_registry["intent"]:
                if project_name and intent_recognition:
                    input_schema = {"project_name": project_name}
            if "basic_info" in tool_registry["intent"]:
                input_schema = {"project_name": "basic_info"}
            file_result = handler.invoke(input_schema)
            tool_results.append(tool | file_result)
    result_message = AIMessage(content=f"tool_action的结果：{tool_results}")
    return {"messages": [result_message], "tool_result": tool_results}


def generate_node(state: MainAgentState):
    intent_recognition = state["intent_recognition"]
    print("intent_recognition", intent_recognition)
    user_message = HumanMessage(
        content=f"请根据参考：{intent_recognition, {state['tool_result']}}信息，组织语言回答用户提问"
    )
    llm_messages = [*state["messages"], user_message]

    result = call_llm(
        CallLLM(messages=llm_messages, structured_output=None, tools=None)
    )

    assistant_message = AIMessage(content=result.content)

    return {
        "response": {
            "success": True,
            "message": "成功返回数据",
            "data": result.content,
            "thread_id": state["thread_id"],
        },
        "messages": [user_message, assistant_message],
    }


def error_handler(state: MainAgentState):

    return {
        "response": {
            "success": False,
            "message": "generate_node节点执行失败",
            "status": 500,
            "thread_id": state["thread_id"],
        }
    }


def next_node(state: MainAgentState):
    intent_recognition = state["intent_recognition"].intents
    if intent_recognition is None:
        return "generate_node"
    if all(indent.intent_type is None for indent in intent_recognition):
        return "generate_node"
    return "tool_call"


def add_main_agent(builder: StateGraph):
    builder.add_node("tool_call", tool_call)
    builder.add_node("tool_action", tool_action)
    builder.add_node("intent_recognition", intent_recognition)
    builder.add_node(
        "generate_node",
        generate_node,
        retry_policy=RetryPolicy(max_attempts=3),
        # error_handler=error_handler,
    )
    builder.add_edge(START, "intent_recognition")
    builder.add_conditional_edges(
        "intent_recognition",
        next_node,
        {"generate_node": "generate_node", "tool_call": "tool_call"},
    )
    builder.add_edge("tool_call", "tool_action")
    builder.add_edge("tool_action", "generate_node")
    builder.add_edge("tool_call", "tool_action")
    builder.add_edge("tool_action", "generate_node")
    builder.add_edge("generate_node", END)
