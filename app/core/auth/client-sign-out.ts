"use client";

import { signOut } from "next-auth/react";

type SignOutNavigator = {
  replace: (...args: any[]) => void;
  refresh: () => void;
};

function normalizeCallbackUrl(url: string | undefined, fallbackUrl: string) {
  if (!url) {
    return fallbackUrl;
  }

  if (typeof window === "undefined") {
    return fallbackUrl;
  }

  try {
    const normalizedUrl = new URL(url, window.location.origin);

    if (normalizedUrl.origin !== window.location.origin) {
      return fallbackUrl;
    }

    return `${normalizedUrl.pathname}${normalizedUrl.search}${normalizedUrl.hash}`;
  } catch {
    return fallbackUrl;
  }
}

export async function performClientSignOut(params: {
  callbackUrl?: string;
  navigator: SignOutNavigator;
}) {
  const callbackUrl = params.callbackUrl ?? "/login";
  const result = await signOut({
    redirect: false,
    callbackUrl,
  });

  params.navigator.replace(normalizeCallbackUrl(result?.url, callbackUrl));
  params.navigator.refresh();
}
