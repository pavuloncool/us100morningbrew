"use client";

import type { SignalImpact } from "@us100/contracts";
import { useMemo, useState } from "react";

import { impactLabel, type AppLocale } from "@/lib/briefings";

type SignalFilter = "all" | "strengthens" | "weakens" | "other";

type SignalDashboardProps = {
  items: SignalDashboardItem[];
  locale: AppLocale;
};

export type SignalDashboardItem = {
  factor: string;
  signal: SignalImpact;
  observation: string;
};

type RankedSignalDashboardItem = SignalDashboardItem & {
  position: number;
};

const dashboardCopy = {
  pl: {
    all: "Wszystkie",
    balance: "Bilans sygnałów",
    empty: "Brak sygnałów w tej kategorii dla bieżącego briefingu.",
    filter: "Filtr sygnałów",
    mixed: "Mieszane / bez zmiany",
    radarDesc:
      "Radar ma pięć osi odpowiadających pięciu sekcjom briefingu. Im dalej od środka, tym mocniej dany czynnik wzmacnia tezę short.",
    radarTitle: "Radar czynników tezy short",
    sectionEyebrow: "Mapa sygnałów",
    sectionTitle: "Co dziś wzmacnia, a co osłabia tezę short",
    strengthens: "Wzmacnia",
    strengthensCount: "wzmacnia",
    weakens: "Osłabia",
    weakensCount: "osłabia",
    caption:
      "Najedź na punkty, żeby rozwinąć etykiety. Radar pokazuje siłę pięciu sekcji briefingu wobec tezy short, nie prognozę ceny."
  },
  en: {
    all: "All",
    balance: "Signal balance",
    empty: "No signals in this category for the current briefing.",
    filter: "Signal filter",
    mixed: "Mixed / unchanged",
    radarDesc:
      "The radar has five axes matching the five briefing sections. The farther from the center, the more that factor strengthens the short thesis.",
    radarTitle: "Short thesis factor radar",
    sectionEyebrow: "Signal map",
    sectionTitle: "What strengthens and weakens the short thesis today",
    strengthens: "Strengthens",
    strengthensCount: "strengthen",
    weakens: "Weakens",
    weakensCount: "weaken",
    caption:
      "Hover over the points to expand labels. The radar shows the strength of five briefing sections against the short thesis, not a price forecast."
  }
} as const;

function filterOptions(locale: AppLocale): ReadonlyArray<{ id: SignalFilter; label: string }> {
  const copy = dashboardCopy[locale];
  return [
    { id: "all", label: copy.all },
    { id: "strengthens", label: copy.strengthens },
    { id: "weakens", label: copy.weakens },
    { id: "other", label: copy.mixed }
  ];
}

function scoreForImpact(impact: SignalImpact): number {
  switch (impact) {
    case "short_thesis_strengthened":
      return 4;
    case "mixed":
      return 2.6;
    case "unchanged":
      return 2;
    case "short_thesis_weakened":
      return 0.9;
  }
}

function filterForImpact(impact: SignalImpact): SignalFilter {
  switch (impact) {
    case "short_thesis_strengthened":
      return "strengthens";
    case "short_thesis_weakened":
      return "weakens";
    case "mixed":
    case "unchanged":
      return "other";
  }
}

function radarPoint(index: number, total: number, value: number): string {
  const center = 92;
  const maxRadius = 68;
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
  const radius = (value / 4) * maxRadius;
  const x = center + Math.cos(angle) * radius;
  const y = center + Math.sin(angle) * radius;
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}

function axisPoint(index: number, total: number): string {
  return radarPoint(index, total, 4);
}

function markerPosition(
  index: number,
  total: number
): { left: string; top: string; x: string; y: string; placement: "left" | "right" | "center" } {
  const center = 50;
  const radius = 38;
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
  const x = center + Math.cos(angle) * radius;
  const y = center + Math.sin(angle) * radius;
  return {
    left: `${x.toFixed(2)}%`,
    top: `${y.toFixed(2)}%`,
    x: (92 + Math.cos(angle) * 68).toFixed(1),
    y: (92 + Math.sin(angle) * 68).toFixed(1),
    placement: x < center - 16 ? "left" : x > center + 16 ? "right" : "center"
  };
}

function impactColor(impact: SignalImpact): string {
  switch (impact) {
    case "short_thesis_strengthened":
      return "var(--negative)";
    case "short_thesis_weakened":
      return "var(--positive)";
    case "mixed":
      return "var(--warning)";
    case "unchanged":
      return "var(--info)";
  }
}

