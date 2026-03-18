import { FileText, RotateCcw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CampaignHeaderBarProps } from "@/types/campaign-header-bar";

export function CampaignHeaderBar(props: CampaignHeaderBarProps) {
  const { campaign, onEditTemplate, onReset, totalRecipients } = props;

  return (
    <Card className="bg-white/85">
      <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{campaign.importedFileName}</Badge>
            <Badge variant="outline">{totalRecipients} recipient drafts</Badge>
            <Badge variant="success">{campaign.validRows} valid rows</Badge>
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{campaign.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Session-only campaign workspace with in-memory draft editing and secure
              server-side send operations.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={onEditTemplate}>
            <FileText className="h-4 w-4" />
            Edit global message
          </Button>
          <Button variant="secondary" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            Reset session
          </Button>
          <Button disabled>
            <Sparkles className="h-4 w-4" />
            Prototype mode
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
