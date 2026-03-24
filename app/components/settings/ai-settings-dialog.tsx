"use client";

import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, KeyRound, Sparkles } from "lucide-react";

import {
  AI_PROVIDER_CATALOG,
  LLM_PROVIDERS,
  resolveProviderConfig,
} from "@/core/ai/provider-defaults";
import { useAiSettings } from "@/hooks/use-ai-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type {
  AiSettingsDialogProps,
  LlmProvider,
  LlmProviderSettings,
} from "@/types/ai-settings";

export function AiSettingsDialog(props: AiSettingsDialogProps) {
  const { open, onOpenChange } = props;
  const {
    activeModel,
    activeProvider,
    activeProviderLabel,
    clearProviderSettings,
    configuredProviders,
    providers,
    setActiveProvider,
    setProviderApiKey,
    setProviderCustomModel,
  } = useAiSettings();
  const [selectedProvider, setSelectedProvider] = useState<LlmProvider>(activeProvider);
  const [draftActiveProvider, setDraftActiveProvider] = useState<LlmProvider>(activeProvider);
  const [draftProviders, setDraftProviders] = useState<Record<LlmProvider, LlmProviderSettings>>(
    providers,
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedProvider(activeProvider);
    setDraftActiveProvider(activeProvider);
    setDraftProviders(providers);
  }, [activeProvider, open, providers]);

  const selectedMeta = AI_PROVIDER_CATALOG[selectedProvider];
  const selectedDraft = draftProviders[selectedProvider];
  const selectedResolvedModel = resolveProviderConfig(selectedProvider, selectedDraft).model;
  const activeDraftConfigured = Boolean(draftProviders[draftActiveProvider].apiKey.trim());

  const configuredCountLabel = useMemo(() => {
    if (configuredProviders.length === 0) {
      return "No providers configured";
    }

    if (configuredProviders.length === 1) {
      return "1 provider configured";
    }

    return `${configuredProviders.length} providers configured`;
  }, [configuredProviders.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,960px)] gap-6 overflow-hidden border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,244,235,0.96))]">
        <div className="grid gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="border-b bg-[radial-gradient(circle_at_top_left,rgba(217,163,78,0.22),transparent_42%),linear-gradient(180deg,rgba(64,42,18,0.98),rgba(42,27,12,0.96))] p-6 text-white lg:border-b-0 lg:border-r">
            <DialogHeader className="space-y-3">
              <Badge className="w-fit bg-white/12 text-white" variant="outline">
                Browser-local AI settings
              </Badge>
              <DialogTitle className="text-2xl tracking-tight">
                Model switchboard
              </DialogTitle>
              <DialogDescription className="max-w-sm text-[15px] leading-7 text-white/78">
                Save keys for multiple LLM providers, set one active model path, and use
                that selection for every regenerate action in this browser.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-8 space-y-3">
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/52">
                  Active route
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-amber-200" />
                  <p className="font-medium text-white">
                    {activeProviderLabel} · {activeModel}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/52">
                  Availability
                </p>
                <p className="mt-3 text-sm text-white/78">{configuredCountLabel}</p>
              </div>

              <Alert className="border-white/10 bg-white/8 text-white">
                <AlertTitle className="text-white">Stored on this device only</AlertTitle>
                <AlertDescription className="text-white/72">
                  API keys stay in browser localStorage. They are not synced to your Google
                  account and they are sent only when you trigger an AI action.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-wrap gap-2">
              {LLM_PROVIDERS.map((provider) => {
                const meta = AI_PROVIDER_CATALOG[provider];
                const isSelected = provider === selectedProvider;
                const isConfigured = Boolean(draftProviders[provider].apiKey.trim());

                return (
                  <Button
                    key={provider}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setSelectedProvider(provider)}
                  >
                    {meta.label}
                    {isConfigured ? (
                      <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px]">
                        Ready
                      </span>
                    ) : null}
                  </Button>
                );
              })}
            </div>

            <div className="mt-6 rounded-[1.6rem] border border-border/70 bg-white/82 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold tracking-tight">{selectedMeta.label}</h3>
                    {draftActiveProvider === selectedProvider ? (
                      <Badge variant="secondary">Active provider</Badge>
                    ) : null}
                  </div>
                  <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                    {selectedMeta.description}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  disabled={!selectedDraft.apiKey.trim()}
                  onClick={() => setDraftActiveProvider(selectedProvider)}
                >
                  <Sparkles className="h-4 w-4" />
                  Use for AI actions
                </Button>
              </div>

              <div className="mt-6 grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor={`${selectedProvider}-api-key`}>API key</Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id={`${selectedProvider}-api-key`}
                      type="password"
                      autoComplete="off"
                      value={selectedDraft.apiKey}
                      onChange={(event) =>
                        setDraftProviders((current) => ({
                          ...current,
                          [selectedProvider]: {
                            ...current[selectedProvider],
                            apiKey: event.target.value,
                          },
                        }))
                      }
                      className="pl-9"
                      placeholder={selectedMeta.apiKeyPlaceholder}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave blank to disable {selectedMeta.label} in this browser.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`${selectedProvider}-custom-model`}>
                    Custom model override
                  </Label>
                  <Input
                    id={`${selectedProvider}-custom-model`}
                    value={selectedDraft.customModel}
                    onChange={(event) =>
                      setDraftProviders((current) => ({
                        ...current,
                        [selectedProvider]: {
                          ...current[selectedProvider],
                          customModel: event.target.value,
                        },
                      }))
                    }
                    placeholder={selectedMeta.defaultModel}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Default: {selectedMeta.defaultModel}</span>
                    <span>&bull;</span>
                    <span>Resolved model: {selectedResolvedModel}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {LLM_PROVIDERS.map((provider) => {
                const meta = AI_PROVIDER_CATALOG[provider];
                const providerState = draftProviders[provider];
                const isConfigured = Boolean(providerState.apiKey.trim());

                return (
                  <div
                    key={provider}
                    className="rounded-2xl border border-border/70 bg-white/72 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{meta.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {isConfigured ? "Configured locally" : "No key saved"}
                        </p>
                      </div>
                      {draftActiveProvider === provider ? (
                        <Badge variant="success">Active</Badge>
                      ) : null}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Model: {resolveProviderConfig(provider, providerState).model}
                    </p>
                  </div>
                );
              })}
            </div>

            <DialogFooter className="mt-6">
              <div className="mr-auto text-sm text-muted-foreground">
                {activeDraftConfigured
                  ? `${AI_PROVIDER_CATALOG[draftActiveProvider].label} will be used for regenerate.`
                  : "Save at least one API key to enable regenerate actions."}
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={!selectedDraft.apiKey && !selectedDraft.customModel}
                onClick={() =>
                  setDraftProviders((current) => ({
                    ...current,
                    [selectedProvider]: {
                      apiKey: "",
                      customModel: "",
                    },
                  }))
                }
              >
                Clear current form
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!providers[selectedProvider].apiKey && !providers[selectedProvider].customModel}
                onClick={() => {
                  clearProviderSettings(selectedProvider);
                  setDraftProviders((current) => ({
                    ...current,
                    [selectedProvider]: {
                      apiKey: "",
                      customModel: "",
                    },
                  }));
                }}
              >
                Remove saved key
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const nextActiveProvider = draftProviders[draftActiveProvider].apiKey.trim()
                    ? draftActiveProvider
                    : draftProviders[selectedProvider].apiKey.trim()
                      ? selectedProvider
                      : draftActiveProvider;

                  LLM_PROVIDERS.forEach((provider) => {
                    setProviderApiKey(provider, draftProviders[provider].apiKey.trim());
                    setProviderCustomModel(
                      provider,
                      draftProviders[provider].customModel.trim(),
                    );
                  });
                  setActiveProvider(nextActiveProvider);
                  onOpenChange(false);
                }}
              >
                Save AI settings
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
