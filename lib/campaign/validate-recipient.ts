import { isValidEmail } from "@/lib/utils/email";

export function validateRecipient(email: string, subject: string, body: string) {
  if (!isValidEmail(email)) {
    return "Recipient email is invalid.";
  }

  if (!subject.trim()) {
    return "Subject is required.";
  }

  if (!body.trim()) {
    return "Email body is required.";
  }

  return null;
}
