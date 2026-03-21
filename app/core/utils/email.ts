const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

/**
 * Performs lightweight email-format validation for imports and send checks.
 *
 * This is intentionally simple. It is not trying to prove deliverability, only to
 * reject obvious non-email values before the user reaches send.
 *
 * @param email Candidate email string.
 * @returns `true` when the value matches the app's basic email pattern.
 */
export function isValidEmail(email: string) {
  return EMAIL_REGEX.test(email.trim());
}
