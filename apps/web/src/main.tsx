import React, { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import "./styles.css";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
};

type ChatHistoryMessage = Pick<ChatMessage, "role" | "content">;

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

type StreamEvent = {
  event?: string;
  data: string;
};

function appendAssistantMessage(messageId: string, content: string, target: "content" | "reasoning" = "content") {
  if (!content) {
    return;
  }

  return (currentMessages: ChatMessage[]) =>
    currentMessages.map((currentMessage) =>
      currentMessage.id === messageId
        ? {
            ...currentMessage,
            [target]: (currentMessage[target] ?? "") + content
          }
        : currentMessage
    );
}

function parseSseEvent(rawEvent: string): StreamEvent | null {
  const lines = rawEvent.split(/\r?\n/);
  const data: string[] = [];
  let event: string | undefined;

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    }

    if (line.startsWith("data:")) {
      data.push(line.slice(5).trimStart());
    }
  }

  if (!event && data.length === 0) {
    return null;
  }

  return {
    event,
    data: data.join("\n")
  };
}

function readStreamToken(streamEvent: StreamEvent): {
  content: string;
  done: boolean;
  target: "content" | "reasoning";
  error?: string;
} {
  const eventName = streamEvent.event?.toLowerCase();
  const data = streamEvent.data.trim();
  const target = eventName === "reasoning" ? "reasoning" : "content";

  if (eventName === "done" || data === "[DONE]") {
    return { content: "", done: true, target };
  }

  if (!data) {
    return { content: "", done: false, target };
  }

  try {
    const payload = JSON.parse(data) as {
      token?: string;
      chunk?: string;
      content?: string;
      delta?: string;
      text?: string;
      message?: string;
      error?: string;
      done?: boolean;
    };

    if (eventName === "error" || payload.error) {
      return { content: "", done: false, target, error: payload.error ?? "Request failed" };
    }

    return {
      content: payload.token ?? payload.chunk ?? payload.content ?? payload.delta ?? payload.text ?? payload.message ?? "",
      done: Boolean(payload.done),
      target
    };
  } catch {
    return {
      content:
        eventName === "token" || eventName === "chunk" || eventName === "reasoning" || !eventName ? streamEvent.data : "",
      done: false,
      target
    };
  }
}

function isStreamEvent(streamEvent: StreamEvent | null): streamEvent is StreamEvent {
  return streamEvent !== null;
}

function App() {
  const threadIdRef = useRef<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "欢迎来到Owner，欢迎随时提问"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const historyRef = useRef<HTMLElement>(null);

  useEffect(() => {
    historyRef.current?.scrollTo({
      top: historyRef.current.scrollHeight
    });
  }, [messages]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    const assistantMessageId = crypto.randomUUID();
    const history: ChatHistoryMessage[] = messages
      .filter((currentMessage) => currentMessage.id !== "welcome" && currentMessage.content.trim())
      .slice(-10)
      .map((currentMessage) => ({
        role: currentMessage.role,
        content: currentMessage.content
      }));

    setIsLoading(true);
    setMessage("");
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmedMessage
      },
      {
        id: assistantMessageId,
        role: "assistant",
        content: ""
      }
    ]);

    try {
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: trimmedMessage,
          history,
          ...(threadIdRef.current ? { thread_id: threadIdRef.current } : {})
        })
      });

      if (!response.ok || !response.body) {
        throw new Error("Request failed");
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

      if (contentType.includes("application/json")) {
        const payload = (await response.json()) as {
          reply?: string;
          content?: string;
          message?: string;
          error?: string;
        };

        if (payload.error) {
          throw new Error(payload.error);
        }

        const update = appendAssistantMessage(assistantMessageId, payload.reply ?? payload.content ?? payload.message ?? "");
        if (update) {
          setMessages(update);
        }

        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const isEventStream = contentType.includes("text/event-stream");
      let buffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();

        if (done) {
          buffer += decoder.decode();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });

        if (!isEventStream) {
          const update = appendAssistantMessage(assistantMessageId, chunk);
          if (update) {
            setMessages(update);
          }
          continue;
        }

        buffer += chunk;
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";

        for (const event of events) {
          const streamEvent = parseSseEvent(event);

          if (!streamEvent) {
            continue;
          }

          if (streamEvent.event?.toLowerCase() === "thread_id") {
            try {
              const payload = JSON.parse(streamEvent.data) as { thread_id?: string };
              threadIdRef.current = payload.thread_id || threadIdRef.current;
            } catch {
              threadIdRef.current = streamEvent.data.trim() || threadIdRef.current;
            }
            continue;
          }

          const token = readStreamToken(streamEvent);
          if (token.error) {
            throw new Error(token.error);
          }

          if (token.done) {
            streamDone = true;
            break;
          }

          const update = appendAssistantMessage(assistantMessageId, token.content, token.target);
          if (update) {
            setMessages(update);
          }
        }
      }

      if (isEventStream && !streamDone && buffer.trim()) {
        const fallbackEvents: StreamEvent[] = buffer.includes("data:")
          ? [parseSseEvent(buffer)].filter(isStreamEvent)
          : buffer.split(/\r?\n/).map((line) => ({ data: line }));

        for (const streamEvent of fallbackEvents) {
          if (streamEvent.event?.toLowerCase() === "thread_id") {
            try {
              const payload = JSON.parse(streamEvent.data) as { thread_id?: string };
              threadIdRef.current = payload.thread_id || threadIdRef.current;
            } catch {
              threadIdRef.current = streamEvent.data.trim() || threadIdRef.current;
            }
            continue;
          }

          const token = readStreamToken(streamEvent);
          if (token.error) {
            throw new Error(token.error);
          }

          const update = appendAssistantMessage(assistantMessageId, token.content, token.target);
          if (update) {
            setMessages(update);
          }
        }
      }
    } catch {
      setMessages((currentMessages) =>
        currentMessages.map((currentMessage) =>
          currentMessage.id === assistantMessageId
            ? {
                ...currentMessage,
                content: currentMessage.content || "请求失败，请稍后重试。"
              }
            : currentMessage
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <main className="shell">
      <section className="workspace">
        <header className="chat-header">
          <h1>Owner Agent</h1>
        </header>

        <section className="chat-history" aria-live="polite" ref={historyRef}>
          {messages.map((chatMessage) => (
            <article className={`chat-message chat-message-${chatMessage.role}`} key={chatMessage.id}>
              {chatMessage.reasoning ? (
                <div className="reasoning-panel">
                  <p>{chatMessage.reasoning}</p>
                </div>
              ) : null}
              <p>{chatMessage.content}</p>
            </article>
          ))}
        </section>

        <form className="chat-composer" onSubmit={submitMessage}>
          <Textarea
            aria-label="Message"
            className="min-h-16 resize-none bg-background text-[12px] leading-5"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={submitOnEnter}
            rows={3}
          />
          <Button type="submit" disabled={isLoading || !message.trim()}>
            发送
          </Button>
        </form>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
