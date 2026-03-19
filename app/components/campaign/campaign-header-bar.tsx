import { FileText, Mail, RotateCcw } from "lucide-react";

import {
  AiSettingsStatusPill,
  AiSettingsTrigger,
} from "@/components/settings/ai-settings-trigger";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CampaignHeaderBarProps } from "@/types/campaign-header-bar";

export function CampaignHeaderBar(props: CampaignHeaderBarProps) {
  const { campaign, onEditTemplate, onReset, senderEmail, totalRecipients } = props;

  return (
    <Card className="bg-white/85">
      <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{campaign.importedFileName}</Badge>
            <Badge variant="outline">{totalRecipients} recipient drafts</Badge>
            <Badge variant="success">{campaign.validRows} valid rows</Badge>
            <AiSettingsStatusPill />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{campaign.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Protected campaign workspace with session-only draft editing and Gmail
              delivery from your authenticated Google account.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/80 px-3 py-1.5 text-sm text-secondary-foreground">
            <Mail className="h-4 w-4" />
            <span className="truncate">{senderEmail}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <AiSettingsTrigger context="header" />
          <Button variant="outline" onClick={onEditTemplate}>
            <FileText className="h-4 w-4" />
            Edit global message
          </Button>
          <Button variant="secondary" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            Reset session
          </Button>
          <SignOutButton />
        </div>
      </CardContent>
    </Card>
  );
}
