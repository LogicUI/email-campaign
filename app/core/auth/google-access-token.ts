import type { JWT } from "next-auth/jwt";

import { getGoogleClientId, getGoogleClientSecret } from "@/core/auth/auth-env";

const TOKEN_REFRESH_BUFFER_MS = 60_000;

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

export class ReauthRequiredError extends Error {
  code = "REAUTH_REQUIRED" as const;

  constructor(message = "Google access expired. Sign in again to continue.") {
    super(message);
    this.name = "ReauthRequiredError";
  }
}

/**
 * Checks whether a Google access token should be treated as expired.
 *
 * We refresh slightly before the actual expiry time to reduce the chance of a send
 * request failing mid-flight because the token expired during processing.
 *
 * @param expiresAt Epoch milliseconds when the token expires.
 * @returns `true` when the token is missing or within the refresh buffer window.
 */
function isExpired(expiresAt?: number) {
  return !expiresAt || Date.now() >= expiresAt - TOKEN_REFRESH_BUFFER_MS;
}

/**
 * Exchanges a Google refresh token for a fresh access token.
 *
 * @param refreshToken OAuth refresh token from the NextAuth JWT.
 * @returns Refreshed Google token payload needed for Gmail API calls.
 * @throws ReauthRequiredError when Google rejects the refresh request.
 */
async function refreshGoogleAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const payload = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !payload.access_token || !payload.expires_in) {
    throw new ReauthRequiredError(payload.error_description ?? payload.error);
  }

  return {
    accessToken: payload.access_token,
    accessTokenExpiresAt: Date.now() + payload.expires_in * 1000,
    refreshToken: payload.refresh_token ?? refreshToken,
  };
}

/**
 * Returns a valid Google access token for Gmail API calls.
 *
 * This is the main token gate for send routes. It uses the cached access token when
 * still valid and falls back to a refresh flow when the JWT holds a refresh token.
 *
 * @param token NextAuth JWT that may contain access and refresh tokens.
 * @returns Non-expired Google access token.
 * @throws ReauthRequiredError when the user must sign in again.
 */
export async function getValidGoogleAccessToken(token: JWT | null) {
  if (!token?.accessToken) {
    throw new ReauthRequiredError();
  }

  if (!isExpired(token.accessTokenExpiresAt)) {
    return token.accessToken;
  }

  if (!token.refreshToken) {
    throw new ReauthRequiredError();
  }

  const refreshed = await refreshGoogleAccessToken(token.refreshToken);
  return refreshed.accessToken;
}
