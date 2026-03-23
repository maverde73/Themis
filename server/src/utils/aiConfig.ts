import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { config } from "./config";

export function getModel() {
  const { aiProvider, aiModel, aiApiKey } = config;

  if (!aiApiKey) {
    throw new Error("AI_API_KEY is not configured");
  }

  switch (aiProvider) {
    case "anthropic":
      return createAnthropic({ apiKey: aiApiKey })(aiModel);
    case "openai":
      return createOpenAI({ apiKey: aiApiKey })(aiModel);
    case "google":
      return createGoogleGenerativeAI({ apiKey: aiApiKey })(aiModel);
    default:
      throw new Error(`Unsupported AI_PROVIDER: ${aiProvider}`);
  }
}
