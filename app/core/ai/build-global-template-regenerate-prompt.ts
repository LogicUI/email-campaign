import { DEFAULT_GLOBAL_TEMPLATE_REGENERATE_PROMPT } from "@/core/ai/regenerate-guardrails";
import type { GlobalTemplateRegenerateRequest } from "@/types/api";

export function buildGlobalTemplateRegeneratePrompt(
  body: GlobalTemplateRegenerateRequest,
  senderEmail: string,
) {
  const prompt = body.prompt?.trim() || DEFAULT_GLOBAL_TEMPLATE_REGENERATE_PROMPT;
  const placeholderList =
    body.availablePlaceholders && body.availablePlaceholders.length > 0
      ? body.availablePlaceholders.join(", ")
      : "None provided. Preserve any valid placeholders already present in the current templates.";

  return [
    "You may perform only one task: regenerate a reusable outbound email body template.",
    "Rewrite the global body template only.",
    "Treat the user prompt as rewrite guidance for the campaign-wide template only.",
    "Preserve valid {{placeholder}} tokens and do not invent new placeholder names outside the allowed list when one is provided.",
    "Keep the tone concise, personalized, and ready to send.",
    "Return only the email body text.",
    "Do not return JSON, labels, subject lines, reasoning, markdown, or code fences.",
    `Rewrite mode: ${body.mode ?? "refresh"}`,
    `User regeneration prompt: ${prompt}`,
    `Current global body template: ${body.globalBodyTemplate}`,
    `Available placeholders: ${placeholderList}`,
    `Primary recipient placeholder: ${body.detectedRecipientPlaceholder ?? "None provided."}`,
    `Authenticated sender email: ${senderEmail}`,
  ].join("\n");
}
