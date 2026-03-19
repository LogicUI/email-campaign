import type { Metadata } from "next";

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
      <body>{children}</body>
    </html>
  );
}
