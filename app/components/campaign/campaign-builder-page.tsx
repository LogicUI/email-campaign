"use client";

import { useMemo } from "react";

import { useBulkSend } from "@/hooks/use-bulk-send";
import { useCampaignBuilder } from "@/hooks/use-campaign-builder";
import { useExcelImport } from "@/hooks/use-excel-import";
import { useRecipientPagination } from "@/hooks/use-recipient-pagination";
import { useCampaignStore } from "@/store/campaign-store";
import { selectRecipientOrder, selectUi } from "@/store/selectors";
import { CampaignComposeDialog } from "@/components/campaign/campaign-compose-dialog";
import { CampaignHeaderBar } from "@/components/campaign/campaign-header-bar";
import { SendSummaryBar } from "@/components/campaign/send-summary-bar";
import { FileUploadDropzone } from "@/components/data-import/file-upload-dropzone";
import { ImportPreviewDialog } from "@/components/data-import/import-preview-dialog";
import { RecipientList } from "@/components/recipient/recipient-list";
import { RecipientPaginationBar } from "@/components/recipient/recipient-pagination-bar";
import type { CampaignBuilderPageProps } from "@/types/campaign-builder-page";

export function CampaignBuilderPage({
  senderEmail = "authenticated@example.com",
}: CampaignBuilderPageProps) {
  const ui = useCampaignStore(selectUi);
  const recipientOrder = useCampaignStore(selectRecipientOrder);
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
  const { clearPreview, confirmEmailColumn, error, onFileSelect } = useExcelImport();
  const {
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    totalPages,
    totalRecipients,
    visibleIds,
  } = useRecipientPagination();
  const bulkSend = useBulkSend();

  const previewOpen = Boolean(preview && !composeDialogOpen && !campaign);

  const composeDefaults = useMemo(() => {
    if (!campaign) {
      return null;
    }

    return campaign;
  }, [campaign]);

  return (
    <main className="app-shell">
      <div className="container py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          {campaign ? (
            <>
              <CampaignHeaderBar
                campaign={campaign}
                senderEmail={senderEmail}
                totalRecipients={totalRecipients}
                onEditTemplate={openComposeDialog}
                onReset={resetSession}
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
                onCheckVisible={() => toggleRecipientsChecked(visibleIds, true)}
                onUncheckVisible={() => toggleRecipientsChecked(visibleIds, false)}
              />
              <RecipientPaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalRecipients={totalRecipients}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
              <RecipientList recipientIds={visibleIds} senderEmail={senderEmail} />
            </>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
              <FileUploadDropzone
                isImporting={ui.isImporting}
                error={error}
                onFileSelect={onFileSelect}
              />
              <div className="rounded-[2rem] border bg-white/70 p-8">
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                  Prototype workflow
                </p>
                <ol className="mt-4 space-y-4 text-sm text-muted-foreground">
                  <li>1. Sign in with Google to unlock the protected workspace.</li>
                  <li>2. Upload a CSV or Excel file with flexible lead columns.</li>
                  <li>3. Confirm the email column and preview invalid rows.</li>
                  <li>4. Define one global subject and body template.</li>
                  <li>5. Edit, regenerate, paginate, select, and send drafts.</li>
                  <li>6. Refreshing the page keeps auth, but draft data remains in memory.</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>

      <ImportPreviewDialog
        open={previewOpen}
        preview={preview}
        onClose={clearPreview}
        onEmailColumnChange={confirmEmailColumn}
        onContinue={() => {
          if (canStartCampaign) {
            openComposeDialog();
          }
        }}
      />

      <CampaignComposeDialog
        open={composeDialogOpen}
        campaign={composeDefaults}
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
