import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { InvalidRowAlertProps } from "@/types/invalid-row-alert";

export function InvalidRowAlert({ invalidCount }: InvalidRowAlertProps) {
  if (invalidCount <= 0) {
    return null;
  }

  return (
    <Alert className="border-amber-300 bg-amber-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
        <div>
          <AlertTitle>{invalidCount} rows will be skipped</AlertTitle>
          <AlertDescription>
            Invalid rows remain visible in the preview, but only valid rows will become
            recipient drafts.
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
