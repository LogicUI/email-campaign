import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ImportPreview } from "@/types/campaign";

export function ImportPreviewTable(props: {
  preview: ImportPreview;
  maxRows?: number;
}) {
  const { preview, maxRows } = props;
  const sampleRows = typeof maxRows === "number" ? preview.rows.slice(0, maxRows) : preview.rows;

  return (
    <div className="min-w-full overflow-x-auto">
      <Table className="min-w-max text-xs md:text-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-20 min-w-[60px] bg-background px-2 sm:min-w-[72px] sm:px-4">
              Row
            </TableHead>
            <TableHead className="min-w-[140px] bg-background px-2 sm:min-w-[220px] sm:px-4">
              Status
            </TableHead>
            {preview.headers.map((header) => (
              <TableHead
                key={header}
                className="min-w-[120px] max-w-[280px] bg-background px-2 sm:min-w-[200px] sm:max-w-[420px] sm:px-4"
              >
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sampleRows.map((row) => (
            <TableRow
              key={row.tempId}
              className="group hover:bg-muted/50 data-[state=selected]:bg-muted/80 data-[state=selected]:hover:bg-muted/70"
            >
              <TableCell className="sticky left-0 z-10 whitespace-nowrap bg-background px-2 align-middle font-medium group-data-[state=selected]:bg-muted/80 sm:px-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary sm:h-8 sm:w-8 sm:text-xs">
                  {row.rowIndex}
                </div>
              </TableCell>
              <TableCell className="min-w-[140px] px-2 py-2 align-middle sm:min-w-[220px] sm:px-4 sm:py-3">
                <div className="flex items-start gap-1.5 sm:gap-2">
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs ${
                      row.isValid
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {row.isValid ? "Valid" : "Invalid"}
                  </span>
                  {!row.isValid && row.invalidReason ? (
                    <p className="max-w-[180px] whitespace-normal text-[10px] leading-4 text-muted-foreground sm:max-w-[260px] sm:text-xs sm:leading-5">
                      {row.invalidReason}
                    </p>
                  ) : null}
                </div>
              </TableCell>
              {preview.headers.map((header) => (
                <TableCell
                  key={header}
                  className="min-w-[120px] max-w-[280px] whitespace-pre-wrap break-words px-2 py-2 align-middle text-[10px] sm:min-w-[200px] sm:max-w-[420px] sm:px-4 sm:py-3 sm:text-xs"
                >
                  {String(row.raw[header] ?? "")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
