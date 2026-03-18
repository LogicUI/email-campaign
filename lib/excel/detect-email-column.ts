import { isValidEmail } from "@/lib/utils/email";

const EXACT_MATCHES = new Set(["email", "e-mail", "email_address", "emailaddress"]);

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

export function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
}
