function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderHtmlFromText(text: string) {
  const escaped = escapeHtml(text);
  const withBreaks = escaped.replaceAll("\n", "<br />");

  return `
    <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#1f1f1f;">
      ${withBreaks}
    </div>
  `;
}
