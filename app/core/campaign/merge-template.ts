import type { PrimitiveFieldValue } from "@/types/campaign";

const FIELD_PLACEHOLDER_SPAN_REGEX =
  /<span\b[^>]*\bdata-field-name=(?:"([^"]+)"|'([^']+)')[^>]*>[\s\S]*?<\/span>/gi;
const TEMPLATE_PLACEHOLDER_REGEX = /\{\{\s*([\w.-]+)\s*\}\}/g;

function resolveFieldValue(
  fields: Record<string, PrimitiveFieldValue>,
  key: string,
) {
  const value = fields[key];

  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
}

/**
 * Replaces handlebars-style placeholders in a template with imported field values.
 *
 * This is the core personalization primitive used for both subjects and bodies.
 * Missing values intentionally collapse to empty strings so templates do not leak
 * unresolved placeholders into generated recipient drafts.
 *
 * @param template Template string containing `{{field_name}}` placeholders.
 * @param fields Imported normalized field values for one recipient.
 * @returns Interpolated template output.
 */
export function mergeTemplate(
  template: string,
  fields: Record<string, PrimitiveFieldValue>,
) {
  return template
    .replace(FIELD_PLACEHOLDER_SPAN_REGEX, (_, doubleQuotedKey, singleQuotedKey) => {
      const key = (doubleQuotedKey || singleQuotedKey || "").trim();
      return key ? resolveFieldValue(fields, key) : "";
    })
    .replace(TEMPLATE_PLACEHOLDER_REGEX, (_, key: string) => resolveFieldValue(fields, key));
}
