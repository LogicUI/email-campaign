import { normalizeHeader } from "@/core/excel/detect-email-column";
import { createId } from "@/core/utils/ids";
import { isValidEmail } from "@/core/utils/email";
import type { ImportPreviewRow, PrimitiveFieldValue } from "@/types/campaign";

function normalizeValue(value: unknown): PrimitiveFieldValue {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return value == null ? null : String(value);
}

export function mapPreviewRows(params: {
  rows: Record<string, unknown>[];
  emailColumn?: string;
}) {
  const { rows, emailColumn } = params;
  const seenEmails = new Set<string>();

  const previewRows: ImportPreviewRow[] = rows.map((row, rowIndex) => {
    const fields = Object.entries(row).reduce<Record<string, PrimitiveFieldValue>>(
      (accumulator, [key, value]) => {
        accumulator[normalizeHeader(key)] = normalizeValue(value);
        return accumulator;
      },
      {},
    );

    const rawEmailValue = emailColumn ? row[emailColumn] : undefined;
    const email = typeof rawEmailValue === "string" ? rawEmailValue.trim().toLowerCase() : "";

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
      rowIndex: rowIndex + 2,
      email: email || undefined,
      isValid,
      invalidReason,
      fields,
      raw: row,
    };
  });

  return previewRows;
}
