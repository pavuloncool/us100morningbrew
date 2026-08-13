"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { isAppLocale, uiCopy, type AppLocale } from "@/lib/briefings";
import { ReviewAuthFragmentHandler } from "@/components/review-auth-fragment-handler";
import { SiteHeader } from "@/components/site-header";

type AppShellProps = {
  children: ReactNode;
};

function localeFromPathname(pathname: string): AppLocale {
  const [, firstSegment] = pathname.split("/");
  return firstSegment && isAppLocale(firstSegment) ? firstSegment : "pl";
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const copy = uiCopy[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <>
      <ReviewAuthFragmentHandler />
      <a className="skip-link" href="#main">
        {copy.skipToContent}
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
    </>
  );
}
