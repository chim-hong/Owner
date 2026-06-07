export type HealthResponse = {
  service: "api" | "agent";
  status: "ok";
  timestamp: string;
};

export type ChatRequest = {
  message: string;
};

export type ChatResponse = {
  reply: string;
  source: "agent";
};
