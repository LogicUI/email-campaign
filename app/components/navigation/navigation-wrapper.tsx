"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export function NavigationWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Don't show navigation on /app routes (authenticated workspace)
  const showNavigation = !pathname.startsWith("/app");

  if (!showNavigation) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
