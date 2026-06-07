import cors from "cors";
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
  const { message } = req.body as ChatRequest;

  if (!message?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  try {
    const response = await fetch(`${agentServiceUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      res.status(502).json({ error: "agent service unavailable" });
      return;
    }

    const payload = (await response.json()) as ChatResponse;
    res.json(payload);
  } catch {
    res.status(502).json({ error: "agent service unavailable" });
  }
});

app.listen(port, () => {
  console.log(`API service listening on http://localhost:${port}`);
});
