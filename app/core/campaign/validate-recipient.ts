import { getZodErrorMessage, sendRecipientContentSchema } from "@/zodSchemas/api";

export function validateRecipient(email: string, subject: string, body: string) {
  const result = sendRecipientContentSchema.safeParse({ email, subject, body });
  return result.success ? null : getZodErrorMessage(result.error);
}
