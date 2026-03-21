import { AlertCircle, LoaderCircle, Plus, Send, WandSparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { SendSummaryBarProps } from "@/types/send-summary-bar";

export function SendSummaryBar(props: SendSummaryBarProps) {
  const {
    checkedCount,
    error,
    failedCount,
    isSending,
    onAddRecipient,
    onClearAllSelected,
    onRetryFailed,
    onSendSelected,
    progress,
  } = props;

  const progressValue = progress.total
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <Card className="bg-white/85">
      <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <CardTitle className="text-xl">Send queue</CardTitle>
          <CardDescription>
            Only checked, unsent recipients are included in the next batch.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{checkedCount} checked</Badge>
          <Badge variant="success">{progress.success} sent</Badge>
          <Badge variant={failedCount > 0 ? "warning" : "secondary"}>
            {failedCount} failed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button onClick={onAddRecipient}>
            <Plus className="h-4 w-4" />
            New recipient
          </Button>
          <Button onClick={onSendSelected} disabled={checkedCount === 0 || isSending}>
            <Send className="h-4 w-4" />
            {isSending ? "Sending..." : "Send selected"}
          </Button>
          <Button
            variant="outline"
            onClick={onClearAllSelected}
            disabled={checkedCount === 0}
          >
            <X className="h-4 w-4" />
            Clear all selected
          </Button>
          <Button variant="outline" onClick={onRetryFailed} disabled={failedCount === 0}>
            <WandSparkles className="h-4 w-4" />
            Re-check failed
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              Batch progress: {progress.completed}/{progress.total || checkedCount}
            </span>
            <span>{progressValue}%</span>
          </div>
          <Progress value={progressValue} />
        </div>

        {isSending ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            <span>
              Sending is in progress. Keep this tab open while {progress.completed}/
              {progress.total || checkedCount} emails finish processing.
            </span>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
