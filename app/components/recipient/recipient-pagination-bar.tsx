"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { RecipientPaginationBarProps } from "@/types/recipient-pagination-bar";

export function RecipientPaginationBar(props: RecipientPaginationBarProps) {
  const {
    currentPage,
    onPageChange,
    onPageSizeChange,
    pageSize,
    totalPages,
    totalRecipients,
  } = props;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-white/85 p-4 md:flex-row md:items-center md:justify-between">
      <div className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages} · {totalRecipients} total recipients
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Select
          className="w-[110px]"
          value={String(pageSize)}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {[6, 12, 24].map((size) => (
            <option key={size} value={size}>
              {size}/page
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
