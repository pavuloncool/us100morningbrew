"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isAppLocale, type AppLocale, uiCopy } from "@/lib/briefings";
import { LanguageSwitch } from "@/components/language-switch";

function localeFromPath(pathname: string): AppLocale {
  const [, firstSegment] = pathname.split("/");
  return firstSegment && isAppLocale(firstSegment) ? firstSegment : "pl";
}

export function SiteHeader() {
  const pathname = usePathname();
  const locale = localeFromPath(pathname);
  const copy = uiCopy[locale];

  return (
    <header className="site-header">
      <Link className="brand" href={`/${locale}`}>
        US100 Morning Brew
      </Link>
      <nav aria-label={copy.mainNavigation}>
        <Link href={`/${locale}`}>{copy.latest}</Link>
        <Link href={`/${locale}/archive`}>{copy.archive}</Link>
      </nav>
      <LanguageSwitch />
    </header>
  );
}

