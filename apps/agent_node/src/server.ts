import cors from "cors";
import "dotenv/config";
import express from "express";
import type { ChatRequest, HealthResponse } from "@personal-agent/shared";

import { createInitialState, mainGraph } from "./graph.js";
import { doneEvent, errorEvent, langGraphStreamToSse } from "./stream.js";

const app = express();
const port = Number(process.env.AGENT_NODE_PORT ?? process.env.AGENT_PORT ?? 4001);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  const payload: HealthResponse = {
    service: "agent",
    status: "ok",
    timestamp: new Date().toISOString()
  };

  res.json(payload);
});

app.post("/chat", async (req, res) => {
  const { message, thread_id } = req.body as ChatRequest;

  if (!message?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    const stream = await mainGraph.stream(createInitialState(message, thread_id), {
      configurable: {
        thread_id: thread_id ?? "default"
      },
      streamMode: ["messages", "updates"]
    });

    for await (const event of langGraphStreamToSse(stream)) {
      res.write(event);
    }

    res.write(doneEvent());
  } catch (error) {
    const message = error instanceof Error ? error.message : "agent service failed";
    res.write(errorEvent(message));
    res.write(doneEvent("传输失败"));
  } finally {
    res.end();
  }
});

app.listen(port, () => {
  console.log(`Node Agent service listening on http://localhost:${port}`);
});
