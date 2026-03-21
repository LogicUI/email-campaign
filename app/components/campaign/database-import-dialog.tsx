"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Database, Eye, Settings, Table2 } from "lucide-react";

import {
  buildAutomaticExistingTableMappings,
  buildExistingTablePreview,
  type DestinationPreviewColumn,
} from "@/core/database/build-existing-table-preview";
import { inferDatabaseColumns } from "@/core/database/infer-column-types";
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
import {
  useDatabaseTablesQuery,
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
  InferredDatabaseColumn,
  SavedListDetail,
} from "@/types/database";
import type { ImportPreview } from "@/types/campaign";

function buildTableName(defaultLabel?: string) {
  const base = (defaultLabel ?? "uploaded_recipients")
    .replace(/\.[^/.]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `${base || "uploaded_recipients"}_${new Date().toISOString().slice(0, 10).replace(/-/g, "_")}`;
}

export function DatabaseImportDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: ImportPreview | null;
  activeConnection: DatabaseSessionConnection | null;
  connectionProfiles?: DatabaseConnectionProfile[];
  onOpenDatabaseSettings?: (context?: DatabaseSettingsOpenContext) => void;
  onSaved: (savedList: SavedListDetail) => void;
}) {
  const {
    activeConnection,
    connectionProfiles = [],
    onOpenChange,
    onOpenDatabaseSettings,
    onSaved,
    open,
    preview,
  } = props;
  const [mode, setMode] = useState<DatabaseSaveMode>("app_only");
  const [saveName, setSaveName] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedSchema, setSelectedSchema] = useState<DatabaseTableSchema | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [newTableSchemaName, setNewTableSchemaName] = useState("public");
  const [newTableName, setNewTableName] = useState("");
  const [newTableColumns, setNewTableColumns] = useState<InferredDatabaseColumn[]>([]);
  const [saveResult, setSaveResult] = useState<DatabaseSaveImportResponseData | null>(null);
  const wasOpenRef = useRef(open);
  const tablesQuery = useDatabaseTablesQuery(activeConnection, open);
  const describeTableMutation = useDescribeDatabaseTableMutation(activeConnection);
  const saveImportMutation = useSaveDatabaseImportMutation();

  useEffect(() => {
    const didOpen = open && !wasOpenRef.current;
    wasOpenRef.current = open;

    if (!didOpen || !preview) {
      return;
    }

    setSaveName((current) => current || `${preview.fileName ?? "Uploaded recipients"} list`);
    setNewTableName((current) => current || buildTableName(preview.fileName));

    // Check for edited schema from settings dialog
    const editedSchema = useDatabaseSessionStore.getState().editedImportSchema;
    if (editedSchema && editedSchema.length > 0) {
      setNewTableColumns(editedSchema);
    } else {
      setNewTableColumns(
        inferDatabaseColumns({
          headers: preview.headers,
          rows: preview.rows.map((row) => row.raw),
        }),
      );
    }

    // Clear stale schema from previous imports
    if (!didOpen) {
      useDatabaseSessionStore.getState().clearEditedImportSchema();
    }

    setMode(activeConnection ? "existing_table" : "app_only");
    setSelectedTable("");
    setSelectedSchema(null);
    setMappings({});
    setSaveResult(null);
    describeTableMutation.reset();
    saveImportMutation.reset();
  }, [activeConnection, describeTableMutation, open, preview, saveImportMutation]);

  const tables = useMemo(() => tablesQuery.data ?? [], [tablesQuery.data]);
  const isLoadingTables = tablesQuery.isPending || tablesQuery.isFetching;
  const isSaving = saveImportMutation.isPending;
  const error = useMemo(() => {
    const activeError = saveImportMutation.error ?? describeTableMutation.error ?? tablesQuery.error;

    return activeError instanceof Error ? activeError.message : null;
  }, [describeTableMutation.error, saveImportMutation.error, tablesQuery.error]);

  const activeProfile = useMemo(() => {
    if (!activeConnection) {
      return null;
    }

    return (
      connectionProfiles.find((profile) => profile.id === activeConnection.profileId) ??
      connectionProfiles.find(
        (profile) =>
          profile.provider === activeConnection.provider && profile.label === activeConnection.label,
      ) ??
      null
    );
  }, [activeConnection, connectionProfiles]);

  const selectedTableRef = useMemo(
    () => tables.find((table) => table.displayName === selectedTable),
    [selectedTable, tables],
  );

  const eligibleRows = useMemo(
    () => preview?.rows.filter((row) => row.isValid) ?? [],
    [preview],
  );

  const invalidRowsCount = preview ? preview.rows.length - eligibleRows.length : 0;

  const loadSchema = useCallback(
    async (table: DatabaseTableRef) => {
      if (!activeConnection || !preview) {
        return;
      }

      try {
        describeTableMutation.reset();
        const payload = await describeTableMutation.mutateAsync(table);

        setSelectedSchema(payload.schema);
        setMappings(buildAutomaticExistingTableMappings(preview, payload.schema));
      } catch {
        return;
      }
    },
    [activeConnection, describeTableMutation, preview],
  );

  useEffect(() => {
    if (
      !open ||
      mode !== "existing_table" ||
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
  }, [activeProfile?.lastSelectedTable, isLoadingTables, loadSchema, mode, open, selectedTable, tables]);

  const existingTablePreview = useMemo(() => {
    if (!selectedSchema || !preview) {
      return {
        destinationPreviewColumns: [],
        mappedSampleRows: [],
      };
    }

    return buildExistingTablePreview(preview, selectedSchema, mappings);
  }, [mappings, preview, selectedSchema]);

  const newTablePreviewColumns = useMemo(
    () =>
      newTableColumns
        .filter((column) => column.suggestedName.trim())
        .map((column) => ({
          destinationColumn: column.suggestedName.trim(),
          sourceHeader: column.sourceHeader,
          type: column.suggestedType,
          nullable: column.nullable,
        })),
    [newTableColumns],
  );

  const destinationPreviewColumns = useMemo(() => {
    if (mode === "existing_table") {
      return existingTablePreview.destinationPreviewColumns;
    }

    if (mode === "new_table") {
      return newTablePreviewColumns;
    }

    return [] as DestinationPreviewColumn[];
  }, [existingTablePreview.destinationPreviewColumns, mode, newTablePreviewColumns]);

  const mappedSampleRows = mode === "existing_table"
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
    (mode !== "existing_table" || Boolean(selectedTableRef));

  if (!preview) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[min(96vw,1180px)] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Save imported rows
          </DialogTitle>
          <DialogDescription>
            Save this upload into EmailAI, insert valid rows into an existing table, or
            create a new table from the CSV schema.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
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
                <div className="mt-3 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No active external database connection in this browser session.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      onOpenDatabaseSettings?.({
                        source: "database-import",
                        preview,
                      })
                    }
                  >
                    Connect database
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="save-import-name">Saved list name</Label>
              <Input
                id="save-import-name"
                value={saveName}
                onChange={(event) => setSaveName(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="save-import-mode">Destination</Label>
              <Select
                id="save-import-mode"
                value={mode}
                onChange={(event) => setMode(event.target.value as typeof mode)}
              >
                <option value="app_only">Save only to EmailAI database</option>
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
                <Badge variant="outline">{preview.rows.length} source rows</Badge>
                <Badge variant="secondary">{eligibleRows.length} valid rows</Badge>
                <Badge variant={invalidRowsCount > 0 ? "warning" : "outline"}>
                  {invalidRowsCount} skipped invalid
                </Badge>
              </div>
              <p className="mt-3">
                External table writes insert only rows EmailAI marked valid from the current CSV
                preview.
              </p>
            </div>

            {mode !== "app_only" ? (
              <div className="rounded-2xl border bg-muted/35 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Insert summary</p>
                <p className="mt-2">{eligibleRows.length} row(s) will be inserted.</p>
                <p className="mt-1">{invalidRowsCount} invalid row(s) will be skipped.</p>
                <p className="mt-1">
                  {destinationPreviewColumns.length} destination column(s) currently mapped.
                </p>
              </div>
            ) : null}

            {error ? (
              <Alert className="border-destructive/40 bg-destructive/5 text-destructive">
                <AlertTitle>Save failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

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
          </div>

          <ScrollArea className="h-[62vh] rounded-2xl border bg-background p-4">
            <div className="space-y-5">
              {mode === "existing_table" ? (
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
                          const next = tables.find((table) => table.displayName === event.target.value);

                          if (next) {
                            void loadSchema(next);
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
                        Writing valid CSV rows into <span className="font-medium text-foreground">{selectedTableRef.displayName}</span>.
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
                      {preview.headers.map((header) => (
                        <div
                          key={header}
                          className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_1fr]"
                        >
                          <div>
                            <p className="text-sm font-medium">{header}</p>
                            <p className="text-xs text-muted-foreground">CSV column</p>
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

              {mode === "new_table" ? (
                <>
                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <p className="font-medium">New table destination</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onOpenDatabaseSettings?.({
                            source: "database-import",
                            preview,
                          })
                        }
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Edit schema
                      </Button>
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
                      New table target: <span className="font-medium text-foreground">{newTableSchemaName}.{newTableName || "untitled_table"}</span>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <p className="font-medium">Editable schema</p>
                    {newTableColumns.map((column, index) => (
                      <div
                        key={`${column.sourceHeader}-${index}`}
                        className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_180px_110px]"
                      >
                        <Input
                          value={column.suggestedName}
                          onChange={(event) =>
                            setNewTableColumns((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, suggestedName: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                        <Select
                          value={column.suggestedType}
                          onChange={(event) =>
                            setNewTableColumns((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, suggestedType: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        >
                          <option value="text">text</option>
                          <option value="integer">integer</option>
                          <option value="numeric">numeric</option>
                          <option value="boolean">boolean</option>
                          <option value="date">date</option>
                          <option value="timestamp with time zone">timestamp with time zone</option>
                        </Select>
                        <Select
                          value={column.nullable ? "nullable" : "required"}
                          onChange={(event) =>
                            setNewTableColumns((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, nullable: event.target.value === "nullable" }
                                  : item,
                              ),
                            )
                          }
                        >
                          <option value="nullable">Nullable</option>
                          <option value="required">Required</option>
                        </Select>
                      </div>
                    ))}
                  </section>
                </>
              ) : null}

              {mode !== "app_only" ? (
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
                            <TableHead>CSV row</TableHead>
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
              ) : null}

              {mode === "app_only" ? (
                <Alert>
                  <AlertTitle>Save without external table</AlertTitle>
                  <AlertDescription>
                    This stores the uploaded rows in EmailAI&apos;s database so you can reopen the
                    list later, even if you do not write to Supabase yet.
                  </AlertDescription>
                </Alert>
              ) : null}
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
                  preview,
                  mode,
                  existingTable: selectedTableRef ?? undefined,
                  mappings:
                    mode === "existing_table"
                      ? preview.headers.map((header) => ({
                          sourceColumn: header,
                          destinationColumn: mappings[header] || undefined,
                        }))
                      : preview.headers.map((header, index) => ({
                          sourceColumn: header,
                          destinationColumn:
                            mode === "new_table"
                              ? newTableColumns[index]?.suggestedName.trim() || undefined
                              : undefined,
                        })),
                  newTable:
                    mode === "new_table"
                      ? {
                          schemaName: newTableSchemaName,
                          tableName: newTableName,
                          columns: newTableColumns,
                        }
                      : undefined,
                };
                const response = await saveImportMutation.mutateAsync(payload);

                setSaveResult(response);
                onSaved(response.savedList);
              } catch {
                return;
              }
            }}
            disabled={
              isSaving ||
              Boolean(saveResult) ||
              !saveName.trim() ||
              (mode === "existing_table" && !canSaveToExternalTable) ||
              (mode === "new_table" &&
                (!activeConnection ||
                  !newTableName.trim() ||
                  newTableColumns.length === 0 ||
                  !canSaveToExternalTable))
            }
          >
            {saveResult ? "Saved" : isSaving ? "Saving..." : "Save import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
