"use client";

import { useEffect, useMemo, useState } from "react";

import { normalizeHeader } from "@/core/excel/detect-email-column";
import {
  DEFAULT_GLOBAL_TEMPLATE_REGENERATE_PROMPT,
  MAX_REGENERATE_PROMPT_LENGTH,
} from "@/core/ai/regenerate-guardrails";
import { fileToAttachment } from "@/core/email/attachment-utils";
import { buildTemplatedEmailPreviewModel } from "@/core/email/email-preview";
import { formatRegeneratedEmailBody } from "@/core/email/format-regenerated-email-body";
import { useGlobalTemplateRegenerate } from "@/hooks/use-global-template-regenerate";
import { AttachmentList } from "@/components/campaign/attachment-list";
import { AttachmentUpload } from "@/components/campaign/attachment-upload";
import { EmailPreviewSurface } from "@/components/email/email-preview-surface";
import { TipTapEmailEditor } from "@/components/email/tiptap-email-editor";
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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSendTestEmailMutation } from "@/tanStack/send";
import type { Attachment } from "@/types/gmail";
import type { CampaignComposeDialogProps } from "@/types/campaign-compose-dialog";

const DEFAULT_CAMPAIGN_NAME = "Intro outreach campaign";
const DEFAULT_GLOBAL_SUBJECT = "Quick introduction";
const DEFAULT_GLOBAL_BODY_TEMPLATE = `Hi there,

I wanted to reach out with a quick introduction and see whether there could be a fit to work together.

If helpful, I can send a short overview tailored to your goals and current priorities.

Would you be open to a quick conversation next week?`;

function resolveDefaultTemplates(preview?: CampaignComposeDialogProps["preview"]) {
  if (!preview) {
    return {
      name: DEFAULT_CAMPAIGN_NAME,
      subject: DEFAULT_GLOBAL_SUBJECT,
      body: DEFAULT_GLOBAL_BODY_TEMPLATE,
    };
  }

  const primaryField = preview.selectedRecipientColumn
    ? normalizeHeader(preview.selectedRecipientColumn)
    : undefined;

  if (!primaryField) {
    return {
      name: DEFAULT_CAMPAIGN_NAME,
      subject: DEFAULT_GLOBAL_SUBJECT,
      body: DEFAULT_GLOBAL_BODY_TEMPLATE,
    };
  }

  const primaryPlaceholder = `{{${primaryField}}}`;

  return {
    name: DEFAULT_CAMPAIGN_NAME,
    subject: `Quick introduction for ${primaryPlaceholder}`,
    body: `Hi ${primaryPlaceholder} team,

I wanted to reach out with a quick introduction and see whether there could be a fit to work together.

If helpful, I can send a short overview tailored to your goals and current priorities.

Would you be open to a quick conversation next week?`,
  };
}

