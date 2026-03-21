import { getZodErrorMessage, sendRecipientContentSchema } from "@/zodSchemas/api";

/**
 * Validates the minimum content required to send a recipient email.
 *
 * This exists so the UI can block sends and show a single human-readable error
 * message before the Gmail bulk-send endpoint is called.
 *
 * @param email Recipient email address.
 * @param subject Final subject line.
 * @param body Final email body.
 * @returns `null` when valid, otherwise a user-facing validation error message.
 */
export function validateRecipient(email: string, subject: string, body: string) {
  const result = sendRecipientContentSchema.safeParse({ email, subject, body });
  return result.success ? null : getZodErrorMessage(result.error);
}
