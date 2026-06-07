import React, { FormEvent, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type ChatResponse = {
  reply: string;
  source: "agent";
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

function App() {
  const [message, setMessage] = useState("帮我整理今天的任务");
  const [reply, setReply] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setReply("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const payload = (await response.json()) as ChatResponse;
      setReply(payload.reply);
    } catch {
      setError("后端或 Agent 服务暂不可用。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="workspace">
        <div className="status-bar">
          <span>Personal Agent</span>
          <span>Web → API → Agent</span>
        </div>

        <div className="hero">
          <div>
            <h1>个人 Agent 控制台</h1>
            <p>一个可部署、可扩展的三层项目框架，用于承载你的个人 AI 工作流。</p>
          </div>
        </div>

        <form className="composer" onSubmit={submitMessage}>
          <textarea
            aria-label="Message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
          />
          <button type="submit" disabled={isLoading || !message.trim()}>
            {isLoading ? "发送中..." : "发送"}
          </button>
        </form>

        <section className="response" aria-live="polite">
          {error ? <p className="error">{error}</p> : null}
          {reply ? <p>{reply}</p> : <p className="muted">Agent 回复会显示在这里。</p>}
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
