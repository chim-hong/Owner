import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { Annotation, END, MemorySaver, messagesStateReducer, START, StateGraph } from "@langchain/langgraph";

import { getPrompt } from "./prompts/registry.js";
import {
  type AgentResponse,
  type IntentRecognitionResult,
  intentRecognitionOutputSchema,
  type ToolCall,
  type ToolResult
} from "./schema.js";
import { getToolRegistry, TOOLS_REGISTRY } from "./tools/registry.js";
import { chatClient, thinkingClient } from "./llm.js";

const MainState = Annotation.Root({
  input: Annotation<string>(),
  thread_id: Annotation<string | undefined>(),
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => []
  }),
  intent_recognition: Annotation<IntentRecognitionResult[]>({
    value: (_current, update) => update,
    default: () => []
  }),
  tool_call: Annotation<ToolCall[]>({
    value: (_current, update) => update,
    default: () => []
  }),
  tool_result: Annotation<ToolResult[]>({
    value: (_current, update) => update,
    default: () => []
  }),
  response: Annotation<AgentResponse | undefined>()
});

export type MainStateType = typeof MainState.State;

function getAvailableTools(intentRecognition: IntentRecognitionResult[]) {
  const intentTypes = new Set(intentRecognition.map((item) => item.intent_type).filter(Boolean));
  return Object.values(TOOLS_REGISTRY).filter((toolRegistry) => intentTypes.has(toolRegistry.intent));
}

function getIntentResult(intentType: "project" | "contact", intentRecognition: IntentRecognitionResult[]) {
  return intentRecognition.find((intent) => intent.intent_type === intentType)?.result ?? null;
}

async function intentRecognitionNode(state: MainStateType) {
  const prompt = getPrompt("intentRecognition").replace("{query}", state.input);
  const message = new HumanMessage(prompt);
  const structuredClient = chatClient.withStructuredOutput(intentRecognitionOutputSchema);
  const result = await structuredClient.invoke([...state.messages, message]);

  return {
    messages: [message],
    intent_recognition: result.intents
  };
}

async function toolCallNode(state: MainStateType) {
  const availableTools = getAvailableTools(state.intent_recognition);
  const toolCalls: ToolCall[] = [];

  for (const toolRegistry of availableTools) {
    if (toolRegistry.intent === "project") {
      const project = getIntentResult("project", state.intent_recognition);
      if (project?.key) {
        toolCalls.push({
          name: toolRegistry.name,
          args: { project_name: project.key },
          type: "tool_call"
        });
      }
    }

    if (toolRegistry.intent === "contact") {
      toolCalls.push({
        name: toolRegistry.name,
        args: {},
        type: "tool_call"
      });
    }
  }

  return {
    messages: [
      new HumanMessage("根据识别出的用户意图选择可用工具。"),
      new AIMessage(`tool_call的结果：${JSON.stringify(toolCalls)}`)
    ],
    tool_call: toolCalls
  };
}

async function toolActionNode(state: MainStateType) {
  const toolResults: ToolResult[] = [];

  for (const toolCall of state.tool_call) {
    const toolRegistry = getToolRegistry(toolCall.name);
    const handler = toolRegistry.handler as { invoke(input: Record<string, unknown>): Promise<unknown> };
    const result = (await handler.invoke(toolCall.args ?? {})) as {
      success: boolean;
      content: string | null;
    };

    toolResults.push({
      ...toolCall,
      success: result.success,
      content: result.content
    });
  }

  return {
    messages: [new AIMessage(`tool_action的结果：${JSON.stringify(toolResults)}`)],
    tool_result: toolResults
  };
}

async function generateNode(state: MainStateType) {
  const prompt = `请回答用户问题。
用户原始问题：${state.input}
工具调用结果：${JSON.stringify(state.tool_result)}

如果工具调用结果 success 为 false，则直接返回 content。
如果工具调用结果 success 为 true，则结合 content 内容进行概括摘要返回。`;
  const message = new HumanMessage(prompt);
  const result = await thinkingClient.invoke([...state.messages, message]);
  const content = typeof result.content === "string" ? result.content : JSON.stringify(result.content);

  return {
    messages: [message, new AIMessage(content)],
    response: {
      success: true,
      message: "成功返回数据",
      data: content,
      thread_id: state.thread_id
    }
  };
}

function routeAfterIntent(state: MainStateType) {
  return state.intent_recognition.length > 0 ? "tool_call_node" : "generate_node";
}

function routeAfterToolCall(state: MainStateType) {
  return state.tool_call.length > 0 ? "tool_action_node" : "generate_node";
}

const checkpointer = new MemorySaver();

export const mainGraph = new StateGraph(MainState)
  .addNode("intent_recognition_node", intentRecognitionNode)
  .addNode("tool_call_node", toolCallNode)
  .addNode("tool_action_node", toolActionNode)
  .addNode("generate_node", generateNode)
  .addEdge(START, "intent_recognition_node")
  .addConditionalEdges("intent_recognition_node", routeAfterIntent, {
    tool_call_node: "tool_call_node",
    generate_node: "generate_node"
  })
  .addConditionalEdges("tool_call_node", routeAfterToolCall, {
    tool_action_node: "tool_action_node",
    generate_node: "generate_node"
  })
  .addEdge("tool_action_node", "generate_node")
  .addEdge("generate_node", END)
  .compile({ checkpointer });

export function createInitialState(input: string, threadId?: string): MainStateType {
  return {
    input,
    thread_id: threadId,
    messages: [new SystemMessage(getPrompt("main"))],
    intent_recognition: [],
    tool_call: [],
    tool_result: [],
    response: undefined
  };
}
