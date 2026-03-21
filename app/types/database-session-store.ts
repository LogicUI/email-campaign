import type { InferredDatabaseColumn } from "@/types/database";
import type { DatabaseSessionConnection } from "@/types/database";

export interface DatabaseSessionStoreState {
  activeConnection: DatabaseSessionConnection | null;
  editedImportSchema: InferredDatabaseColumn[] | null;
}

export interface DatabaseSessionStoreActions {
  clearActiveConnection: () => void;
  setActiveConnection: (connection: DatabaseSessionConnection) => void;
  updateActiveConnection: (
    updater: (current: DatabaseSessionConnection | null) => DatabaseSessionConnection | null,
  ) => void;
  setEditedImportSchema: (schema: InferredDatabaseColumn[]) => void;
  clearEditedImportSchema: () => void;
}

export type DatabaseSessionStore = DatabaseSessionStoreState &
  DatabaseSessionStoreActions;
