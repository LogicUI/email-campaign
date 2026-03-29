import type { LlmProvider } from "@/types/ai-settings";

export interface AiGenerateDraftParams {
  apiKey: string;
  model: string;
  prompt: string;
  systemInstruction: string;
}

export interface AiProviderParsedResponse {
  body: string;
  reasoning?: string;
  subject?: string;
}

export interface DispatchRegenerateParams extends AiGenerateDraftParams {
  provider: LlmProvider;
}
