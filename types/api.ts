import type { PrimitiveFieldValue } from "@/types/campaign";

export interface RegenerateRequest {
  recipientId: string;
  globalSubject: string;
  globalBodyTemplate: string;
  currentBody: string;
  recipient: {
    email: string;
    fields: Record<string, PrimitiveFieldValue>;
  };
  mode?: "refresh" | "improve" | "shorten";
}

export interface RegenerateResponse {
  ok: boolean;
  data?: {
    recipientId: string;
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
}

export interface BulkSendRequest {
  campaignId: string;
  sendJobId: string;
  recipients: SendPayloadRecipient[];
}

export interface BulkSendResultItem {
  recipientId: string;
  status: "sent" | "failed";
  resendId?: string;
  errorMessage?: string;
}

export interface BulkSendResponse {
  ok: boolean;
  data?: {
    sendJobId: string;
    results: BulkSendResultItem[];
  };
  error?: string;
}
