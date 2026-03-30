"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Mail, Send, TriangleAlert, X } from "lucide-react";

import {
  DEFAULT_REGENERATE_PROMPT,
  MAX_REGENERATE_PROMPT_LENGTH,
} from "@/core/ai/regenerate-guardrails";
import { fileToAttachment } from "@/core/email/attachment-utils";
import { buildTemplatedEmailPreviewModel } from "@/core/email/email-preview";
import { EmailPreviewSurface } from "@/components/email/email-preview-surface";
import { useRecipientEditor } from "@/hooks/use-recipient-editor";
import { useRecipientRegenerate } from "@/hooks/use-recipient-regenerate";
import { RecipientCardToolbar } from "@/components/recipient/recipient-card-toolbar";
import { TipTapEmailEditor } from "@/components/email/tiptap-email-editor";
import { AttachmentUpload } from "@/components/campaign/attachment-upload";
import { AttachmentList } from "@/components/campaign/attachment-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useSendTestEmailMutation } from "@/tanStack/send";
import type { RecipientEmailCardProps } from "@/types/recipient-email-card";

export function RecipientEmailCard({
  recipientId,
  senderEmail,
}: RecipientEmailCardProps) {
  const {
    onAttachmentsChange,
    onBodyChangeWithJson,
    onCcEmailsChange,
    onCheckedChange,
    onEmailChange,
    onRemove,
    onSubjectChange,
    recipient,
  } = useRecipientEditor(recipientId);
  const { error, isRegenerating, regenerate } = useRecipientRegenerate(recipientId);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [prompt, setPrompt] = useState(DEFAULT_REGENERATE_PROMPT);
  const [attachmentError, setAttachmentError] = useState<string | undefined>();
  const [ccEmailsString, setCcEmailsString] = useState(() =>
    recipient.ccEmails?.join(", ") ?? ""
  );
  const [testEmailAddress, setTestEmailAddress] = useState(senderEmail);
  const [testEmailSuccess, setTestEmailSuccess] = useState<string | null>(null);
  const testEmailMutation = useSendTestEmailMutation();

  useEffect(() => {
    if (!regenerateDialogOpen) {
      setPrompt(DEFAULT_REGENERATE_PROMPT);
    }
  }, [regenerateDialogOpen]);

  useEffect(() => {
    if (previewDialogOpen) {
      setTestEmailAddress(senderEmail);
      setTestEmailSuccess(null);
    }
  }, [previewDialogOpen, senderEmail]);

  const previewModel = useMemo(
    () =>
      buildTemplatedEmailPreviewModel({
        subject: recipient?.subject ?? "",
        body: recipient?.body ?? "",
        attachments: recipient?.attachments ?? [],
        fields: recipient?.fields,
      }),
    [recipient?.attachments, recipient?.body, recipient?.fields, recipient?.subject],
  );

  if (!recipient) {
    return null;
  }

  return (
    <Card className="h-full bg-white/90">
      <CardHeader className="gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <CardTitle className="text-lg">
              {recipient.source === "manual"
                ? recipient.email || "New recipient"
                : recipient.recipient || recipient.email}
            </CardTitle>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="font-medium">To</span>
              </div>
              {recipient.source === "manual" ? (
                <Input
                  aria-label={`Recipient email ${recipient.id}`}
                  placeholder="recipient@example.com"
                  value={recipient.email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  disabled={recipient.isSending || recipient.isRegenerating}
                  className="w-full"
                />
              ) : (
                <span className="truncate">{recipient.email}</span>
              )}
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                <span className="font-medium">From</span>
                <span className="truncate">{senderEmail}</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`cc-${recipient.id}`} className="text-xs">
                  CC Recipients (optional)
                </Label>
                <Input
                  id={`cc-${recipient.id}`}
                  type="text"
                  placeholder="cc@example.com, another@example.com"
                  value={ccEmailsString}
                  onChange={(event) => setCcEmailsString(event.target.value)}
                  onBlur={() => {
                    const emails = ccEmailsString
                      .split(",")
                      .map((e) => e.trim())
                      .filter((e) => e.length > 0);
                    onCcEmailsChange(emails);
                  }}
                  disabled={recipient.isSending || recipient.isRegenerating}
                  className="w-full h-8 text-sm"
                />
                {ccEmailsString.split(",").map((e) => e.trim()).filter((e) => e.length > 0).length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {
                      ccEmailsString
                        .split(",")
                        .map((e) => e.trim())
                        .filter((e) => e.length > 0).length
                    }{" "}
                    CC recipient
                    {ccEmailsString.split(",").map((e) => e.trim()).filter((e) => e.length > 0).length > 1
                      ? "s"
                      : ""}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {recipient.source === "manual"
                ? "Manual"
                : recipient.sourceFileName
                  ? `${recipient.sourceFileName} · Row ${recipient.rowIndex}`
                  : `Row ${recipient.rowIndex}`}
            </Badge>
            <button
              type="button"
              aria-label={`Remove recipient ${recipient.id}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onRemove}
              disabled={recipient.isSending || recipient.isRegenerating}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <RecipientCardToolbar
          checked={recipient.checked}
          disabled={recipient.sent}
          status={recipient.status}
          sent={recipient.sent}
          isRegenerating={isRegenerating}
          onCheckedChange={onCheckedChange}
          onPreview={() => setPreviewDialogOpen(true)}
          onRegenerate={() => setRegenerateDialogOpen(true)}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`subject-${recipient.id}`}>Subject</Label>
          <Input
            id={`subject-${recipient.id}`}
            value={recipient.subject}
            onChange={(event) => onSubjectChange(event.target.value)}
            disabled={recipient.isSending || recipient.isRegenerating}
          />
        </div>
        <div className="space-y-2">
          <AttachmentUpload
            attachments={recipient.attachments ?? []}
            onAttachmentsChange={onAttachmentsChange}
            error={attachmentError}
            onErrorChange={setAttachmentError}
            disabled={recipient.isSending || recipient.isRegenerating}
          />
          {recipient.attachments && recipient.attachments.length > 0 ? (
            <AttachmentList
              attachments={recipient.attachments}
              onRemove={(index) => {
                const newAttachments = recipient.attachments?.filter((_, i) => i !== index) ?? [];
                onAttachmentsChange(newAttachments);
                setAttachmentError(undefined);
              }}
            />
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`body-${recipient.id}`}>Body</Label>
          <TipTapEmailEditor
            content={recipient.body}
            editorJson={recipient.bodyEditorJson}
            onChange={(html, json) => {
              onBodyChangeWithJson(html, json);
            }}
            attachments={recipient.attachments ?? []}
            onAttachmentsChange={onAttachmentsChange}
            availablePlaceholders={Object.keys(recipient.fields)}
            onInsertPlaceholder={(placeholder) => {
              console.log("Inserted placeholder:", placeholder);
            }}
            onUploadImage={async (file) => {
              const attachment = await fileToAttachment(file);
              attachment.isInline = true;

              // Generate content ID for inline image
              const { generateContentId } = await import("@/core/email/attachment-utils");
              attachment.contentId = await generateContentId(file.name);

              // Add to attachments
              const currentAttachments = recipient.attachments ?? [];
              onAttachmentsChange([...currentAttachments, attachment]);
            }}
            className="min-h-[240px]"
            disabled={recipient.isSending || recipient.isRegenerating}
            loadingState={
              recipient.isRegenerating
                ? {
                    title: "Regenerating draft",
                    detail: "Review is temporarily locked while AI rewrites this email.",
                  }
                : undefined
            }
            id={`body-${recipient.id}`}
          />
        </div>
        {error || recipient.errorMessage ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <TriangleAlert className="h-4 w-4" />
            <span>{error ?? recipient.errorMessage}</span>
          </div>
        ) : null}
      </CardContent>

      <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <DialogContent className="sm:max-w-[560px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Regenerate with prompt</DialogTitle>
            <DialogDescription>
              The AI uses this prompt only to rewrite this email from the existing
              campaign and recipient context. Non-email or unrelated instructions are
              ignored.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor={`regenerate-prompt-${recipient.id}`}>Prompt</Label>
            <Textarea
              id={`regenerate-prompt-${recipient.id}`}
              value={prompt}
              maxLength={MAX_REGENERATE_PROMPT_LENGTH}
              onChange={(event) => setPrompt(event.target.value)}
              className="min-h-[180px]"
            />
            <p className="text-xs text-muted-foreground">
              {prompt.length}/{MAX_REGENERATE_PROMPT_LENGTH} characters
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRegenerateDialogOpen(false)}
              disabled={isRegenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const result = regenerate(prompt);

                if (result === "started") {
                  setRegenerateDialogOpen(false);
                }
              }}
              disabled={!prompt.trim() || isRegenerating}
            >
              {isRegenerating ? "Generating..." : "Regenerate email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[720px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Preview and test email</DialogTitle>
            <DialogDescription>
              This preview uses the same HTML body and attachment data that the send flow uses.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`preview-subject-${recipient.id}`}>Subject</Label>
                <Input
                  id={`preview-subject-${recipient.id}`}
                  value={previewModel.subject}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`test-email-${recipient.id}`}>Send test to</Label>
                <Input
                  id={`test-email-${recipient.id}`}
                  type="email"
                  value={testEmailAddress}
                  onChange={(event) => {
                    setTestEmailAddress(event.target.value);
                    setTestEmailSuccess(null);
                  }}
                  disabled={testEmailMutation.isPending}
                />
              </div>
            </div>

            <EmailPreviewSurface
              subject={previewModel.subject}
              toEmail={recipient.email || "recipient@example.com"}
              fromEmail={senderEmail}
              ccEmails={recipient.ccEmails}
              previewHtml={previewModel.previewHtml}
              fileAttachments={previewModel.fileAttachments}
              inlineAttachmentsCount={previewModel.inlineAttachments.length}
            />

            {testEmailSuccess ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {testEmailSuccess}
              </div>
            ) : null}

            {testEmailMutation.error instanceof Error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {testEmailMutation.error.message}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPreviewDialogOpen(false)}
              disabled={testEmailMutation.isPending}
            >
              Close
            </Button>
            <Button
              onClick={async () => {
                const response = await testEmailMutation.mutateAsync({
                  to: testEmailAddress,
                  subject: previewModel.subject,
                  body: previewModel.bodyText,
                  bodyHtml: previewModel.bodyHtml,
                  bodyText: previewModel.bodyText,
                  ccEmails: recipient.ccEmails,
                  attachments: recipient.attachments ?? [],
                });

                setTestEmailSuccess(
                  `Sent a test email to ${testEmailAddress}. Provider message ID: ${response.providerMessageId}.`,
                );
              }}
              disabled={!testEmailAddress.trim() || testEmailMutation.isPending}
            >
              {testEmailMutation.isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Sending test...
                </>
              ) : (
                "Send test email"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
