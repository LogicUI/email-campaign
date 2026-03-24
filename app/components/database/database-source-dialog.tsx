"use client";

import { useMemo, useState } from "react";
import { Database, LoaderCircle, Table2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useDatabaseTablesQuery, useImportDatabaseTablePreviewMutation } from "@/tanStack/database";
import type { ImportPreview } from "@/types/campaign";
import type { DatabaseSessionConnection, DatabaseTableRef } from "@/types/database";

export function DatabaseSourceDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeConnection: DatabaseSessionConnection | null;
  onImported: (preview: ImportPreview) => void;
  onOpenDatabaseSettings: () => void;
}) {
  const { activeConnection, onImported, onOpenChange, onOpenDatabaseSettings, open } = props;
  const [selectedTableName, setSelectedTableName] = useState("");
  const tablesQuery = useDatabaseTablesQuery(activeConnection, open);
  const importMutation = useImportDatabaseTablePreviewMutation(activeConnection);
  const tables = useMemo(() => tablesQuery.data ?? [], [tablesQuery.data]);

  const selectedTable = useMemo(
    () => tables.find((table) => table.displayName === selectedTableName) ?? null,
    [selectedTableName, tables],
  );
  const error = (tablesQuery.error ?? importMutation.error) as Error | null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setSelectedTableName("");
          importMutation.reset();
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="w-[min(94vw,34rem)] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Import from database
          </DialogTitle>
          <DialogDescription>
            Select a table from the active Postgres or Supabase connection and load
            its rows into the campaign preview flow.
          </DialogDescription>
        </DialogHeader>

        {!activeConnection ? (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/35 p-4 text-sm text-muted-foreground">
              No active database connection is available in this browser session.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={onOpenDatabaseSettings}>Open database settings</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/35 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{activeConnection.label}</p>
                <p className="mt-1">Provider: {activeConnection.provider}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="database-source-table">Source table</Label>
                <Select
                  id="database-source-table"
                  value={selectedTableName}
                  onChange={(event) => setSelectedTableName(event.target.value)}
                >
                  <option value="">
                    {tablesQuery.isLoading ? "Loading tables..." : "Select a table"}
                  </option>
                  {tables.map((table) => (
                    <option key={table.displayName} value={table.displayName}>
                      {table.displayName}
                    </option>
                  ))}
                </Select>
              </div>

              {selectedTable ? (
                <div className="rounded-xl border bg-muted/35 p-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Table2 className="h-4 w-4" />
                    <span className="font-medium text-foreground">{selectedTable.displayName}</span>
                  </div>
                  <p className="mt-1">
                    EmailAI will normalize all rows into the same preview used for file
                    and Google Sheet imports.
                  </p>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {error.message}
                </div>
              ) : null}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                disabled={!selectedTable || importMutation.isPending}
                onClick={async () => {
                  const preview = await importMutation.mutateAsync(selectedTable as DatabaseTableRef);
                  onImported(preview);
                  onOpenChange(false);
                }}
              >
                {importMutation.isPending ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Import table
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
