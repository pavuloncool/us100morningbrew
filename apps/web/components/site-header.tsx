"use client";

import Image from "next/image";
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
        <Image
          alt=""
          aria-hidden="true"
          className="brand-logo"
          height={40}
          priority
          src="/us100morningbrew-logo.webp"
          width={40}
        />
        <span>US100 Morning Brew</span>
      </Link>
      <nav aria-label={copy.mainNavigation}>
        <Link href={`/${locale}`}>{copy.latest}</Link>
        <Link href={`/${locale}/archive`}>{copy.archive}</Link>
        <Link href={`/${locale}/weekly`}>{copy.reportOfWeek}</Link>
        <Link href={`/${locale}/ai-funding`}>{copy.aiFunding}</Link>
      </nav>
      <LanguageSwitch />
    </header>
  );
}
