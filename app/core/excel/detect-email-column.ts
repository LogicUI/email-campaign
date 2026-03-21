import { isValidEmail } from "@/core/utils/email";

const EXACT_MATCHES = new Set(["email", "e-mail", "email_address", "emailaddress"]);

/**
 * Detects the most likely email column from spreadsheet headers and sample rows.
 *
 * The import flow needs a sensible default before the user reviews the uploaded
 * data. The detector prefers exact header matches first, then obvious fuzzy header
 * matches, and finally falls back to sampling actual row values for valid emails.
 *
 * @param rows Raw spreadsheet rows.
 * @param headers Ordered header list from the upload.
 * @returns Selected email column and all candidate columns in confidence order.
 */
export function detectEmailColumn(rows: Record<string, unknown>[], headers: string[]) {
  const normalizedToOriginal = new Map<string, string>();

  headers.forEach((header) => {
    normalizedToOriginal.set(normalizeHeader(header), header);
  });

  for (const [normalized, original] of normalizedToOriginal.entries()) {
    if (EXACT_MATCHES.has(normalized)) {
      return {
        selected: original,
        candidates: [original],
      };
    }
  }

  const candidates = headers.filter((header) => /email|e-mail/i.test(header));

  if (candidates.length > 0) {
    return {
      selected: candidates[0],
      candidates,
    };
  }

  const scored = headers
    .map((header) => {
      let validCount = 0;

      rows.slice(0, 25).forEach((row) => {
        const value = row[header];

        if (typeof value === "string" && isValidEmail(value)) {
          validCount += 1;
        }
      });

      return {
        header,
        validCount,
      };
    })
    .filter((entry) => entry.validCount > 0)
    .sort((left, right) => right.validCount - left.validCount);

  return {
    selected: scored[0]?.header,
    candidates: scored.map((entry) => entry.header),
  };
}

/**
 * Normalizes a spreadsheet header into a comparison-friendly key.
 *
 * This exists so header detection and mapping logic can compare columns reliably
 * without caring about case or whitespace differences.
 *
 * @param header Original uploaded header text.
 * @returns Lowercased underscore-normalized header value.
 */
export function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
}
