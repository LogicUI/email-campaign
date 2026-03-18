import OpenAI from "openai";

function getOpenAiApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  return apiKey;
}

export function getOpenAiClient() {
  return new OpenAI({
    apiKey: getOpenAiApiKey(),
  });
}

export function getOpenAiModel() {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}
