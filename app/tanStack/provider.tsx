"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { getQueryClient } from "@/tanStack/query-client";

export function TanStackProvider(props: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  return <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>;
}
