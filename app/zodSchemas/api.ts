import { z } from "zod";

import { LLM_PROVIDERS } from "@/core/ai/provider-defaults";
import { primitiveFieldValueSchema } from "@/zodSchemas/shared";

const requiredString = (message: string) => z.string().trim().min(1, message);

export const recipientEmailSchema = z.string().trim().email("Recipient email is invalid.");

export const sendRecipientContentSchema = z.object({
  email: recipientEmailSchema,
  subject: requiredString("Subject is required."),
  body: requiredString("Email body is required."),
});

export const sendPayloadRecipientSchema = sendRecipientContentSchema.extend({
  id: requiredString("Recipient id is required."),
});

export const BULK_SEND_MAX_RECIPIENTS = 100;

export const bulkSendRequestSchema = z.object({
  campaignId: requiredString("Campaign id is required."),
  sendJobId: requiredString("Send job id is required."),
  recipients: z
    .array(sendPayloadRecipientSchema)
    .min(1, "No recipients supplied.")
    .max(
      BULK_SEND_MAX_RECIPIENTS,
      `Limit bulk sends to ${BULK_SEND_MAX_RECIPIENTS} recipients per request.`,
    ),
});

export const regenerateRequestSchema = z.object({
  recipientId: requiredString("Recipient id is required."),
  globalSubject: z.string(),
  globalBodyTemplate: z.string(),
  currentBody: requiredString("Current draft body is required."),
  provider: z.enum(LLM_PROVIDERS),
  apiKey: requiredString("Provider API key is required."),
  model: z.string().trim().optional(),
  recipient: z.object({
    email: recipientEmailSchema,
    fields: z.record(z.string(), primitiveFieldValueSchema),
  }),
  mode: z.enum(["refresh", "improve", "shorten"]).optional(),
});

export const regenerateProviderResponseSchema = z.object({
  body: requiredString("AI provider did not return a body."),
  subject: z.string().optional(),
  reasoning: z.string().optional(),
});

export const testEmailRequestSchema = z.object({
  to: recipientEmailSchema,
  subject: requiredString("Subject is required."),
  body: requiredString("Email body is required."),
});

export function getZodErrorMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid payload.";
}
