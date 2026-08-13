"use client";

import { usePathname, useRouter } from "next/navigation";

import { isAppLocale, type AppLocale } from "@/lib/briefings";

export function LanguageSwitch() {
  const pathname = usePathname();
  const router = useRouter();
  const [, firstSegment, ...restSegments] = pathname.split("/");
  const language: AppLocale = firstSegment && isAppLocale(firstSegment) ? firstSegment : "pl";
  const ariaLabel =
    language === "pl" ? "Przełącznik języka" : "Language switcher";

  const selectLanguage = (nextLanguage: AppLocale) => {
    const nextPath =
      firstSegment && isAppLocale(firstSegment)
        ? `/${[nextLanguage, ...restSegments].join("/")}`
        : `/${nextLanguage}${pathname === "/" ? "" : pathname}`;

    window.localStorage.setItem("us100:language", nextLanguage);
    router.push(nextPath);
  };

  return (
    <div className="language-switch" aria-label={ariaLabel}>
      <button
        aria-pressed={language === "pl"}
        data-active={language === "pl"}
        onClick={() => {
          selectLanguage("pl");
        }}
        type="button"
      >
        PL
      </button>
      <button
        aria-pressed={language === "en"}
        data-active={language === "en"}
        onClick={() => {
          selectLanguage("en");
        }}
        type="button"
      >
        EN
      </button>
    </div>
  );
}
