import type { JSONContent } from "@tiptap/core";

import { migrateLegacyContent } from "@/core/email/migrate-legacy-content";
import type { Attachment } from "@/types/gmail";

const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;
const IMAGE_TAG_REGEX = /<img\b([^>]*?)\/?>/gi;
const ATTRIBUTE_REGEX = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

export interface PreparedEmailEditorContent {
  displayContent: string | JSONContent;
  comparisonMode: "html" | "json";
  comparisonValue: string;
  shouldPersistNormalization: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseTipTapDocument(value?: string): JSONContent | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);

    if (
      isRecord(parsed) &&
      parsed.type === "doc" &&
      Array.isArray(parsed.content)
    ) {
      return parsed as JSONContent;
    }
  } catch {
    return null;
  }

  return null;
}

function looksLikeHtml(value: string) {
  return HTML_TAG_REGEX.test(value);
}

function getCidFromSource(value?: string) {
  const match = value?.match(/^cid:(.+)$/i);
  return match?.[1];
}

function parseAttributes(source: string) {
  const attributes: Record<string, string> = {};

  for (const match of source.matchAll(ATTRIBUTE_REGEX)) {
    const [, name, doubleQuoted, singleQuoted] = match;

    if (!name) {
      continue;
    }

    attributes[name] = doubleQuoted ?? singleQuoted ?? "";
  }

  return attributes;
}

function serializeAttributes(attributes: Record<string, string | undefined>) {
  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([name, value]) => `${name}="${String(value)}"`)
    .join(" ");
}

function rewriteImageTags(
  html: string,
  transform: (attributes: Record<string, string>) => Record<string, string>,
) {
  return html.replace(IMAGE_TAG_REGEX, (match, rawAttributes) => {
    const nextAttributes = transform(parseAttributes(rawAttributes));
    const serializedAttributes = serializeAttributes(nextAttributes);

    return serializedAttributes ? `<img ${serializedAttributes} />` : match;
  });
}

function findInlineAttachment(
  attributes: Record<string, string | undefined>,
  attachments: Attachment[],
) {
  const explicitContentId = attributes["data-content-id"];
  const sourceContentId = getCidFromSource(attributes.src);
  const contentId = explicitContentId || sourceContentId;

  if (contentId) {
    const byContentId = attachments.find(
      (attachment) => attachment.isInline && attachment.contentId === contentId,
    );

    if (byContentId) {
      return byContentId;
    }
  }

  const filename = attributes["data-filename"] || attributes.alt;

  if (!filename) {
    return undefined;
  }

  return attachments.find(
    (attachment) => attachment.isInline && attachment.filename === filename,
  );
}

export function buildInlineImagePreviewSource(attachment?: Attachment) {
  if (!attachment || !attachment.contentType.startsWith("image/") || !attachment.data) {
    return undefined;
  }

  return `data:${attachment.contentType};base64,${attachment.data}`;
}

export function serializeEmailEditorHtml(html: string) {
  return rewriteImageTags(html, (attributes) => {
    const contentId = attributes["data-content-id"] || getCidFromSource(attributes.src);

    if (!contentId) {
      return attributes;
    }

    return {
      ...attributes,
      src: `cid:${contentId}`,
      "data-content-id": contentId,
    };
  });
}

function buildEditorPreviewHtml(html: string, attachments: Attachment[]) {
  return rewriteImageTags(html, (attributes) => {
    const attachment = findInlineAttachment(attributes, attachments);
    const previewSource = buildInlineImagePreviewSource(attachment);
    const contentId = attributes["data-content-id"] || attachment?.contentId || getCidFromSource(attributes.src);

    if (!previewSource || !contentId) {
      return attributes;
    }

    const nextAttributes: Record<string, string> = {
      ...attributes,
      src: previewSource,
      "data-content-id": contentId,
    };

    if (!nextAttributes["data-filename"] && attachment?.filename) {
      nextAttributes["data-filename"] = attachment.filename;
    }

    if (!nextAttributes.alt && attachment?.filename) {
      nextAttributes.alt = attachment.filename;
    }

    return nextAttributes;
  });
}

export function buildEmailPreviewHtml(content: string, attachments: Attachment[]) {
  const htmlContent = looksLikeHtml(content)
    ? serializeEmailEditorHtml(content)
    : migrateLegacyContent(content, attachments);

  return buildEditorPreviewHtml(htmlContent, attachments);
}

function applyPreviewSourcesToJson(
  content: JSONContent,
  attachments: Attachment[],
): JSONContent {
  const nextContent: JSONContent = {
    ...content,
  };

  if (content.attrs && isRecord(content.attrs)) {
    const attributes = Object.fromEntries(
      Object.entries(content.attrs).map(([key, value]) => [key, String(value)]),
    );
    const attachment = findInlineAttachment(attributes, attachments);
    const previewSource = buildInlineImagePreviewSource(attachment);
    const contentId =
      attributes["data-content-id"] ||
      attributes.contentId ||
      attachment?.contentId ||
      getCidFromSource(attributes.src);

    if (previewSource && contentId) {
      nextContent.attrs = {
        ...content.attrs,
        src: previewSource,
        contentId,
        filename: attributes.filename || attachment?.filename,
        alt: attributes.alt || attachment?.filename,
      };
    }
  }

  if (content.content) {
    nextContent.content = content.content.map((child) =>
      applyPreviewSourcesToJson(child, attachments),
    );
  }

  return nextContent;
}

export function normalizeHtmlForComparison(html: string) {
  return html.replace(/>\s+</g, "><").trim();
}

export function prepareEmailEditorContent(params: {
  content: string;
  editorJson?: string;
  attachments: Attachment[];
}): PreparedEmailEditorContent {
  const { attachments, content, editorJson } = params;
  const parsedEditorJson = parseTipTapDocument(editorJson);
  const recoveredBodyJson = parseTipTapDocument(content);
  const shouldNormalizePlainText =
    content.trim().length > 0 && !looksLikeHtml(content) && !recoveredBodyJson;
  const shouldPersistNormalization =
    Boolean(recoveredBodyJson) || shouldNormalizePlainText;

  if (parsedEditorJson) {
    const displayContent = applyPreviewSourcesToJson(parsedEditorJson, attachments);

    return {
      displayContent,
      comparisonMode: "json",
      comparisonValue: JSON.stringify(displayContent),
      shouldPersistNormalization,
    };
  }

  if (recoveredBodyJson) {
    const displayContent = applyPreviewSourcesToJson(recoveredBodyJson, attachments);

    return {
      displayContent,
      comparisonMode: "json",
      comparisonValue: JSON.stringify(displayContent),
      shouldPersistNormalization: true,
    };
  }

  const htmlContent = looksLikeHtml(content)
    ? content
    : migrateLegacyContent(content, attachments);
  const displayContent = buildEditorPreviewHtml(htmlContent, attachments);

  return {
    displayContent,
    comparisonMode: "html",
    comparisonValue: normalizeHtmlForComparison(displayContent),
    shouldPersistNormalization,
  };
}
