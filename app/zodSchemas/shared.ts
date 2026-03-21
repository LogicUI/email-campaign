import { z } from "zod";

export const primitiveFieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

// Zod schema to normalize Excel cell values, stripping surrounding quotes
export const cellValueSchema = z.union([
  z.string().transform((val) => {
    const trimmed = val.trim();
    // Remove surrounding quotes if present (common in Excel formula-based cells)
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  }),
  z.number(),
  z.boolean(),
  z.null(),
]);
