import type {
  AiFundingDashboard,
  AiFundingDashboardMetricId,
  AiFundingMetricSource,
  AiFundingStressComponentId,
  AiFundingStressState
} from "@us100/contracts";

import type { AppLocale } from "./briefings";

type DashboardMetric = AiFundingDashboard["metrics"][number];
type ScoreComponent = AiFundingDashboard["score"]["components"][number];

const metricLabels: Record<AppLocale, Record<AiFundingDashboardMetricId, string>> = {
  pl: {
    credit_spread: "Spread kredytowy",
    free_cash_flow: "Wolne przepływy pieniężne",
    hyperscaler_capex: "Capex hyperscalerów",
    new_issue_concession: "Premia nowej emisji",
    orderbook_coverage: "Popyt na emisje"
  },
  en: {
    credit_spread: "Credit spread",
    free_cash_flow: "Free cash flow",
    hyperscaler_capex: "Hyperscaler capex",
    new_issue_concession: "New issue concession",
    orderbook_coverage: "Orderbook coverage"
  }
};

const componentLabels: Record<AppLocale, Record<AiFundingStressComponentId, string>> = {
  pl: {
    capex_cashflow_pressure: "Presja capex / cash flow",
    credit_spread_trend: "Trend spreadów kredytowych",
    new_issue_concession: "Premia nowej emisji",
    orderbook_coverage: "Popyt na emisje"
  },
  en: {
    capex_cashflow_pressure: "Capex / cash-flow pressure",
    credit_spread_trend: "Credit spread trend",
    new_issue_concession: "New issue concession",
    orderbook_coverage: "Orderbook coverage"
  }
};

const stressStateLabels: Record<AppLocale, Record<AiFundingStressState, string>> = {
  pl: {
    high: "WYSOKI",
    insufficient_data: "BRAK WYSTARCZAJĄCYCH DANYCH",
    low: "NISKI",
    moderate: "UMIARKOWANY",
    severe: "SKRAJNY"
  },
  en: {
    high: "HIGH",
    insufficient_data: "INSUFFICIENT DATA",
    low: "LOW",
    moderate: "MODERATE",
    severe: "SEVERE"
  }
};

const completenessLabels: Record<AppLocale, Record<AiFundingMetricSource["completeness"], string>> = {
  pl: {
    complete: "pełne",
    partial: "częściowe",
    unavailable: "niedostępne"
  },
  en: {
    complete: "complete",
    partial: "partial",
    unavailable: "unavailable"
  }
};

const confidenceLabels: Record<AppLocale, Record<AiFundingMetricSource["confidence"], string>> = {
  pl: {
    high: "wysoka pewność",
    low: "niska pewność",
    medium: "średnia pewność"
  },
  en: {
    high: "high",
    low: "low",
    medium: "medium"
  }
};

const sourceTypeLabels: Record<AppLocale, Record<AiFundingMetricSource["sourceType"], string>> = {
  pl: {
    derived: "wyliczone",
    finra_trace: "FINRA TRACE",
    fred: "FRED",
    openfigi: "OpenFIGI",
    public_web: "publiczne WWW",
    sec_edgar: "SEC EDGAR",
    treasury: "U.S. Treasury"
  },
  en: {
    derived: "derived",
    finra_trace: "FINRA TRACE",
    fred: "FRED",
    openfigi: "OpenFIGI",
    public_web: "public web",
    sec_edgar: "SEC EDGAR",
    treasury: "U.S. Treasury"
  }
};

const metricIdByLegacyLabel: Record<string, AiFundingDashboardMetricId> = {
  "Credit spread": "credit_spread",
  "Free cash flow": "free_cash_flow",
  "Hyperscaler capex": "hyperscaler_capex",
  "New issue concession": "new_issue_concession",
  "Orderbook coverage": "orderbook_coverage"
};

const componentIdByLegacyLabel: Record<string, AiFundingStressComponentId> = {
  "Capex / cash-flow pressure": "capex_cashflow_pressure",
  "Credit spread trend": "credit_spread_trend",
  "New issue concession": "new_issue_concession",
  "Orderbook coverage": "orderbook_coverage"
};

const unavailableMetricNames: Record<string, string> = {
  Capex: "Capex",
  "Capex pressure": "presja capex",
  "Credit spread": "spread kredytowy",
  "Credit spread trend": "trend spreadów kredytowych",
  "New issue concession": "premia nowej emisji",
  "Orderbook coverage": "popyt na emisje"
};

const unavailableReasonLabels: Record<string, string> = {
  "No parsed SEC quarterly metrics are available yet.":
    "Nie załadowano jeszcze przetworzonych kwartalnych metryk z SEC.",
  "No public 20D spread history is available yet.":
    "Nie ma jeszcze publicznej 20-dniowej historii spreadów.",
  "Public filings and configured public sources did not disclose orderbook size.":
    "Publiczne filingi i skonfigurowane źródła publiczne nie ujawniły wielkości orderbooka.",
  "Public sources did not provide both new issue spread and comparable secondary spread.":
    "Źródła publiczne nie podały jednocześnie spreadu nowej emisji i porównywalnego spreadu wtórnego."
};

const watchFieldLabels: Record<string, string> = {
  "AI/data-center commitments": "zobowiązania AI/data-center",
  "capex actual": "raportowany capex",
  "capex guidance": "guidance capex",
  "debt financing comments": "komentarze o finansowaniu długiem",
  "free cash flow": "wolne przepływy pieniężne",
  "operating cash flow": "operacyjne przepływy pieniężne"
};

function metricId(metric: DashboardMetric): AiFundingDashboardMetricId | null {
  return metric.id ?? metricIdByLegacyLabel[metric.label] ?? null;
}

