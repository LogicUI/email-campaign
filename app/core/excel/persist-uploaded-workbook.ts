"use client";

import type {
  LegacySavedWorkbookRecord,
  SavedWorkbookFileRecord,
  SavedWorkbookRecord,
} from "@/types/campaign";

const SAVED_WORKBOOK_STORAGE_KEY = "emailai-saved-workbook";
const SAVED_WORKBOOK_VERSION = 2;
const BYTE_CHUNK_SIZE = 0x8000;

/**
 * Guards workbook persistence so the helpers no-op safely during SSR.
 *
 * @returns `true` when `window` APIs are available.
 */
function isBrowserEnvironment() {
  return typeof window !== "undefined";
}

/**
 * Serializes a workbook file buffer into base64 for localStorage persistence.
 *
 * localStorage only accepts strings, so uploaded workbook bytes must be encoded
 * before they can be cached for later restore.
 *
 * @param arrayBuffer Raw workbook bytes.
 * @returns Base64-encoded representation of the file.
 */
function encodeArrayBufferToBase64(arrayBuffer: ArrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";

  for (let index = 0; index < bytes.length; index += BYTE_CHUNK_SIZE) {
    const chunk = bytes.subarray(index, index + BYTE_CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }

  return window.btoa(binary);
}

/**
 * Decodes a base64 workbook payload back into raw bytes.
 *
 * @param dataBase64 Base64-encoded workbook payload from storage.
 * @returns Byte array ready to rebuild into a `File`.
 */
function decodeBase64ToUint8Array(dataBase64: string) {
  const binary = window.atob(dataBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

/**
 * Reads a browser `File` into an ArrayBuffer in a compatibility-friendly way.
 *
 * @param file Uploaded browser file object.
 * @returns Raw file bytes.
 */
async function readFileAsArrayBuffer(file: File) {
  if (typeof file.arrayBuffer === "function") {
    return file.arrayBuffer();
  }

  return new Response(file).arrayBuffer();
}

/**
 * Validates and upgrades a stored workbook record from localStorage.
 *
 * This exists because the workbook cache format has already evolved once. The
 * function protects restore flows from malformed data and upgrades legacy v1 records
 * into the current multi-file format.
 *
 * @param value Parsed JSON value from localStorage.
 * @returns Valid saved workbook record or `null` when the payload is unusable.
 */
function parseSavedWorkbookRecord(value: unknown): SavedWorkbookRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.version === 1) {
    const legacyCandidate = candidate as unknown as LegacySavedWorkbookRecord;

    if (
      typeof legacyCandidate.fileName !== "string" ||
      typeof legacyCandidate.mimeType !== "string" ||
      typeof legacyCandidate.size !== "number" ||
      typeof legacyCandidate.savedAt !== "string" ||
      typeof legacyCandidate.dataBase64 !== "string"
    ) {
      return null;
    }

    return {
      version: SAVED_WORKBOOK_VERSION,
      savedAt: legacyCandidate.savedAt,
      files: [
        {
          fileName: legacyCandidate.fileName,
          mimeType: legacyCandidate.mimeType,
          size: legacyCandidate.size,
          lastModified: Date.parse(legacyCandidate.savedAt) || Date.now(),
          dataBase64: legacyCandidate.dataBase64,
        },
      ],
    };
  }

  return {
    version: SAVED_WORKBOOK_VERSION,
    savedAt:
      typeof candidate.savedAt === "string"
        ? candidate.savedAt
        : new Date().toISOString(),
    files: Array.isArray(candidate.files)
      ? candidate.files.filter(
          (file): file is SavedWorkbookFileRecord =>
            !!file &&
            typeof file === "object" &&
            typeof (file as SavedWorkbookFileRecord).fileName === "string" &&
            typeof (file as SavedWorkbookFileRecord).mimeType === "string" &&
            typeof (file as SavedWorkbookFileRecord).size === "number" &&
            typeof (file as SavedWorkbookFileRecord).lastModified === "number" &&
            typeof (file as SavedWorkbookFileRecord).dataBase64 === "string",
        )
      : [],
  };
}

/**
 * Converts one uploaded file into the persisted workbook-file record shape.
 *
 * @param file Uploaded workbook file.
 * @returns Serializable file record containing metadata and base64 payload.
 */
async function serializeWorkbookFile(file: File): Promise<SavedWorkbookFileRecord> {
  const arrayBuffer = await readFileAsArrayBuffer(file);

  return {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    lastModified: file.lastModified || Date.now(),
    dataBase64: encodeArrayBufferToBase64(arrayBuffer),
  };
}

/**
 * Persists the current workbook file set into browser localStorage.
 *
 * This supports the "reupload" and restore workflows so users can reuse the most
 * recent workbook bundle without selecting the files again.
 *
 * @param files Workbook files to persist locally.
 * @returns The saved workbook record that was written to localStorage.
 */
export async function saveUploadedWorkbooks(files: File[]): Promise<SavedWorkbookRecord> {
  if (!isBrowserEnvironment()) {
    throw new Error("Workbook persistence is available only in the browser.");
  }

  const serializedFiles = await Promise.all(files.map((file) => serializeWorkbookFile(file)));
  const record: SavedWorkbookRecord = {
    version: SAVED_WORKBOOK_VERSION,
    savedAt: new Date().toISOString(),
    files: serializedFiles,
  };

  window.localStorage.setItem(SAVED_WORKBOOK_STORAGE_KEY, JSON.stringify(record));

  return record;
}

/**
 * Backward-compatible single-file wrapper around `saveUploadedWorkbooks`.
 *
 * @param file Workbook file to persist.
 * @returns Saved workbook record containing the one file.
 */
export async function saveUploadedWorkbook(file: File): Promise<SavedWorkbookRecord> {
  return saveUploadedWorkbooks([file]);
}

/**
 * Loads the last saved workbook bundle from localStorage.
 *
 * Invalid or corrupted records are cleared eagerly so later restore attempts do not
 * keep failing on the same bad payload.
 *
 * @returns Saved workbook record or `null` when none is available.
 */
export function loadUploadedWorkbook(): SavedWorkbookRecord | null {
  if (!isBrowserEnvironment()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(SAVED_WORKBOOK_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedRecord = parseSavedWorkbookRecord(JSON.parse(rawValue));

    if (!parsedRecord || parsedRecord.files.length === 0) {
      clearUploadedWorkbook();
      return null;
    }

    return parsedRecord;
  } catch {
    clearUploadedWorkbook();
    return null;
  }
}

/**
 * Deletes the locally cached workbook bundle from browser storage.
 */
export function clearUploadedWorkbook() {
  if (!isBrowserEnvironment()) {
    return;
  }

  window.localStorage.removeItem(SAVED_WORKBOOK_STORAGE_KEY);
}

/**
 * Rebuilds persisted workbook file records into browser `File` objects.
 *
 * @param record Saved workbook bundle loaded from localStorage.
 * @returns Array of reconstructed files suitable for re-import.
 */
export function rebuildUploadedWorkbookFiles(record: SavedWorkbookRecord) {
  return record.files.map((file) => {
    const bytes = decodeBase64ToUint8Array(file.dataBase64);

    return new File([bytes], file.fileName, {
      type: file.mimeType || "application/octet-stream",
      lastModified: file.lastModified,
    });
  });
}

/**
 * Convenience helper that returns only the first restored workbook file.
 *
 * This is kept for the older single-file code paths that still expect one `File`.
 *
 * @param record Saved workbook bundle loaded from localStorage.
 * @returns First reconstructed file in the bundle.
 */
export function rebuildUploadedWorkbookFile(record: SavedWorkbookRecord) {
  return rebuildUploadedWorkbookFiles(record)[0];
}
