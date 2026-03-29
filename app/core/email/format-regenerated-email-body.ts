import { migrateLegacyContent } from "@/core/email/migrate-legacy-content";
import type { Attachment } from "@/types/gmail";

const IMAGE_PLACEHOLDER_REGEX = /\{\{image:[^}]+\}\}/g;
const GREETING_REGEX = /^(Dear\b[^\n]*?,|Hi\b[^\n]*?,|Hello\b[^\n]*?,|Hey\b[^\n]*?,)\s*/i;
const CLOSING_MARKERS = [
  "Best regards,",
  "Kind regards,",
  "Warm regards,",
  "Regards,",
  "Sincerely,",
  "Thank you,",
  "Thanks,",
];

function normalizeWhitespace(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").trim();
}

function isolateImagePlaceholders(value: string) {
  return value.replace(IMAGE_PLACEHOLDER_REGEX, (match) => `\n\n${match}\n\n`);
}

function splitGreeting(value: string) {
  const match = value.match(GREETING_REGEX);

  if (!match) {
    return {
      greeting: undefined,
      remainder: value.trim(),
    };
  }

  return {
    greeting: match[1].trim(),
    remainder: value.slice(match[0].length).trim(),
  };
}

function splitClosing(value: string) {
  const normalized = value.trim();
  const candidates = CLOSING_MARKERS.map((marker) => {
    const start = normalized.toLowerCase().lastIndexOf(marker.toLowerCase());

    if (start === -1) {
      return null;
    }

    return {
      marker,
      start,
      end: start + marker.length,
    };
  })
    .filter((candidate): candidate is { marker: string; start: number; end: number } =>
      candidate !== null,
    )
    .sort((left, right) => {
      if (right.end !== left.end) {
        return right.end - left.end;
      }

      return left.start - right.start;
    });

  const closingCandidate = candidates[0];

  if (!closingCandidate) {
    return {
      body: normalized,
      closing: undefined,
    };
  }

  const before = normalized.slice(0, closingCandidate.start).trim();
  const after = normalized.slice(closingCandidate.end).trim();

  return {
    body: before,
    closing: after ? `${closingCandidate.marker}\n${after}` : closingCandidate.marker,
  };
}

function splitSentences(value: string) {
  return (
    value.match(/\{\{image:[^}]+\}\}|[^.!?]+(?:[.!?]+(?=\s|$)|$)/g) ?? [value]
  )
    .map((part) => part.trim())
    .filter(Boolean);
}

function chunkBodyParagraphs(value: string) {
  if (!value.trim()) {
    return [];
  }

  if (value.includes("\n\n")) {
    return value
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }

  const parts = splitSentences(value);
  const paragraphs: string[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length === 0) {
      return;
    }

    paragraphs.push(current.join(" ").trim());
    current = [];
  };

  for (const part of parts) {
    if (part.startsWith("{{image:")) {
      flush();
      paragraphs.push(part);
      continue;
    }

    current.push(part);
    const currentLength = current.join(" ").length;

    if (current.length >= 3 || (current.length >= 2 && currentLength >= 240)) {
      flush();
    }
  }

  flush();

  return paragraphs;
}

function structurePlainTextBody(content: string) {
  const normalized = isolateImagePlaceholders(normalizeWhitespace(content));
  const { greeting, remainder } = splitGreeting(normalized);
  const { body, closing } = splitClosing(remainder);

  return [
    greeting,
    ...chunkBodyParagraphs(body),
    closing,
  ]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join("\n\n");
}

/**
 * Converts a regenerate response into editor-friendly HTML.
 *
 * The model often returns plain text. This formatter nudges raw text toward
 * email-shaped structure and then converts it into TipTap-friendly HTML so the
 * editor shows readable paragraphs instead of one long block.
 */
export function formatRegeneratedEmailBody(
  content: string,
  attachments: Attachment[],
) {
  if (!content.trim()) {
    return content;
  }

  if (content.includes("<")) {
    return content;
  }

  return migrateLegacyContent(structurePlainTextBody(content), attachments);
}
