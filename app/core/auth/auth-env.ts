/**
 * Returns the auth secret used by NextAuth in all environments.
 *
 * This must be set via AUTH_SECRET or NEXTAUTH_SECRET environment variable.
 * In production, the application will fail to start if neither is provided.
 *
 * @returns Auth secret string.
 * @throws {Error} If no auth secret is configured
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET or NEXTAUTH_SECRET must be set in production.\n" +
          'Generate one with: openssl rand -base64 32'
      );
    }
    // Development-only fallback for convenience
    console.warn(
      "⚠️  No AUTH_SECRET set. Using temporary development secret.\n" +
        'For production, generate one with: openssl rand -base64 32'
    );
    return "dev-secret-do-not-use-in-production";
  }

  return secret;
}

/**
 * Reads the configured Google OAuth client id.
 *
 * @returns Google OAuth client id, or an empty string when not configured.
 */
export function getGoogleClientId() {
  return process.env.AUTH_GOOGLE_ID ?? "";
}

/**
 * Reads the configured Google OAuth client secret.
 *
 * @returns Google OAuth client secret, or an empty string when not configured.
 */
export function getGoogleClientSecret() {
  return process.env.AUTH_GOOGLE_SECRET ?? "";
}
