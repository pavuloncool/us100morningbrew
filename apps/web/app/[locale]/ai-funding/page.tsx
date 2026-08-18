import { notFound } from "next/navigation";

import { AiFundingDashboardView } from "@/components/ai-funding-dashboard";
import { getLatestAiFundingDashboard } from "@/lib/ai-funding";
import { isAppLocale } from "@/lib/briefings";

type AiFundingPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AiFundingPage({ params }: AiFundingPageProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    notFound();
  }

  const dashboard = await getLatestAiFundingDashboard();
  return <AiFundingDashboardView dashboard={dashboard} locale={locale} />;
}
