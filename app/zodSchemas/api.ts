import { z } from "zod";

import { MAX_REGENERATE_PROMPT_LENGTH } from "@/core/ai/regenerate-guardrails";
import { LLM_PROVIDERS } from "@/core/ai/provider-defaults";
import { primitiveFieldValueSchema } from "@/zodSchemas/shared";

const requiredString = (message: string) => z.string().trim().min(1, message);

const recipientEmailSchema = z.string().trim().email("Recipient email is invalid.");

const ccEmailsSchema = z
  .array(z.string().trim().email("Invalid CC email address."))
  .optional()
  .default([]);

const attachmentSchema = z.object({
  filename: z.string().trim().min(1, "Attachment filename is required."),
  contentType: z.string().trim().min(1, "Attachment content type is required."),
  data: z.string().trim().min(1, "Attachment data is required."),
  size: z.number().optional(),
  isInline: z.boolean().optional(),
  contentId: z.string().optional(),
}).refine(
  (data) => {
    // If isInline is true, must be an image content type
    if (data.isInline && !data.contentType.startsWith("image/")) {
      return false;
    }
    return true;
  },
  {
    message: "Only image attachments can be inline.",
    path: ["isInline"],
  }
).refine(
  (data) => {
    // If isInline is true, must have contentId
    if (data.isInline && !data.contentId) {
      return false;
    }
    return true;
  },
  {
    message: "Inline attachments must have a contentId.",
    path: ["contentId"],
  }
);

const attachmentsSchema = z
  .array(attachmentSchema)
  .optional()
  .default([]);

export const sendRecipientContentSchema = z.object({
  email: recipientEmailSchema,
  ccEmails: ccEmailsSchema,
  subject: requiredString("Subject is required."),
  body: requiredString("Email body is required."),
  bodyHtml: z.string().trim().optional(),
  bodyText: z.string().trim().optional(),
  attachments: attachmentsSchema,
});

const sendPayloadRecipientSchema = sendRecipientContentSchema.extend({
  id: requiredString("Recipient id is required."),
});

const BULK_SEND_MAX_RECIPIENTS = 100;

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
  prompt: z
    .string()
    .trim()
    .min(1, "Regeneration prompt is required.")
    .max(
      MAX_REGENERATE_PROMPT_LENGTH,
      `Regeneration prompt must be ${MAX_REGENERATE_PROMPT_LENGTH} characters or fewer.`,
    )
    .optional(),
  provider: z.enum(LLM_PROVIDERS),
  apiKey: requiredString("Provider API key is required."),
  model: z.string().trim().optional(),
  recipient: z.object({
    email: recipientEmailSchema,
    fields: z.record(z.string(), primitiveFieldValueSchema),
  }),
  mode: z.enum(["refresh", "improve", "shorten"]).optional(),
});

export const globalTemplateRegenerateRequestSchema = z.object({
  globalSubject: z.string(),
  globalBodyTemplate: requiredString("Global body template is required."),
  prompt: z
    .string()
    .trim()
    .min(1, "Regeneration prompt is required.")
    .max(
      MAX_REGENERATE_PROMPT_LENGTH,
      `Regeneration prompt must be ${MAX_REGENERATE_PROMPT_LENGTH} characters or fewer.`,
    )
    .optional(),
  provider: z.enum(LLM_PROVIDERS),
  apiKey: requiredString("Provider API key is required."),
  model: z.string().trim().optional(),
  availablePlaceholders: z.array(z.string().trim().min(1)).optional(),
  detectedRecipientPlaceholder: z.string().trim().optional(),
  mode: z.enum(["refresh", "improve", "shorten"]).optional(),
});

const regenerateProviderResponseSchema = z.object({
  body: requiredString("AI provider did not return a body."),
  subject: z.string().optional(),
  reasoning: z.string().optional(),
});

export const testEmailRequestSchema = z.object({
  to: recipientEmailSchema,
  ccEmails: ccEmailsSchema,
  subject: requiredString("Subject is required."),
  body: requiredString("Email body is required."),
  bodyHtml: z.string().trim().optional(),
  bodyText: z.string().trim().optional(),
  attachments: attachmentsSchema,
});

export function getZodErrorMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid payload.";
}
