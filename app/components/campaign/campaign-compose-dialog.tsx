"use client";

import { useEffect, useState } from "react";

import { normalizeHeader } from "@/core/excel/detect-email-column";
import {
  DEFAULT_GLOBAL_TEMPLATE_REGENERATE_PROMPT,
  MAX_REGENERATE_PROMPT_LENGTH,
} from "@/core/ai/regenerate-guardrails";
import { useGlobalTemplateRegenerate } from "@/hooks/use-global-template-regenerate";
import { AttachmentList } from "@/components/campaign/attachment-list";
import { AttachmentUpload } from "@/components/campaign/attachment-upload";
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
  const { campaign, onClose, onSubmit, open, preview } = props;
  const defaults = resolveDefaultTemplates(preview);
  const { error, isRegenerating, regenerate } = useGlobalTemplateRegenerate();
  const [name, setName] = useState(campaign?.name ?? defaults.name);
  const [subject, setSubject] = useState(campaign?.globalSubject ?? defaults.subject);
  const [body, setBody] = useState(campaign?.globalBodyTemplate ?? defaults.body);
  const [ccEmailsString, setCcEmailsString] = useState(campaign?.globalCcEmails?.join(", ") ?? "");
  const [attachments, setAttachments] = useState<Attachment[]>(campaign?.globalAttachments ?? []);
  const [attachmentError, setAttachmentError] = useState<string | undefined>();
  const [applyMode, setApplyMode] = useState<"untouched" | "all">("untouched");
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [prompt, setPrompt] = useState(DEFAULT_GLOBAL_TEMPLATE_REGENERATE_PROMPT);

  useEffect(() => {
    setName(campaign?.name ?? defaults.name);
    setSubject(campaign?.globalSubject ?? defaults.subject);
    setBody(campaign?.globalBodyTemplate ?? defaults.body);
    setCcEmailsString(campaign?.globalCcEmails?.join(", ") ?? "");
    setAttachments(campaign?.globalAttachments ?? []);
    setAttachmentError(undefined);
  }, [campaign, defaults.body, defaults.name, defaults.subject, open]);

  useEffect(() => {
    if (!regenerateDialogOpen) {
      setPrompt(DEFAULT_GLOBAL_TEMPLATE_REGENERATE_PROMPT);
    }
  }, [regenerateDialogOpen]);

  const availablePlaceholders = preview?.headers.map((header) => normalizeHeader(header)) ?? [];
  const detectedRecipientPlaceholder = preview?.selectedRecipientColumn
    ? normalizeHeader(preview.selectedRecipientColumn)
    : undefined;

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
              />
            ) : null}

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <Label htmlFor="global-body">Global body template</Label>
                {campaign ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => setRegenerateDialogOpen(true)}
                  >
                    Regenerate with prompt
                  </Button>
                ) : null}
              </div>
              <Textarea
                id="global-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className="min-h-[150px] sm:min-h-[220px]"
                disabled={isRegenerating}
              />
              {isRegenerating ? (
                <p className="text-sm text-muted-foreground animate-pulse">
                  AI is generating...
                </p>
              ) : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>

            {campaign ? (
              <div className="space-y-2">
                <Label htmlFor="apply-mode">Apply changes to drafts</Label>
                <Select
                  id="apply-mode"
                  value={applyMode}
                  onChange={(event) =>
                    setApplyMode(event.target.value as "untouched" | "all")
                  }
                >
                  <option value="untouched">Only untouched drafts</option>
                  <option value="all">Overwrite all drafts</option>
                </Select>
              </div>
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
                  globalCcEmails: ccEmailsString
                    .split(",")
                    .map((e) => e.trim())
                    .filter((e) => e.length > 0),
                  globalAttachments: attachments,
                  applyMode,
                })
              }
              disabled={!subject.trim() || !body.trim() || (!campaign && !name.trim())}
            >
              {campaign ? "Save global message" : "Create recipient drafts"}
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
              onClick={async () => {
                // Close modal immediately
                setRegenerateDialogOpen(false);

                // Stream body text progressively
                const result = await regenerate(
                  {
                    globalSubject: subject,
                    globalBodyTemplate: body,
                    prompt,
                    availablePlaceholders,
                    detectedRecipientPlaceholder,
                  },
                  (streamingBody) => {
                    // Update body field with streaming text
                    setBody(streamingBody);
                  },
                );

                if (!result) {
                  return;
                }

                // result is just a string (body text)
                setBody(result);
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
