"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { KeyRound, Orbit } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAiSettings } from "@/hooks/use-ai-settings";
import type { AiSettingsTriggerProps } from "@/types/ai-settings";

const AiSettingsDialog = dynamic(
  () => import("@/components/settings/ai-settings-dialog").then((mod) => mod.AiSettingsDialog),
);

export function AiSettingsStatusPill() {
  const { activeModel, activeProviderLabel, resolvedActiveProvider } = useAiSettings();

  return (
    <Badge variant={resolvedActiveProvider.isConfigured ? "secondary" : "warning"}>
      {resolvedActiveProvider.isConfigured
        ? `AI · ${activeProviderLabel} · ${activeModel}`
        : "AI · Configure provider"}
    </Badge>
  );
}

// Temporarily unused - removed from file upload page
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AiSettingsTrigger(props: AiSettingsTriggerProps) {
  const { context } = props;
  const [open, setOpen] = useState(false);
  const { activeModel, activeProviderLabel, configuredProviders, resolvedActiveProvider } =
    useAiSettings();

  if (context === "header") {
    return (
      <>
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <Orbit className="h-4 w-4" />
          AI Settings
        </Button>
        <AiSettingsDialog open={open} onOpenChange={setOpen} />
      </>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-border/80 bg-white/70 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={resolvedActiveProvider.isConfigured ? "success" : "warning"}>
                {resolvedActiveProvider.isConfigured
                  ? `${activeProviderLabel} ready`
                  : "AI not configured"}
              </Badge>
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                LLM routing
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {resolvedActiveProvider.isConfigured
                ? `${activeProviderLabel} · ${activeModel} powers regenerate in this browser.`
                : "Add one or more provider API keys before using regenerate."}
            </p>
            <p className="text-xs text-muted-foreground">
              {configuredProviders.length === 0
                ? "No providers configured locally yet."
                : `${configuredProviders.length} provider${
                    configuredProviders.length === 1 ? "" : "s"
                  } configured locally.`}
            </p>
          </div>

          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            <KeyRound className="h-4 w-4" />
            AI Settings
          </Button>
        </div>
      </div>
      <AiSettingsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
