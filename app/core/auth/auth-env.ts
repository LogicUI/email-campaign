export function getAuthSecret() {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "emailai-dev-auth-secret";
}

export function getGoogleClientId() {
  return process.env.AUTH_GOOGLE_ID ?? "";
}

export function getGoogleClientSecret() {
  return process.env.AUTH_GOOGLE_SECRET ?? "";
}
