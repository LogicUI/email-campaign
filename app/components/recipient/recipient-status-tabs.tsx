"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RecipientStatusView } from "@/types/campaign-store";
import type { RecipientStatusTabsProps } from "@/types/recipient-status-tabs";

export function RecipientStatusTabs(props: RecipientStatusTabsProps) {
  const { sentCount, unsentCount, value, onValueChange } = props;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white/85 p-4">
      <div className="text-sm font-medium text-foreground">Recipient view</div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={value === "unsent" ? "default" : "outline"}
          onClick={() => onValueChange("unsent")}
        >
          Unsent
          <Badge
            variant={value === "unsent" ? "secondary" : "outline"}
            className="ml-1"
          >
            {unsentCount}
          </Badge>
        </Button>
        <Button
          type="button"
          variant={value === "sent" ? "default" : "outline"}
          onClick={() => onValueChange("sent")}
        >
          Sent
          <Badge
            variant={value === "sent" ? "secondary" : "outline"}
            className="ml-1"
          >
            {sentCount}
          </Badge>
        </Button>
      </div>
    </div>
  );
}
