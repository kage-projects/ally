import type { Metadata } from "next";
import "@/components/arc/foundation.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ally — Adaptive UI Engine",
  description: "Live observability dashboard for Ally adaptive interface decisions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-accent="coral" data-theme="dark" lang="en">
      <body>{children}</body>
    </html>
  );
}
