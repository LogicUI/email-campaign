"use client";

import type { ImportPreview } from "@/types/campaign";

import { InvalidRowAlert } from "@/components/import/invalid-row-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ImportPreviewDialogProps {
  open: boolean;
  preview: ImportPreview | null;
  onClose: () => void;
  onEmailColumnChange: (column: string) => void;
  onContinue: () => void;
}

export function ImportPreviewDialog(props: ImportPreviewDialogProps) {
  const { open, preview, onClose, onEmailColumnChange, onContinue } = props;

  if (!preview) {
    return null;
  }

  const sampleRows = preview.rows.slice(0, 10);
  const columns = preview.headers;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent className="max-h-[88vh]">
        <DialogHeader>
          <DialogTitle>Review imported rows</DialogTitle>
          <DialogDescription>
            Confirm the detected email column before generating recipient drafts from{" "}
            <span className="font-medium text-foreground">{preview.fileName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/40 p-4">
              <p className="text-sm font-medium">Import summary</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary">{preview.rows.length} rows</Badge>
                <Badge variant="success">{preview.validCount} valid</Badge>
                <Badge variant={preview.invalidCount > 0 ? "warning" : "secondary"}>
                  {preview.invalidCount} invalid
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-column">Email column</Label>
              <Select
                id="email-column"
                value={preview.selectedEmailColumn}
                onChange={(event) => onEmailColumnChange(event.target.value)}
              >
                <option value="">Select a column</option>
                {columns.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </Select>
            </div>

            <InvalidRowAlert invalidCount={preview.invalidCount} />
          </div>

          <ScrollArea className="h-[420px] rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Status</TableHead>
                  {columns.map((header) => (
                    <TableHead key={header}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleRows.map((row) => (
                  <TableRow key={row.tempId}>
                    <TableCell>{row.rowIndex}</TableCell>
                    <TableCell>
                      <Badge variant={row.isValid ? "success" : "warning"}>
                        {row.isValid ? "Valid" : row.invalidReason}
                      </Badge>
                    </TableCell>
                    {columns.map((header) => (
                      <TableCell key={header} className="max-w-[220px] truncate">
                        {String(row.raw[header] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onContinue} disabled={!preview.selectedEmailColumn || preview.validCount === 0}>
            Continue to message setup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
