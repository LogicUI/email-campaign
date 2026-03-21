import type { LlmProvider } from "@/types/ai-settings";
import type { PrimitiveFieldValue } from "@/types/campaign";

export interface RegenerateRequest {
  recipientId: string;
  globalSubject: string;
  globalBodyTemplate: string;
  currentBody: string;
  prompt?: string;
  provider: LlmProvider;
  apiKey: string;
  model?: string;
  recipient: {
    email: string;
    fields: Record<string, PrimitiveFieldValue>;
  };
  mode?: "refresh" | "improve" | "shorten";
}

export interface GlobalTemplateRegenerateRequest {
  globalSubject: string;
  globalBodyTemplate: string;
  prompt?: string;
  provider: LlmProvider;
  apiKey: string;
  model?: string;
  availablePlaceholders?: string[];
  detectedRecipientPlaceholder?: string;
  mode?: "refresh" | "improve" | "shorten";
}

export interface RegenerateResponse {
  ok: boolean;
  code?: ApiErrorCode;
  data?: {
    recipientId: string;
    subject?: string;
    body: string;
    reasoning?: string;
  };
  error?: string;
}

export interface GlobalTemplateRegenerateResponse {
  ok: boolean;
  code?: ApiErrorCode;
  data?: {
    subject: string;
    body: string;
    reasoning?: string;
  };
  error?: string;
}

export interface RegenerateStreamStartEvent {
  type: "start";
  recipientId: string;
}

export interface RegenerateStreamBodyDeltaEvent {
  type: "body_delta";
  recipientId: string;
  chunk: string;
}

export interface RegenerateStreamFinalEvent {
  type: "final";
  recipientId: string;
  body: string;
  subject?: string;
  reasoning?: string;
}

export interface RegenerateStreamErrorEvent {
  type: "error";
  recipientId: string;
  error: string;
}

export type RegenerateStreamEvent =
  | RegenerateStreamStartEvent
  | RegenerateStreamBodyDeltaEvent
  | RegenerateStreamFinalEvent
  | RegenerateStreamErrorEvent;

export interface SendPayloadRecipient {
  id: string;
  email: string;
  subject: string;
  body: string;
}

export type ApiErrorCode = "REAUTH_REQUIRED" | "UNAUTHORIZED";

export interface BulkSendRequest {
  campaignId: string;
  sendJobId: string;
  recipients: SendPayloadRecipient[];
}

export interface BulkSendResultItem {
  recipientId: string;
  status: "sent" | "failed";
  providerMessageId?: string;
  errorMessage?: string;
}

export interface BulkSendResponse {
  ok: boolean;
  code?: ApiErrorCode;
  data?: BulkSendResponseData;
  error?: string;
}

export interface BulkSendResponseData {
  sendJobId: string;
  results: BulkSendResultItem[];
}
