import cors from "cors";
import { randomUUID } from "node:crypto";
import "dotenv/config";
import express from "express";
import type { ChatRequest, ChatResponse, HealthResponse } from "@personal-agent/shared";

const app = express();
const port = Number(process.env.API_PORT ?? 3000);
const agentServiceUrl = process.env.AGENT_SERVICE_URL ?? "http://localhost:4000";

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  const payload: HealthResponse = {
    service: "api",
    status: "ok",
    timestamp: new Date().toISOString()
  };

  res.json(payload);
});

app.post("/api/chat", async (req, res) => {
  const { message, history = [], thread_id } = req.body as ChatRequest;
  const threadId = thread_id?.trim() || randomUUID();

  if (!message?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent("thread_id", { thread_id: threadId });

  try {
    const response = await fetch(`${agentServiceUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message, history, thread_id: threadId })
    });

    if (!response.ok) {
      sendEvent("error", { error: "agent service unavailable" });
      sendEvent("done", {});
      res.end();
      return;
    }

    if (response.headers.get("content-type")?.includes("text/event-stream") && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        res.write(decoder.decode(value, { stream: true }));
      }

      res.end();
      return;
    }

    const payload = (await response.json()) as ChatResponse;
    const chunks = payload.reply.match(/.{1,8}/gu) ?? [payload.reply];

    for (const chunk of chunks) {
      sendEvent("chunk", { content: chunk });
    }

    sendEvent("done", { source: payload.source });
    res.end();
  } catch {
    sendEvent("error", { error: "agent service unavailable" });
    sendEvent("done", {});
    res.end();
  }
});

app.listen(port, () => {
  console.log(`API service listening on http://localhost:${port}`);
});
