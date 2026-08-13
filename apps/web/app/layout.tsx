import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "US100 Morning Brew",
    template: "%s | US100 Morning Brew"
  },
  description:
    "Codzienny, strukturalny briefing US100 / Nasdaq-100 badający price action, breadth, AI, rates, Fed i volatility.",
  openGraph: {
    type: "website",
    siteName: "US100 Morning Brew"
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pl">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