function componentId(component: ScoreComponent): AiFundingStressComponentId | null {
  return component.id ?? componentIdByLegacyLabel[component.label] ?? null;
}

export function aiFundingStateLabel(state: AiFundingStressState, locale: AppLocale): string {
  return stressStateLabels[locale][state];
}

export function aiFundingMetricLabel(metric: DashboardMetric, locale: AppLocale): string {
  const id = metricId(metric);
  return id ? metricLabels[locale][id] : metric.label;
}

export function aiFundingComponentLabel(component: ScoreComponent, locale: AppLocale): string {
  const id = componentId(component);
  return id ? componentLabels[locale][id] : component.label;
}

export function aiFundingCompletenessLabel(
  value: AiFundingMetricSource["completeness"],
  locale: AppLocale
): string {
  return completenessLabels[locale][value];
}

export function aiFundingConfidenceLabel(
  value: AiFundingMetricSource["confidence"],
  locale: AppLocale
): string {
  return confidenceLabels[locale][value];
}

export function aiFundingSourceTypeLabel(
  value: AiFundingMetricSource["sourceType"],
  locale: AppLocale
): string {
  return sourceTypeLabels[locale][value];
}

export function aiFundingUnavailableReason(value: string | null, locale: AppLocale): string | null {
  if (value === null || locale === "en") {
    return value;
  }
  return unavailableReasonLabels[value] ?? value;
}

export function aiFundingSourceTitle(source: AiFundingMetricSource, locale: AppLocale): string {
  if (locale === "en") {
    return source.source;
  }
  const unavailableMatch = source.source.match(
    /^(.+) is not available from the configured public sources$/
  );
  if (unavailableMatch) {
    const englishMetricName = unavailableMatch[1] ?? "";
    const metricName = unavailableMetricNames[englishMetricName] ?? englishMetricName;
    return `Brak publicznie załadowanej metryki: ${metricName}`;
  }
  if (source.source.startsWith("FINRA public fixed income data placeholder")) {
    return "FINRA TRACE: brak załadowanych publicznych obserwacji obligacji w produkcyjnym snapshocie";
  }
  if (source.source.startsWith("SEC EDGAR companyfacts placeholder")) {
    return "SEC EDGAR: brak załadowanych kwartalnych metryk w produkcyjnym snapshocie";
  }
  return source.source;
}

export function aiFundingFcfTrendLabel(value: string, locale: AppLocale): string {
  if (locale === "en") {
    return value;
  }
  if (value === "up") {
    return "rośnie";
  }
  if (value === "down") {
    return "spada";
  }
  if (value === "flat") {
    return "stabilny";
  }
  return value;
}

export function aiFundingInterpretation(
  state: AiFundingStressState,
  current: string,
  locale: AppLocale
): string {
  if (locale === "en") {
    return current;
  }
  switch (state) {
    case "insufficient_data":
      return "Publiczne dane nie są jeszcze wystarczająco kompletne, żeby sklasyfikować stres finansowania AI. Brakujące metryki popytu na dług są pokazywane jako N/A, a nie estymowane. Stres finansowania jest ostrzeżeniem reżimowym, nie sygnałem timingowym.";
    case "low":
      return "Warunki finansowania pozostają zasadniczo zdrowe w dostępnych publicznych danych. Stres finansowania nie jest samodzielnym sygnałem timingowym dla US100.";
    case "moderate":
      return "Publiczne dane pokazują umiarkowany stres finansowania AI. Sygnał należy traktować jako kontekst reżimu, nie automatyczny impuls do shorta.";
    case "high":
      return "Publiczne dane pokazują wysoki stres finansowania AI, co zwiększa ryzyko kompresji wycen, jeśli osłabnie też price action US100. To nadal osobna warstwa względem timingu transakcji.";
    case "severe":
      return "Publiczne dane pokazują skrajny stres finansowania AI. To fundamentalne ostrzeżenie reżimowe, które nadal wymaga osobnego potwierdzenia timingowego.";
  }
}

export function localizeAiFundingDashboard(
  dashboard: AiFundingDashboard,
  locale: AppLocale
): AiFundingDashboard {
  if (locale === "en") {
    return dashboard;
  }
  const localizeSource = (source: AiFundingMetricSource): AiFundingMetricSource => ({
    ...source,
    source: aiFundingSourceTitle(source, locale)
  });

  return {
    ...dashboard,
    alerts: dashboard.alerts.map((alert) => ({
      ...alert,
      source: localizeSource(alert.source)
    })),
    dataSources: dashboard.dataSources.map(localizeSource),
    events: dashboard.events.map((event) => ({
      ...event,
      source: localizeSource(event.source),
      title: event.title.replace(": next SEC/IR update check", ": kontrola następnej aktualizacji SEC/IR"),
      watchFields: event.watchFields.map((field) => watchFieldLabels[field] ?? field)
    })),
    interpretation: aiFundingInterpretation(dashboard.score.state, dashboard.interpretation, locale),
    issuerCards: dashboard.issuerCards.map((issuer) => ({
      ...issuer,
      fcfTrend: aiFundingFcfTrendLabel(issuer.fcfTrend, locale)
    })),
    metrics: dashboard.metrics.map((metric) => ({
      ...metric,
      label: aiFundingMetricLabel(metric, locale),
      source: localizeSource(metric.source)
    })),
    score: {
      ...dashboard.score,
      components: dashboard.score.components.map((component) => ({
        ...component,
        label: aiFundingComponentLabel(component, locale),
        source: localizeSource(component.source),
        unavailableReason: aiFundingUnavailableReason(component.unavailableReason, locale)
      }))
    }
  };
}
