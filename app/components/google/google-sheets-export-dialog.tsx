"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, Sheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useExportGoogleSheetResultsMutation } from "@/tanStack/google";
import type { Campaign, CampaignRecipient } from "@/types/campaign";

export function GoogleSheetsExportDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  recipients: CampaignRecipient[];
  senderEmail: string;
}) {
  const { campaign, onOpenChange, open, recipients, senderEmail } = props;
  const exportMutation = useExportGoogleSheetResultsMutation();
  const [worksheetTitle, setWorksheetTitle] = useState("EmailAI Results");

  const exportableRecipients = useMemo(
    () =>
      recipients.filter(
        (recipient) => recipient.status === "sent" || recipient.status === "failed",
      ),
    [recipients],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          exportMutation.reset();
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="w-[min(94vw,34rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sheet className="h-5 w-5" />
            Save results to Google Sheets
          </DialogTitle>
          <DialogDescription>
            Append campaign results to a dedicated worksheet in the source
            spreadsheet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border bg-muted/35 p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{campaign.importedFileName}</p>
            <p className="mt-1">
              {exportableRecipients.length} sent/failed recipient result
              {exportableRecipients.length === 1 ? "" : "s"} will be exported.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="google-results-tab">Results worksheet</Label>
            <Input
              id="google-results-tab"
              value={worksheetTitle}
              onChange={(event) => setWorksheetTitle(event.target.value)}
            />
          </div>

          {exportMutation.isSuccess ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Results appended successfully
              </div>
              <a
                className="mt-2 inline-block underline"
                href={exportMutation.data.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open spreadsheet
              </a>
            </div>
          ) : null}

          {exportMutation.error instanceof Error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {exportMutation.error.message}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            disabled={
              !campaign.googleSpreadsheetId ||
              !worksheetTitle.trim() ||
              exportableRecipients.length === 0 ||
              exportMutation.isPending
            }
            onClick={async () => {
              await exportMutation.mutateAsync({
                spreadsheetId: campaign.googleSpreadsheetId as string,
                worksheetTitle: worksheetTitle.trim(),
                campaignName: campaign.name,
                senderEmail,
                globalSubject: campaign.globalSubject,
                recipients: exportableRecipients.map((recipient) => ({
                  id: recipient.id,
                  rowIndex: recipient.rowIndex,
                  email: recipient.email,
                  recipient: recipient.recipient,
                  subject: recipient.subject,
                  status: recipient.status,
                  errorMessage: recipient.errorMessage,
                  providerMessageId: recipient.lastProviderMessageId,
                  sourceFileName: recipient.sourceFileName,
                  sourceSheetName: recipient.sourceSheetName,
                  lastSendAttemptAt: recipient.lastSendAttemptAt,
                })),
              });
            }}
          >
            {exportMutation.isPending ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Sheet className="h-4 w-4" />
                Append results
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
