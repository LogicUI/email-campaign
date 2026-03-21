import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { InvalidRowAlertProps } from "@/types/invalid-row-alert";

export function InvalidRowAlert({ invalidCount, rows = [] }: InvalidRowAlertProps) {
  if (invalidCount <= 0) {
    return null;
  }

  const hasRows = rows.length > 0;

  return (
    <Alert className="min-w-0 border-amber-300 bg-amber-50">
      <div className="flex min-w-0 items-start gap-2 sm:gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <AlertTitle className="text-sm sm:text-base">{invalidCount} rows will be skipped</AlertTitle>
          <AlertDescription className="text-xs sm:text-sm">
            Invalid rows remain visible in the preview, but only valid rows will become
            recipient drafts.
          </AlertDescription>
          {hasRows ? (
            <div className="mt-3 min-w-0 overflow-hidden rounded-lg border border-amber-200/80 bg-white/40">
              <ScrollArea className="h-[7rem] sm:h-[7.5rem] w-full" aria-label="Invalid rows list">
                <div className="space-y-1.5 sm:space-y-2 p-2 sm:p-3 pr-3 sm:pr-4 text-xs sm:text-sm text-amber-950">
                  {rows.map((row) => (
                    <div
                      key={`${row.sourceFileName ?? "upload"}-${row.rowIndex}-${row.reason}`}
                      className="max-w-full rounded-lg border border-amber-200/80 bg-white/70 px-2 sm:px-3 py-1.5 sm:py-2"
                    >
                      <p className="font-medium text-[10px] sm:text-xs">
                        {row.sourceFileName ? `${row.sourceFileName} · ` : ""}Row {row.rowIndex}
                      </p>
                      <p className="break-words text-amber-900/90 text-[10px] sm:text-xs">{row.reason}</p>
                      {row.email ? (
                        <p className="mt-1 break-all text-[9px] sm:text-xs text-amber-900/70">{row.email}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </div>
      </div>
    </Alert>
  );
}
