import { Mail } from "lucide-react";

import { AiSettingsStatusPill } from "@/components/settings/ai-settings-trigger";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CampaignHeaderBarProps } from "@/types/campaign-header-bar";

export function CampaignHeaderBar(props: CampaignHeaderBarProps) {
  const { campaign, senderEmail } = props;

  return (
    <Card className="bg-white/85">
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{campaign.importedFileName}</Badge>
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
      </CardContent>
    </Card>
  );
}
