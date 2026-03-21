"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { performClientSignOut } from "@/core/auth/client-sign-out";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      setLogoutError(null);
      await performClientSignOut({
        navigator: router,
      });
    } catch (error) {
      console.error("Failed to sign out.", error);
      setLogoutError("Unable to log out. Refresh and try again.");
      setIsSigningOut(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        disabled={isSigningOut}
        onClick={() => void handleSignOut()}
      >
        <LogOut className="h-4 w-4" />
        {isSigningOut ? "Logging out..." : "Log out"}
      </Button>
      {logoutError ? <p className="text-sm text-destructive">{logoutError}</p> : null}
    </div>
  );
}
