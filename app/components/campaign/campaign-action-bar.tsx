"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Database, FileText, LogOut, Menu, Orbit, Upload, LayoutGrid } from "lucide-react";
import { useRouter } from "next/navigation";

import { performClientSignOut } from "@/core/auth/client-sign-out";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { CampaignActionBarProps } from "@/types/campaign-action-bar";

const AiSettingsDialog = dynamic(
  () => import("@/components/settings/ai-settings-dialog").then((mod) => mod.AiSettingsDialog),
);

export function CampaignActionBar(props: CampaignActionBarProps) {
  const { hasCampaign, onEditTemplate, onOpenDashboard, onOpenDatabaseSettings, onReupload } = props;
  const router = useRouter();
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <>
      <div className="sticky top-3 z-30">
        <div className="overflow-hidden rounded-lg border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(247,242,232,0.92))] shadow-[0_18px_48px_rgba(59,39,18,0.14)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-5">
            <Button
              variant="secondary"
              className="rounded-full border border-black/5 bg-white/90 shadow-sm"
              onClick={onReupload}
            >
              <Upload className="h-4 w-4" />
              Reupload new
            </Button>

            <div className="hidden items-center gap-2 md:flex">
              {onOpenDashboard ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full bg-white/75"
                  onClick={onOpenDashboard}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Saved dashboard
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="rounded-full bg-white/75"
                onClick={onOpenDatabaseSettings}
              >
                <Database className="h-4 w-4" />
                Database
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full bg-white/75"
                onClick={() => setAiSettingsOpen(true)}
              >
                <Orbit className="h-4 w-4" />
                AI Settings
              </Button>
              {hasCampaign ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full bg-white/75"
                  onClick={onEditTemplate}
                >
                  <FileText className="h-4 w-4" />
                  Edit global message
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="rounded-full bg-white/75"
                disabled={isSigningOut}
                onClick={() => void handleSignOut()}
              >
                <LogOut className="h-4 w-4" />
                {isSigningOut ? "Logging out..." : "Log out"}
              </Button>
            </div>

            <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-full bg-white/80 md:hidden"
                  aria-label="Open workspace menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="left-auto right-4 top-[4.75rem] w-[min(92vw,22rem)] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-lg border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,232,0.96))] p-0 shadow-[0_24px_64px_rgba(59,39,18,0.18)] md:hidden">
                <DialogHeader className="border-b border-border/60 px-5 py-4">
                  <DialogTitle className="text-base">Workspace menu</DialogTitle>
                  <DialogDescription>
                    Campaign controls stay here on mobile.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 p-3">
                  {onOpenDashboard ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start rounded-2xl bg-white/70"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenDashboard();
                      }}
                    >
                      <LayoutGrid className="h-4 w-4" />
                      Saved dashboard
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start rounded-2xl bg-white/70"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenDatabaseSettings();
                    }}
                  >
                    <Database className="h-4 w-4" />
                    Database
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start rounded-2xl bg-white/70"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setAiSettingsOpen(true);
                    }}
                  >
                    <Orbit className="h-4 w-4" />
                    AI Settings
                  </Button>
                  {hasCampaign ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start rounded-2xl bg-white/70"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onEditTemplate();
                      }}
                    >
                      <FileText className="h-4 w-4" />
                      Edit global message
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start rounded-2xl bg-white/70"
                    disabled={isSigningOut}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      void handleSignOut();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    {isSigningOut ? "Logging out..." : "Log out"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {logoutError ? (
            <p className="border-t border-border/60 px-5 py-3 text-sm text-destructive">
              {logoutError}
            </p>
          ) : null}
        </div>
      </div>

      <AiSettingsDialog open={aiSettingsOpen} onOpenChange={setAiSettingsOpen} />
    </>
  );
}
