import "dotenv/config";

import { ChatOpenAI } from "@langchain/openai";

const apiKey = process.env.DEEPSEEK_API_KEY ?? process.env.LLM_API_KEY;
const model = process.env.LLM_MODEL ?? "deepseek-v4-flash";
const baseURL = process.env.LLM_API_BASE_URL ?? "https://api.deepseek.com";

const commonConfig = {
  model,
  apiKey,
  configuration: {
    baseURL
  }
};

export const thinkingClient = new ChatOpenAI({
  ...commonConfig,
  streaming: true
});

export const chatClient = new ChatOpenAI({
  ...commonConfig,
  streaming: false,
  modelKwargs: {
    extra_body: {
      thinking: { type: "disabled" }
    }
  }
});
