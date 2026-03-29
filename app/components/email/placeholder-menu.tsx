"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Code } from "lucide-react";

interface PlaceholderMenuProps {
  placeholders: string[];
  onInsert: (placeholder: string) => void;
  disabled?: boolean;
}

export function PlaceholderMenu({
  placeholders,
  onInsert,
  disabled = false,
}: PlaceholderMenuProps) {
  if (placeholders.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-muted/20 px-3 py-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Insert field
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={disabled} className="gap-2 rounded-full bg-background/90 shadow-sm">
            <Code className="h-4 w-4" />
            Placeholder
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-60 overflow-y-auto rounded-2xl border-border/80 bg-background/95 p-2 shadow-xl backdrop-blur"
        >
          {placeholders.map((placeholder) => (
            <DropdownMenuItem
              key={placeholder}
              onClick={() => onInsert(placeholder)}
              disabled={disabled}
              className="rounded-xl px-3 py-2 font-mono text-sm"
            >
              {`{{${placeholder}}}`}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
