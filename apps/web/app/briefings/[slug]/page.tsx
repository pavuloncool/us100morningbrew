import { redirect } from "next/navigation";

type BriefingRedirectPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function BriefingRedirectPage({ params }: BriefingRedirectPageProps) {
  const { slug } = await params;
  redirect(`/pl/briefings/${slug}`);
}
