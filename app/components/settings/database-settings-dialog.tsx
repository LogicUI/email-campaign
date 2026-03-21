"use client";
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Database, PlugZap, RefreshCw } from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { useCampaignSync } from "@/hooks/use-campaign-sync";
import { useDatabaseSettings } from "@/hooks/use-database-settings";
import { useDescribeDatabaseTableMutation } from "@/tanStack/database";
import { useDatabaseSessionStore } from "@/store/database-session-store";
import type {
  DatabaseConnectionProfile,
  DatabaseSettingsOpenContext,
  DatabaseSessionConnection,
  DatabaseTableSchema,
  ExternalDatabaseProvider,
  InferredDatabaseColumn,
} from "@/types/database";
import type { ImportPreview } from "@/types/campaign";

/**
 * Main database configuration dialog for the workspace.
 *
 * This component brings together connection testing, saved profile visibility,
 * table discovery, and campaign-history sync controls in one place. It exists so
 * database behavior stays discoverable from the same action bar as `Reupload new`
 * without introducing another global header or route.
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
}) {
  const {
    open,
    onOpenChange,
    initialProfiles,
    importPreview = null,
    origin = "general",
    onProfilesUpdated,
  } = props;
  const {
    activeConnection,
    clearActiveConnection,
    connectConnection,
    error,
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
    updateSyncMode,
  } = useDatabaseSettings(initialProfiles);
  const describePreviewTableMutation = useDescribeDatabaseTableMutation(activeConnection);
  const syncState = useCampaignSync({
    onSavedDataChange: onProfilesUpdated,
  });

  const isImportFlow = origin === "database-import" && Boolean(importPreview);

  const {
    canSyncCurrentCampaign,
    error: syncError,
    isSyncing,
    lastSyncedAt,
    needsSync,
    syncCurrentCampaign,
  } = isImportFlow
    ? {
        canSyncCurrentCampaign: false,
        error: undefined,
        isSyncing: false,
        lastSyncedAt: undefined,
        needsSync: false,
        syncCurrentCampaign: () => Promise.resolve(),
      }
    : syncState;
  const [provider, setProvider] = useState<ExternalDatabaseProvider>("supabase");
  const [label, setLabel] = useState("Primary Supabase");
  const [connectionString, setConnectionString] = useState("");
  const [destinationPreviewSchema, setDestinationPreviewSchema] =
    useState<DatabaseTableSchema | null>(null);
  const loadedDestinationPreviewKeyRef = useRef("");
  const [editedSchemaColumns, setEditedSchemaColumns] = useState<InferredDatabaseColumn[]>([]);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [importMode, setImportMode] = useState<{
    type: "existing" | "new" | "append" | "app_only";
    tableId?: string;
  }>({ type: "app_only" });
  const [checkDuplicates, setCheckDuplicates] = useState(true);
  const [newTableSchemaName, setNewTableSchemaName] = useState("public");
  const [newTableName, setNewTableName] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    if (activeConnection) {
      setProvider(activeConnection.provider);
      setLabel(activeConnection.label);
      setConnectionString(activeConnection.connectionString);
    }

    // Initialize schema when opening from import flow
    if (origin === "database-import" && importPreview) {
      const inferred = inferDatabaseColumns({
        headers: importPreview.headers,
        rows: importPreview.rows.map((r) => r.raw),
      });
      setEditedSchemaColumns(inferred);
      useDatabaseSessionStore.getState().setEditedImportSchema(inferred);

      // Initialize table name
      if (!newTableName) {
        const base = (importPreview.fileName ?? "uploaded_recipients")
          .replace(/\.[^/.]+$/, "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
        setNewTableName(`${base || "uploaded_recipients"}_${new Date().toISOString().slice(0, 10).replace(/-/g, "_")}`);
      }
    }
  }, [activeConnection, open, origin, importPreview, newTableName]);

  const draftConnection: DatabaseSessionConnection = {
    provider,
    connectionString,
    label,
    syncMode: activeConnection?.syncMode ?? "auto",
  };
  const isDraftConnectionReady = isConnectionReadyToConnect(draftConnection);
  const isCurrentDraftConnected =
    !!activeConnection &&
    activeConnection.provider === provider &&
    activeConnection.label.trim() === label.trim() &&
    activeConnection.connectionString.trim() === connectionString.trim();
  const shouldShowImportPreview = open && origin === "database-import" && Boolean(importPreview);
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
  const previewDestinationTable = useMemo(() => {
    if (!shouldShowImportPreview || !activeConnection || isLoadingTables || tables.length === 0) {
      return null;
    }

    if (activeProfile?.lastSelectedTable) {
      const preferredTable = tables.find(
        (table) => table.displayName === activeProfile.lastSelectedTable,
      );

      if (preferredTable) {
        return preferredTable;
      }
    }

    return tables[0] ?? null;
  }, [
    activeConnection,
    activeProfile?.lastSelectedTable,
    isLoadingTables,
    shouldShowImportPreview,
    tables,
  ]);
  const previewDestinationKey =
    activeConnection && previewDestinationTable
      ? `${activeConnection.profileId ?? activeConnection.label}:${previewDestinationTable.displayName}`
      : "";
  const isFallbackPreviewTable =
    Boolean(previewDestinationTable) &&
    previewDestinationTable?.displayName !== activeProfile?.lastSelectedTable;
  const destinationPreview = useMemo(() => {
    if (!importPreview || !destinationPreviewSchema) {
      return null;
    }

    return buildExistingTablePreview(
      importPreview,
      destinationPreviewSchema,
      buildAutomaticExistingTableMappings(importPreview, destinationPreviewSchema),
    );
  }, [destinationPreviewSchema, importPreview]);

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

  const resetPreviewTableMutation = describePreviewTableMutation.reset;
  const runPreviewTableDescribe = describePreviewTableMutation.mutateAsync;

  useEffect(() => {
    if (!shouldShowImportPreview) {
      setDestinationPreviewSchema(null);
      loadedDestinationPreviewKeyRef.current = "";
      resetPreviewTableMutation();
      return;
    }

    if (!activeConnection || !previewDestinationTable || !previewDestinationKey) {
      setDestinationPreviewSchema(null);
      loadedDestinationPreviewKeyRef.current = "";
      return;
    }

    if (loadedDestinationPreviewKeyRef.current === previewDestinationKey) {
      return;
    }

    let cancelled = false;
    loadedDestinationPreviewKeyRef.current = previewDestinationKey;
    setDestinationPreviewSchema(null);
    resetPreviewTableMutation();

    void runPreviewTableDescribe(previewDestinationTable)
      .then((payload) => {
        if (!cancelled) {
          setDestinationPreviewSchema(payload.schema);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDestinationPreviewSchema(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeConnection,
    previewDestinationKey,
    previewDestinationTable,
    resetPreviewTableMutation,
    runPreviewTableDescribe,
    shouldShowImportPreview,
  ]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && isImportFlow && editedSchemaColumns.length > 0) {
        useDatabaseSessionStore.getState().setEditedImportSchema(editedSchemaColumns);
      }
      onOpenChange(isOpen);
    }}>
      {isImportFlow ? (
        <DialogContent className="flex max-h-[92vh] w-[min(96vw,900px)] flex-col gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-2xl tracking-tight">Connect & Configure Import</DialogTitle>
            <DialogDescription className="max-w-2xl">
              Configure how your Excel data will be imported into the database. Choose a destination
              table or create a new one, then connect to your database.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 pb-6">
              {/* Section 1: Excel Preview */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Excel Upload Preview</h3>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{importPreview?.validCount || 0} valid</Badge>
                    <Badge variant={importPreview && importPreview.invalidCount > 0 ? "warning" : "outline"}>
                      {importPreview?.invalidCount || 0} invalid
                    </Badge>
                    <Badge variant="outline">{importPreview?.rows.length || 0} rows</Badge>
                  </div>
                </div>
                {importPreview && (
                  <div className="rounded-xl border bg-background p-2">
                    <ImportPreviewTable preview={importPreview} maxRows={5} />
                  </div>
                )}
              </section>

              {/* Section 2: Table Destination */}
              <section className="space-y-3">
                <h3 className="font-medium">Table Destination</h3>
                <RadioGroup
                  value={importMode.type}
                  onValueChange={(value) =>
                    setImportMode({ type: value as typeof importMode.type, tableId: importMode.tableId })
                  }
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="existing" id="mode-existing" />
                    <Label htmlFor="mode-existing" className="cursor-pointer">
                      Choose existing table
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="new" id="mode-new" />
                    <Label htmlFor="mode-new" className="cursor-pointer">
                      Create new table
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="append" id="mode-append" />
                    <Label htmlFor="mode-append" className="cursor-pointer">
                      Append to existing table (check duplicates)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="app_only" id="mode-app-only" />
                    <Label htmlFor="mode-app-only" className="cursor-pointer">
                      Save to EmailAI only
                    </Label>
                  </div>
                </RadioGroup>
              </section>

              {/* Section 3: Dynamic Configuration */}
              <section className="space-y-3">
                {importMode.type === "existing" && (
                  <div className="space-y-3">
                    <Label htmlFor="existing-table">Select table</Label>
                    <Select
                      id="existing-table"
                      value={importMode.tableId ?? ""}
                      onChange={(e) => setImportMode({ ...importMode, tableId: e.target.value })}
                    >
                      <option value="">{isLoadingTables ? "Loading tables..." : "Select a table"}</option>
                      {tables.map((table) => (
                        <option key={table.name} value={table.name}>
                          {table.displayName}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                {importMode.type === "new" && (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="new-table-schema">Schema</Label>
                        <Input
                          id="new-table-schema"
                          value={newTableSchemaName}
                          onChange={(e) => setNewTableSchemaName(e.target.value)}
                          placeholder="public"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="new-table-name">Table name</Label>
                        <Input
                          id="new-table-name"
                          value={newTableName}
                          onChange={(e) => setNewTableName(e.target.value)}
                          placeholder="my_table"
                        />
                      </div>
                    </div>

                    <EditableSchemaEditor
                      columns={editedSchemaColumns}
                      onChange={setEditedSchemaColumns}
                      previewRows={samplePreviewRows}
                      destinationColumns={schemaDestinationColumns}
                    />
                  </div>
                )}

                {importMode.type === "append" && (
                  <div className="space-y-3">
                    <Label htmlFor="append-table">Select table to append</Label>
                    <Select
                      id="append-table"
                      value={importMode.tableId ?? ""}
                      onChange={(e) => setImportMode({ ...importMode, tableId: e.target.value })}
                    >
                      <option value="">{isLoadingTables ? "Loading tables..." : "Select a table"}</option>
                      {tables.map((table) => (
                        <option key={table.name} value={table.name}>
                          {table.displayName}
                        </option>
                      ))}
                    </Select>

                    <div className="flex items-center gap-2 rounded-xl border bg-muted/35 p-3">
                      <Checkbox
                        id="check-duplicates"
                        checked={checkDuplicates}
                        onCheckedChange={(checked) => setCheckDuplicates(checked === "indeterminate" ? false : checked)}
                      />
                      <Label htmlFor="check-duplicates" className="cursor-pointer">
                        Check for duplicates (ignore existing rows)
                      </Label>
                    </div>
                  </div>
                )}

                {importMode.type === "app_only" && (
                  <Alert>
                    <AlertTitle>Save to EmailAI database</AlertTitle>
                    <AlertDescription>
                      Your Excel data will be saved to EmailAI&apos;s internal database. You can access it
                      later from the dashboard.
                    </AlertDescription>
                  </Alert>
                )}
              </section>

              {/* Section 4: Connection Form */}
              <section className="space-y-4 rounded-xl border bg-muted/25 p-4">
                <h3 className="font-medium">Database Connection</h3>

                <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-end">
                  <div className="grid gap-2">
                    <Label htmlFor="db-provider-import">Provider</Label>
                    <Select
                      id="db-provider-import"
                      value={provider}
                      onChange={(e) => {
                        invalidateConnectionTest();
                        setProvider(e.target.value as ExternalDatabaseProvider);
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
                      onChange={(e) => {
                        invalidateConnectionTest();
                        setLabel(e.target.value);
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
                    onChange={(e) => {
                      invalidateConnectionTest();
                      setConnectionString(e.target.value);
                    }}
                    placeholder="postgresql://user:password@host:5432/database"
                  />
                  <p className="text-xs text-muted-foreground">
                    Supabase pooler URLs are supported. Paste the Session pooler DSN exactly as shown
                    in Supabase Connect.
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

                {activeConnection && (
                  <div className="rounded-lg border bg-background p-3">
                    <p className="text-sm font-medium">Connected</p>
                    <p className="mt-1 text-sm">{activeConnection.label}</p>
                    <Badge variant="secondary" className="mt-1">{activeConnection.provider}</Badge>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      await testConnection(draftConnection);
                    }}
                    disabled={isTestingConnection || isConnectingConnection || !connectionString.trim() || !label.trim()}
                  >
                    <PlugZap className="h-4 w-4" />
                    {isTestingConnection ? "Testing..." : "Test connection"}
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
                      !label.trim() ||
                      !isDraftConnectionReady ||
                      isCurrentDraftConnected
                    }
                  >
                    <PlugZap className="h-4 w-4" />
                    {isCurrentDraftConnected ? "Connected" : isConnectingConnection ? "Connecting..." : "Connect"}
                  </Button>
                  {activeConnection && (
                    <Button type="button" variant="outline" onClick={() => clearActiveConnection()}>
                      Disconnect
                    </Button>
                  )}
                </div>
              </section>
            </div>
          </ScrollArea>

          <DialogFooter className="border-t bg-background px-6 py-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : (
        <DialogContent className="flex max-h-[min(92vh,960px)] w-[min(96vw,1080px)] flex-col gap-0 overflow-hidden p-0 lg:max-h-[90vh]">
          <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[0.82fr_1.18fr]">
            <div className="overflow-y-auto border-b p-6 lg:border-b-0 lg:border-r bg-[linear-gradient(180deg,rgba(31,41,55,0.98),rgba(17,24,39,0.98))] text-white">
                <DialogHeader className="space-y-3">
                  <Badge className="w-fit bg-white/12 text-white" variant="outline">
                    Session-only credentials
                  </Badge>
                  <DialogTitle className="text-2xl tracking-tight">Database connection</DialogTitle>
                  <DialogDescription className="max-w-sm text-[15px] leading-7 text-white/78">
                    Connect Supabase or any Postgres-compatible database, inspect tables, and
                    save imported Excel rows for reuse later.
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

                  <div className="rounded-2xl border border-white/12 bg-white/8 p-4 text-sm text-white/74">
                    <p className="font-medium text-white">Campaign sync</p>
                    <p className="mt-2">
                      {lastSyncedAt
                        ? `Last synced at ${new Date(lastSyncedAt).toLocaleString()}`
                        : "No campaign sync has completed for the active connection yet."}
                    </p>
                    <p className="mt-2">
                      {needsSync
                        ? "The current campaign has unsynced changes."
                        : "No pending campaign sync in this browser right now."}
                    </p>
                  </div>
                </div>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="grid gap-4">
                {isImportFlow && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setShowConnectionForm((current) => !current)}
                  >
                    <span>Connection settings</span>
                    {showConnectionForm ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                )}

                {(showConnectionForm || !isImportFlow) && (
                  <>
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
                        <Label htmlFor="db-label">Connection label</Label>
                        <Input
                          id="db-label"
                          value={label}
                          onChange={(event) => {
                            invalidateConnectionTest();
                            setLabel(event.target.value);
                          }}
                          placeholder="Production leads database"
                        />
                      </div>
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
                      <p className="text-xs text-muted-foreground">
                        Supabase pooler URLs are supported. Paste the Session pooler DSN exactly
                        as shown in Supabase Connect.
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

                    {syncError ? (
                      <Alert className="border-destructive/40 bg-destructive/5 text-destructive">
                        <AlertTitle>Sync failed</AlertTitle>
                        <AlertDescription>{syncError}</AlertDescription>
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
                        Disconnect browser session
                      </Button>
                    </div>

                    <div className="grid gap-3 rounded-2xl border bg-muted/35 p-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-end">
                      <div className="grid gap-2">
                        <Label htmlFor="db-sync-mode">Send history sync</Label>
                        <Select
                          id="db-sync-mode"
                          value={activeConnection?.syncMode ?? "auto"}
                          disabled={!activeConnection}
                          onChange={async (event) => {
                            if (!activeConnection) {
                              return;
                            }

                            await updateSyncMode(
                              activeConnection.profileId ?? "",
                              event.target.value as "auto" | "manual",
                            );
                            await onProfilesUpdated?.();
                          }}
                        >
                          <option value="auto">Auto sync after send</option>
                          <option value="manual">Manual sync only</option>
                        </Select>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canSyncCurrentCampaign || isSyncing}
                        onClick={() => void syncCurrentCampaign()}
                      >
                        <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                        {isSyncing ? "Syncing..." : "Sync now"}
                      </Button>
                    </div>
                  </>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                  {shouldShowImportPreview && importPreview ? (
                    <>
                      <div className="rounded-2xl border bg-muted/35 p-4 lg:col-span-2">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">Uploaded spreadsheet preview</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Read-only view of the current upload while you connect a destination
                              database.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{importPreview.validCount} valid</Badge>
                            <Badge
                              variant={importPreview.invalidCount > 0 ? "warning" : "outline"}
                            >
                              {importPreview.invalidCount} invalid
                            </Badge>
                            <Badge variant="outline">
                              {importPreview.sourceFiles.length} file
                              {importPreview.sourceFiles.length === 1 ? "" : "s"}
                            </Badge>
                          </div>
                        </div>
                        <ScrollArea className="mt-4 h-[260px] rounded-xl border bg-background">
                          <ImportPreviewTable preview={importPreview} maxRows={8} />
                        </ScrollArea>
                      </div>

                      <div className="rounded-2xl border bg-muted/35 p-4 lg:col-span-2">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">Destination preview</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Preview how valid uploaded rows could map into a destination table.
                              Final destination selection still happens in the save dialog.
                            </p>
                          </div>
                          {previewDestinationTable ? (
                            <Badge variant="outline">{previewDestinationTable.displayName}</Badge>
                          ) : null}
                        </div>

                        {!activeConnection ? (
                          <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                            Connect a database to preview how valid uploaded rows could map into a
                            destination table.
                          </div>
                        ) : isLoadingTables ? (
                          <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                            Loading destination preview...
                          </div>
                        ) : tables.length === 0 ? (
                          <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                            No tables were found for this connection.
                          </div>
                        ) : describePreviewTableMutation.error instanceof Error ? (
                          <Alert className="mt-4 border-destructive/40 bg-destructive/5 text-destructive">
                            <AlertTitle>Destination preview unavailable</AlertTitle>
                            <AlertDescription>
                              {describePreviewTableMutation.error.message}
                            </AlertDescription>
                          </Alert>
                        ) : destinationPreviewSchema && destinationPreview ? (
                          <div className="mt-4 space-y-4">
                            {isFallbackPreviewTable ? (
                              <p className="text-xs text-muted-foreground">
                                Previewing the first available table because no previous import
                                destination is saved for this connection yet.
                              </p>
                            ) : null}

                            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Database className="h-4 w-4" />
                                  <p className="font-medium">Table schema</p>
                                </div>
                                <div className="overflow-hidden rounded-xl border bg-background">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Column</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Constraint</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {destinationPreviewSchema.columns.map((column) => (
                                        <TableRow key={column.name}>
                                          <TableCell className="font-medium">{column.name}</TableCell>
                                          <TableCell>{column.type}</TableCell>
                                          <TableCell>
                                            {column.nullable ? "Nullable" : "Required"}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Database className="h-4 w-4" />
                                  <p className="font-medium">Mapped sample rows</p>
                                </div>
                                {destinationPreview.destinationPreviewColumns.length > 0 ? (
                                  <div className="overflow-hidden rounded-xl border bg-background">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>CSV row</TableHead>
                                          {destinationPreview.destinationPreviewColumns.map((column) => (
                                            <TableHead
                                              key={`${column.destinationColumn}-${column.sourceHeader}`}
                                            >
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
                                        {destinationPreview.mappedSampleRows.map((row) => (
                                          <TableRow key={row.rowIndex}>
                                            <TableCell className="font-medium">
                                              {row.rowIndex}
                                            </TableCell>
                                            {row.values.map((value, index) => (
                                              <TableCell key={`${row.rowIndex}-${index}`}>
                                                {value}
                                              </TableCell>
                                            ))}
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                                    The previewed destination table has no automatic header matches
                                    with the uploaded spreadsheet.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                            Loading destination preview...
                          </div>
                        )}
                      </div>
                    </>
                  ) : null}

                  {!isImportFlow && (
                    <div className="rounded-2xl border bg-muted/35 p-4">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <p className="font-medium">Saved connection profiles</p>
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
                  )}

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
