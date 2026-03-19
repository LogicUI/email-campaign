"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button variant="secondary" onClick={() => signOut({ callbackUrl: "/login" })}>
      <LogOut className="h-4 w-4" />
      Log out
    </Button>
  );
}
