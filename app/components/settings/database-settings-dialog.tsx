"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Database, Eye, PlugZap, Table2 } from "lucide-react";

import {
  buildAutomaticExistingTableMappings,
  buildExistingTablePreview,
} from "@/core/database/build-existing-table-preview";
import { inferDatabaseColumns } from "@/core/database/infer-column-types";
import { EditableSchemaEditor } from "@/components/database/editable-schema-editor";
import { ImportPreviewTable } from "@/components/data-import/import-preview-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDatabaseSettings } from "@/hooks/use-database-settings";
import {
  useDescribeDatabaseTableMutation,
  useSaveDatabaseImportMutation,
} from "@/tanStack/database";
import { useDatabaseSessionStore } from "@/store/database-session-store";
import type {
  DatabaseConnectionProfile,
  DatabaseSaveImportPayload,
  DatabaseSaveImportResponseData,
  DatabaseSaveMode,
  DatabaseSettingsOpenContext,
  DatabaseSessionConnection,
  DatabaseTableRef,
  DatabaseTableSchema,
  ExternalDatabaseProvider,
  InferredDatabaseColumn,
} from "@/types/database";
import type { ImportPreview } from "@/types/campaign";

function buildConnectionLabel(
  provider: ExternalDatabaseProvider,
  connectionString: string,
) {
  const providerLabel = provider === "supabase" ? "Supabase connection" : "Postgres connection";

  try {
    const host = new URL(connectionString).hostname.trim();
    return host ? `${providerLabel} · ${host}` : providerLabel;
  } catch {
    return providerLabel;
  }
}

