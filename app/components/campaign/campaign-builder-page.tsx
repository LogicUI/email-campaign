"use client";

import { useMemo, useRef, useState } from "react";

import { useBulkSend } from "@/hooks/use-bulk-send";
import { useCampaignBuilder } from "@/hooks/use-campaign-builder";
import { useExcelImport } from "@/hooks/use-excel-import";
import { useRecipientPagination } from "@/hooks/use-recipient-pagination";
import { useCampaignStore } from "@/store/campaign-store";
import { selectRecipientOrder, selectUi } from "@/store/selectors";
import { CampaignActionBar } from "@/components/campaign/campaign-action-bar";
import { CampaignComposeDialog } from "@/components/campaign/campaign-compose-dialog";
import { DatabaseImportDialog } from "@/components/campaign/database-import-dialog";
import { CampaignHeaderBar } from "@/components/campaign/campaign-header-bar";
import { ReuploadWorkbookDialog } from "@/components/campaign/reupload-workbook-dialog";
import { SendSummaryBar } from "@/components/campaign/send-summary-bar";
import { FileUploadDropzone } from "@/components/data-import/file-upload-dropzone";
import { ImportPreviewDialog } from "@/components/data-import/import-preview-dialog";
import { RecipientList } from "@/components/recipient/recipient-list";
import { RecipientPaginationBar } from "@/components/recipient/recipient-pagination-bar";
import { RecipientStatusTabs } from "@/components/recipient/recipient-status-tabs";
import { useDatabaseSessionStore } from "@/store/database-session-store";
import type { CampaignBuilderPageProps } from "@/types/campaign-builder-page";

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
  const activeConnection = useDatabaseSessionStore((state) => state.activeConnection);
  const ui = useCampaignStore(selectUi);
  const recipientOrder = useCampaignStore(selectRecipientOrder);
  const setImportPreview = useCampaignStore((state) => state.setImportPreview);
  const toggleRecipientsChecked = useCampaignStore((state) => state.toggleRecipientsChecked);
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

  return (
    <main className="app-shell">
      <div className="container py-6 md:py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
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
                totalRecipients={totalRecipients}
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
                onRetryFailed={bulkSend.retryFailed}
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
            <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
              <FileUploadDropzone
                isImporting={ui.isImporting}
                error={error}
                notice={notice}
                onFilesSelect={onFilesSelect}
                onRestoreSavedFile={hasSavedWorkbook ? restoreSavedWorkbook : undefined}
                savedWorkbookLabel={savedWorkbookLabel}
              />
              <div className="rounded-[2rem] border bg-white/70 p-8">
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
          setReuploadInputMode("replace");
          reuploadInputRef.current?.click();
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
        onSaveToDatabase={() => setDatabaseImportDialogOpen(true)}
        onContinue={() => {
          if (canStartCampaign) {
            openComposeDialog();
          }
        }}
      />

      <DatabaseImportDialog
        open={databaseImportDialogOpen}
        onOpenChange={setDatabaseImportDialogOpen}
        preview={preview}
        activeConnection={activeConnection}
        connectionProfiles={connectionProfiles}
        onOpenDatabaseSettings={() =>
          onOpenDatabaseSettings?.({
            source: "database-import",
            preview,
          })
        }
        onSaved={(savedList) => {
          if (preview) {
            setImportPreview({
              ...preview,
              savedListId: savedList.id,
            });
          }

          void onSavedDataChange?.();
        }}
      />

      <CampaignComposeDialog
        open={composeDialogOpen}
        campaign={composeDefaults}
        preview={preview}
        onClose={closeComposeDialog}
        onSubmit={({ applyMode, globalBodyTemplate, globalSubject, name }) => {
          if (campaign) {
            updateGlobalTemplate({
              globalBodyTemplate,
              globalSubject,
              applyMode,
            });
            closeComposeDialog();
            return;
          }

          createCampaignFromPreview({
            name,
            globalBodyTemplate,
            globalSubject,
          });
        }}
      />
    </main>
  );
}
