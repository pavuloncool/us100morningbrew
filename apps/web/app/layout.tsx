import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://www.theguy2b.com"),
  title: {
    default: "US100 Morning Brew",
    template: "%s | US100 Morning Brew"
  },
  description:
    "Codzienny, strukturalny briefing US100 / Nasdaq-100 badający price action, breadth, AI, rates, Fed i volatility.",
  icons: {
    apple: "/us100morningbrew-logo-trans.png",
    icon: "/us100morningbrew-logo-trans.png"
  },
  openGraph: {
    images: [
      {
        alt: "US100 Morning Brew logo",
        height: 1254,
        url: "/us100morningbrew-logo-trans.png",
        width: 1254
      }
    ],
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
