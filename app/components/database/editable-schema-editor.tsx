"use client";

import { Database, Eye } from "lucide-react";

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
import type { EditableSchemaEditorProps } from "@/types/editable-schema-editor";

/**
 * Reusable component for editing database table schema inferred from Excel data.
 *
 * This component extracts the schema editing pattern from the upload-to-database
 * flow, allowing users to customize column names, types, and constraints before
 * creating a database table. It shows a live preview of how sample rows will appear.
 *
 * Used in:
 * - DatabaseSettingsDialog (import flow)
 */
export function EditableSchemaEditor({
  columns,
  onChange,
  previewRows,
  destinationColumns,
  disabled = false,
}: EditableSchemaEditorProps) {
  const handleColumnNameChange = (index: number, value: string) => {
    const sanitized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/^_+|_+$/g, "") || "column_value";

    onChange(
      columns.map((col, i) =>
        i === index ? { ...col, suggestedName: sanitized } : col,
      ),
    );
  };

  const handleColumnTypeChange = (index: number, value: string) => {
    onChange(
      columns.map((col, i) =>
        i === index ? { ...col, suggestedType: value } : col,
      ),
    );
  };

  const handleNullableChange = (index: number, value: string) => {
    onChange(
      columns.map((col, i) =>
        i === index ? { ...col, nullable: value === "nullable" } : col,
      ),
    );
  };

  const hasDuplicateNames = () => {
    const names = columns.map((col) => col.suggestedName.trim());
    const unique = new Set(names);
    return names.length !== unique.size;
  };

  return (
    <div className="space-y-5">
      {/* Editable Schema Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          <p className="font-medium">Table schema</p>
        </div>

        {columns.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No columns found in the uploaded data.
          </div>
        ) : (
          <div className="space-y-3">
            {hasDuplicateNames() && (
              <p className="text-sm text-destructive">
                Duplicate column names detected. Please ensure all column names are unique.
              </p>
            )}

            {columns.map((column, index) => (
              <div
                key={`${column.sourceHeader}-${index}`}
                className="grid gap-2 rounded-xl border bg-background p-3 sm:grid-cols-[1fr_180px_110px]"
              >
                <div className="grid gap-2">
                  <Label htmlFor={`column-name-${index}`} className="sr-only">
                    Column name
                  </Label>
                  <Input
                    id={`column-name-${index}`}
                    value={column.suggestedName}
                    onChange={(e) =>
                      handleColumnNameChange(index, e.target.value)
                    }
                    disabled={disabled}
                    placeholder="column_name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Source: {column.sourceHeader}
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`column-type-${index}`} className="sr-only">
                    Column type
                  </Label>
                  <Select
                    id={`column-type-${index}`}
                    value={column.suggestedType}
                    onChange={(e) =>
                      handleColumnTypeChange(index, e.target.value)
                    }
                    disabled={disabled}
                  >
                    <option value="text">text</option>
                    <option value="integer">integer</option>
                    <option value="numeric">numeric</option>
                    <option value="boolean">boolean</option>
                    <option value="date">date</option>
                    <option value="timestamp with time zone">
                      timestamp with time zone
                    </option>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`column-nullable-${index}`} className="sr-only">
                    Nullable
                  </Label>
                  <Select
                    id={`column-nullable-${index}`}
                    value={column.nullable ? "nullable" : "required"}
                    onChange={(e) =>
                      handleNullableChange(index, e.target.value)
                    }
                    disabled={disabled}
                  >
                    <option value="nullable">Nullable</option>
                    <option value="required">Required</option>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sample Rows Preview */}
      {destinationColumns.length > 0 && previewRows.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <p className="font-medium">Sample rows preview</p>
          </div>

          <ScrollArea className="rounded-xl border bg-background p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Row</TableHead>
                  {destinationColumns.map((column) => (
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
                {previewRows.map((row) => (
                  <TableRow key={row.rowIndex}>
                    <TableCell className="font-medium">{row.rowIndex}</TableCell>
                    {row.values.map((value, index) => (
                      <TableCell key={`${row.rowIndex}-${index}`}>
                        {value}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </section>
      )}
    </div>
  );
}