export function CampaignComposeDialog(props: CampaignComposeDialogProps) {
  const { campaign, onClose, onSubmit, open, preview, senderEmail } = props;
  const defaults = resolveDefaultTemplates(preview);
  const { error, isRegenerating, regenerate } = useGlobalTemplateRegenerate();
  const [name, setName] = useState(campaign?.name ?? defaults.name);
  const [subject, setSubject] = useState(campaign?.globalSubject ?? defaults.subject);
  const [body, setBody] = useState(campaign?.globalBodyTemplate ?? defaults.body);
  const [bodyEditorJson, setBodyEditorJson] = useState<string | undefined>(
    campaign?.globalBodyEditorJson
  );
  const [ccEmailsString, setCcEmailsString] = useState(campaign?.globalCcEmails?.join(", ") ?? "");
  const [attachments, setAttachments] = useState<Attachment[]>(campaign?.globalAttachments ?? []);
  const [attachmentError, setAttachmentError] = useState<string | undefined>();
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedPreviewRowId, setSelectedPreviewRowId] = useState("");
  const [testEmailAddress, setTestEmailAddress] = useState(senderEmail);
  const [testEmailSuccess, setTestEmailSuccess] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(DEFAULT_GLOBAL_TEMPLATE_REGENERATE_PROMPT);
  const [regenerateVersion, setRegenerateVersion] = useState(0);
  const testEmailMutation = useSendTestEmailMutation();

  useEffect(() => {
    setName(campaign?.name ?? defaults.name);
    setSubject(campaign?.globalSubject ?? defaults.subject);
    setBody(campaign?.globalBodyTemplate ?? defaults.body);
    setBodyEditorJson(campaign?.globalBodyEditorJson);
    setCcEmailsString(campaign?.globalCcEmails?.join(", ") ?? "");
    setAttachments(campaign?.globalAttachments ?? []);
    setAttachmentError(undefined);
  }, [campaign, defaults.body, defaults.name, defaults.subject, open]);

  useEffect(() => {
    if (!regenerateDialogOpen) {
      setPrompt(DEFAULT_GLOBAL_TEMPLATE_REGENERATE_PROMPT);
    }
  }, [regenerateDialogOpen]);

  const globalCcEmails = useMemo(
    () =>
      ccEmailsString
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email.length > 0),
    [ccEmailsString],
  );
  const previewRows = useMemo(
    () => preview?.rows.filter((row) => row.isValid) ?? [],
    [preview],
  );

  useEffect(() => {
    if (!previewDialogOpen) {
      return;
    }

    setTestEmailAddress(senderEmail);
    setTestEmailSuccess(null);
    setSelectedPreviewRowId((current) =>
      current && previewRows.some((row) => row.tempId === current)
        ? current
        : (previewRows[0]?.tempId ?? ""),
    );
  }, [previewDialogOpen, previewRows, senderEmail]);

  const availablePlaceholders = preview?.headers.map((header) => normalizeHeader(header)) ?? [];
  const detectedRecipientPlaceholder = preview?.selectedRecipientColumn
    ? normalizeHeader(preview.selectedRecipientColumn)
    : undefined;
  const selectedPreviewRow =
    previewRows.find((row) => row.tempId === selectedPreviewRowId) ?? previewRows[0];
  const globalPreview = useMemo(
    () =>
      buildTemplatedEmailPreviewModel({
        subject,
        body,
        attachments,
        fields: selectedPreviewRow?.fields,
      }),
    [attachments, body, selectedPreviewRow?.fields, subject],
  );
  const canSendPreviewTest = Boolean(selectedPreviewRow);

  // Handle toggling an attachment between inline and regular
  const handleToggleInline = async (index: number, isInline: boolean) => {
    const updatedAttachments = [...attachments];
    const attachment = { ...updatedAttachments[index] };

    if (isInline && !attachment.contentId) {
      // Import generateContentId
      const { generateContentId } = await import("@/core/email/attachment-utils");
      attachment.contentId = await generateContentId(attachment.filename);
    }

    attachment.isInline = isInline;
    updatedAttachments[index] = attachment;
    setAttachments(updatedAttachments);
  };

  // Handle image upload from TipTap editor
  const handleImageUpload = async (file: File) => {
    const attachment = await fileToAttachment(file);
    attachment.isInline = true;

    // Generate content ID for inline image
    const { generateContentId } = await import("@/core/email/attachment-utils");
    attachment.contentId = await generateContentId(file.name);

    // Add to attachments
    setAttachments((prev) => [...prev, attachment]);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
        <DialogContent className="max-h-[calc(100vh-4rem)] overflow-y-auto p-6 border-0">
          <DialogHeader>
            <DialogTitle>
              {campaign ? "Edit global message" : "Define campaign message"}
            </DialogTitle>
            <DialogDescription>
              The global template pre-fills each recipient card. Use{" "}
              <code>{"{{field_name}}"}</code> placeholders to personalize imported
              columns.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:gap-4">
            {!campaign ? (
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign name</Label>
                <Input
                  id="campaign-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="global-subject">Global subject</Label>
              <Input
                id="global-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                disabled={isRegenerating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="global-cc">CC recipients (optional)</Label>
              <Input
                id="global-cc"
                type="text"
                placeholder="cc@example.com, another@example.com"
                value={ccEmailsString}
                onChange={(event) => setCcEmailsString(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple email addresses with commas
              </p>
            </div>

            <AttachmentUpload
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              error={attachmentError}
              onErrorChange={setAttachmentError}
            />

            {attachments.length > 0 ? (
              <AttachmentList
                attachments={attachments}
                onRemove={(index) => {
                  const newAttachments = attachments.filter((_, i) => i !== index);
                  setAttachments(newAttachments);
                  setAttachmentError(undefined);
                }}
                onToggleInline={handleToggleInline}
              />
            ) : null}

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <Label>Global body template</Label>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => setPreviewDialogOpen(true)}
                  >
                    Preview & test
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => setRegenerateDialogOpen(true)}
                  >
                    Regenerate with prompt
                  </Button>
                </div>
              </div>
              <TipTapEmailEditor
                content={body}
                editorJson={bodyEditorJson}
                onChange={(html, json) => {
                  setBody(html);
                  setBodyEditorJson(json);
                }}
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                availablePlaceholders={availablePlaceholders}
                onInsertPlaceholder={(placeholder) => {
                  // Placeholder is inserted by TipTap, this is just for tracking
                  console.log("Inserted placeholder:", placeholder);
                }}
                onUploadImage={handleImageUpload}
                className="min-h-[220px]"
                disabled={isRegenerating}
                loadingState={
                  isRegenerating
                    ? {
                        title: "Refreshing global template",
                        detail: "The body is locked until the updated campaign message is ready.",
                      }
                    : undefined
                }
                id="Global body template"
                forceUpdate={regenerateVersion}
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>

            {campaign ? (
              <p className="rounded-xl border border-border/70 bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
                Saving the global message refreshes every unsent recipient draft so the
                queue stays aligned with the latest template.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                onSubmit({
                  name,
                  globalSubject: subject,
                  globalBodyTemplate: body,
                  globalBodyEditorJson: bodyEditorJson,
                  globalCcEmails,
                  globalAttachments: attachments,
                })
              }
              disabled={!subject.trim() || !body.trim() || (!campaign && !name.trim())}
            >
              {campaign ? "Save global message" : "Create recipient drafts"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-h-[calc(100vh-4rem)] overflow-y-auto p-4 sm:max-w-[900px] sm:p-6">
          <DialogHeader>
            <DialogTitle>Preview and test global message</DialogTitle>
            <DialogDescription>
              Preview the resolved email before sending. The sample recipient controls
              how placeholders are rendered in this preview.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="preview-global-subject">Subject</Label>
                <Input
                  id="preview-global-subject"
                  value={globalPreview.subject}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preview-global-test-email">Send test to</Label>
                <Input
                  id="preview-global-test-email"
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

            {previewRows.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="preview-sample-recipient">Sample recipient</Label>
                <Select
                  id="preview-sample-recipient"
                  value={selectedPreviewRow?.tempId ?? ""}
                  onChange={(event) => {
                    setSelectedPreviewRowId(event.target.value);
                    setTestEmailSuccess(null);
                  }}
                  disabled={testEmailMutation.isPending}
                >
                  {previewRows.map((row) => (
                    <option key={row.tempId} value={row.tempId}>
                      {(row.recipient || row.email || `Row ${row.rowIndex}`).trim()}
                      {row.email ? ` · ${row.email}` : ""}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                  The preview and test email use this sample row to resolve
                  placeholders like {"{{clinic_name}}"}.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No imported sample rows are available yet. You can preview the raw
                template, but test send is disabled until a sample recipient exists.
              </div>
            )}

            <EmailPreviewSurface
              subject={globalPreview.subject}
              toEmail={selectedPreviewRow?.email || "sample-recipient@example.com"}
              fromEmail={senderEmail}
              ccEmails={globalCcEmails}
              previewHtml={globalPreview.previewHtml}
              fileAttachments={globalPreview.fileAttachments}
              inlineAttachmentsCount={globalPreview.inlineAttachments.length}
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
                  subject: globalPreview.subject,
                  body: globalPreview.bodyText,
                  bodyHtml: globalPreview.bodyHtml,
                  bodyText: globalPreview.bodyText,
                  ccEmails: globalCcEmails,
                  attachments,
                });

                setTestEmailSuccess(
                  `Sent a test email to ${testEmailAddress}. Provider message ID: ${response.providerMessageId}.`,
                );
              }}
              disabled={
                !testEmailAddress.trim() ||
                testEmailMutation.isPending ||
                !canSendPreviewTest
              }
            >
              {testEmailMutation.isPending ? "Sending test..." : "Send test email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <DialogContent className="sm:max-w-[560px] p-6">
          <DialogHeader>
            <DialogTitle>Regenerate with prompt</DialogTitle>
            <DialogDescription>
              Rewrite the global subject and body template before saving. The
              regenerated version stays editable until you save the global message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="global-regenerate-prompt">Prompt</Label>
            <Textarea
              id="global-regenerate-prompt"
              value={prompt}
              maxLength={MAX_REGENERATE_PROMPT_LENGTH}
              onChange={(event) => setPrompt(event.target.value)}
              className="min-h-[120px] sm:min-h-[180px]"
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
                const result = regenerate(
                  {
                    globalSubject: subject,
                    globalBodyTemplate: body,
                    prompt,
                    availablePlaceholders,
                    detectedRecipientPlaceholder,
                  },
                  (data) => {
                    if (data.subject) {
                      setSubject(data.subject);
                    }

                    setBody(formatRegeneratedEmailBody(data.body, attachments));
                    setBodyEditorJson(undefined);
                    setRegenerateVersion((v) => v + 1);
                  },
                );

                if (result === "started") {
                  setRegenerateDialogOpen(false);
                }
              }}
              disabled={!prompt.trim() || isRegenerating}
            >
              {isRegenerating ? "Generating..." : "Regenerate global message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
