import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { getServerAuthSession } from "@/core/auth/session";
import type { LoginPageProps } from "@/types/auth";

function getSingleValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServerAuthSession();

  if (session?.user?.email) {
    redirect("/");
  }

  const callbackUrl = getSingleValue(searchParams?.callbackUrl) ?? "/";
  const reason = getSingleValue(searchParams?.reason);

  return (
    <main className="app-shell">
      <div className="container flex min-h-screen items-center justify-center py-12">
        <Card className="w-full max-w-md border-white/60 bg-white/85 shadow-[0_30px_90px_rgba(103,76,34,0.12)]">
          <CardHeader className="space-y-4">
            <Badge variant="secondary" className="w-fit">
              Protected workspace
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">Sign in to EmailAI</h1>
              <CardDescription className="text-base leading-7">
                Use your Google account to access the campaign workspace. Your Google
                email becomes the sender identity for Gmail-powered email sends.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {reason === "reauth" ? (
              <Alert>
                <AlertTitle>Google access needs to be refreshed</AlertTitle>
                <AlertDescription>
                  Sign in again to restore Gmail sending permissions for this workspace.
                </AlertDescription>
              </Alert>
            ) : null}

            <GoogleSignInButton callbackUrl={callbackUrl} />

            <p className="text-sm leading-6 text-muted-foreground">
              Only authenticated users can access the app. Saved lists and send history are
              available again after sign-in, while raw external database credentials stay
              session-only in this browser.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
