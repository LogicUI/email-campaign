import type { Attachment } from "@/types/gmail";

/**
 * Migrates legacy email content to rich HTML.
 *
 * Converts:
 * - Plain text with newlines → <p> tags
 * - {{image:filename}} → <img src="cid:contentId">
 * - {{field_name}} → <span data-field-name="field_name">{{field_name}}</span>
 *
 * @param content Legacy plain text or HTML
 * @param attachments Inline image attachments
 * @returns HTML string ready for TipTap
 */
export function migrateLegacyContent(
  content: string,
  attachments: Attachment[]
): string {
  let html = content;

  // Convert plain text line breaks to <p> tags
  if (!html.includes("<")) {
    // It's plain text - convert double newlines to paragraph breaks
    const paragraphs = html.split("\n\n");
    html = paragraphs
      .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  // Convert {{image:filename}} to <img> tags
  html = html.replace(/\{\{image:([^}]+)\}\}/g, (match, filename) => {
    const trimmedFilename = filename.trim();
    const att = attachments.find(
      (a) => a.filename === trimmedFilename && a.isInline
    );
    if (att && att.contentId) {
      return `<img src="cid:${att.contentId}" alt="${trimmedFilename}" data-content-id="${att.contentId}" data-filename="${trimmedFilename}" style="max-width: 100%; height: auto;" />`;
    }
    console.warn(`Image not found for placeholder: ${match}`);
    return match; // Keep placeholder if image not found
  });

  // Convert {{field_name}} to placeholder spans
  // We use a special span that the FieldPlaceholder extension can parse
  html = html.replace(
    /\{\{([\w.-]+)\}\}/g,
    (match, fieldName) => {
      return `<span data-field-name="${fieldName}">{{${fieldName}}}</span>`;
    }
  );

  return html;
}

/**
 * Converts HTML to TipTap JSON format.
 *
 * This is a simplified converter that handles basic HTML structures.
 * For production, you might want to use TipTap's HTMLParser or a more robust solution.
 *
 * @param html HTML string
 * @returns TipTap JSON string
 */
function convertHtmlToTipTapJson(html: string): string {
  // Check if it's already TipTap JSON
  try {
    const parsed = JSON.parse(html);
    if (parsed.type === "doc" && parsed.content) {
      return html; // Already JSON
    }
  } catch {
    // Not JSON, continue with HTML conversion
  }

  // For now, return the HTML as-is - TipTap can parse HTML directly
  // The editor will convert it to JSON on load
  return html;
}
