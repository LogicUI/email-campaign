const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function isValidEmail(email: string) {
  return EMAIL_REGEX.test(email.trim());
}
