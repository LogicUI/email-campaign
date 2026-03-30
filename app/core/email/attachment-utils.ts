import type { Attachment } from "@/types/gmail";

/**
 * Generates a UUID v4 using Web Crypto API (client-side compatible).
 */
async function generateUUID(): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  if (typeof crypto !== "undefined") {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    array[6] = (array[6]! & 0x0f) | 0x40; // Version 4
    array[8] = (array[8]! & 0x3f) | 0x80; // Variant 10

    const hex = Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return [
      hex.substring(0, 8),
      hex.substring(8, 12),
      hex.substring(12, 16),
      hex.substring(16, 20),
      hex.substring(20, 32),
    ].join("-");
  }

  // Last resort fallback (Math.random-based, not cryptographically secure)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Gets the file extension from a filename.
 */
function extname(filename: string): string {
  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex === -1) {
    return "";
  }
  return filename.slice(lastDotIndex);
}

/**
 * MIME type mapping for common file extensions.
 */
const MIME_TYPES: Record<string, string> = {
  // Documents
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".rtf": "application/rtf",

  // Images
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",

  // Audio
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",

  // Video
  ".mp4": "video/mp4",
  ".avi": "video/x-msvideo",
  ".mov": "video/quicktime",
  ".wmv": "video/x-ms-wmv",
  ".flv": "video/x-flv",
  ".webm": "video/webm",

  // Archives
  ".zip": "application/zip",
  ".rar": "application/vnd.rar",
  ".7z": "application/x-7z-compressed",
  ".tar": "application/x-tar",
  ".gz": "application/gzip",

  // Other
  ".json": "application/json",
  ".xml": "application/xml",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".ts": "text/typescript",
};

/**
 * Allowed file extensions for security.
 */
const ALLOWED_EXTENSIONS = Object.keys(MIME_TYPES);

/**
 * Maximum attachment size in bytes (18 MB to account for base64 encoding overhead).
 * Gmail's limit is 25 MB total message size after encoding.
 */
export const MAX_ATTACHMENT_SIZE = 18 * 1024 * 1024;

/**
 * Maximum number of attachments per email.
 */
export const MAX_ATTACHMENTS_PER_EMAIL = 10;

const INLINE_IMAGE_MAX_DIMENSION = 1200;
const INLINE_IMAGE_TARGET_BYTES = 350 * 1024;
const INLINE_IMAGE_MIN_DIMENSION = 320;
const INLINE_IMAGE_INITIAL_DISPLAY_WIDTH = 640;

export interface InlineImageAttachmentResult {
  attachment: Attachment;
  warning?: string;
}

/**
 * Gets the MIME type for a file based on its extension.
 *
 * @param filename The name of the file.
 * @returns The MIME type string, or "application/octet-stream" if unknown.
 */
export function getMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

/**
 * Sanitizes a filename to prevent security issues.
 *
 * Removes path separators, control characters, and special characters
 * that could cause issues on different operating systems.
 *
 * IMPORTANT: Preserves the file extension (last dot) to ensure proper
 * MIME type detection and image display in email clients.
 *
 * @param filename The original filename.
 * @returns A sanitized filename safe for use in email headers.
 */
