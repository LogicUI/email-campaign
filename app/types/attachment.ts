import type { Attachment } from "./gmail";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface AttachmentSizeInfo {
  totalRawSize: number;
  estimatedEncodedSize: number;
  usagePercent: number;
  atLimit: boolean;
}
