import type { Attachment } from "@/types/gmail";
import type { AttachmentSizeInfo, ValidationResult } from "@/types/attachment";
import {
  formatBytes,
  MAX_ATTACHMENT_SIZE,
  MAX_ATTACHMENTS_PER_EMAIL,
  validateAttachments,
} from "@/core/email/attachment-utils";

/**
 * Validates a file before adding to attachments
 *
 * Checks:
 * 1. Individual file size (18 MB limit)
 * 2. Maximum attachments count (10 files)
 * 3. Total size with encoding overhead (25 MB Gmail limit after base64)
 */
export function validateFileBeforeUpload(
  file: File,
  currentAttachments: Attachment[]
): ValidationResult {
  // Check individual file size
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return {
      valid: false,
      error: `"${file.name}" is ${formatBytes(file.size)}. Maximum: ${formatBytes(MAX_ATTACHMENT_SIZE)}`,
    };
  }

  // Check count limit
  if (currentAttachments.length >= MAX_ATTACHMENTS_PER_EMAIL) {
    return {
      valid: false,
      error: `Maximum ${MAX_ATTACHMENTS_PER_EMAIL} attachments allowed`,
    };
  }

  // Calculate total with encoding overhead
  const currentTotal = currentAttachments.reduce(
    (sum, att) => sum + (att.size || 0),
    0
  );
  const newTotal = currentTotal + file.size;
  const estimatedEncodedSize = newTotal * 1.33;
  const gmailLimit = 25 * 1024 * 1024;

  if (estimatedEncodedSize > gmailLimit) {
    const remainingRawBytes = gmailLimit / 1.33 - currentTotal;
    return {
      valid: false,
      error: `Only ${formatBytes(Math.max(0, remainingRawBytes))} remaining (after encoding overhead)`,
    };
  }

  return { valid: true };
}

/**
 * Calculates total attachment size info for display
 *
 * Returns:
 * - Raw size (before encoding)
 * - Estimated encoded size (after base64, ~33% increase)
 * - Usage percentage of Gmail's 25 MB limit
 * - Whether we're at/near the limit (>90%)
 */
export function calculateAttachmentSizeInfo(
  attachments: Attachment[]
): AttachmentSizeInfo {
  const totalRawSize = attachments.reduce(
    (sum, att) => sum + (att.size || 0),
    0
  );
  const estimatedEncodedSize = totalRawSize * 1.33;
  const gmailLimit = 25 * 1024 * 1024;
  const usagePercent = (estimatedEncodedSize / gmailLimit) * 100;

  return {
    totalRawSize,
    estimatedEncodedSize,
    usagePercent,
    atLimit: usagePercent > 90,
  };
}

/**
 * Validates all attachments before sending
 *
 * Performs comprehensive validation:
 * - Count limits
 * - Individual file sizes
 * - Total size with encoding overhead
 * - File types and extensions
 * - Attachment data integrity
 */
function validateAttachmentsForSend(
  attachments: Attachment[]
): ValidationResult {
  if (attachments.length === 0) {
    return { valid: true }; // No attachments is valid
  }

  // Use existing validateAttachments from attachment-utils
  const result = validateAttachments(attachments);

  if (!result.isValid) {
    return {
      valid: false,
      error: result.error || "Attachment validation failed",
    };
  }

  return { valid: true };
}
