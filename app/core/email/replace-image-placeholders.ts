import { generateContentId } from "./attachment-utils";
import type { Attachment } from "@/types/gmail";

/**
 * Replaces image placeholders in HTML with cid: references.
 *
 * This function scans the HTML for {{image:filename}} placeholders and replaces them
 * with <img src="cid:contentId"> tags. It also generates Content-IDs for inline images
 * that don't already have one.
 *
 * @param html - The HTML content containing {{image:filename}} placeholders
 * @param inlineImages - Array of inline image attachments
 * @returns Object containing:
 *   - html: Modified HTML with cid: references
 *   - contentIds: Map of filename -> contentId for all inline images
 */
export async function replaceImagePlaceholders(
  html: string,
  inlineImages: Attachment[]
): Promise<{ html: string; contentIds: Map<string, string> }> {
  const contentIds = new Map<string, string>();
  const filenameToIndex = new Map<string, number>();

  // Build a map of filenames to contentIds
  // Handle duplicate filenames by using index
  await Promise.all(
    inlineImages.map(async (image, index) => {
      const filename = image.filename;
      const count = filenameToIndex.get(filename) || 0;
      filenameToIndex.set(filename, count + 1);

      // Use existing contentId or generate a new one
      const contentId = image.contentId || await generateContentId(filename);
      contentIds.set(`${filename}:${count}`, contentId);
    })
  );

  // Replace {{image:filename}} placeholders
  let modifiedHtml = html;
  const placeholderRegex = /\{\{image:([^}]+)\}\}/g;
  let matchCount = 0;
  const usedPlaceholders = new Map<string, number>();

  modifiedHtml = html.replace(placeholderRegex, (match, filename) => {
    const trimmedFilename = filename.trim();
    const count = usedPlaceholders.get(trimmedFilename) || 0;
    usedPlaceholders.set(trimmedFilename, count + 1);
    matchCount++;

    const key = `${trimmedFilename}:${count}`;
    const contentId = contentIds.get(key);

    if (!contentId) {
      // Placeholder references a non-existent inline image
      // Return original placeholder or could return an error marker
      console.warn(`No inline image found for placeholder: ${match}`);
      return match;
    }

    // Return <img> tag with cid: reference
    // Include alt text for accessibility
    const altText = trimmedFilename.replace(/\.[^/.]+$/, ""); // Remove extension
    return `<img src="cid:${contentId}" alt="${altText}" />`;
  });

  if (matchCount > 0) {
    console.log(`Replaced ${matchCount} image placeholders with cid: references`);
  }

  return {
    html: modifiedHtml,
    contentIds,
  };
}

/**
 * Validates that all inline images referenced in placeholders exist.
 *
 * @param html - The HTML content containing {{image:filename}} placeholders
 * @param inlineImages - Array of inline image attachments
 * @returns Object with validation result and list of missing images
 */
function validateImagePlaceholders(
  html: string,
  inlineImages: Attachment[]
): { isValid: boolean; missingImages: string[] } {
  const placeholderRegex = /\{\{image:([^}]+)\}\}/g;
  const placeholders = new Set<string>();
  let match: RegExpExecArray | null;

  // Extract all unique placeholder filenames
  while ((match = placeholderRegex.exec(html)) !== null) {
    placeholders.add(match[1].trim());
  }

  // Check if each placeholder has a corresponding inline image
  const missingImages: string[] = [];
  const inlineFilenames = new Set(inlineImages.map((img) => img.filename));

  for (const placeholder of placeholders) {
    if (!inlineFilenames.has(placeholder)) {
      missingImages.push(placeholder);
    }
  }

  return {
    isValid: missingImages.length === 0,
    missingImages,
  };
}
