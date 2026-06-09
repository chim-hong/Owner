import { z } from "zod";

export const projectSchema = z.object({
  key: z.enum(["trustdecision-portal", "trustdecision-oper", "aicube", "td-ui"]).nullable().default(null),
  name: z.string().nullable().default(null),
  description: z.string().nullable().default(null)
});

export const intentRecognitionResultSchema = z.object({
  intent_type: z.enum(["project", "contact"]).nullable().default(null),
  result: projectSchema.nullable().default(null)
});

export const intentRecognitionOutputSchema = z.object({
  intents: z.array(intentRecognitionResultSchema).default([])
});

export type Project = z.infer<typeof projectSchema>;
export type IntentRecognitionResult = z.infer<typeof intentRecognitionResultSchema>;
export type IntentRecognitionOutput = z.infer<typeof intentRecognitionOutputSchema>;

export type ToolCall = {
  name: string;
  args?: Record<string, unknown>;
  type: "tool_call";
};

export type ToolResult = {
  name: string;
  args?: Record<string, unknown>;
  type: "tool_call";
  success: boolean;
  content: string | null;
};

export type AgentResponse = {
  success: boolean;
  message: string;
  data: string;
  thread_id?: string;
};
