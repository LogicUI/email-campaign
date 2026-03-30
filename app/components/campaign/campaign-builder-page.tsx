"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";

import { useBulkSend } from "@/hooks/use-bulk-send";
import { useCampaignBuilder } from "@/hooks/use-campaign-builder";
import { useExcelImport } from "@/hooks/use-excel-import";
import { useRecipientPagination } from "@/hooks/use-recipient-pagination";
import { useCampaignStore } from "@/store/campaign-store";
import { selectRecipientOrder, selectRecipientsById, selectUi } from "@/store/selectors";
import { useSaveDatabaseImportMutation } from "@/tanStack/database";
import type { CampaignRecipient, ImportPreview } from "@/types/campaign";
import { CampaignActionBar } from "@/components/campaign/campaign-action-bar";
import { CampaignHeaderBar } from "@/components/campaign/campaign-header-bar";
import { SendSummaryBar } from "@/components/campaign/send-summary-bar";
import { FileUploadDropzone } from "@/components/data-import/file-upload-dropzone";
import { RecipientList } from "@/components/recipient/recipient-list";
import { RecipientPaginationBar } from "@/components/recipient/recipient-pagination-bar";
import { RecipientStatusTabs } from "@/components/recipient/recipient-status-tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useDatabaseSessionStore } from "@/store/database-session-store";
import type { CampaignBuilderPageProps } from "@/types/campaign-builder-page";

const CampaignComposeDialog = dynamic(
  () => import("@/components/campaign/campaign-compose-dialog").then((mod) => mod.CampaignComposeDialog),
);
const ReuploadWorkbookDialog = dynamic(
  () =>
    import("@/components/campaign/reupload-workbook-dialog").then(
      (mod) => mod.ReuploadWorkbookDialog,
    ),
);
const DatabaseSourceDialog = dynamic(
  () =>
    import("@/components/database/database-source-dialog").then(
      (mod) => mod.DatabaseSourceDialog,
    ),
);
const GoogleDriveImportDialog = dynamic(
  () =>
    import("@/components/google/google-drive-import-dialog").then(
      (mod) => mod.GoogleDriveImportDialog,
    ),
);
const ImportPreviewDialog = dynamic(
  () =>
    import("@/components/data-import/import-preview-dialog").then(
      (mod) => mod.ImportPreviewDialog,
    ),
);
const DatabaseSettingsDialog = dynamic(
  () =>
    import("@/components/settings/database-settings-dialog").then(
      (mod) => mod.DatabaseSettingsDialog,
    ),
);