export function SignalDashboard({ items, locale }: SignalDashboardProps) {
  const [filter, setFilter] = useState<SignalFilter>("all");
  const copy = dashboardCopy[locale];
  const rankedItems = useMemo(
    () => items.map((item, index) => ({ ...item, position: index + 1 })),
    [items]
  );
  const chartItems = rankedItems.slice(0, 6);
  const polygonPoints = chartItems
    .map((item, index) => radarPoint(index, chartItems.length, scoreForImpact(item.signal)))
    .join(" ");
  const filteredItems = useMemo(
    () =>
      rankedItems.filter((item) => filter === "all" || filterForImpact(item.signal) === filter),
    [filter, rankedItems]
  );
  const strengthensCount = rankedItems.filter(
    (item) => item.signal === "short_thesis_strengthened"
  ).length;
  const weakensCount = rankedItems.filter(
    (item) => item.signal === "short_thesis_weakened"
  ).length;

  return (
    <section className="signal-dashboard" aria-labelledby="signal-dashboard-title">
      <header className="signal-dashboard__header">
        <div>
          <p className="eyebrow">{copy.sectionEyebrow}</p>
          <h2 id="signal-dashboard-title">{copy.sectionTitle}</h2>
        </div>
        <div className="signal-balance" aria-label={copy.balance}>
          <span data-side="strengthens">{`${strengthensCount} ${copy.strengthensCount}`}</span>
          <span data-side="weakens">{`${weakensCount} ${copy.weakensCount}`}</span>
        </div>
      </header>

      <div className="signal-dashboard__body">
        <figure className="radar-card">
          <div className="radar-plot">
            <svg aria-labelledby="radar-title radar-desc" role="img" viewBox="0 0 184 184">
              <title id="radar-title">{copy.radarTitle}</title>
              <desc id="radar-desc">{copy.radarDesc}</desc>
              <circle cx="92" cy="92" r="17" />
              <circle cx="92" cy="92" r="34" />
              <circle cx="92" cy="92" r="51" />
              <circle cx="92" cy="92" r="68" />
              {chartItems.map((item, index) => {
                const end = axisPoint(index, chartItems.length);
                const [x, y] = end.split(",");
                const marker = markerPosition(index, chartItems.length);
                return (
                  <g key={item.factor}>
                    <line
                      className="radar-axis-line"
                      style={{ stroke: impactColor(item.signal) }}
                      x1="92"
                      x2={x}
                      y1="92"
                      y2={y}
                    />
                    <circle
                      className="radar-axis-dot"
                      cx={marker.x}
                      cy={marker.y}
                      r="2.8"
                      style={{ stroke: impactColor(item.signal) }}
                    />
                  </g>
                );
              })}
              <polygon points={polygonPoints} />
            </svg>
            <div className="radar-label-layer" aria-hidden="true">
              {chartItems.map((item, index) => {
                const marker = markerPosition(index, chartItems.length);
                return (
                  <span
                    className="radar-marker"
                    data-placement={marker.placement}
                    key={item.factor}
                    style={{ left: marker.left, top: marker.top }}
                  >
                    <span style={{ background: impactColor(item.signal) }}>{item.position}</span>
                    <strong>{item.factor}</strong>
                  </span>
                );
              })}
            </div>
          </div>
          <figcaption>
            {copy.caption}
          </figcaption>
        </figure>

        <div className="signal-panel">
          <div className="filter-controls" aria-label={copy.filter}>
            {filterOptions(locale).map((option) => (
              <button
                aria-pressed={filter === option.id}
                data-active={filter === option.id}
                key={option.id}
                onClick={() => {
                  setFilter(option.id);
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="factor-results" aria-live="polite">
            {filteredItems.length > 0 ? (
              <ul className="factor-bars">
                {filteredItems.map((item) => {
                  const score = scoreForImpact(item.signal);
                  return (
                    <li data-impact={item.signal} key={item.factor}>
                      <div className="factor-bars__copy">
                        <strong>{`${item.position}. ${item.factor}`}</strong>
                        <span>{impactLabel(item.signal, locale)}</span>
                      </div>
                      <div className="factor-bars__track" aria-hidden="true">
                        <span style={{ width: `${Math.max(18, (score / 4) * 100)}%` }} />
                      </div>
                      <p>{item.observation}</p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="factor-results__empty">{copy.empty}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
