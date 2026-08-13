import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BriefingView } from "@/components/briefing";
import { getBriefingBySlug, isAppLocale } from "@/lib/briefings";

type BriefingPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export async function generateMetadata({ params }: BriefingPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) {
    return {};
  }

  const briefing = await getBriefingBySlug(slug, locale);
  if (!briefing) {
    return {};
  }

  return {
    title: briefing.headline,
    description: briefing.deck
  };
}

export default async function LocaleBriefingPage({ params }: BriefingPageProps) {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) {
    notFound();
  }

  const briefing = await getBriefingBySlug(slug, locale);
  if (!briefing) {
    notFound();
  }

  return <BriefingView briefing={briefing} />;
}
