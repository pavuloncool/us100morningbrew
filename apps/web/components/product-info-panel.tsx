"use client";

import { useEffect, useState } from "react";

import type { AppLocale } from "@/lib/briefings";

const storageKey = "us100:product-info-dismissed";

type ProductInfoPanelProps = {
  locale: AppLocale;
};

export function ProductInfoPanel({ locale }: ProductInfoPanelProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(storageKey) === "true");
  }, []);

  if (dismissed) {
    return null;
  }

  const copy = {
    pl: {
      close: "Zamknij informację",
      description:
        "US100 Morning Brew to aplikacja analityczno-publikacyjna dla rynku Nasdaq-100/US100, generująca codzienny poranny briefing inwestycyjny na podstawie danych finansowych, giełdowych, makroekonomicznych i rynkowych newsów, stosująca automatyczny proces researchu, analizy sygnałów, oceny tezy rynkowej i publikacji treści gotowej do akceptacji redakcyjnej.",
      disclaimer:
        "Publikowane treści mają charakter wyłącznie edukacyjny i informacyjny. Nie stanowią porady inwestycyjnej, rekomendacji kupna lub sprzedaży instrumentów finansowych ani indywidualnej konsultacji dostosowanej do sytuacji użytkownika.",
      eyebrow: "O aplikacji"
    },
    en: {
      close: "Dismiss information",
      description:
        "US100 Morning Brew is an analytics and publishing application for the Nasdaq-100/US100 market, generating a daily morning investment briefing based on financial, market, macroeconomic and market-news sources, using an automated process for research, signal analysis, market-thesis assessment and editorial-ready publication.",
      disclaimer:
        "Published content is for educational and informational purposes only. It does not constitute investment advice, a recommendation to buy or sell financial instruments, or an individual consultation tailored to the user’s situation.",
      eyebrow: "About the app"
    }
  }[locale];

  const dismiss = () => {
    window.localStorage.setItem(storageKey, "true");
    setDismissed(true);
  };

  return (
    <section className="product-info-panel" aria-label={copy.eyebrow}>
      <button
        aria-label={copy.close}
        className="product-info-panel__close"
        onClick={dismiss}
        type="button"
      >
        ×
      </button>
      <p className="eyebrow">{copy.eyebrow}</p>
      <p>{copy.description}</p>
      <p>{copy.disclaimer}</p>
    </section>
  );
}
