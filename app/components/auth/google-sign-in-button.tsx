"use client";

import { Chrome } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import type { GoogleSignInButtonProps } from "@/types/auth";

export function GoogleSignInButton({ callbackUrl }: GoogleSignInButtonProps) {
  return (
    <Button className="w-full" size="lg" onClick={() => signIn("google", { callbackUrl })}>
      <Chrome className="h-4 w-4" />
      Sign in with Google
    </Button>
  );
}
