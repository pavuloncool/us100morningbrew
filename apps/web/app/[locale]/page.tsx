import { notFound } from "next/navigation";

import { BriefingView } from "@/components/briefing";
import { getLatestBriefing, isAppLocale } from "@/lib/briefings";

type LocalePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function LocaleHomePage({ params }: LocalePageProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    notFound();
  }

  const briefing = await getLatestBriefing(locale);
  if (!briefing) {
    notFound();
  }

  return <BriefingView briefing={briefing} />;
}
