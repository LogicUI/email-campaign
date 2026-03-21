import * as React from "react";

import { cn } from "@/core/utils/cn";

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;

  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export { Select };
