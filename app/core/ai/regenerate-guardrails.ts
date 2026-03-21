export const DEFAULT_REGENERATE_PROMPT = `Rewrite this outbound email using the current draft, the campaign templates, and the recipient fields. Keep it concise, personalized, factual, and ready to send. Preserve the sender's intent and return only the email body.`;

export const DEFAULT_GLOBAL_TEMPLATE_REGENERATE_PROMPT = `Rewrite this campaign-wide subject and body template so it stays reusable across recipients. Preserve valid {{placeholder}} tokens, keep the tone concise and personalized, and return a polished subject plus body that are ready to save as the new global message.`;

export const MAX_REGENERATE_PROMPT_LENGTH = 1200;

/**
 * Normalizes the user-supplied regenerate prompt with a safe default fallback.
 *
 * This ensures backend prompt construction never receives `undefined` or blank
 * prompts, even when older callers omit the field entirely.
 *
 * @param value Optional custom regenerate prompt from the client.
 * @returns Trimmed prompt string, or the canonical default prompt.
 */
export function resolveRegeneratePrompt(value?: string) {
  const normalized = value?.trim();
  return normalized || DEFAULT_REGENERATE_PROMPT;
}
