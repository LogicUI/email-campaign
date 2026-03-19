"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { createInitialAiProvidersState } from "@/core/ai/provider-defaults";
import type { AiSettingsStore } from "@/types/ai-settings";

const initialProviders = createInitialAiProvidersState();
export const initialAiSettingsState = {
  activeProvider: "openai" as const,
  providers: initialProviders,
};

export const useAiSettingsStore = create<AiSettingsStore>()(
  persist(
    (set) => ({
      ...initialAiSettingsState,
      setActiveProvider: (provider) =>
        set({
          activeProvider: provider,
        }),
      setProviderApiKey: (provider, apiKey) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [provider]: {
              ...state.providers[provider],
              apiKey,
            },
          },
        })),
      setProviderCustomModel: (provider, customModel) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [provider]: {
              ...state.providers[provider],
              customModel,
            },
          },
        })),
      clearProviderSettings: (provider) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [provider]: {
              apiKey: "",
              customModel: "",
            },
          },
          activeProvider:
            state.activeProvider === provider ? "openai" : state.activeProvider,
        })),
    }),
    {
      name: "emailai-ai-settings",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
