import type { MorningBrew } from "@us100/contracts";

import {
  convictionLabel,
  formatDate,
  impactLabel,
  orderedSections,
  type AppLocale,
  watchItemKey
} from "@/lib/briefings";
import { ProductInfoPanel } from "@/components/product-info-panel";
import { SignalDashboard, type SignalDashboardItem } from "@/components/signal-dashboard";

type BriefingViewProps = {
  briefing: MorningBrew;
};

export function BriefingView({ briefing }: BriefingViewProps) {
  const locale = briefing.language as AppLocale;
  const copy = {
    pl: {
      changed: "Co się zmieniło",
      conviction: "Przekonanie",
      keySignal: "Najważniejsza informacja dnia",
      levels: "Poziomy i sygnały do obserwacji",
      sources: "Źródła",
      scorecard: "Scorecard tezy short",
      unknownPublisher: "Nieznany wydawca",
      verdict: "Werdykt",
      weekly: "Tygodniowe podsumowanie tezy short",
      why: "Dlaczego to ma znaczenie"
    },
    en: {
      changed: "What changed",
      conviction: "Conviction",
      keySignal: "Most important signal of the day",
      levels: "Levels and signals to watch",
      sources: "Sources",
      scorecard: "Short thesis scorecard",
      unknownPublisher: "Unknown publisher",
      verdict: "Verdict",
      weekly: "Weekly short thesis summary",
      why: "Why it matters"
    }
  }[locale];
  const sectionSignals = orderedSections(briefing).map(({ section }) => ({
    factor: section.title,
    signal: section.impact,
    observation: section.observation
  })) satisfies SignalDashboardItem[];

  return (
    <div className="page">
      <ProductInfoPanel locale={locale} />

      <section className="briefing-hero" aria-labelledby="briefing-title">
        <div className="hero-copy">
          <p className="eyebrow">US100 Morning Brew / {formatDate(briefing.date, locale)}</p>
          <h1 id="briefing-title">{briefing.headline}</h1>
          <p className="deck">{briefing.deck}</p>
        </div>
        <aside className="hero-meta" aria-label="Podsumowanie">
          <div className="stat">
            <span>{copy.verdict}</span>
            <strong>{briefing.verdict.summary}</strong>
          </div>
          <div className="stat">
            <span>{copy.conviction}</span>
            <strong>{convictionLabel(briefing.verdict.conviction, locale)}</strong>
          </div>
          <span className="tone" data-impact={briefing.verdict.stance}>
            {impactLabel(briefing.verdict.stance, locale)}
          </span>
        </aside>
      </section>

      <section className="key-signal" aria-labelledby="key-signal-title">
        <p className="eyebrow">{copy.keySignal}</p>
        <h2 id="key-signal-title">{briefing.keySignal.title}</h2>
        <p>{briefing.keySignal.observation}</p>
        <div className="why">
          <strong>{copy.why}</strong>
          <p>{briefing.keySignal.whyItMatters}</p>
        </div>
      </section>

      <SignalDashboard items={sectionSignals} locale={locale} />

      {briefing.weeklySummary ? (
        <section className="weekly-summary" aria-labelledby="weekly-summary-title">
          <div className="weekly-summary__header">
            <div>
              <p className="eyebrow">
                {copy.weekly} /{" "}
                {formatDate(briefing.weeklySummary.periodStart, locale)} -{" "}
                {formatDate(briefing.weeklySummary.periodEnd, locale)}
              </p>
              <h2 id="weekly-summary-title">{briefing.weeklySummary.title}</h2>
            </div>
            <span className="tone" data-impact={briefing.weeklySummary.verdict.stance}>
              {impactLabel(briefing.weeklySummary.verdict.stance, locale)}
            </span>
          </div>
          <p>{briefing.weeklySummary.verdict.summary}</p>
          <div className="why">
            <strong>{copy.why}</strong>
            <p>{briefing.weeklySummary.verdict.whyItMatters}</p>
          </div>
          <div className="weekly-summary__grid">
            <div>
              <h3>{copy.changed}</h3>
              <ul className="watch-items">
                {briefing.weeklySummary.keyChanges.map((item) => (
                  <li key={watchItemKey(item)}>
                    <strong>{item.label}</strong>
                    <p>{item.trigger}</p>
                    <p>{item.whyItMatters}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>{copy.scorecard}</h3>
              <ul className="scorecard-list">
                {briefing.weeklySummary.thesisSignals.map((item) => (
                  <li key={item.factor}>
                    <span className="tone" data-impact={item.signal}>
                      {impactLabel(item.signal, locale)}
                    </span>
                    <strong>{item.factor}</strong>
                    <p>{item.observation}</p>
                    <p>{item.whyItMatters}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <div className="section-grid">
        {orderedSections(briefing).map(({ id, section }, index) => (
          <section className="section" key={id} aria-labelledby={`${id}-title`}>
            <span className="tone" data-impact={section.impact}>
              {impactLabel(section.impact, locale)}
            </span>
            <h2 id={`${id}-title`}>{`${index + 1}. ${section.title}`}</h2>
            <p>{section.observation}</p>
            <div className="why">
              <strong>{copy.why}</strong>
              <p>{section.whyItMatters}</p>
            </div>
          </section>
        ))}
      </div>

      <section className="scorecard" aria-labelledby="scorecard-title">
        <h2 id="scorecard-title">{copy.scorecard}</h2>
        <ul className="scorecard-list">
          {briefing.thesisScorecard.map((item) => (
            <li key={item.factor}>
              <span className="tone" data-impact={item.signal}>
                {impactLabel(item.signal, locale)}
              </span>
              <strong>{item.factor}</strong>
              <p>{item.observation}</p>
              <p>{item.whyItMatters}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="watch-list" aria-labelledby="changed-title">
        <h2 id="changed-title">{copy.changed}</h2>
        <ul className="watch-items">
          {briefing.whatChanged.map((item) => (
            <li key={watchItemKey(item)}>
              <strong>{item.label}</strong>
              <p>{item.trigger}</p>
              <p>{item.whyItMatters}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="watch-list" aria-labelledby="levels-title">
        <h2 id="levels-title">{copy.levels}</h2>
        <ul className="watch-items">
          {briefing.levelsToWatch.map((item) => (
            <li key={watchItemKey(item)}>
              <strong>{item.label}</strong>
              <p>{item.trigger}</p>
              <p>{item.whyItMatters}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="sources" aria-labelledby="sources-title">
        <h2 id="sources-title">{copy.sources}</h2>
        <ul className="source-items">
          {briefing.sources.map((source) => (
            <li key={source.id}>
              <a href={source.url}>{source.title}</a>
              <p>{source.publisher ?? copy.unknownPublisher}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
