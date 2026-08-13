import type { MorningBrew } from "@us100/contracts";

import { formatDate, impactLabel, orderedSections, type AppLocale } from "./briefings";

type NewsletterEnv = Record<string, string | undefined>;

export type NewsletterDraftResult =
  | {
      broadcastId: string;
      provider: "kit";
      status: "created";
      url: string | null;
    }
  | {
      provider: "kit" | "disabled";
      reason: string;
      status: "skipped";
    };

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function paragraph(value: string): string {
  return `<p>${escapeHtml(value)}</p>`;
}

export function renderNewsletterHtml(briefing: MorningBrew, publicUrl?: string): string {
  const locale = briefing.language as AppLocale;
  const why = locale === "pl" ? "Dlaczego to ma znaczenie" : "Why it matters";
  const scorecard = locale === "pl" ? "Scorecard tezy short" : "Short thesis scorecard";
  const watch = locale === "pl" ? "Co obserwować" : "What to watch";
  const readOnline = locale === "pl" ? "Czytaj online" : "Read online";

  const sections = orderedSections(briefing)
    .map(
      ({ section }, index) => `
        <h3>${index + 1}. ${escapeHtml(section.title)}</h3>
        <p><strong>${escapeHtml(impactLabel(section.impact, locale))}</strong></p>
        ${paragraph(section.observation)}
        <p><strong>${why}</strong></p>
        ${paragraph(section.whyItMatters)}
      `
    )
    .join("");

  const scorecardItems = briefing.thesisScorecard
    .map(
      (item) => `
        <li>
          <strong>${escapeHtml(item.factor)}</strong><br />
          ${escapeHtml(impactLabel(item.signal, locale))}<br />
          ${escapeHtml(item.observation)}
        </li>
      `
    )
    .join("");

  const watchItems = briefing.levelsToWatch
    .map(
      (item) => `
        <li>
          <strong>${escapeHtml(item.label)}</strong><br />
          ${escapeHtml(item.trigger)}<br />
          ${escapeHtml(item.whyItMatters)}
        </li>
      `
    )
    .join("");

  const onlineLink = publicUrl
    ? `<p><a href="${escapeHtml(publicUrl)}">${readOnline}</a></p>`
    : "";

  return `
    <article>
      <p><strong>US100 Morning Brew / ${escapeHtml(formatDate(briefing.date, locale))}</strong></p>
      <h1>${escapeHtml(briefing.headline)}</h1>
      ${paragraph(briefing.deck)}
      <h2>${escapeHtml(briefing.keySignal.title)}</h2>
      ${paragraph(briefing.keySignal.observation)}
      <p><strong>${why}</strong></p>
      ${paragraph(briefing.keySignal.whyItMatters)}
      ${sections}
      <h2>${scorecard}</h2>
      <ul>${scorecardItems}</ul>
      <h2>${watch}</h2>
      <ul>${watchItems}</ul>
      ${onlineLink}
    </article>
  `;
}

function parseInteger(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function parseJsonObjectArray(value: string | undefined): unknown[] | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed) ? parsed : undefined;
}

export async function createNewsletterDraft(
  briefing: MorningBrew,
  env: NewsletterEnv = process.env
): Promise<NewsletterDraftResult> {
  const provider = env.US100_NEWSLETTER_PROVIDER ?? "disabled";
  if (provider !== "kit") {
    return {
      provider: "disabled",
      reason: "US100_NEWSLETTER_PROVIDER is not set to kit.",
      status: "skipped"
    };
  }

  const apiKey = env.KIT_API_KEY;
  if (!apiKey) {
    return {
      provider: "kit",
      reason: "KIT_API_KEY is not configured.",
      status: "skipped"
    };
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const publicUrl = appUrl ? `${appUrl}/${briefing.language}/briefings/${briefing.slug}` : undefined;
  const subscriberFilter = parseJsonObjectArray(env.KIT_SUBSCRIBER_FILTER);
  const body: Record<string, unknown> = {
    content: renderNewsletterHtml(briefing, publicUrl),
    description: `US100 Morning Brew ${briefing.date} ${briefing.language.toUpperCase()}`,
    email_template_id: parseInteger(env.KIT_EMAIL_TEMPLATE_ID),
    preview_text: briefing.deck,
    public: env.KIT_BROADCAST_PUBLIC === "true",
    published_at: new Date().toISOString(),
    send_at: null,
    subject: briefing.headline
  };

  if (subscriberFilter) {
    body.subscriber_filter = subscriberFilter;
  }

  const response = await fetch("https://api.kit.com/v4/broadcasts", {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "X-Kit-Api-Key": apiKey
    },
    method: "POST"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Kit broadcast draft failed with ${response.status}: ${message}`);
  }

  const payload = (await response.json()) as {
    broadcast?: {
      id?: number | string;
      public_url?: string | null;
      url?: string | null;
    };
  };
  const broadcastId = payload.broadcast?.id ? String(payload.broadcast.id) : "";
  if (!broadcastId) {
    throw new Error("Kit did not return a broadcast id.");
  }

  return {
    broadcastId,
    provider: "kit",
    status: "created",
    url: payload.broadcast?.public_url ?? payload.broadcast?.url ?? null
  };
}
