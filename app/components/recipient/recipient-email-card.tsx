"use client";

import { Mail, TriangleAlert } from "lucide-react";

import { useRecipientEditor } from "@/hooks/use-recipient-editor";
import { useRecipientRegenerate } from "@/hooks/use-recipient-regenerate";
import { RecipientCardToolbar } from "@/components/recipient/recipient-card-toolbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RecipientEmailCardProps } from "@/types/recipient-email-card";

export function RecipientEmailCard({ recipientId }: RecipientEmailCardProps) {
  const { onBodyChange, onCheckedChange, onSubjectChange, recipient } =
    useRecipientEditor(recipientId);
  const { error, isRegenerating, regenerate } = useRecipientRegenerate(recipientId);

  if (!recipient) {
    return null;
  }

  return (
    <Card className="h-full bg-white/90">
      <CardHeader className="gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              {recipient.fields.clinic_name ? String(recipient.fields.clinic_name) : recipient.email}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="truncate">{recipient.email}</span>
            </div>
          </div>
          <Badge variant="outline">Row {recipient.rowIndex}</Badge>
        </div>
        <RecipientCardToolbar
          checked={recipient.checked}
          disabled={recipient.sent}
          status={recipient.status}
          sent={recipient.sent}
          isRegenerating={isRegenerating}
          onCheckedChange={onCheckedChange}
          onRegenerate={regenerate}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`subject-${recipient.id}`}>Subject</Label>
          <Input
            id={`subject-${recipient.id}`}
            value={recipient.subject}
            onChange={(event) => onSubjectChange(event.target.value)}
            disabled={recipient.isSending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`body-${recipient.id}`}>Body</Label>
          <Textarea
            id={`body-${recipient.id}`}
            value={recipient.body}
            onChange={(event) => onBodyChange(event.target.value)}
            className="min-h-[240px]"
            disabled={recipient.isSending}
          />
        </div>
        {error || recipient.errorMessage ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <TriangleAlert className="h-4 w-4" />
            <span>{error ?? recipient.errorMessage}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
