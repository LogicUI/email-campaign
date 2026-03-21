import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { getAuthSecret, getGoogleClientId, getGoogleClientSecret } from "@/core/auth/auth-env";

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: getGoogleClientId(),
      clientSecret: getGoogleClientSecret(),
      authorization: {
        params: {
          access_type: "offline",
          include_granted_scopes: "true",
          prompt: "consent",
          response_type: "code",
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive.metadata.readonly",
          ].join(" "),
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (typeof profile?.sub === "string") {
        token.userId = profile.sub;
      } else if (typeof token.sub === "string" && !token.userId) {
        token.userId = token.sub;
      }

      if (account) {
        token.accessToken = account.access_token;
        token.accessTokenExpiresAt = account.expires_at ? account.expires_at * 1000 : undefined;
        token.refreshToken = account.refresh_token ?? token.refreshToken;
        token.googleEmail =
          typeof profile?.email === "string" ? profile.email : token.email ?? token.googleEmail;
        token.authError = undefined;
      }

      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        session.user = {
          id: "",
          email: "",
        };
      }

      session.user.id = token.userId ?? token.sub ?? session.user.id ?? "";
      session.user.email = token.googleEmail ?? token.email ?? session.user.email ?? "";
      session.authError = token.authError;

      return session;
    },
  },
};
