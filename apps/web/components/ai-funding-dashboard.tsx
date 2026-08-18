import type { AiFundingDashboard, AiFundingStressState } from "@us100/contracts";

import { formatDate, type AppLocale } from "@/lib/briefings";

type AiFundingDashboardViewProps = {
  dashboard: AiFundingDashboard;
  locale: AppLocale;
};

const copy = {
  pl: {
    alerts: "Alerty",
    asOf: "Stan na",
    capex: "Capex",
    concession: "NIC",
    coverage: "Coverage",
    creditSpread: "Spread",
    dataQuality: "Jakość danych",
    emptyAlerts: "Brak aktywnych alertów w publicznym zestawie danych.",
    events: "Następne wydarzenia",
    fcf: "FCF",
    headline: "AI Funding Monitor",
    issuerMetrics: "Emitenci",
    month: "1M",
    noEvents: "Brak nadchodzących wydarzeń w publicznym snapshocie.",
    note: "Funding stress ≠ timing signal",
    now: "Teraz",
    score: "AI Funding Stress",
    source: "Źródło",
    subtitle:
      "Public-only early-warning layer for AI/data-center financing pressure in hyperscalers.",
    threeMonths: "3M",
    unavailable: "Niedostępne publicznie",
    watchFields: "Do sprawdzenia"
  },
  en: {
    alerts: "Alerts",
    asOf: "As of",
    capex: "Capex",
    concession: "NIC",
    coverage: "Coverage",
    creditSpread: "Spread",
    dataQuality: "Data quality",
    emptyAlerts: "No active alerts in the public data set.",
    events: "Next events",
    fcf: "FCF",
    headline: "AI Funding Monitor",
    issuerMetrics: "Issuers",
    month: "1M",
    noEvents: "No upcoming events in the public snapshot.",
    note: "Funding stress ≠ timing signal",
    now: "Now",
    score: "AI Funding Stress",
    source: "Source",
    subtitle:
      "Public-only early-warning layer for AI/data-center financing pressure in hyperscalers.",
    threeMonths: "3M",
    unavailable: "Publicly unavailable",
    watchFields: "Check"
  }
} as const;

function stateLabel(state: AiFundingStressState, locale: AppLocale): string {
  const labels = {
    pl: {
      high: "HIGH",
      insufficient_data: "INSUFFICIENT DATA",
      low: "LOW",
      moderate: "MODERATE",
      severe: "SEVERE"
    },
    en: {
      high: "HIGH",
      insufficient_data: "INSUFFICIENT DATA",
      low: "LOW",
      moderate: "MODERATE",
      severe: "SEVERE"
    }
  } as const;
  return labels[locale][state];
}

function formatTimestamp(value: string, locale: AppLocale): string {
  return new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Warsaw"
  }).format(new Date(value));
}

export function AiFundingDashboardView({ dashboard, locale }: AiFundingDashboardViewProps) {
  const t = copy[locale];
  return (
    <div className="page ai-funding-page">
      <section className="ai-funding-hero" aria-labelledby="ai-funding-title">
        <div>
          <p className="eyebrow">US100 Morning Brew</p>
          <h1 id="ai-funding-title">{t.headline}</h1>
          <p className="deck">{t.subtitle}</p>
        </div>
        <aside className="ai-funding-score" data-state={dashboard.score.state}>
          <span>{t.score}</span>
          <strong>
            {dashboard.score.totalScore} / {dashboard.score.availableMaxScore || dashboard.score.fullMaxScore}
          </strong>
          <b>{stateLabel(dashboard.score.state, locale)}</b>
          <small>{t.note}</small>
        </aside>
      </section>

      <section className="ai-funding-interpretation" aria-label={t.note}>
        <p>{dashboard.interpretation}</p>
        <span>{`${t.asOf}: ${formatTimestamp(dashboard.asOf, locale)}`}</span>
      </section>

      <section className="ai-funding-matrix" aria-label="AI funding monitor current state">
        <div className="ai-funding-matrix__head" aria-hidden="true">
          <span />
          <span>{t.now}</span>
          <span>{t.month}</span>
          <span>{t.threeMonths}</span>
        </div>
        {dashboard.metrics.map((metric) => (
          <div className="ai-funding-matrix__row" data-trend={metric.trend} key={metric.label}>
            <strong>{metric.label}</strong>
            <span>{metric.current}</span>
            <span>{metric.oneMonthAgo}</span>
            <span>{metric.threeMonthsAgo}</span>
          </div>
        ))}
      </section>

      <section className="ai-funding-components" aria-labelledby="ai-funding-components-title">
        <h2 id="ai-funding-components-title">{t.dataQuality}</h2>
        <ul>
          {dashboard.score.components.map((component) => (
            <li key={component.label}>
              <strong>{component.label}</strong>
              <span>{component.score === null ? "N/A" : `${component.score} / 3`}</span>
              <p>{component.unavailableReason ?? component.metric}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="ai-funding-issuers" aria-labelledby="ai-funding-issuers-title">
        <h2 id="ai-funding-issuers-title">{t.issuerMetrics}</h2>
        <div className="ai-funding-issuer-grid">
          {dashboard.issuerCards.map((issuer) => (
            <article className="ai-funding-issuer-card" key={issuer.issuerId}>
              <header>
                <strong>{issuer.ticker}</strong>
                <span>{issuer.name}</span>
              </header>
              <dl>
                <div>
                  <dt>{t.creditSpread}</dt>
                  <dd>{issuer.creditSpread}</dd>
                </div>
                <div>
                  <dt>20D</dt>
                  <dd>{issuer.twentyDaySpreadChange}</dd>
                </div>
                <div>
                  <dt>{t.coverage}</dt>
                  <dd>{issuer.latestIssueCoverage}</dd>
                </div>
                <div>
                  <dt>{t.concession}</dt>
                  <dd>{issuer.latestConcession}</dd>
                </div>
                <div>
                  <dt>{t.capex}</dt>
                  <dd>{issuer.capexGuidanceChange}</dd>
                </div>
                <div>
                  <dt>{t.fcf}</dt>
                  <dd>{issuer.fcfTrend}</dd>
                </div>
              </dl>
              <p>{`${copy[locale].events}: ${issuer.nextEarningsDate}`}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ai-funding-events" aria-labelledby="ai-funding-events-title">
        <h2 id="ai-funding-events-title">{t.events}</h2>
        {dashboard.events.length > 0 ? (
          <ol>
            {dashboard.events.map((event) => (
              <li key={event.id}>
                <time dateTime={event.date}>{formatDate(event.date, locale)}</time>
                <strong>{event.title}</strong>
                {event.watchFields.length > 0 ? (
                  <p>{`${t.watchFields}: ${event.watchFields.join(", ")}`}</p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p>{t.noEvents}</p>
        )}
      </section>

      <section className="ai-funding-sources" aria-labelledby="ai-funding-sources-title">
        <h2 id="ai-funding-sources-title">{t.source}</h2>
        <ul>
          {dashboard.dataSources.map((source, index) => (
            <li key={`${source.source}:${index}`}>
              {source.sourceUrl ? <a href={source.sourceUrl}>{source.source}</a> : <span>{source.source}</span>}
              <small>{`${source.sourceType} / ${source.completeness} / ${source.confidence}`}</small>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
