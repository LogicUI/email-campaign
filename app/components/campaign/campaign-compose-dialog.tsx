"use client";

import { useEffect, useState } from "react";

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
import type { CampaignComposeDialogProps } from "@/types/campaign-compose-dialog";

export function CampaignComposeDialog(props: CampaignComposeDialogProps) {
  const { campaign, onClose, onSubmit, open } = props;
  const [name, setName] = useState(campaign?.name ?? "Session campaign");
  const [subject, setSubject] = useState(campaign?.globalSubject ?? "");
  const [body, setBody] = useState(campaign?.globalBodyTemplate ?? "");
  const [applyMode, setApplyMode] = useState<"untouched" | "all">("untouched");

  useEffect(() => {
    setName(campaign?.name ?? "Session campaign");
    setSubject(campaign?.globalSubject ?? "");
    setBody(campaign?.globalBodyTemplate ?? "");
  }, [campaign, open]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent>
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

        <div className="grid gap-4">
          {!campaign ? (
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Campaign name</Label>
              <Input
                id="campaign-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Q2 clinic outreach"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="global-subject">Global subject</Label>
            <Input
              id="global-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Helping {{clinic_name}} streamline patient communication"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="global-body">Global body template</Label>
            <Textarea
              id="global-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-[220px]"
              placeholder={`Hi {{clinic_name}},\n\nI noticed your clinic serves patients at {{address}}...`}
            />
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
  );
}