function buildTableName(defaultLabel?: string) {
  const base = (defaultLabel ?? "uploaded_recipients")
    .replace(/\.[^/.]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `${base || "uploaded_recipients"}_${new Date().toISOString().slice(0, 10).replace(/-/g, "_")}`;
}

/**
 * Main database configuration dialog for the workspace.
 *
 * This component manages browser-session database connectivity and, for import
 * flows, the additional table selection/configuration steps required to save data
 * into an external database.
 *
 * @param props.open Whether the dialog is open.
 * @param props.onOpenChange Standard dialog open-state handler.
 * @param props.initialProfiles Server-fetched saved connection profiles for the user.
 * @param props.onProfilesUpdated Optional callback to refresh surrounding dashboard
 * or workspace data after a connection test or sync changes persisted state.
 * @returns Rendered database settings dialog.
 */
export function DatabaseSettingsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProfiles?: DatabaseConnectionProfile[];
  importPreview?: ImportPreview | null;
  origin?: DatabaseSettingsOpenContext["source"];
  onProfilesUpdated?: () => Promise<void> | void;
  onImportSaved?: (result: DatabaseSaveImportResponseData) => void;
}) {
  const {
    open,
    onOpenChange,
    initialProfiles,
    importPreview = null,
    origin = "general",
    onImportSaved,
    onProfilesUpdated,
  } = props;
  const isImportFlow = origin === "database-import" && Boolean(importPreview);
  const {
    activeConnection,
    clearActiveConnection,
    connectConnection,
    error: connectionError,
    invalidateConnectionTest,
    isConnectingConnection,
    isConnectionReadyToConnect,
    isLoadingTables,
    isTestingConnection,
    profiles,
    successKind,
    successMessage,
    tables,
    testConnection,
  } = useDatabaseSettings(initialProfiles, {
    loadTables: isImportFlow,
  });
  const describeTableMutation = useDescribeDatabaseTableMutation(activeConnection);
  const saveImportMutation = useSaveDatabaseImportMutation();
  const [provider, setProvider] = useState<ExternalDatabaseProvider>("supabase");
  const [label, setLabel] = useState("Primary Supabase");
  const [connectionString, setConnectionString] = useState("");
  const [editedSchemaColumns, setEditedSchemaColumns] = useState<InferredDatabaseColumn[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saveMode, setSaveMode] = useState<DatabaseSaveMode>("app_only");
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedSchema, setSelectedSchema] = useState<DatabaseTableSchema | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [newTableSchemaName, setNewTableSchemaName] = useState("public");
  const [newTableName, setNewTableName] = useState("");
  const [saveResult, setSaveResult] = useState<DatabaseSaveImportResponseData | null>(null);
  const wasOpenRef = useRef(open);
  const importInitKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (activeConnection) {
      setProvider(activeConnection.provider);
      setLabel(activeConnection.label);
      setConnectionString(activeConnection.connectionString);
    }
  }, [activeConnection, open]);

  useEffect(() => {
    if (!open) {
      importInitKeyRef.current = null;
      return;
    }

    if (!isImportFlow || !importPreview) {
      return;
    }

    const didOpen = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    const importInitKey = JSON.stringify([
      importPreview.fileName ?? "",
      importPreview.sourceFiles.map((file) => `${file.fileName}:${file.sheetName ?? ""}`).join("|"),
      importPreview.headers.join("|"),
      importPreview.rows.length,
    ]);

    if (!didOpen && importInitKeyRef.current === importInitKey) {
      return;
    }
    importInitKeyRef.current = importInitKey;

    const storedSchema = useDatabaseSessionStore.getState().editedImportSchema;
    const inferredSchema =
      storedSchema && storedSchema.length > 0
        ? storedSchema
        : inferDatabaseColumns({
            headers: importPreview.headers,
            rows: importPreview.rows.map((row) => row.raw),
          });

    setEditedSchemaColumns(inferredSchema);
    setSaveName(`${importPreview.fileName ?? "Uploaded recipients"} list`);
    setSaveMode(activeConnection ? "existing_table" : "app_only");
    setSelectedTable("");
    setSelectedSchema(null);
    setMappings({});
    setNewTableSchemaName("public");
    setNewTableName(buildTableName(importPreview.fileName));
    setSaveResult(null);
    describeTableMutation.reset();
    saveImportMutation.reset();
  }, [
    activeConnection,
    importPreview,
    isImportFlow,
    open,
  ]);

  const derivedLabel = useMemo(
    () => (isImportFlow ? label : buildConnectionLabel(provider, connectionString)),
    [connectionString, isImportFlow, label, provider],
  );
  const draftConnection: DatabaseSessionConnection = {
    provider,
    connectionString,
    label: derivedLabel,
    syncMode: activeConnection?.syncMode ?? "auto",
  };
  const isDraftConnectionReady = isConnectionReadyToConnect(draftConnection);
  const isCurrentDraftConnected =
    !!activeConnection &&
    activeConnection.provider === provider &&
    activeConnection.label.trim() === draftConnection.label.trim() &&
    activeConnection.connectionString.trim() === connectionString.trim();
  const activeProfile = useMemo(() => {
    if (!activeConnection) {
      return null;
    }

    return (
      profiles.find((profile) => profile.id === activeConnection.profileId) ??
      profiles.find(
        (profile) =>
          profile.provider === activeConnection.provider && profile.label === activeConnection.label,
      ) ??
      null
    );
  }, [activeConnection, profiles]);
  const selectedTableRef = useMemo<DatabaseTableRef | null>(
    () => tables.find((table) => table.displayName === selectedTable) ?? null,
    [selectedTable, tables],
  );
  const eligibleRows = useMemo(
    () => importPreview?.rows.filter((row) => row.isValid) ?? [],
    [importPreview],
  );
  const invalidRowsCount = importPreview ? importPreview.rows.length - eligibleRows.length : 0;

  const samplePreviewRows = useMemo(() => {
    if (!importPreview || !editedSchemaColumns) {
      return [];
    }

    return importPreview.rows
      .filter((row) => row.isValid)
      .slice(0, 5)
      .map((row) => ({
        rowIndex: row.rowIndex,
        values: editedSchemaColumns.map((col) =>
          String(row.raw[col.sourceHeader] ?? ""),
        ),
      }));
  }, [importPreview, editedSchemaColumns]);

  const schemaDestinationColumns = useMemo(() => {
    return editedSchemaColumns
      .filter((col) => col.suggestedName.trim())
      .map((col) => ({
        destinationColumn: col.suggestedName.trim(),
        sourceHeader: col.sourceHeader,
        type: col.suggestedType,
        nullable: col.nullable,
      }));
  }, [editedSchemaColumns]);

  const loadSchema = useCallback(
    async (table: DatabaseTableRef) => {
      if (!activeConnection || !importPreview) {
        return;
      }

      try {
        describeTableMutation.reset();
        const payload = await describeTableMutation.mutateAsync(table);
        setSelectedSchema(payload.schema);
        setMappings(buildAutomaticExistingTableMappings(importPreview, payload.schema));
      } catch {
        return;
      }
    },
    [activeConnection, describeTableMutation, importPreview],
  );

  useEffect(() => {
    if (
      !isImportFlow ||
      !open ||
      saveMode !== "existing_table" ||
      selectedTable ||
      !activeProfile?.lastSelectedTable ||
      isLoadingTables
    ) {
      return;
    }

    const preferredTable = tables.find(
      (table) => table.displayName === activeProfile.lastSelectedTable,
    );

    if (!preferredTable) {
      return;
    }

    setSelectedTable(preferredTable.displayName);
    void loadSchema(preferredTable);
  }, [
    activeProfile?.lastSelectedTable,
    isImportFlow,
    isLoadingTables,
    loadSchema,
    open,
    saveMode,
    selectedTable,
    tables,
  ]);

  const existingTablePreview = useMemo(() => {
    if (!selectedSchema || !importPreview) {
      return {
        destinationPreviewColumns: [],
        mappedSampleRows: [],
      };
    }

    return buildExistingTablePreview(importPreview, selectedSchema, mappings);
  }, [importPreview, mappings, selectedSchema]);

  const destinationPreviewColumns = useMemo(() => {
    if (saveMode === "existing_table") {
      return existingTablePreview.destinationPreviewColumns;
    }

    if (saveMode === "new_table") {
      return schemaDestinationColumns;
    }

    return [];
  }, [existingTablePreview.destinationPreviewColumns, saveMode, schemaDestinationColumns]);

  const mappedSampleRows =
    saveMode === "existing_table"
      ? existingTablePreview.mappedSampleRows
      : eligibleRows.slice(0, 5).map((row) => ({
          rowIndex: row.rowIndex,
          values: destinationPreviewColumns.map((column) =>
            String(row.raw[column.sourceHeader] ?? ""),
          ),
        }));

  const canSaveToExternalTable =
    Boolean(activeConnection) &&
    eligibleRows.length > 0 &&
    destinationPreviewColumns.length > 0 &&
    (saveMode !== "existing_table" || Boolean(selectedTableRef));
  const isSaving = saveImportMutation.isPending;
  const error = useMemo(() => {
    const activeError = saveImportMutation.error ?? describeTableMutation.error;

    if (activeError instanceof Error) {
      return activeError.message;
    }

    return connectionError;
  }, [connectionError, describeTableMutation.error, saveImportMutation.error]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && isImportFlow && editedSchemaColumns.length > 0) {
        useDatabaseSessionStore.getState().setEditedImportSchema(editedSchemaColumns);
      }
      onOpenChange(isOpen);
    }}>
      {isImportFlow ? (
        <DialogContent className="flex max-h-[92vh] w-[min(96vw,1180px)] flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl tracking-tight">Connect & Save Import</DialogTitle>
            <DialogDescription className="max-w-3xl">
              Use the same database settings flow to test a connection, connect this browser
              session, choose a destination, and save the current upload.
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-2xl border bg-muted/35 p-4">
                <p className="text-sm font-medium">Connection state</p>
                {activeConnection ? (
                  <div className="mt-3 space-y-2">
                    <Badge variant="secondary">{activeConnection.provider}</Badge>
                    <p className="text-sm">{activeConnection.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {activeProfile?.displayHost ?? "Session-only connection"}
                    </p>
                    {activeProfile?.lastSelectedTable ? (
                      <p className="text-xs text-muted-foreground">
                        Last destination: {activeProfile.lastSelectedTable}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No active database session in this browser yet.
                  </p>
                )}
              </div>

              <div className="grid gap-2 rounded-2xl border bg-muted/35 p-4">
                <Label htmlFor="save-import-name">Saved list name</Label>
                <Input
                  id="save-import-name"
                  value={saveName}
                  onChange={(event) => setSaveName(event.target.value)}
                />
              </div>

              <div className="grid gap-2 rounded-2xl border bg-muted/35 p-4">
                <Label htmlFor="save-import-mode">Destination</Label>
                <Select
                  id="save-import-mode"
                  value={saveMode}
                  onChange={(event) => {
                    setSaveMode(event.target.value as DatabaseSaveMode);
                    setSaveResult(null);
                  }}
                >
                  <option value="app_only">Save only to EmailAI</option>
                  <option value="existing_table" disabled={!activeConnection}>
                    Insert into existing table
                  </option>
                  <option value="new_table" disabled={!activeConnection}>
                    Create and insert into new table
                  </option>
                </Select>
              </div>

              <div className="rounded-2xl border bg-muted/35 p-4 text-sm text-muted-foreground">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{importPreview!.rows.length} source rows</Badge>
                  <Badge variant="secondary">{eligibleRows.length} valid rows</Badge>
                  <Badge variant={invalidRowsCount > 0 ? "warning" : "outline"}>
                    {invalidRowsCount} skipped invalid
                  </Badge>
                </div>
                <p className="mt-3">
                  External writes insert only rows EmailAI marked valid from the current upload.
                </p>
                {saveMode !== "app_only" ? (
                  <>
                    <p className="mt-2">{eligibleRows.length} row(s) will be inserted.</p>
                    <p className="mt-1">
                      {destinationPreviewColumns.length} destination column(s) currently mapped.
                    </p>
                  </>
                ) : null}
              </div>

              {saveResult ? (
                <Alert>
                  <AlertTitle>Import saved</AlertTitle>
                  <AlertDescription className="space-y-1">
                    <p>
                      {saveResult.destinationTableName
                        ? `Inserted ${saveResult.insertedCount} row(s) into ${saveResult.destinationTableName}.`
                        : "Saved list into EmailAI."}
                    </p>
                    <p>
                      {saveResult.eligibleRowCount} eligible from {saveResult.sourceRowCount} source
                      row(s), {saveResult.skippedRowCount} skipped.
                    </p>
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="rounded-2xl border bg-muted/35 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">Saved connection profiles</p>
                  <Badge variant="outline">{profiles.length}</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {profiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No saved profile metadata yet. Paste a DSN to reconnect.
                    </p>
                  ) : (
                    profiles.map((profile) => (
                      <div key={profile.id} className="rounded-xl border bg-background p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{profile.label}</p>
                          <Badge variant="outline">{profile.provider}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {profile.displayHost} · {profile.displayDatabaseName}
                        </p>
                        {profile.lastSelectedTable ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Last table: {profile.lastSelectedTable}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Credentials stay in session storage only. Saved profiles help identify the target
                  database, but they do not restore the raw connection string.
                </p>
              </div>
            </div>

            <ScrollArea className="h-[70vh] rounded-2xl border bg-background p-4">
              <div className="space-y-5">
                <section className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">Uploaded spreadsheet preview</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Review the current upload while you connect a destination database.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{importPreview!.validCount} valid</Badge>
                      <Badge variant={importPreview!.invalidCount > 0 ? "warning" : "outline"}>
                        {importPreview!.invalidCount} invalid
                      </Badge>
                      <Badge variant="outline">
                        {importPreview!.sourceFiles.length} file
                        {importPreview!.sourceFiles.length === 1 ? "" : "s"}
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-background">
                    <ImportPreviewTable preview={importPreview!} maxRows={8} />
                  </div>
                </section>

                <section className="space-y-4 rounded-2xl border bg-muted/25 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Database connection</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Test first, then connect this browser session before saving externally.
                      </p>
                    </div>
                    {activeConnection ? (
                      <Badge variant="secondary">{activeConnection.provider}</Badge>
                    ) : null}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-end">
                    <div className="grid gap-2">
                      <Label htmlFor="db-provider-import">Provider</Label>
                      <Select
                        id="db-provider-import"
                        value={provider}
                        onChange={(event) => {
                          invalidateConnectionTest();
                          setProvider(event.target.value as ExternalDatabaseProvider);
                        }}
                      >
                        <option value="supabase">Supabase</option>
                        <option value="postgres">Postgres</option>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="db-label-import">Connection label</Label>
                      <Input
                        id="db-label-import"
                        value={label}
                        onChange={(event) => {
                          invalidateConnectionTest();
                          setLabel(event.target.value);
                        }}
                        placeholder="Production database"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="db-connection-string-import">Connection string</Label>
                    <Input
                      id="db-connection-string-import"
                      value={connectionString}
                      onChange={(event) => {
                        invalidateConnectionTest();
                        setConnectionString(event.target.value);
                      }}
                      placeholder="postgresql://user:password@host:5432/database"
                    />
                    <p className="text-xs text-muted-foreground">
                      Supabase pooler URLs are supported. Paste the Session pooler DSN exactly as
                      shown in Supabase Connect.
                    </p>
                  </div>

                  {error ? (
                    <Alert className="border-destructive/40 bg-destructive/5 text-destructive">
                      <AlertTitle>Connection failed</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : null}

                  {successMessage ? (
                    <Alert>
                      <AlertTitle>
                        {successKind === "test" ? "Connection test passed" : "Connection ready"}
                      </AlertTitle>
                      <AlertDescription>{successMessage}</AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        await testConnection(draftConnection);
                      }}
                      disabled={
                        isTestingConnection ||
                        isConnectingConnection ||
                        !connectionString.trim() ||
                        !label.trim()
                      }
                    >
                      <PlugZap className="h-4 w-4" />
                      {isTestingConnection ? "Testing..." : "Test connection"}
                    </Button>
                    <Button
                      type="button"
                      onClick={async () => {
                        await connectConnection(draftConnection);
                        setSaveMode((current) => (current === "app_only" ? "existing_table" : current));
                        await onProfilesUpdated?.();
                      }}
                      disabled={
                        isTestingConnection ||
                        isConnectingConnection ||
                        !connectionString.trim() ||
                        !label.trim() ||
                        !isDraftConnectionReady ||
                        isCurrentDraftConnected
                      }
                    >
                      <PlugZap className="h-4 w-4" />
                      {isCurrentDraftConnected
                        ? "Connected"
                        : isConnectingConnection
                          ? "Connecting..."
                          : "Connect"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => clearActiveConnection()}
                      disabled={!activeConnection}
                    >
                      Disconnect
                    </Button>
                  </div>
                </section>

                {saveMode === "existing_table" ? (
                  <>
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <p className="font-medium">Destination table</p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="existing-table">Choose table</Label>
                        <Select
                          id="existing-table"
                          value={selectedTable}
                          onChange={(event) => {
                            setSelectedTable(event.target.value);
                            setSaveResult(null);
                            const nextTable = tables.find(
                              (table) => table.displayName === event.target.value,
                            );

                            if (nextTable) {
                              void loadSchema(nextTable);
                            }
                          }}
                        >
                          <option value="">
                            {isLoadingTables ? "Loading tables..." : "Select a table"}
                          </option>
                          {tables.map((table) => (
                            <option key={table.displayName} value={table.displayName}>
                              {table.displayName}
                            </option>
                          ))}
                        </Select>
                      </div>
                      {selectedTableRef ? (
                        <div className="rounded-xl border bg-muted/25 p-3 text-sm text-muted-foreground">
                          Writing valid uploaded rows into{" "}
                          <span className="font-medium text-foreground">
                            {selectedTableRef.displayName}
                          </span>
                          .
                        </div>
                      ) : null}
                    </section>

                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Table2 className="h-4 w-4" />
                        <p className="font-medium">Table schema</p>
                      </div>
                      {selectedSchema ? (
                        <div className="overflow-hidden rounded-xl border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Column</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Constraint</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedSchema.columns.map((column) => (
                                <TableRow key={column.name}>
                                  <TableCell className="font-medium">{column.name}</TableCell>
                                  <TableCell>{column.type}</TableCell>
                                  <TableCell>{column.nullable ? "Nullable" : "Required"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                          Select a table to inspect its columns before mapping.
                        </div>
                      )}
                    </section>

                    {selectedSchema ? (
                      <section className="space-y-3">
                        <p className="font-medium">Column mapping</p>
                        {importPreview!.headers.map((header) => (
                          <div
                            key={header}
                            className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_1fr]"
                          >
                            <div>
                              <p className="text-sm font-medium">{header}</p>
                              <p className="text-xs text-muted-foreground">Uploaded column</p>
                            </div>
                            <Select
                              value={mappings[header] ?? ""}
                              onChange={(event) =>
                                setMappings((current) => ({
                                  ...current,
                                  [header]: event.target.value,
                                }))
                              }
                            >
                              <option value="">Skip this column</option>
                              {selectedSchema.columns.map((column) => (
                                <option key={column.name} value={column.name}>
                                  {column.name} ({column.type})
                                </option>
                              ))}
                            </Select>
                          </div>
                        ))}
                      </section>
                    ) : null}
                  </>
                ) : null}

                {saveMode === "new_table" ? (
                  <>
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <p className="font-medium">New table destination</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="new-table-schema">Schema</Label>
                          <Input
                            id="new-table-schema"
                            value={newTableSchemaName}
                            onChange={(event) => setNewTableSchemaName(event.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="new-table-name">Table name</Label>
                          <Input
                            id="new-table-name"
                            value={newTableName}
                            onChange={(event) => setNewTableName(event.target.value)}
                          />
                        </div>
                      </div>
                      <div className="rounded-xl border bg-muted/25 p-3 text-sm text-muted-foreground">
                        New table target:{" "}
                        <span className="font-medium text-foreground">
                          {newTableSchemaName}.{newTableName || "untitled_table"}
                        </span>
                      </div>
                    </section>

                    <section className="space-y-3">
                      <p className="font-medium">Editable schema</p>
                      <EditableSchemaEditor
                        columns={editedSchemaColumns}
                        onChange={setEditedSchemaColumns}
                        previewRows={samplePreviewRows}
                        destinationColumns={schemaDestinationColumns}
                      />
                    </section>
                  </>
                ) : null}

                {saveMode !== "app_only" ? (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <p className="font-medium">Mapped sample preview</p>
                    </div>
                    {destinationPreviewColumns.length > 0 ? (
                      <div className="overflow-hidden rounded-xl border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Row</TableHead>
                              {destinationPreviewColumns.map((column) => (
                                <TableHead key={`${column.destinationColumn}-${column.sourceHeader}`}>
                                  <div className="space-y-1">
                                    <p>{column.destinationColumn}</p>
                                    <p className="text-[11px] font-normal text-muted-foreground">
                                      {column.sourceHeader}
                                    </p>
                                  </div>
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {mappedSampleRows.map((row) => (
                              <TableRow key={row.rowIndex}>
                                <TableCell className="font-medium">{row.rowIndex}</TableCell>
                                {row.values.map((value, index) => (
                                  <TableCell key={`${row.rowIndex}-${index}`}>{value}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                        Map at least one destination column to preview what will be inserted.
                      </div>
                    )}
                  </section>
                ) : (
                  <Alert>
                    <AlertTitle>Save without external table</AlertTitle>
                    <AlertDescription>
                      This stores the uploaded rows in EmailAI so you can reopen the list later,
                      even without writing to Postgres yet.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {saveResult ? "Done" : "Cancel"}
            </Button>
            <Button
              onClick={async () => {
                setSaveResult(null);

                try {
                  saveImportMutation.reset();
                  const payload: DatabaseSaveImportPayload = {
                    connection: activeConnection ?? undefined,
                    saveName,
                    preview: importPreview!,
                    mode: saveMode,
                    existingTable: selectedTableRef ?? undefined,
                    mappings:
                      saveMode === "existing_table"
                        ? importPreview!.headers.map((header) => ({
                            sourceColumn: header,
                            destinationColumn: mappings[header] || undefined,
                          }))
                        : importPreview!.headers.map((header, index) => ({
                            sourceColumn: header,
                            destinationColumn:
                              saveMode === "new_table"
                                ? editedSchemaColumns[index]?.suggestedName.trim() || undefined
                                : undefined,
                          })),
                    newTable:
                      saveMode === "new_table"
                        ? {
                            schemaName: newTableSchemaName,
                            tableName: newTableName,
                            columns: editedSchemaColumns,
                          }
                        : undefined,
                  };
                  const response = await saveImportMutation.mutateAsync(payload);

                  useDatabaseSessionStore.getState().setEditedImportSchema(editedSchemaColumns);
                  setSaveResult(response);
                  onImportSaved?.(response);
                  await onProfilesUpdated?.();
                } catch {
                  return;
                }
              }}
              disabled={
                isSaving ||
                Boolean(saveResult) ||
                !saveName.trim() ||
                (saveMode === "existing_table" && !canSaveToExternalTable) ||
                (saveMode === "new_table" &&
                  (!activeConnection ||
                    !newTableName.trim() ||
                    editedSchemaColumns.length === 0 ||
                    !canSaveToExternalTable))
              }
            >
              {saveResult ? "Saved" : isSaving ? "Saving..." : "Save import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : (
        <DialogContent className="flex max-h-[min(92vh,960px)] w-[min(96vw,1080px)] flex-col gap-0 overflow-hidden lg:max-h-[90vh]">
          <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="overflow-y-auto border-b p-6 lg:border-b-0 lg:border-r bg-[linear-gradient(180deg,rgba(31,41,55,0.98),rgba(17,24,39,0.98))] text-white">
                <DialogHeader className="space-y-3">
                  <Badge className="w-fit bg-white/12 text-white" variant="outline">
                    Session-only credentials
                  </Badge>
                  <DialogTitle className="text-2xl tracking-tight">Database connection</DialogTitle>
                  <DialogDescription className="max-w-sm text-[15px] leading-7 text-white/78">
                    Test a Supabase or Postgres connection, connect it to this browser session,
                    and disconnect it when you are done.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-8 space-y-4">
                  <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/52">Active connection</p>
                    {activeConnection ? (
                      <div className="mt-3 space-y-2 text-sm text-white/80">
                        <p className="font-medium text-white">{activeConnection.label}</p>
                        <p>{activeConnection.provider}</p>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-white/74">No active database session in this browser.</p>
                    )}
                  </div>

                  <Alert className="border-white/10 bg-white/8 text-white">
                    <AlertTitle className="text-white">Raw credentials stay in sessionStorage</AlertTitle>
                    <AlertDescription className="text-white/72">
                      This browser session keeps the connection string temporarily. The app saves
                      only non-secret profile metadata for your account.
                    </AlertDescription>
                  </Alert>

                  <div className="rounded-2xl border border-white/12 bg-white/8 p-4 text-sm text-white/74">
                    <p className="font-medium text-white">Local Supabase example</p>
                    <p className="mt-2 break-all">
                      postgresql://postgres:postgres@127.0.0.1:54322/postgres
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-300/20 bg-amber-50/10 p-4 text-sm text-white/74">
                    <p className="font-medium text-white">Supabase pooler supported</p>
                    <p className="mt-2">
                      Supabase <span className="font-medium text-white">Session pooler</span> URLs are
                      supported and preferred for cloud connections. The direct{" "}
                      <code>db.&lt;project-ref&gt;.supabase.co</code> host uses IPv6 by default and
                      often fails from local dev environments.
                    </p>
                    <p className="mt-2 break-all text-white/82">
                      postgresql://postgres.&lt;project-ref&gt;:&lt;password&gt;@aws-0-&lt;region&gt;.pooler.supabase.com:5432/postgres
                    </p>
                  </div>
                </div>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="grid gap-4">
                <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-end">
                  <div className="grid gap-2">
                    <Label htmlFor="db-provider">Provider</Label>
                    <Select
                      id="db-provider"
                      value={provider}
                      onChange={(event) => {
                        invalidateConnectionTest();
                        setProvider(event.target.value as ExternalDatabaseProvider);
                      }}
                    >
                      <option value="supabase">Supabase</option>
                      <option value="postgres">Postgres</option>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="db-connection-string">Connection string</Label>
                    <Input
                      id="db-connection-string"
                      value={connectionString}
                      onChange={(event) => {
                        invalidateConnectionTest();
                        setConnectionString(event.target.value);
                      }}
                      placeholder="postgresql://user:password@host:5432/database"
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Supabase pooler URLs are supported. Paste the Session pooler DSN exactly as shown
                  in Supabase Connect.
                </p>

                {error ? (
                  <Alert className="border-destructive/40 bg-destructive/5 text-destructive">
                    <AlertTitle>Connection failed</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                {successMessage ? (
                  <Alert>
                    <AlertTitle>
                      {successKind === "test" ? "Connection test passed" : "Connection ready"}
                    </AlertTitle>
                    <AlertDescription>{successMessage}</AlertDescription>
                  </Alert>
                ) : null}

                {activeConnection ? (
                  <div className="rounded-2xl border bg-muted/35 p-4">
                    <p className="font-medium">Connected in this browser session</p>
                    <p className="mt-2 text-sm">{activeConnection.label}</p>
                    <Badge variant="secondary" className="mt-2">
                      {activeConnection.provider}
                    </Badge>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      await testConnection(draftConnection);
                    }}
                    disabled={
                      isTestingConnection || isConnectingConnection || !connectionString.trim()
                    }
                  >
                    <PlugZap className="h-4 w-4" />
                    {isTestingConnection ? "Testing connection..." : "Test connection"}
                  </Button>
                  <Button
                    type="button"
                    onClick={async () => {
                      await connectConnection(draftConnection);
                      await onProfilesUpdated?.();
                    }}
                    disabled={
                      isTestingConnection ||
                      isConnectingConnection ||
                      !connectionString.trim() ||
                      !isDraftConnectionReady ||
                      isCurrentDraftConnected
                    }
                  >
                    <PlugZap className="h-4 w-4" />
                    {isCurrentDraftConnected
                      ? "Connected"
                      : isConnectingConnection
                        ? "Connecting..."
                        : "Connect"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => clearActiveConnection()}
                    disabled={!activeConnection}
                  >
                    Disconnect browser session
                  </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border bg-muted/35 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">Saved connection profiles</p>
                      <Badge variant="outline">{profiles.length}</Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      {profiles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No connection profiles saved for this account yet.
                        </p>
                      ) : (
                        profiles.map((profile) => (
                          <div key={profile.id} className="rounded-xl border bg-background p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium">{profile.label}</p>
                              <Badge variant="outline">{profile.provider}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {profile.displayHost} · {profile.displayDatabaseName}
                            </p>
                            {profile.lastSelectedTable ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Last table: {profile.lastSelectedTable}
                              </p>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-muted/35 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">Available tables</p>
                      <Badge variant="outline">{tables.length}</Badge>
                    </div>
                    <ScrollArea className="mt-3 h-[280px] rounded-xl border bg-background p-3">
                      <div className="space-y-2">
                        {isLoadingTables ? (
                          <p className="text-sm text-muted-foreground">Loading tables...</p>
                        ) : tables.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Connect first to inspect tables from the destination database.
                          </p>
                        ) : (
                          tables.map((table) => (
                            <div key={table.displayName} className="rounded-xl border px-3 py-2">
                              <p className="font-medium">{table.displayName}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t bg-background px-6 py-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
      )}
    </Dialog>
  );
}
