const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;

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

export function isHtmlContent(value: string) {
  return HTML_TAG_REGEX.test(value);
}

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

/**
 * Builds a readable plain-text fallback from editor HTML.
 *
 * This is used for the text/plain MIME part when the authoring surface is rich HTML.
 */
export function renderTextFromHtml(value: string) {
  if (!isHtmlContent(value)) {
    return value;
  }

  const text = value
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<img\b[^>]*alt="([^"]*)"[^>]*>/gi, "\n[Image: $1]\n")
    .replace(/<img\b[^>]*>/gi, "\n[Image]\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|blockquote|h[1-6]|ul|ol|li)>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n");

  return decodeHtmlEntities(text).trim();
}
