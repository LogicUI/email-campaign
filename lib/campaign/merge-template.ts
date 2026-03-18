import type { PrimitiveFieldValue } from "@/types/campaign";

export function mergeTemplate(
  template: string,
  fields: Record<string, PrimitiveFieldValue>,
) {
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => {
    const value = fields[key];

    if (value === null || value === undefined || value === "") {
      return "";
    }

    return String(value);
  });
}
