/**
 * Escapes HTML-sensitive characters in plain text email content.
 *
 * @param value Raw plain text content.
 * @returns HTML-safe text string.
 */
function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Renders plain text email content into a minimal HTML wrapper for Gmail.
 *
 * This exists so plain editable campaign bodies can be sent as HTML emails without
 * losing line breaks or risking raw HTML injection from user-entered content.
 *
 * @param text Plain text email body.
 * @returns Safe HTML email body.
 */
export function renderHtmlFromText(text: string) {
  const escaped = escapeHtml(text);
  const withBreaks = escaped.replaceAll("\n", "<br />");

  return `
    <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#1f1f1f;">
      ${withBreaks}
    </div>
  `;
}
