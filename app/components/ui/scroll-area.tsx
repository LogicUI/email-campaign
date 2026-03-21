"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/core/utils/cn";

const scrollBarBaseClass =
  "flex touch-none select-none bg-muted/35 transition-colors";

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      orientation="vertical"
      className={cn(scrollBarBaseClass, "h-full w-3 border-l border-l-transparent p-[1px]")}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border/90" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      orientation="horizontal"
      className={cn(scrollBarBaseClass, "h-3 flex-col border-t border-t-transparent p-[1px]")}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border/90" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
    <ScrollAreaPrimitive.Corner className="bg-transparent" />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

export { ScrollArea };
