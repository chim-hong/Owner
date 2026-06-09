import { AIMessageChunk } from "@langchain/core/messages";

function streamEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function chunkText(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item === "object" && "text" in item) {
          return String(item.text);
        }
        return "";
      })
      .join("");
  }

  return "";
}

export async function* langGraphStreamToSse(stream: AsyncIterable<unknown>) {
  for await (const item of stream) {
    if (!Array.isArray(item) || item[0] !== "messages") {
      continue;
    }

    const [chunk, metadata] = item[1] as [unknown, Record<string, unknown>];
    if (!(chunk instanceof AIMessageChunk)) {
      continue;
    }

    const node = typeof metadata.langgraph_node === "string" ? metadata.langgraph_node : undefined;
    const additionalKwargs = chunk.additional_kwargs as { reasoning_content?: string } | undefined;
    const reasoning = additionalKwargs?.reasoning_content;
    if (reasoning) {
      yield streamEvent("reasoning", { content: reasoning, node });
    }

    const content = chunkText(chunk.content);
    if (content) {
      yield streamEvent("chunk", { content, node });
    }
  }
}

export function doneEvent(content = "传输完毕") {
  return streamEvent("done", { content });
}

export function errorEvent(error: string) {
  return streamEvent("error", { error });
}
