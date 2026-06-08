export type HealthResponse = {
  service: "api" | "agent";
  status: "ok";
  timestamp: string;
};

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatRequest = {
  message: string;
  thread_id?: string;
  history?: ChatHistoryMessage[];
};

export type ChatResponse = {
  reply: string;
  source: "agent";
};
