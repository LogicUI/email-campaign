/**
 * Input sanitization utilities for XSS prevention.
 *
 * This module provides strict HTML sanitization to prevent XSS attacks.
 * All HTML tags are stripped and special characters are escaped.
 *
 * Per user preference, this uses STRICT sanitization:
 * - ALL HTML tags are removed
 * - Special characters are escaped
 * - No formatting is preserved
 */

/**
 * Strict sanitization: Strip ALL HTML and escape special characters.
 *
 * This provides maximum security against XSS attacks by removing all
 * HTML content and escaping special characters.
 *
 * @param input - Potentially unsafe user input
 * @returns Sanitized string with no HTML and escaped special chars
 *
 * @example
 * ```ts
 * sanitizeStrict('<script>alert("xss")</script>Hello')
 * // Returns: 'alert(&quot;xss&quot;)Hello'
 *
 * sanitizeStrict('Click <a href="evil">here</a>')
 * // Returns: 'Click &lt;a href=&quot;evil&quot;&gt;here&lt;/a&gt;'
 * ```
 */
export function sanitizeStrict(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return (
    input
      // Remove all HTML tags
      .replace(/<[^>]*>/g, "")
      // Escape HTML special characters
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;")
      // Trim whitespace
      .trim()
  );
}

/**
 * Sanitize email subject line.
 * Removes HTML, escapes special characters, truncates to reasonable length.
 *
 * @param subject - Email subject line
 * @returns Sanitized subject line (max 998 characters per RFC 5322)
 */
export function sanitizeEmailSubject(subject: string): string {
  const sanitized = sanitizeStrict(subject);
  // RFC 5322 limits subject lines to 998 characters
  return sanitized.slice(0, 998);
}

/**
 * Sanitize email body text.
 * Removes HTML, escapes special characters.
 *
 * @param body - Email body content
 * @returns Sanitized body text
 */
export function sanitizeEmailBody(body: string): string {
  return sanitizeStrict(body);
}

/**
 * Sanitize recipient name.
 * Removes HTML, escapes special characters.
 *
 * @param name - Recipient display name
 * @returns Sanitized name
 */
export function sanitizeRecipientName(name: string): string {
  const sanitized = sanitizeStrict(name);
  // Names are typically short, truncate to 256 characters
  return sanitized.slice(0, 256);
}

/**
 * Validate and sanitize email address.
 *
 * Note: This only validates the format. It does NOT check if the email
 * is deliverable or exists.
 *
 * @param email - Email address to validate
 * @returns Sanitized email address or empty string if invalid
 */
export function sanitizeEmailAddress(email: string): string {
  if (typeof email !== "string") {
    return "";
  }

  const trimmed = email.trim().toLowerCase();

  // Basic email format validation (RFC 5322)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmed)) {
    return "";
  }

  return trimmed;
}

/**
 * Sanitize a generic text field (user input, comments, notes, etc).
 *
 * @param text - Text to sanitize
 * @param maxLength - Maximum allowed length (default: 10000)
 * @returns Sanitized text
 */
export function sanitizeText(text: string, maxLength = 10000): string {
  const sanitized = sanitizeStrict(text);
  return sanitized.slice(0, maxLength);
}

/**
 * Batch sanitize an object's string properties.
 * Useful for sanitizing entire request payloads.
 *
 * @param obj - Object with string properties to sanitize
 * @param fields - Array of field names to sanitize (if specified, only these fields)
 * @returns Object with sanitized string properties
 *
 * @example
 * ```ts
 * const sanitized = sanitizeObject({
 *   subject: '<script>alert("xss")</script>Hello',
 *   body: 'Click <a href="evil">here</a>',
 *   other: 'Leave as is'
 * }, ['subject', 'body']);
 * // Returns: { subject: '...', body: '...', other: 'Leave as is' }
 * ```
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fields?: (keyof T)[]
): T {
  const result = { ...obj };
  const keysToSanitize = fields || (Object.keys(obj) as (keyof T)[]);

  for (const key of keysToSanitize) {
    const value = result[key];
    if (typeof value === "string") {
      (result[key] as unknown) = sanitizeStrict(value);
    }
  }

  return result;
}
