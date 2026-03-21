import { cellValueSchema } from "@/zodSchemas/shared";
import { normalizeHeader } from "@/core/excel/detect-email-column";
import { createId } from "@/core/utils/ids";
import { isValidEmail } from "@/core/utils/email";
import type {
  ImportPreviewRow,
  ImportSourceRow,
  PrimitiveFieldValue,
} from "@/types/campaign";

/**
 * Coerces a raw spreadsheet cell into the primitive field union used by templates.
 *
 * This exists so imported values can be safely stored in recipient field maps and
 * reused by template interpolation without leaking unsupported JS types.
 *
 * @param value Raw cell value from the workbook parser.
 * @returns Normalized primitive value accepted by the campaign model.
 */
function normalizeValue(value: unknown): PrimitiveFieldValue {
  return cellValueSchema.parse(value);
}

/**
 * Converts imported workbook rows into preview rows with validation metadata.
 *
 * This is the step that prepares uploaded data for human review. It normalizes field
 * keys, extracts the chosen email/recipient values, enforces duplicate-email checks,
 * and records row-level invalid reasons used by the import preview dialog.
 *
 * @param params.rows Imported source rows with workbook/file metadata.
 * @param params.emailColumn Selected email column, if one has been detected/chosen.
 * @param params.recipientColumn Selected recipient column, if one has been detected/chosen.
 * @returns Preview rows ready for the review-import UI.
 */
export function mapPreviewRows(params: {
  rows: ImportSourceRow[];
  emailColumn?: string;
  recipientColumn?: string;
}) {
  const { rows, emailColumn, recipientColumn } = params;
  const seenEmails = new Set<string>();

  const previewRows: ImportPreviewRow[] = rows.map((row) => {
    const fields = Object.entries(row.raw).reduce<Record<string, PrimitiveFieldValue>>(
      (accumulator, [key, value]) => {
        accumulator[normalizeHeader(key)] = normalizeValue(value);
        return accumulator;
      },
      {},
    );

    const rawEmailValue = emailColumn ? row.raw[emailColumn] : undefined;
    const email =
      typeof rawEmailValue === "string"
        ? rawEmailValue.trim().toLowerCase()
        : typeof rawEmailValue === "number" || typeof rawEmailValue === "boolean"
          ? String(rawEmailValue).trim().toLowerCase()
          : "";
    const rawRecipientValue = recipientColumn ? row.raw[recipientColumn] : undefined;
    const recipient =
      typeof rawRecipientValue === "string"
        ? rawRecipientValue.trim()
        : typeof rawRecipientValue === "number" || typeof rawRecipientValue === "boolean"
          ? String(rawRecipientValue).trim()
          : "";

    let isValid = true;
    let invalidReason: string | undefined;

    if (!emailColumn) {
      isValid = false;
      invalidReason = "No email column selected.";
    } else if (!email) {
      isValid = false;
      invalidReason = "Missing email.";
    } else if (!isValidEmail(email)) {
      isValid = false;
      invalidReason = "Invalid email format.";
    } else if (seenEmails.has(email)) {
      isValid = false;
      invalidReason = "Duplicate email in upload.";
    }

    if (isValid) {
      seenEmails.add(email);
    }

    return {
      tempId: createId("preview"),
      rowIndex: row.originalRowIndex,
      email: email || undefined,
      recipient: recipient || undefined,
      sourceFileName: row.sourceFileName,
      sourceSheetName: row.sourceSheetName,
      isValid,
      invalidReason,
      fields,
      raw: row.raw,
    };
  });

  return previewRows;
}
