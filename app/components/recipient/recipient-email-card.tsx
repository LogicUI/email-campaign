"use client";

import { useEffect, useState } from "react";
import { Mail, Send, TriangleAlert, X } from "lucide-react";

import {
  DEFAULT_REGENERATE_PROMPT,
  MAX_REGENERATE_PROMPT_LENGTH,
} from "@/core/ai/regenerate-guardrails";
import { useRecipientEditor } from "@/hooks/use-recipient-editor";
import { useRecipientRegenerate } from "@/hooks/use-recipient-regenerate";
import { RecipientCardToolbar } from "@/components/recipient/recipient-card-toolbar";
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
import type { RecipientEmailCardProps } from "@/types/recipient-email-card";

export function RecipientEmailCard({
  recipientId,
  senderEmail,
}: RecipientEmailCardProps) {
  const {
    onBodyChange,
    onCcEmailsChange,
    onCheckedChange,
    onEmailChange,
    onRemove,
    onSubjectChange,
    recipient,
  } = useRecipientEditor(recipientId);
  const { error, isRegenerating, regenerate } = useRecipientRegenerate(recipientId);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [prompt, setPrompt] = useState(DEFAULT_REGENERATE_PROMPT);

  useEffect(() => {
    if (!regenerateDialogOpen) {
      setPrompt(DEFAULT_REGENERATE_PROMPT);
    }
  }, [regenerateDialogOpen]);

  if (!recipient) {
    return null;
  }

  return (
    <Card className="h-full bg-white/90">
      <CardHeader className="gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
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
                  value={recipient.ccEmails?.join(", ") || ""}
                  onChange={(event) => {
                    const emails = event.target.value
                      .split(",")
                      .map((e) => e.trim())
                      .filter((e) => e.length > 0);
                    onCcEmailsChange(emails);
                  }}
                  disabled={recipient.isSending || recipient.isRegenerating}
                  className="h-8 text-sm"
                />
                {recipient.ccEmails && recipient.ccEmails.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {recipient.ccEmails.length} CC recipient{recipient.ccEmails.length > 1 ? "s" : ""}
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
          <Label htmlFor={`body-${recipient.id}`}>Body</Label>
          <Textarea
            id={`body-${recipient.id}`}
            value={recipient.body}
            onChange={(event) => onBodyChange(event.target.value)}
            className="min-h-[240px]"
            disabled={recipient.isSending || recipient.isRegenerating}
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
        <DialogContent className="sm:max-w-[560px]">
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
              onClick={async () => {
                const result = await regenerate(prompt);

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
    </Card>
  );
}
