"use client";

import { useCallback, useEffect, useState } from "react";

import {
  clearUploadedWorkbook,
  loadUploadedWorkbook,
  rebuildUploadedWorkbookFiles,
  saveUploadedWorkbooks,
} from "@/core/excel/persist-uploaded-workbook";
import {
  buildImportPreview,
  mergeImportPreviews,
} from "@/core/excel/build-import-preview";
import { parseWorkbookFile } from "@/core/excel/parse-workbook";
import { useCampaignStore } from "@/store/campaign-store";
import { selectImportPreview } from "@/store/selectors";
import type { SavedWorkbookRecord } from "@/types/campaign";

export function useExcelImport() {
  const preview = useCampaignStore(selectImportPreview);
  const setImportPreview = useCampaignStore((state) => state.setImportPreview);
  const setImporting = useCampaignStore((state) => state.setImporting);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedWorkbook, setSavedWorkbook] = useState<SavedWorkbookRecord | null>(null);

  useEffect(() => {
    setSavedWorkbook(loadUploadedWorkbook());
  }, []);

  const buildPreviewFromFiles = useCallback(
    async (
      files: File[],
      preferredColumns?: {
        emailColumn?: string;
        recipientColumn?: string;
      },
    ) => {
      const parsedPreviews = await Promise.all(files.map((file) => parseWorkbookFile(file)));

      return mergeImportPreviews(parsedPreviews, preferredColumns);
    },
    [],
  );

  const onFilesSelect = useCallback(
    async (
      files: FileList | File[] | null,
      options?: {
        append?: boolean;
      },
    ) => {
      const selectedFiles = Array.from(files ?? []);

      if (selectedFiles.length === 0) {
        return;
      }

      const append = options?.append ?? false;
      setError(null);
      setNotice(null);
      setImporting(true);

      try {
        const parsedPreviews = await Promise.all(selectedFiles.map((file) => parseWorkbookFile(file)));
        const nextPreview =
          append && preview
            ? mergeImportPreviews([preview, ...parsedPreviews], {
                emailColumn: preview.selectedEmailColumn,
                recipientColumn: preview.selectedRecipientColumn,
              })
            : mergeImportPreviews(parsedPreviews);

        setImportPreview(nextPreview);

        try {
          const existingFiles =
            append && savedWorkbook ? rebuildUploadedWorkbookFiles(savedWorkbook) : [];
          const savedRecord = await saveUploadedWorkbooks([
            ...existingFiles,
            ...selectedFiles,
          ]);
          setSavedWorkbook(savedRecord);
        } catch {
          setNotice("File uploaded, but it could not be saved locally for reuse.");
        }
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to parse the uploaded file.",
        );
      } finally {
        setImporting(false);
      }
    },
    [preview, savedWorkbook, setImportPreview, setImporting],
  );

  const onFileSelect = useCallback(
    async (file: File | null) => {
      await onFilesSelect(file ? [file] : null);
    },
    [onFilesSelect],
  );

  const restoreSavedWorkbook = useCallback(async () => {
    setError(null);
    setNotice(null);

    const savedRecord = loadUploadedWorkbook();

    if (!savedRecord) {
      setSavedWorkbook(null);
      setError("No saved workbook is available in this browser.");
      return false;
    }

    setImporting(true);

    try {
      const restoredFiles = rebuildUploadedWorkbookFiles(savedRecord);
      const nextPreview = await buildPreviewFromFiles(restoredFiles);
      setImportPreview(nextPreview);
      setSavedWorkbook(savedRecord);
      return true;
    } catch (caughtError) {
      clearUploadedWorkbook();
      setSavedWorkbook(null);
      setError(
        caughtError instanceof Error
          ? `Saved workbook could not be restored. ${caughtError.message}`
          : "Saved workbook could not be restored. Please upload it again.",
      );
      return false;
    } finally {
      setImporting(false);
    }
  }, [buildPreviewFromFiles, setImportPreview, setImporting]);

  const restoreSavedWorkbookWithFiles = useCallback(
    async (files: FileList | File[] | null) => {
      const selectedFiles = Array.from(files ?? []);

      if (selectedFiles.length === 0) {
        return false;
      }

      setError(null);
      setNotice(null);

      const savedRecord = loadUploadedWorkbook();

      if (!savedRecord) {
        setSavedWorkbook(null);
        setError("No saved workbook is available in this browser.");
        return false;
      }

      setImporting(true);

      try {
        const restoredFiles = rebuildUploadedWorkbookFiles(savedRecord);
        const allFiles = [...restoredFiles, ...selectedFiles];
        const nextPreview = await buildPreviewFromFiles(allFiles);
        setImportPreview(nextPreview);

        try {
          const nextSavedRecord = await saveUploadedWorkbooks(allFiles);
          setSavedWorkbook(nextSavedRecord);
        } catch {
          setSavedWorkbook(savedRecord);
          setNotice("Files were added, but the updated workbook set could not be saved locally.");
        }

        return true;
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to parse the uploaded file.",
        );
        return false;
      } finally {
        setImporting(false);
      }
    },
    [buildPreviewFromFiles, setImportPreview, setImporting],
  );

  const rebuildPreview = useCallback(
    (params: {
      emailColumn?: string;
      recipientColumn?: string;
    }) => {
      if (!preview) {
        return;
      }

      setImportPreview(
        buildImportPreview({
          preferredEmailColumn: params.emailColumn || undefined,
          preferredRecipientColumn: params.recipientColumn || undefined,
          savedListId: preview.savedListId,
          sourceType: preview.sourceType,
          googleSpreadsheetId: preview.googleSpreadsheetId,
          googleSpreadsheetUrl: preview.googleSpreadsheetUrl,
          databaseConnectionLabel: preview.databaseConnectionLabel,
          databaseTableName: preview.databaseTableName,
          sourceFiles: preview.sourceFiles,
          sourceRows: preview.sourceRows,
        }),
      );
    },
    [preview, setImportPreview],
  );

  const confirmEmailColumn = useCallback(
    (column: string) => {
      if (!preview) {
        return;
      }

      rebuildPreview({
        emailColumn: column,
        recipientColumn:
          preview.selectedRecipientColumn === column
            ? undefined
            : preview.selectedRecipientColumn,
      });
    },
    [preview, rebuildPreview],
  );

  const confirmRecipientColumn = useCallback(
    (column: string) => {
      if (!preview) {
        return;
      }

      rebuildPreview({
        emailColumn: preview.selectedEmailColumn,
        recipientColumn:
          column && column !== preview.selectedEmailColumn ? column : undefined,
      });
    },
    [preview, rebuildPreview],
  );

  const clearPreview = useCallback(() => {
    setImportPreview(null);
    setError(null);
    setNotice(null);
  }, [setImportPreview]);

  const removeImportedFile = useCallback(
    async (fileName: string) => {
      if (!preview) {
        return;
      }

      const nextSourceFiles = preview.sourceFiles.filter((file) => file.fileName !== fileName);
      const nextSourceRows = preview.sourceRows.filter((row) => row.sourceFileName !== fileName);

      setError(null);
      setNotice(null);

      if (nextSourceFiles.length === 0 || nextSourceRows.length === 0) {
        setImportPreview(null);

        if (savedWorkbook) {
          clearUploadedWorkbook();
          setSavedWorkbook(null);
        }

        return;
      }

      setImportPreview(
        buildImportPreview({
          preferredEmailColumn: preview.selectedEmailColumn,
          preferredRecipientColumn: preview.selectedRecipientColumn,
          sourceFiles: nextSourceFiles,
          sourceRows: nextSourceRows,
        }),
      );

      if (!savedWorkbook) {
        return;
      }

      try {
        const remainingFiles = rebuildUploadedWorkbookFiles(savedWorkbook).filter(
          (file) => file.name !== fileName,
        );

        if (remainingFiles.length === 0) {
          clearUploadedWorkbook();
          setSavedWorkbook(null);
          return;
        }

        const nextSavedRecord = await saveUploadedWorkbooks(remainingFiles);
        setSavedWorkbook(nextSavedRecord);
      } catch {
        setNotice("The file was removed from the preview, but the saved workbook set could not be updated.");
      }
    },
    [preview, savedWorkbook, setImportPreview],
  );

  const removeSavedWorkbookFiles = useCallback(
    async (fileKeys: string[]) => {
      const currentSavedWorkbook = loadUploadedWorkbook();

      if (!currentSavedWorkbook) {
        return null;
      }

      setError(null);
      setNotice(null);

      // Create a set of file keys to remove
      const filesToRemoveSet = new Set(fileKeys);

      // Filter out the specified files
      const remainingFiles = currentSavedWorkbook.files.filter(
        (file) => !filesToRemoveSet.has(`${file.fileName}-${file.lastModified}`),
      );

      // If no files remain, clear everything
      if (remainingFiles.length === 0) {
        clearUploadedWorkbook();
        setSavedWorkbook(null);
        return null;
      }

      // Save the updated workbook
      try {
        // Create a temporary saved workbook record with remaining files
        const tempRecord: SavedWorkbookRecord = {
          version: currentSavedWorkbook.version,
          savedAt: currentSavedWorkbook.savedAt,
          files: remainingFiles,
        };

        // Rebuild the files from the filtered record
        const rebuiltFiles = rebuildUploadedWorkbookFiles(tempRecord);

        const nextSavedRecord = await saveUploadedWorkbooks(rebuiltFiles);
        setSavedWorkbook(nextSavedRecord);
        return nextSavedRecord;
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to update the saved workbook.",
        );
        return currentSavedWorkbook;
      }
    },
    [setSavedWorkbook],
  );

  return {
    preview,
    error,
    notice,
    savedWorkbook,
    hasSavedWorkbook: Boolean(savedWorkbook),
    onFilesSelect,
    onFileSelect,
    restoreSavedWorkbook,
    restoreSavedWorkbookWithFiles,
    confirmEmailColumn,
    confirmRecipientColumn,
    removeImportedFile,
    removeSavedWorkbookFiles,
    clearPreview,
  };
}
