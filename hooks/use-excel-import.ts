"use client";

import { useCallback, useState } from "react";

import { parseWorkbookFile } from "@/lib/excel/parse-workbook";
import { mapPreviewRows } from "@/lib/excel/map-preview-rows";
import { useCampaignStore } from "@/store/campaign-store";
import { selectImportPreview } from "@/store/selectors";

export function useExcelImport() {
  const preview = useCampaignStore(selectImportPreview);
  const setImportPreview = useCampaignStore((state) => state.setImportPreview);
  const setImporting = useCampaignStore((state) => state.setImporting);
  const [error, setError] = useState<string | null>(null);

  const onFileSelect = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }

      setError(null);
      setImporting(true);

      try {
        const nextPreview = await parseWorkbookFile(file);
        setImportPreview(nextPreview);
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
    [setImportPreview, setImporting],
  );

  const confirmEmailColumn = useCallback(
    (column: string) => {
      if (!preview) {
        return;
      }

      const rows = mapPreviewRows({
        rows: preview.rows.map((row) => row.raw),
        emailColumn: column,
      });

      setImportPreview({
        ...preview,
        selectedEmailColumn: column,
        rows,
        validCount: rows.filter((row) => row.isValid).length,
        invalidCount: rows.filter((row) => !row.isValid).length,
      });
    },
    [preview, setImportPreview],
  );

  const clearPreview = useCallback(() => {
    setImportPreview(null);
    setError(null);
  }, [setImportPreview]);

  return {
    preview,
    error,
    onFileSelect,
    confirmEmailColumn,
    clearPreview,
  };
}
