import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    authError?: "REAUTH_REQUIRED";
    user: DefaultSession["user"] & {
      id: string;
      email: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    accessTokenExpiresAt?: number;
    authError?: "REAUTH_REQUIRED";
    googleEmail?: string;
    refreshToken?: string;
    userId?: string;
  }
}
