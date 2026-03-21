/**
 * Returns the auth secret used by NextAuth in all environments.
 *
 * A local fallback is kept for development convenience, but production should set
 * `AUTH_SECRET` explicitly.
 *
 * @returns Auth secret string.
 */
export function getAuthSecret() {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "emailai-dev-auth-secret";
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
