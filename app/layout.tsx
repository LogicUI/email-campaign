import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "EmailAI Prototype",
  description: "In-memory mass email builder with AI rewrite and Resend delivery.",
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