export function CampaignBuilderPage({
  connectionProfiles = [],
  onOpenDashboard,
  onOpenDatabaseSettings,
  onSavedDataChange,
  senderEmail = "authenticated@example.com",
}: CampaignBuilderPageProps) {
  const reuploadInputRef = useRef<HTMLInputElement | null>(null);
  const [reuploadDialogOpen, setReuploadDialogOpen] = useState(false);
  const [reuploadInputMode, setReuploadInputMode] = useState<"replace" | "append">("replace");
  const [databaseImportDialogOpen, setDatabaseImportDialogOpen] = useState(false);
  const [databaseSourceDialogOpen, setDatabaseSourceDialogOpen] = useState(false);
  const [googleImportDialogOpen, setGoogleImportDialogOpen] = useState(false);
  const activeConnection = useDatabaseSessionStore((state) => state.activeConnection);
  const ui = useCampaignStore(selectUi);
  const recipientOrder = useCampaignStore(selectRecipientOrder);
  const recipientsById = useCampaignStore(selectRecipientsById);
  const dismissRestoredDraftWarning = useCampaignStore(
    (state) => state.dismissRestoredDraftWarning,
  );
  const setImportPreview = useCampaignStore((state) => state.setImportPreview);
  const toggleRecipientsChecked = useCampaignStore((state) => state.toggleRecipientsChecked);
  const saveImportMutation = useSaveDatabaseImportMutation();
  const {
    canStartCampaign,
    campaign,
    closeComposeDialog,
    composeDialogOpen,
    createCampaignFromPreview,
    addManualRecipient,
    openComposeDialog,
    preview,
    resetSession,
    updateGlobalTemplate,
  } = useCampaignBuilder();
  const {
    clearPreview,
    confirmEmailColumn,
    confirmRecipientColumn,
    error,
    hasSavedWorkbook,
    notice,
    onFilesSelect,
    removeImportedFile,
    removeSavedWorkbookFiles,
    restoreSavedWorkbook,
    restoreSavedWorkbookWithFiles,
    savedWorkbook,
  } = useExcelImport();
  const {
    currentPage,
    pageSize,
    recipientStatusView,
    sentCount,
    setCurrentPage,
    setPageSize,
    setRecipientStatusView,
    totalPages,
    totalRecipients,
    unsentCount,
    visibleIds,
  } = useRecipientPagination();
  const bulkSend = useBulkSend({
    onSavedDataChange,
  });

  const previewOpen = Boolean(preview && !composeDialogOpen && !campaign);
  const hasActiveSession = Boolean(preview || composeDialogOpen || campaign);

  const composeDefaults = useMemo(() => {
    if (!campaign) {
      return null;
    }

    return campaign;
  }, [campaign]);

  const canAppendFiles = Boolean((preview && !campaign) || composeDialogOpen || hasSavedWorkbook);

  const openReuploadFlow = () => {
    setReuploadDialogOpen(true);
  };

  const savedWorkbookLabel = savedWorkbook
    ? savedWorkbook.files.length === 1
      ? savedWorkbook.files[0].fileName
      : `${savedWorkbook.files[0].fileName} + ${savedWorkbook.files.length - 1} more`
    : undefined;

  const hasUnsavedImport = Boolean(
    campaign &&
    !campaign.savedListId
  );

  const buildImportPreviewFromCampaign = (
    campaignData: typeof campaign,
    recipientsList: CampaignRecipient[],
  ): ImportPreview => {
    if (!campaignData) {
      throw new Error("Campaign data is required");
    }

    // Extract headers from first recipient's fields
    const firstRecipient = recipientsList[0];
    const headers = firstRecipient?.fields ? Object.keys(firstRecipient.fields) : [];

    // Build unique source files list
    const sourceFilesMap = new Map<string, { fileName: string; sheetName?: string }>();
    recipientsList.forEach((recipient) => {
      if (recipient.sourceFileName && !sourceFilesMap.has(recipient.sourceFileName)) {
        sourceFilesMap.set(recipient.sourceFileName, {
          fileName: recipient.sourceFileName,
          sheetName: recipient.sourceSheetName,
        });
      }
    });

    // Reconstruct source rows
    const sourceRows = recipientsList.map((recipient) => ({
      raw: recipient.fields,
      sourceFileName: recipient.sourceFileName || campaignData.importedFileName,
      originalRowIndex: recipient.rowIndex,
    }));

    // Build preview rows
    const rows = recipientsList.map((recipient) => ({
      tempId: recipient.id,
      rowIndex: recipient.rowIndex,
      email: recipient.email,
      recipient: recipient.recipient || recipient.email,
      sourceFileName: recipient.sourceFileName || campaignData.importedFileName,
      sourceSheetName: recipient.sourceSheetName,
      isValid: true,
      invalidReason: undefined,
      fields: recipient.fields,
      raw: recipient.fields,
    }));

    return {
      fileName: campaignData.importedFileName,
      sheetName: campaignData.importedSheetName,
      sourceFiles: Array.from(sourceFilesMap.values()),
      sourceRows,
      headers,
      rows,
      validCount: campaignData.validRows,
      invalidCount: campaignData.invalidRows,
      candidateEmailColumns: campaignData.detectedEmailColumn ? [campaignData.detectedEmailColumn] : [],
      candidateRecipientColumns: campaignData.detectedRecipientColumn ? [campaignData.detectedRecipientColumn] : [],
      selectedEmailColumn: campaignData.detectedEmailColumn,
      selectedRecipientColumn: campaignData.detectedRecipientColumn,
    };
  };

  const handleSaveToDatabase = async () => {
    // Check if database is connected
    if (!activeConnection) {
      setDatabaseImportDialogOpen(true);
      return;
    }

    if (!campaign) return;

    // Get all recipients
    const recipients = recipientOrder.map((id) => recipientsById[id]).filter(Boolean);

    try {
      // Reconstruct import preview from campaign data
      const preview = buildImportPreviewFromCampaign(campaign, recipients);

      // Create save payload
      const payload = {
        connection: activeConnection,
        saveName: `${campaign.name} list`,
        preview,
        mode: "app_only" as const,
        mappings: [],
      };

      // Execute save
      const response = await saveImportMutation.mutateAsync(payload);

      // Update campaign with savedListId
      const currentCampaign = useCampaignStore.getState().campaign;
      if (currentCampaign) {
        useCampaignStore.setState({
          campaign: {
            ...currentCampaign,
            savedListId: response.savedList.id,
            databaseConnectionLabel: activeConnection.label,
            databaseTableName: response.destinationTableName,
          },
        });
      }

      // Refresh saved data
      await onSavedDataChange?.();
    } catch (error) {
      console.error("Failed to save campaign to database:", error);
    }
  };

  return (
    <section className="app-shell" aria-label="Campaign workspace">
      <div className="container py-6 md:py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          {ui.restoredDraftWarning ? (
            <Alert className="border-amber-300 bg-amber-50 text-amber-950">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <AlertTitle>Inline images need to be re-added</AlertTitle>
                    <AlertDescription className="text-amber-900/80">
                      {ui.restoredDraftWarning}
                    </AlertDescription>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-amber-900 hover:bg-amber-100 hover:text-amber-950"
                  onClick={dismissRestoredDraftWarning}
                >
                  Dismiss
                </Button>
              </div>
            </Alert>
          ) : null}
          {hasActiveSession ? (
            <CampaignActionBar
              hasCampaign={Boolean(campaign)}
              onOpenDashboard={onOpenDashboard}
              onOpenDatabaseSettings={() => onOpenDatabaseSettings?.()}
              onEditTemplate={openComposeDialog}
              onReupload={openReuploadFlow}
            />
          ) : null}
          {campaign ? (
            <>
              <CampaignHeaderBar
                campaign={campaign}
                senderEmail={senderEmail}
              />
              <SendSummaryBar
                checkedCount={bulkSend.checkedCount}
                failedCount={bulkSend.failedCount}
                isSending={bulkSend.isSending}
                progress={bulkSend.progress}
                error={bulkSend.error}
                onAddRecipient={addManualRecipient}
                onClearAllSelected={() => toggleRecipientsChecked(recipientOrder, false)}
                onSendSelected={bulkSend.sendSelected}
                hasUnsavedImport={hasUnsavedImport}
                onSaveToDatabase={handleSaveToDatabase}
              />
              <RecipientStatusTabs
                value={recipientStatusView}
                sentCount={sentCount}
                unsentCount={unsentCount}
                onValueChange={setRecipientStatusView}
              />
              <RecipientPaginationBar
                currentPage={currentPage}
                recipientLabel={recipientStatusView}
                totalPages={totalPages}
                pageSize={pageSize}
                totalRecipients={totalRecipients}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
              <RecipientList
                recipientIds={visibleIds}
                senderEmail={senderEmail}
                emptyStateMessage={
                  recipientStatusView === "sent"
                    ? "No sent recipients saved in this browser yet."
                    : "No unsent recipients remaining in this browser view."
                }
              />
            </>
          ) : (
            <div className="grid gap-8">
              <div className="mx-auto max-w-2xl rounded-[2rem] border bg-white/70 p-8">
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                  Workflow
                </p>
                <ol className="mt-4 space-y-4 text-sm text-muted-foreground">
                  <li>1. Sign in with Google to unlock the protected workspace.</li>
                  <li>2. Upload one or more CSV or Excel files with flexible lead columns.</li>
                  <li>3. Confirm the email and recipient columns, then review invalid rows.</li>
                  <li>4. Define one global subject and body template.</li>
                  <li>5. Edit, regenerate, paginate, select, and send drafts.</li>
                  <li>6. The latest uploaded workbook is saved locally for quick reuse.</li>
                </ol>
              </div>
              <FileUploadDropzone
                isImporting={ui.isImporting}
                error={error}
                notice={notice}
                onFilesSelect={onFilesSelect}
                onImportFromDatabase={() => setDatabaseSourceDialogOpen(true)}
                onImportFromGoogle={() => setGoogleImportDialogOpen(true)}
                onRestoreSavedFile={hasSavedWorkbook ? restoreSavedWorkbook : undefined}
                savedWorkbookLabel={savedWorkbookLabel}
              />
            </div>
          )}
        </div>
      </div>

      <input
        ref={reuploadInputRef}
        className="sr-only"
        type="file"
        aria-label="Reupload files"
        accept=".csv,.xlsx,.xls"
        multiple
        onChange={async (event) => {
          if (!event.target.files?.length) {
            return;
          }

          const selectedFiles = event.target.files;
          const nextMode = reuploadInputMode;
          setReuploadDialogOpen(false);

          if (nextMode === "append") {
            if (campaign) {
              resetSession();

              if (hasSavedWorkbook) {
                await restoreSavedWorkbookWithFiles(selectedFiles);
              } else {
                await onFilesSelect(selectedFiles);
              }
            } else {
              if (composeDialogOpen) {
                closeComposeDialog();
              }

              if (preview) {
                await onFilesSelect(selectedFiles, { append: true });
              } else if (hasSavedWorkbook) {
                resetSession();
                await restoreSavedWorkbookWithFiles(selectedFiles);
              } else {
                await onFilesSelect(selectedFiles);
              }
            }
          } else {
            resetSession();
            await onFilesSelect(selectedFiles);
          }

          event.target.value = "";
        }}
      />

      <ReuploadWorkbookDialog
        canAddFiles={canAppendFiles}
        open={reuploadDialogOpen}
        savedWorkbook={savedWorkbook}
        onOpenChange={setReuploadDialogOpen}
        onAddFiles={() => {
          setReuploadInputMode("append");
          reuploadInputRef.current?.click();
        }}
        onChooseDifferentFile={() => {
          resetSession();
          setReuploadDialogOpen(false);
        }}
        onUseSavedFile={async () => {
          setReuploadDialogOpen(false);
          resetSession();
          await restoreSavedWorkbook();
        }}
        onRemoveSavedFiles={removeSavedWorkbookFiles}
      />

      <ImportPreviewDialog
        open={previewOpen}
        preview={preview}
        onClose={clearPreview}
        onAddFiles={(files) => void onFilesSelect(files, { append: true })}
        onRemoveFile={(fileName) => void removeImportedFile(fileName)}
        onEmailColumnChange={confirmEmailColumn}
        onRecipientColumnChange={confirmRecipientColumn}
        isImporting={ui.isImporting}
        onContinue={() => {
          if (canStartCampaign) {
            openComposeDialog();
          }
        }}
      />

      <DatabaseSettingsDialog
        open={databaseImportDialogOpen}
        onOpenChange={setDatabaseImportDialogOpen}
        initialProfiles={connectionProfiles}
        importPreview={preview}
        origin="database-import"
        onProfilesUpdated={
          onSavedDataChange
            ? async () => {
                await onSavedDataChange();
              }
            : undefined
        }
        onImportSaved={(result) => {
          if (preview) {
            setImportPreview({
              ...preview,
              savedListId: result.savedList.id,
              databaseConnectionLabel: activeConnection?.label,
              databaseTableName: result.destinationTableName,
            });
          }

          void onSavedDataChange?.();
        }}
      />

      <DatabaseSourceDialog
        open={databaseSourceDialogOpen}
        onOpenChange={setDatabaseSourceDialogOpen}
        activeConnection={activeConnection}
        onOpenDatabaseSettings={() => onOpenDatabaseSettings?.()}
        onImported={(importedPreview) => {
          resetSession();
          setImportPreview(importedPreview);
        }}
      />

      {googleImportDialogOpen ? (
        <GoogleDriveImportDialog
          open={googleImportDialogOpen}
          onOpenChange={setGoogleImportDialogOpen}
          onImported={(importedPreview) => {
            resetSession();
            setImportPreview(importedPreview);
          }}
        />
      ) : null}

      <CampaignComposeDialog
        open={composeDialogOpen}
        campaign={composeDefaults}
        preview={preview}
        senderEmail={senderEmail}
        onClose={closeComposeDialog}
        onSubmit={({ globalBodyTemplate, globalBodyEditorJson, globalSubject, globalCcEmails, globalAttachments, name }) => {
          if (campaign) {
            updateGlobalTemplate({
              globalBodyTemplate,
              globalBodyEditorJson,
              globalSubject,
              globalCcEmails,
              globalAttachments,
            });
            closeComposeDialog();
            return;
          }

          createCampaignFromPreview({
            name,
            globalBodyTemplate,
            globalBodyEditorJson,
            globalSubject,
            globalCcEmails,
            globalAttachments,
          });
        }}
      />
    </section>
  );
}
