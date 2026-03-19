import type { RegenerateRequest } from "@/types/api";

export function buildRegeneratePrompt(body: RegenerateRequest, senderEmail: string) {
  return [
    "Rewrite a single outbound email draft.",
    "Keep the tone concise, helpful, and personalized.",
    "Do not invent facts that are not in the recipient fields or draft.",
    "Return only the email body text.",
    "Do not return JSON, labels, subject lines, reasoning, markdown, or code fences.",
    `Rewrite mode: ${body.mode ?? "refresh"}`,
    `Global subject template: ${body.globalSubject}`,
    `Global body template: ${body.globalBodyTemplate}`,
    `Current draft: ${body.currentBody}`,
    `Authenticated sender email: ${senderEmail}`,
    `Recipient email: ${body.recipient.email}`,
    `Recipient fields: ${JSON.stringify(body.recipient.fields)}`,
  ].join("\n");
}
