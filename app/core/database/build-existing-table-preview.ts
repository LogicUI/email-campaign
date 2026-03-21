import type { ImportPreview } from "@/types/campaign";
import type { DatabaseTableSchema } from "@/types/database";

export interface DestinationPreviewColumn {
  destinationColumn: string;
  sourceHeader: string;
  type?: string;
  nullable?: boolean;
}

export interface MappedSamplePreviewRow {
  rowIndex: number;
  values: string[];
}

function normalizeForMatch(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export function buildAutomaticExistingTableMappings(
  preview: ImportPreview,
  schema: DatabaseTableSchema,
) {
  return Object.fromEntries(
    preview.headers.map((header) => {
      const normalizedHeader = normalizeForMatch(header);
      const matchedColumn = schema.columns.find(
        (column) => normalizeForMatch(column.name) === normalizedHeader,
      );

      return [header, matchedColumn?.name ?? ""];
    }),
  );
}

export function buildExistingTablePreview(
  preview: ImportPreview,
  schema: DatabaseTableSchema,
  mappings: Record<string, string>,
) {
  const sourceHeaderByDestination = new Map<string, string>();

  preview.headers.forEach((header) => {
    const destinationColumn = mappings[header];
    if (destinationColumn) {
      sourceHeaderByDestination.set(destinationColumn, header);
    }
  });

  const destinationPreviewColumns: DestinationPreviewColumn[] = schema.columns
    .filter((column) => sourceHeaderByDestination.has(column.name))
    .map((column) => ({
      destinationColumn: column.name,
      sourceHeader: sourceHeaderByDestination.get(column.name) as string,
      type: column.type,
      nullable: column.nullable,
    }));

  const mappedSampleRows: MappedSamplePreviewRow[] = preview.rows
    .filter((row) => row.isValid)
    .slice(0, 5)
    .map((row) => ({
      rowIndex: row.rowIndex,
      values: destinationPreviewColumns.map((column) => String(row.raw[column.sourceHeader] ?? "")),
    }));

  return {
    destinationPreviewColumns,
    mappedSampleRows,
  };
}
