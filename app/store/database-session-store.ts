"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { DatabaseSessionStore } from "@/types/database-session-store";

const initialState = {
  activeConnection: null,
  editedImportSchema: null,
};

export const useDatabaseSessionStore = create<DatabaseSessionStore>()(
  persist(
    (set) => ({
      ...initialState,
      clearActiveConnection: () =>
        set({
          activeConnection: null,
        }),
      setActiveConnection: (connection) =>
        set({
          activeConnection: connection,
        }),
      updateActiveConnection: (updater) =>
        set((state) => ({
          activeConnection: updater(state.activeConnection),
        })),
      setEditedImportSchema: (schema) =>
        set({
          editedImportSchema: schema,
        }),
      clearEditedImportSchema: () =>
        set({
          editedImportSchema: null,
        }),
    }),
    {
      name: "emailai-database-session",
      storage: createJSONStorage(() => sessionStorage),
      version: 3,
      migrate: (persistedState, version) => {
        const state = persistedState as DatabaseSessionStore;

        // Migration from version 2 to 3: add editedImportSchema
        if (version === 2) {
          return {
            ...state,
            editedImportSchema: null,
          };
        }

        if (!state?.activeConnection) {
          return {
            activeConnection: null,
            editedImportSchema: null,
          };
        }

        return {
          ...state,
          activeConnection: {
            ...state.activeConnection,
            syncMode: state.activeConnection.syncMode ?? "auto",
          },
          editedImportSchema: state.editedImportSchema ?? null,
        };
      },
    },
  ),
);
