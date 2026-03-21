import { normalizeHeader } from "@/core/excel/detect-email-column";
import type { InferredDatabaseColumn } from "@/types/database";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}[ tT]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/;

/**
 * Classifies a single spreadsheet cell into a coarse database-oriented type label.
 *
 * This exists because database table creation needs a best-effort guess per column,
 * but uploaded spreadsheet cells arrive as loosely typed JS values. The inference
 * here is intentionally conservative: ambiguous values fall back to `text` so we do
 * not create an overly strict schema that rejects later inserts.
 *
 * @param value Raw cell value taken from the parsed workbook row object.
 * @returns A lightweight type token used by {@link mergeTypes} to infer a column type.
 */
function inferValueType(value: unknown) {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "boolean") {
    return "boolean";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? "integer" : "numeric";
  }

  if (typeof value !== "string") {
    return "text";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "null";
  }

  if (/^(true|false|yes|no)$/i.test(trimmed)) {
    return "boolean";
  }

  if (/^-?\d+$/.test(trimmed)) {
    return "integer";
  }

  if (/^-?\d+\.\d+$/.test(trimmed)) {
    return "numeric";
  }

  if (ISO_DATE_PATTERN.test(trimmed)) {
    return "date";
  }

  if (ISO_TIMESTAMP_PATTERN.test(trimmed)) {
    return "timestamp";
  }

  return "text";
}

/**
 * Collapses all observed cell-level types for a column into one SQL column type.
 *
 * The function exists to keep inference predictable across mixed spreadsheets:
 * fully empty columns become `text`, purely numeric columns stay numeric, and
 * mixed/ambiguous columns intentionally degrade to `text` for safety.
 *
 * @param types Set of value-level type tokens produced while scanning a column.
 * @returns The suggested SQL type string to use when creating a destination table.
 */
function mergeTypes(types: Set<string>) {
  const meaningfulTypes = [...types].filter((type) => type !== "null");

  if (meaningfulTypes.length === 0) {
    return "text";
  }

  if (meaningfulTypes.length === 1) {
    return meaningfulTypes[0] === "timestamp" ? "timestamp with time zone" : meaningfulTypes[0];
  }

  if (meaningfulTypes.every((type) => type === "integer" || type === "numeric")) {
    return meaningfulTypes.includes("numeric") ? "numeric" : "integer";
  }

  return "text";
}

/**
 * Converts an uploaded header into a SQL-safe identifier candidate.
 *
 * This exists because user spreadsheets often contain spaces, punctuation, or
 * headings that are fine for display but not reliable as database column names.
 * The function keeps names deterministic so generated schemas and mappings are
 * stable across uploads.
 *
 * @param value Original header text from the spreadsheet.
 * @returns A sanitized snake_case-ish identifier that can be used as a column name.
 */
function sanitizeIdentifier(value: string) {
  const normalized = normalizeHeader(value).replace(/[^a-z0-9_]/g, "_");
  const stripped = normalized.replace(/^_+/, "");

  return stripped || "column_value";
}

/**
 * Infers destination database columns from spreadsheet headers and sampled rows.
 *
 * This function is the bridge between workbook preview data and table creation.
 * It scans each header across all imported rows, determines nullability, derives
 * a safe suggested column name, and chooses a conservative SQL type so the user
 * can either accept or edit the generated schema before saving.
 *
 * @param params.headers Ordered list of spreadsheet headers from the upload preview.
 * @param params.rows Raw row objects keyed by original header names.
 * @returns Column descriptors that drive the "create new table" database flow.
 */
export function inferDatabaseColumns(params: {
  headers: string[];
  rows: Record<string, unknown>[];
}): InferredDatabaseColumn[] {
  const { headers, rows } = params;

  return headers.map((header) => {
    const types = new Set<string>();
    let nullable = false;

    rows.forEach((row) => {
      const type = inferValueType(row[header]);
      types.add(type);

      if (type === "null") {
        nullable = true;
      }
    });

    return {
      sourceHeader: header,
      suggestedName: sanitizeIdentifier(header),
      suggestedType: mergeTypes(types),
      nullable,
    };
  });
}
