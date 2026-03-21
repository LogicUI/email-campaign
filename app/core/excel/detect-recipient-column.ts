import { normalizeHeader } from "@/core/excel/detect-email-column";

const HIGH_CONFIDENCE_THRESHOLD = 70;

const EXACT_MATCH_SCORES = new Map<string, number>([
  ["recipient", 100],
  ["recipient_name", 98],
  ["contact_name", 96],
  ["full_name", 92],
  ["first_name", 88],
  ["clinic_name", 86],
  ["company_name", 86],
  ["organization_name", 86],
  ["practice_name", 84],
  ["business_name", 84],
  ["client_name", 84],
  ["account_name", 82],
  ["team_name", 80],
  ["brand_name", 80],
  ["firm_name", 80],
  ["name", 72],
]);

/**
 * Assigns a heuristic score to a normalized recipient-style header.
 *
 * This exists because recipient columns are more ambiguous than email columns. The
 * score lets the detector rank plausible name/company fields without forcing a pick
 * when confidence is too low.
 *
 * @param normalizedHeader Header after normalization.
 * @returns Confidence score for using the header as the recipient field.
 */
function scoreRecipientHeader(normalizedHeader: string) {
  const exactScore = EXACT_MATCH_SCORES.get(normalizedHeader);

  if (exactScore) {
    return exactScore;
  }

  if (/recipient|addressee/.test(normalizedHeader)) {
    return 94;
  }

  if (/contact/.test(normalizedHeader) && /name/.test(normalizedHeader)) {
    return 92;
  }

  if (/_name$/.test(normalizedHeader)) {
    return 60;
  }

  return 0;
}

/**
 * Adds a small bonus when a candidate recipient column has real sample values.
 *
 * This keeps the detector from preferring a semantically good but empty column over a
 * slightly weaker match that is actually populated in the uploaded rows.
 *
 * @param rows Raw spreadsheet rows.
 * @param header Candidate header being sampled.
 * @returns Bonus score based on non-empty sample values.
 */
function getSampleValueBonus(rows: Record<string, unknown>[], header: string) {
  const nonEmptyCount = rows.slice(0, 10).reduce((count, row) => {
    const value = row[header];

    if (typeof value === "string" && value.trim()) {
      return count + 1;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return count + 1;
    }

    return count;
  }, 0);

  return Math.min(nonEmptyCount, 3);
}

/**
 * Detects the most likely recipient/name column from spreadsheet data.
 *
 * The compose flow uses this to prefill a personalization field that is distinct
 * from the email column. The detector intentionally avoids email-like headers and
 * only auto-selects a column when confidence clears a minimum threshold.
 *
 * @param rows Raw spreadsheet rows.
 * @param headers Ordered header list from the upload.
 * @param emailColumn Optional already-selected email column to exclude from matching.
 * @returns Selected recipient column and all scored candidate columns.
 */
export function detectRecipientColumn(
  rows: Record<string, unknown>[],
  headers: string[],
  emailColumn?: string,
) {
  const normalizedEmailColumn = emailColumn ? normalizeHeader(emailColumn) : undefined;

  const scored = headers
    .map((header) => {
      const normalizedHeader = normalizeHeader(header);

      if (
        normalizedHeader === normalizedEmailColumn ||
        /(^e_?mail$)|email|e-mail/.test(normalizedHeader)
      ) {
        return null;
      }

      const score = scoreRecipientHeader(normalizedHeader);

      if (score === 0) {
        return null;
      }

      return {
        header,
        score: score + getSampleValueBonus(rows, header),
      };
    })
    .filter((entry): entry is { header: string; score: number } => entry !== null)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.header.localeCompare(right.header);
    });

  return {
    selected: scored.find((entry) => entry.score >= HIGH_CONFIDENCE_THRESHOLD)?.header,
    candidates: scored.map((entry) => entry.header),
  };
}
