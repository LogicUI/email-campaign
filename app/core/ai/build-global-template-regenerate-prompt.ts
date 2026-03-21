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
    "You may perform only one task: regenerate a reusable outbound email template.",
    "Rewrite both the global subject template and the global body template.",
    "Treat the user prompt as rewrite guidance for the campaign-wide template only.",
    "Preserve valid {{placeholder}} tokens and do not invent new placeholder names outside the allowed list when one is provided.",
    "Keep the tone concise, personalized, and ready to send.",
    "Return valid JSON with keys: subject, body, reasoning.",
    "Do not return markdown, code fences, or any extra keys.",
    `Rewrite mode: ${body.mode ?? "refresh"}`,
    `User regeneration prompt: ${prompt}`,
    `Current global subject template: ${body.globalSubject}`,
    `Current global body template: ${body.globalBodyTemplate}`,
    `Available placeholders: ${placeholderList}`,
    `Primary recipient placeholder: ${body.detectedRecipientPlaceholder ?? "None provided."}`,
    `Authenticated sender email: ${senderEmail}`,
  ].join("\n");
}