export function sanitizeFilename(filename: string): string {
  // Extract the file extension (last dot)
  const lastDotIndex = filename.lastIndexOf(".");

  let namePart: string;
  let extensionPart: string;

  if (lastDotIndex > 0 && lastDotIndex < filename.length - 1) {
    // Has extension: "image.jpg" → namePart="image", extensionPart=".jpg"
    namePart = filename.substring(0, lastDotIndex);
    extensionPart = filename.substring(lastDotIndex);
  } else {
    // No extension or hidden file: use entire filename
    namePart = filename;
    extensionPart = "";
  }

  // Sanitize only the name part (preserve extension as-is)
  let sanitizedName = namePart
    .replace(/[\/\\]/g, "_") // Remove path separators
    .replace(/\s+/g, "_") // Replace spaces with underscores (for email compatibility)
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .replace(/[<>:"|?*]/g, "_") // Remove Windows-invalid characters (replace each char)
    .substring(0, 255 - extensionPart.length); // Limit length (account for extension)

  // Remove trailing dots from the name part (not extension, not underscores/spaces)
  // This handles "file." → "file" but preserves "file_name"
  sanitizedName = sanitizedName.replace(/\.+$/, "");

  // Handle edge case: only dots in filename (e.g., "...") → return as-is
  if (namePart.match(/^\.+$/) && extensionPart === "") {
    return filename;
  }

  return sanitizedName + extensionPart;
}

/**
 * Validates whether a file extension is allowed.
 *
 * @param filename The name of the file.
 * @returns true if the file extension is allowed, false otherwise.
 */
export function isAllowedExtension(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Validates an attachment's size.
 *
 * @param size The size of the file in bytes.
 * @returns true if the file size is within limits, false otherwise.
 */
export function isValidAttachmentSize(size: number): boolean {
  return size > 0 && size <= MAX_ATTACHMENT_SIZE;
}

/**
 * Validates the total size of all attachments including encoding overhead.
 *
 * Base64 encoding increases file size by approximately 33%, so we need to
 * ensure the encoded total doesn't exceed Gmail's 25 MB limit.
 *
 * @param attachments Array of attachments to validate.
 * @returns true if total size is within limits, false otherwise.
 */
export function validateTotalAttachmentSize(attachments: Attachment[]): boolean {
  const totalSize = attachments.reduce((sum, att) => sum + (att.size || 0), 0);

  // Account for base64 encoding overhead (33% increase)
  const estimatedEncodedSize = totalSize * 1.33;

  // Gmail's limit is 25 MB (25 * 1024 * 1024 bytes)
  return estimatedEncodedSize <= 25 * 1024 * 1024;
}

/**
 * Validates the number of attachments.
 *
 * @param count The number of attachments.
 * @returns true if within limits, false otherwise.
 */
export function isValidAttachmentCount(count: number): boolean {
  return count > 0 && count <= MAX_ATTACHMENTS_PER_EMAIL;
}

/**
 * Validates an attachment for security and size constraints.
 *
 * @param attachment The attachment to validate.
 * @returns An object with isValid flag and error message if invalid.
 */
export function validateAttachment(attachment: Attachment): {
  isValid: boolean;
  error?: string;
} {
  // Check filename
  if (!attachment.filename || attachment.filename.trim().length === 0) {
    return { isValid: false, error: "Attachment filename is required" };
  }

  // Check allowed extension
  if (!isAllowedExtension(attachment.filename)) {
    return {
      isValid: false,
      error: `File type not allowed: ${extname(attachment.filename)}`,
    };
  }

  // Check size if provided
  if (attachment.size !== undefined && !isValidAttachmentSize(attachment.size)) {
    return {
      isValid: false,
      error: `Attachment too large: ${formatBytes(attachment.size)}. Maximum: ${formatBytes(MAX_ATTACHMENT_SIZE)}`,
    };
  }

  // Check data
  if (!attachment.data || attachment.data.length === 0) {
    return { isValid: false, error: "Attachment data is required" };
  }

  return { isValid: true };
}

/**
 * Validates multiple attachments.
 *
 * @param attachments Array of attachments to validate.
 * @returns An object with isValid flag and error message if invalid.
 */
export function validateAttachments(attachments: Attachment[]): {
  isValid: boolean;
  error?: string;
} {
  // Check count
  if (!isValidAttachmentCount(attachments.length)) {
    return {
      isValid: false,
      error: `Too many attachments. Maximum: ${MAX_ATTACHMENTS_PER_EMAIL}`,
    };
  }

  // Check each attachment
  for (let i = 0; i < attachments.length; i++) {
    const result = validateAttachment(attachments[i]);
    if (!result.isValid) {
      return {
        isValid: false,
        error: `Attachment ${i + 1} (${attachments[i].filename}): ${result.error}`,
      };
    }
  }

  // Check total size
  if (!validateTotalAttachmentSize(attachments)) {
    return {
      isValid: false,
      error: "Total attachment size exceeds Gmail's 25 MB limit",
    };
  }

  return { isValid: true };
}

/**
 * Formats bytes into a human-readable string.
 *
 * @param bytes The number of bytes.
 * @returns A formatted string like "1.5 MB".
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function replaceFilenameExtension(filename: string, extension: string) {
  const dotIndex = filename.lastIndexOf(".");

  if (dotIndex === -1) {
    return `${filename}${extension}`;
  }

  return `${filename.slice(0, dotIndex)}${extension}`;
}

async function blobToBase64(blob: Blob) {
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
) {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Image optimization failed while encoding the canvas."));
      },
      mimeType,
      quality,
    );
  });
}

async function loadBrowserImage(file: File) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Unable to read image "${file.name}".`));
    };

    image.src = objectUrl;
  });
}

async function loadBrowserImageSource(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose?: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);

      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      };
    } catch {
      // Fall through to the Image-based decoder for broader compatibility.
    }
  }

  const image = await loadBrowserImage(file);

  return {
    source: image,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  };
}

function detectCanvasTransparency(canvas: HTMLCanvasElement) {
  const sampleCanvas = document.createElement("canvas");
  const sampleContext = sampleCanvas.getContext("2d");

  if (!sampleContext) {
    return false;
  }

  sampleCanvas.width = Math.min(64, canvas.width);
  sampleCanvas.height = Math.min(64, canvas.height);
  sampleContext.drawImage(canvas, 0, 0, sampleCanvas.width, sampleCanvas.height);
  const { data } = sampleContext.getImageData(
    0,
    0,
    sampleCanvas.width,
    sampleCanvas.height,
  );

  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 250) {
      return true;
    }
  }

  return false;
}

function getScaledImageDimensions(width: number, height: number, scale: number) {
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function drawImageToCanvas(
  image: CanvasImageSource,
  width: number,
  height: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image optimization failed because the browser canvas is unavailable.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  return canvas;
}

async function optimizeInlineImageFile(file: File): Promise<Attachment> {
  if (
    typeof window === "undefined" ||
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml"
  ) {
    return fileToAttachment(file);
  }

  const loadedImage = await loadBrowserImageSource(file);
  const originalWidth = loadedImage.width;
  const originalHeight = loadedImage.height;

  try {
    if (!originalWidth || !originalHeight) {
      return fileToAttachment(file);
    }

    const maxDimensionScale = Math.min(
      1,
      INLINE_IMAGE_MAX_DIMENSION / Math.max(originalWidth, originalHeight),
    );

    let scale = maxDimensionScale;
    let quality = 0.82;
    let bestBlob: Blob | null = null;
    let bestWidth = originalWidth;
    let bestHeight = originalHeight;

    while (scale > 0) {
      const { width, height } = getScaledImageDimensions(
        originalWidth,
        originalHeight,
        scale,
      );
      const canvas = drawImageToCanvas(loadedImage.source, width, height);
      const hasTransparency =
        file.type === "image/png" || file.type === "image/webp"
          ? detectCanvasTransparency(canvas)
          : false;
      const outputType = hasTransparency ? "image/png" : "image/jpeg";
      const blob = await canvasToBlob(
        canvas,
        outputType,
        outputType === "image/jpeg" ? quality : undefined,
      );

      if (!bestBlob || blob.size < bestBlob.size) {
        bestBlob = blob;
        bestWidth = width;
        bestHeight = height;
      }

      if (blob.size <= INLINE_IMAGE_TARGET_BYTES) {
        bestBlob = blob;
        bestWidth = width;
        bestHeight = height;
        break;
      }

      if (outputType === "image/jpeg" && quality > 0.62) {
        quality -= 0.08;
        continue;
      }

      if (
        width <= INLINE_IMAGE_MIN_DIMENSION ||
        height <= INLINE_IMAGE_MIN_DIMENSION
      ) {
        break;
      }

      scale *= 0.85;
    }

    if (!bestBlob) {
      return fileToAttachment(file);
    }

    if (bestBlob.size >= file.size && scale === maxDimensionScale) {
      return fileToAttachment(file, {
        imageDimensions: {
          width: originalWidth,
          height: originalHeight,
        },
      });
    }

    const optimizedType = bestBlob.type || file.type;
    const optimizedFilename =
      optimizedType === file.type
        ? file.name
        : replaceFilenameExtension(
            file.name,
            optimizedType === "image/png" ? ".png" : ".jpg",
          );

    return {
      filename: sanitizeFilename(optimizedFilename),
      contentType: optimizedType,
      data: await blobToBase64(bestBlob),
      size: bestBlob.size,
      originalSize: file.size > bestBlob.size ? file.size : undefined,
      width: bestWidth,
      height: bestHeight,
    };
  } finally {
    loadedImage.dispose?.();
  }
}

export async function prepareInlineImageAttachment(
  file: File,
): Promise<InlineImageAttachmentResult> {
  try {
    return {
      attachment: await optimizeInlineImageFile(file),
    };
  } catch (optimizationError) {
    try {
      return {
        attachment: await fileToAttachment(file),
        warning:
          optimizationError instanceof Error
            ? `This image could not be optimized, so the original file was used instead.`
            : "This image could not be optimized, so the original file was used instead.",
      };
    } catch {
      throw optimizationError;
    }
  }
}

export function getInlineImageDisplayDimensions(
  attachment: Pick<Attachment, "width" | "height">,
  maxDisplayWidth = INLINE_IMAGE_INITIAL_DISPLAY_WIDTH,
) {
  if (!attachment.width || !attachment.height) {
    return {};
  }

  const displayWidth = Math.min(attachment.width, maxDisplayWidth);

  return {
    width: displayWidth,
    height: Math.round((attachment.height / attachment.width) * displayWidth),
  };
}

/**
 * Converts a file to an attachment object.
 *
 * This function should be used when processing uploaded files.
 * It reads the file, determines the MIME type, and creates an
 * attachment object ready for sending.
 *
 * @param file The file object (from a file upload).
 * @returns Promise resolving to an Attachment object.
 */
export async function fileToAttachment(
  file: File,
  options?: {
    originalSize?: number;
    imageDimensions?: {
      width: number;
      height: number;
    };
  },
): Promise<Attachment> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Data = buffer.toString("base64");

  return {
    filename: sanitizeFilename(file.name),
    contentType: getMimeType(file.name),
    data: base64Data,
    size: file.size,
    originalSize: options?.originalSize,
    width: options?.imageDimensions?.width,
    height: options?.imageDimensions?.height,
  };
}

/**
 * Checks if an attachment is an image based on its MIME type.
 *
 * @param attachment The attachment to check.
 * @returns true if the attachment is an image, false otherwise.
 */
export function isImageAttachment(attachment: Attachment): boolean {
  return attachment.contentType.startsWith("image/");
}

/**
 * Generates a unique Content-ID for inline images.
 *
 * Content-IDs are used in email to reference inline images via the cid: URL scheme.
 * Each inline image needs a unique Content-ID within the email.
 *
 * @param filename Optional filename to include in the Content-ID for debugging.
 * @returns A unique Content-ID string (e.g., "img_abc123def456").
 */
export async function generateContentId(filename?: string): Promise<string> {
  const uuid = await generateUUID();
  const uuidWithoutDashes = uuid.replaceAll("-", "");
  // Include first 8 chars of sanitized filename for debugging (optional)
  const sanitized = filename
    ? sanitizeFilename(filename).substring(0, 8).replaceAll(/[^a-zA-Z0-9]/g, "")
    : "";
  return `img_${sanitized}${uuidWithoutDashes}`;
}
