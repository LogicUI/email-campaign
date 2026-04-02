import type { Metadata } from "next";

import { TanStackProvider } from "@/tanStack/provider";
import { NavigationWrapper } from "@/components/navigation/navigation-wrapper";

import "./globals.css";

export const metadata: Metadata = {
  title: "EmailAI Campaign",
  description: "Protected email campaign builder with Gmail delivery and configurable AI providers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <TanStackProvider>
          <NavigationWrapper>{children}</NavigationWrapper>
        </TanStackProvider>
      </body>
    </html>
  );
}
