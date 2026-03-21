import { LoaderCircle, RefreshCw } from "lucide-react";

import type { SendStatus } from "@/types/campaign";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { RecipientCardToolbarProps } from "@/types/recipient-card-toolbar";

function getStatusVariant(status: SendStatus): "secondary" | "success" | "warning" | "destructive" {
  switch (status) {
    case "sent":
      return "success";
    case "failed":
      return "destructive";
    case "queued":
    case "sending":
      return "warning";
    default:
      return "secondary";
  }
}

function getStatusLabel(status: SendStatus) {
  switch (status) {
    case "queued":
      return "Queued to send";
    case "sending":
      return "Sending now";
    default:
      return status;
  }
}

export function RecipientCardToolbar(props: RecipientCardToolbarProps) {
  const {
    checked,
    disabled,
    isRegenerating,
    onCheckedChange,
    onRegenerate,
    sent,
    status,
  } = props;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={checked}
            disabled={disabled}
            onCheckedChange={(value) => onCheckedChange(Boolean(value))}
          />
          <span className="text-sm font-medium">
            {sent ? "Already sent" : checked ? "Selected" : "Not selected"}
          </span>
        </div>
        <Badge variant={getStatusVariant(status)} className="gap-1.5">
          {status === "sending" ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : null}
          {status === "queued" ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : null}
          {getStatusLabel(status)}
        </Badge>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRegenerate}
        disabled={isRegenerating}
      >
        <RefreshCw className={isRegenerating ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        {isRegenerating ? "Generating..." : "Regenerate with prompt"}
      </Button>
    </div>
  );
}
