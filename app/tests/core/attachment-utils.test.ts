import { describe, expect, it } from "vitest";

import {
  fileToAttachment,
  formatBytes,
  getMimeType,
  isAllowedExtension,
  isValidAttachmentCount,
  isValidAttachmentSize,
  sanitizeFilename,
  validateAttachment,
  validateAttachments,
  validateTotalAttachmentSize,
} from "@/core/email/attachment-utils";
import type { Attachment } from "@/types/gmail";

describe("attachment-utils", () => {
  describe("getMimeType", () => {
    it("returns correct MIME type for common file extensions", () => {
      expect(getMimeType("document.pdf")).toBe("application/pdf");
      expect(getMimeType("image.jpg")).toBe("image/jpeg");
      expect(getMimeType("image.png")).toBe("image/png");
      expect(getMimeType("data.csv")).toBe("text/csv");
      expect(getMimeType("archive.zip")).toBe("application/zip");
    });

    it("returns application/octet-stream for unknown types", () => {
      expect(getMimeType("file.unknown")).toBe("application/octet-stream");
      expect(getMimeType("no_extension")).toBe("application/octet-stream");
    });

    it("handles case-insensitive extensions", () => {
      expect(getMimeType("document.PDF")).toBe("application/pdf");
      expect(getMimeType("image.PNG")).toBe("image/png");
    });
  });

  describe("sanitizeFilename", () => {
    it("removes path separators", () => {
      expect(sanitizeFilename("path/to/file.pdf")).toBe("path_to_file.pdf");
      expect(sanitizeFilename("path\\to\\file.pdf")).toBe("path_to_file.pdf");
    });

    it("removes Windows-invalid characters", () => {
      // * is replaced with _ but not counted in the result since we have 7 special chars
      expect(sanitizeFilename('file<>:"|?*.txt')).toBe("file_______.txt");
    });

    it("removes control characters", () => {
      expect(sanitizeFilename("file\x00\x01.txt")).toBe("file.txt");
    });

    it("limits filename length to 255 characters", () => {
      const longName = "a".repeat(300);
      expect(sanitizeFilename(longName)).toHaveLength(255);
    });

    it("handles empty strings", () => {
      expect(sanitizeFilename("")).toBe("");
    });

    it("preserves file extensions (CRITICAL for image display)", () => {
      // Basic extensions
      expect(sanitizeFilename("my photo.jpg")).toBe("my_photo.jpg");
      expect(sanitizeFilename("document.pdf")).toBe("document.pdf");
      expect(sanitizeFilename("image.png")).toBe("image.png");
      expect(sanitizeFilename("archive.tar.gz")).toBe("archive.tar.gz"); // Preserves last extension
    });

    it("handles filenames with spaces and special characters", () => {
      expect(sanitizeFilename("my image file.jpg")).toBe("my_image_file.jpg");
      expect(sanitizeFilename("report (final).pdf")).toBe("report_(final).pdf"); // Parentheses are valid
    });

    it("handles hidden files and dotfiles", () => {
      expect(sanitizeFilename(".hidden")).toBe(".hidden");
      expect(sanitizeFilename(".gitignore")).toBe(".gitignore");
    });

    it("handles files without extensions", () => {
      expect(sanitizeFilename("README")).toBe("README");
      expect(sanitizeFilename("my file")).toBe("my_file");
    });

    it("handles multiple dots correctly", () => {
      // Only the last dot should be preserved as the extension separator
      // Dots in the name part are preserved (they're valid in modern systems)
      expect(sanitizeFilename("my.file.name.jpg")).toBe("my.file.name.jpg");
      expect(sanitizeFilename("archive.tar.gz")).toBe("archive.tar.gz"); // .gz is the extension
    });

    it("handles edge cases with dots", () => {
      // File starting with dot (hidden file)
      expect(sanitizeFilename(".config.json")).toBe(".config.json");

      // File with dot at the end (no extension)
      expect(sanitizeFilename("file.")).toBe("file");

      // File with only dots
      expect(sanitizeFilename("...")).toBe("...");
    });
  });

  describe("isAllowedExtension", () => {
    it("returns true for allowed extensions", () => {
      expect(isAllowedExtension("document.pdf")).toBe(true);
      expect(isAllowedExtension("image.jpg")).toBe(true);
      expect(isAllowedExtension("data.csv")).toBe(true);
    });

    it("returns false for disallowed extensions", () => {
      expect(isAllowedExtension("script.exe")).toBe(false);
      expect(isAllowedExtension("unknown.xyz")).toBe(false);
    });
  });

  describe("isValidAttachmentSize", () => {
    it("returns true for valid sizes", () => {
      expect(isValidAttachmentSize(1)).toBe(true);
      expect(isValidAttachmentSize(10 * 1024 * 1024)).toBe(true); // 10 MB
      expect(isValidAttachmentSize(18 * 1024 * 1024)).toBe(true); // 18 MB (max)
    });

    it("returns false for sizes exceeding limit", () => {
      expect(isValidAttachmentSize(0)).toBe(false);
      expect(isValidAttachmentSize(19 * 1024 * 1024)).toBe(false); // 19 MB (too large)
      expect(isValidAttachmentSize(25 * 1024 * 1024)).toBe(false); // 25 MB
    });
  });

  describe("validateTotalAttachmentSize", () => {
    it("returns true when total size is within limits", () => {
      const attachments: Attachment[] = [
        { filename: "a.pdf", contentType: "application/pdf", data: "abcd", size: 10 * 1024 * 1024 },
        { filename: "b.pdf", contentType: "application/pdf", data: "efgh", size: 8 * 1024 * 1024 },
      ];
      expect(validateTotalAttachmentSize(attachments)).toBe(true);
    });

    it("returns false when total size exceeds limit", () => {
      const attachments: Attachment[] = [
        { filename: "a.pdf", contentType: "application/pdf", data: "abcd", size: 20 * 1024 * 1024 },
      ];
      expect(validateTotalAttachmentSize(attachments)).toBe(false);
    });
  });

  describe("isValidAttachmentCount", () => {
    it("returns true for valid counts", () => {
      expect(isValidAttachmentCount(1)).toBe(true);
      expect(isValidAttachmentCount(5)).toBe(true);
      expect(isValidAttachmentCount(10)).toBe(true);
    });

    it("returns false for invalid counts", () => {
      expect(isValidAttachmentCount(0)).toBe(false);
      expect(isValidAttachmentCount(11)).toBe(false);
      expect(isValidAttachmentCount(100)).toBe(false);
    });
  });

  describe("validateAttachment", () => {
    it("validates correct attachment", () => {
      const attachment: Attachment = {
        filename: "document.pdf",
        contentType: "application/pdf",
        data: Buffer.from("test").toString("base64"),
        size: 1024,
      };
      expect(validateAttachment(attachment)).toEqual({ isValid: true });
    });

    it("rejects empty filename", () => {
      const attachment: Attachment = {
        filename: "",
        contentType: "application/pdf",
        data: "abcd",
      };
      expect(validateAttachment(attachment)).toEqual({
        isValid: false,
        error: "Attachment filename is required",
      });
    });

    it("rejects disallowed file types", () => {
      const attachment: Attachment = {
        filename: "script.exe",
        contentType: "application/octet-stream",
        data: "abcd",
      };
      expect(validateAttachment(attachment)).toEqual({
        isValid: false,
        error: "File type not allowed: .exe",
      });
    });

    it("rejects oversized attachments", () => {
      const attachment: Attachment = {
        filename: "large.pdf",
        contentType: "application/pdf",
        data: "abcd",
        size: 25 * 1024 * 1024,
      };
      const result = validateAttachment(attachment);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("too large");
    });

    it("rejects empty data", () => {
      const attachment: Attachment = {
        filename: "document.pdf",
        contentType: "application/pdf",
        data: "",
      };
      expect(validateAttachment(attachment)).toEqual({
        isValid: false,
        error: "Attachment data is required",
      });
    });
  });

  describe("validateAttachments", () => {
    it("validates multiple attachments", () => {
      const attachments: Attachment[] = [
        {
          filename: "a.pdf",
          contentType: "application/pdf",
          data: Buffer.from("a").toString("base64"),
          size: 1024,
        },
        {
          filename: "b.jpg",
          contentType: "image/jpeg",
          data: Buffer.from("b").toString("base64"),
          size: 2048,
        },
      ];
      expect(validateAttachments(attachments)).toEqual({ isValid: true });
    });

    it("rejects too many attachments", () => {
      const attachments: Attachment[] = Array.from({ length: 11 }, (_, i) => ({
        filename: `file${i}.pdf`,
        contentType: "application/pdf",
        data: "abcd",
        size: 1024,
      }));
      expect(validateAttachments(attachments)).toEqual({
        isValid: false,
        error: "Too many attachments. Maximum: 10",
      });
    });

    it("rejects when total size exceeds limit", () => {
      const attachments: Attachment[] = [
        {
          filename: "huge.pdf",
          contentType: "application/pdf",
          data: "abcd",
          size: 20 * 1024 * 1024,
        },
      ];
      // First validation catches individual file size > 18 MB
      const result = validateAttachments(attachments);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("too large");
    });
  });

  describe("formatBytes", () => {
    it("formats bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 Bytes");
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1024 * 1024)).toBe("1 MB");
      expect(formatBytes(1536)).toBe("1.5 KB");
      expect(formatBytes(1024 * 1024 * 1.5)).toBe("1.5 MB");
    });
  });
});
