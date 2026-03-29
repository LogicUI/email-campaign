import { serializeEmailEditorHtml } from "@/core/email/editor-content";
import type { Attachment } from "@/types/gmail";

/**
 * Extracts HTML from TipTap editor for email sending.
 *
 * Process:
 * 1. If TipTap JSON, convert to HTML (TipTap does this automatically)
 * 2. Convert FieldPlaceholder spans back to {{field_name}} text
 * 3. Ensure inline images have cid: references
 * 4. Return clean HTML ready for MIME construction
 *
 * @param editorJson TipTap JSON string (optional, falls back to HTML)
 * @param htmlContent HTML content (fallback if no JSON)
 * @param attachments Inline image attachments
 * @returns HTML string ready for email
 */
export function extractHtmlForEmail(
  editorJson: string | undefined,
  htmlContent: string,
  attachments: Attachment[]
): string {
  let html = serializeEmailEditorHtml(htmlContent);
  const missingInlineImages = new Set<string>();

  // Convert placeholder spans back to {{field_name}}
  // The FieldPlaceholder extension renders: <span data-field-name="...">{{field_name}}</span>
  html = html.replace(
    /<span data-field-name="([^"]+)"[^>]*>{{\1}}<\/span>/g,
    "{{$1}}"
  );

  // Also handle a more general case where the span might contain the field name
  html = html.replace(
    /<span data-field-name="([^"]+)"[^>]*>(.*?)<\/span>/g,
    (match, fieldName, content) => {
      // If content contains the placeholder, use it; otherwise use the field name
      if (content.includes(`{{${fieldName}}}`)) {
        return content;
      }
      return `{{${fieldName}}}`;
    }
  );

  // Ensure inline images have cid: references
  // Verify that all cid: references exist in attachments
  const cidRegex = /<img[^>]+src="cid:([^"]+)"[^>]*>/g;
  html = html.replace(cidRegex, (match, contentId) => {
    // Verify contentId exists in attachments
    const att = attachments.find((a) => a.contentId === contentId);
    if (!att) {
      missingInlineImages.add(contentId);
      return match;
    }
    return match;
  });

  if (missingInlineImages.size > 0) {
    throw new Error(
      `Missing inline image attachments for: ${Array.from(missingInlineImages)
        .map((contentId) => `cid:${contentId}`)
        .join(", ")}`,
    );
  }

  return html;
}
