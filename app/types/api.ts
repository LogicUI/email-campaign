import type { LlmProvider } from "@/types/ai-settings";
import type { Attachment } from "@/types/gmail";
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
    subject?: string;
    body: string;
    reasoning?: string;
  };
  error?: string;
}

export interface SendPayloadRecipient {
  id: string;
  email: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  bodyText?: string;
  ccEmails?: string[];
  attachments?: Attachment[];
}

export interface TestEmailRequest {
  to: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  bodyText?: string;
  ccEmails?: string[];
  attachments?: Attachment[];
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
