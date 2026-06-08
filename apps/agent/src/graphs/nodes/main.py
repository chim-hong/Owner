from langchain.messages import AIMessage, HumanMessage
from langgraph.func import END, START, RetryPolicy
from langgraph.graph import StateGraph
from src.schema.main import MainAgentState, Project
from src.schema.utils import CallLLM
from src.tools.registry import TOOLS_REGISTRY
from src.utils.llm import call_llm
from src.utils.main import get_prompt, get_tool_registry


def get_available_tools(state: MainAgentState):
    # 这里保留权限/资源校验入口：后续可根据 user、thread、project、tenant 等上下文过滤。
    return list(TOOLS_REGISTRY.values())


def intent_recognition(state: MainAgentState):
    query = state["input"]
    prompt = get_prompt("intent_recognition")
    content = prompt.format(query=query)
    message = HumanMessage(content=content)
    messages = [*state["messages"], message]
    config = CallLLM(messages=messages, structured_output=Project, tools=None)
    result = call_llm(config)
    return {"messages": [message], "intent_recognition": result}


def tool_call(state: MainAgentState):
    project = state["intent_recognition"]
    available_tools = get_available_tools(state)
    tool_calls = []

    if project:
        for tool_registry in available_tools:
            if tool_registry.get("intent") != "project_detail":
                continue

            tool_calls.append(
                {
                    "name": tool_registry["name"],
                    "args": {"project_name": project.key},
                    "type": "tool_call",
                }
            )

    message = HumanMessage(content="根据识别出的项目意图选择工具。")
    result_message = AIMessage(content=f"tool_call的结果：{tool_calls}")
    return {"messages": [message, result_message], "tool_call": tool_calls}


def tool_action(state: MainAgentState):
    """执行tool"""
    _tools = state["tool_call"]
    tool_results = []
    if _tools:
        # 校验工具权限
        # 校验资源权限
        for tool in _tools:
            tool_registry = get_tool_registry(tool["name"])
            handler = tool_registry["handler"]
            project_name = tool.get("args", {}).get("project_name")
            if not project_name and state["intent_recognition"]:
                project_name = state["intent_recognition"].key
            file_result = handler.invoke({"project_name": project_name})
            tool_results.append(tool | file_result)
    print("tool_results", tool_results)
    result_message = AIMessage(content=f"tool_action的结果：{tool_results}")
    return {"messages": [result_message], "tool_result": tool_results}


def generate_node(state: MainAgentState):

    user_message = HumanMessage(
        content=f"请根据{state['tool_result']}中的信息，如果工具调用结果success为False，则直接返回content。工具调用结果success为True则结合content内容进行概括摘要返回"
    )
    llm_messages = [*state["messages"], user_message]

    result = call_llm(
        CallLLM(messages=llm_messages, structured_output=None, tools=None)
    )

    print("result======", result)

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
    builder.add_edge("intent_recognition", "tool_call")
    builder.add_edge("tool_call", "tool_action")
    builder.add_edge("tool_action", "generate_node")
    builder.add_edge("generate_node", END)
