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

function isExpired(expiresAt?: number) {
  return !expiresAt || Date.now() >= expiresAt - TOKEN_REFRESH_BUFFER_MS;
}

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
