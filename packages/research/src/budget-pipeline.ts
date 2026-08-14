import type { Locale, SignalImpact } from "@us100/contracts";

import type {
  AnalysisOutput,
  DeterministicSignal,
  EvidencePack,
  MarketSnapshot,
  ResearchCollector,
  ResearchRunContext,
  SignalAnalyzer,
  SourceDocument
} from "./pipeline";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

type BudgetCollectorEnv = Record<string, string | undefined>;

type BudgetCollectorConfig = {
  env?: BudgetCollectorEnv;
  fetch?: FetchLike;
  maxRequests?: number;
  requestTimeoutMs?: number;
};

type DailyBar = {
  close: number;
  date: string;
  high: number;
  low: number;
  open: number;
  volume: number | null;
};

type PriceSnapshotPayload = {
  aboveSma20: boolean | null;
  aboveSma50: boolean | null;
  aboveSma200: boolean | null;
  close: number;
  date: string;
  dayChangePct: number | null;
  distanceFromHigh20Pct: number | null;
  label: string;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  symbol: string;
};

type FredObservation = {
  date: string;
  value: number;
};

type CollectorItemResult = {
  snapshot: MarketSnapshot | null;
  source: SourceDocument | null;
};

const defaultTrackedPrices = [
  { label: "Nasdaq-100", sourceId: "stooq-ndx", symbol: "^ndx" },
  { label: "QQQ", sourceId: "stooq-qqq", symbol: "qqq.us" },
  { label: "VIX", sourceId: "stooq-vix", symbol: "^vix" },
  { label: "NVIDIA", sourceId: "stooq-nvda", symbol: "nvda.us" },
  { label: "Broadcom", sourceId: "stooq-avgo", symbol: "avgo.us" },
  { label: "Microsoft", sourceId: "stooq-msft", symbol: "msft.us" },
  { label: "Apple", sourceId: "stooq-aapl", symbol: "aapl.us" },
  { label: "Amazon", sourceId: "stooq-amzn", symbol: "amzn.us" },
  { label: "Meta", sourceId: "stooq-meta", symbol: "meta.us" },
  { label: "Alphabet", sourceId: "stooq-googl", symbol: "googl.us" },
  { label: "Tesla", sourceId: "stooq-tsla", symbol: "tsla.us" }
] as const;

const fredSeries = [
  { label: "US Treasury 2Y", seriesId: "DGS2", sourceId: "fred-dgs2" },
  { label: "US Treasury 10Y", seriesId: "DGS10", sourceId: "fred-dgs10" },
  { label: "Fed Funds Effective Rate", seriesId: "DFF", sourceId: "fred-dff" }
] as const;

function yyyymmdd(date: string): string {
  return date.replaceAll("-", "");
}

function lookbackDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

function numberOrNull(value: string | undefined): number | null {
  if (!value || value === ".") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pctChange(current: number, previous: number | null | undefined): number | null {
  if (!previous) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

function parseStooqCsv(csv: string): DailyBar[] {
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [date, open, high, low, close, volume] = line.split(",");
      return {
        close: Number(close),
        date: date ?? "",
        high: Number(high),
        low: Number(low),
        open: Number(open),
        volume: numberOrNull(volume)
      };
    })
    .filter(
      (bar) =>
        bar.date.length > 0 &&
        Number.isFinite(bar.open) &&
        Number.isFinite(bar.high) &&
        Number.isFinite(bar.low) &&
        Number.isFinite(bar.close)
    );
}

function pricePayload(symbol: string, label: string, bars: DailyBar[]): PriceSnapshotPayload | null {
  const latest = bars.at(-1);
  if (!latest) {
    return null;
  }
  const closes = bars.map((bar) => bar.close);
  const previous = bars.at(-2)?.close;
  const high20 = Math.max(...bars.slice(-20).map((bar) => bar.high));
  const sma20 = average(closes.slice(-20));
  const sma50 = average(closes.slice(-50));
  const sma200 = average(closes.slice(-200));

  return {
    aboveSma20: sma20 === null ? null : latest.close >= sma20,
    aboveSma50: sma50 === null ? null : latest.close >= sma50,
    aboveSma200: sma200 === null ? null : latest.close >= sma200,
    close: latest.close,
    date: latest.date,
    dayChangePct: pctChange(latest.close, previous),
    distanceFromHigh20Pct: pctChange(latest.close, high20),
    label,
    sma20,
    sma50,
    sma200,
    symbol
  };
}

function parseFredObservations(body: unknown): FredObservation[] {
  if (
    typeof body !== "object" ||
    body === null ||
    !("observations" in body) ||
    !Array.isArray(body.observations)
  ) {
    return [];
  }

  return body.observations
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }
      const date = "date" in item && typeof item.date === "string" ? item.date : "";
      const value = "value" in item && typeof item.value === "string" ? numberOrNull(item.value) : null;
      return date && value !== null ? { date, value } : null;
    })
    .filter((item): item is FredObservation => item !== null);
}

function stripTags(value: string): string {
  return value
    .replaceAll(/<!\[CDATA\[|\]\]>/g, "")
    .replaceAll(/<[^>]+>/g, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .trim();
}

function parseRssItems(xml: string, limit: number): SourceDocument[] {
  const items = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  const documents: SourceDocument[] = [];
  for (const match of items) {
    const item = match[1] ?? "";
    const title = stripTags(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    const link = stripTags(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "");
    const published = stripTags(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "");
    if (!title || !link) {
      continue;
    }
    const publishedDate = published ? new Date(published) : null;
    documents.push({
      id: `news-${documents.length + 1}`,
      observedAt:
        publishedDate && Number.isFinite(publishedDate.getTime())
          ? publishedDate.toISOString()
          : null,
      publisher: "Google News RSS",
      title,
      url: link
    });
    if (documents.length >= limit) {
      break;
    }
  }
  return documents;
}

function sourceDocument(id: string, title: string, url: string, observedAt: string): SourceDocument {
  return {
    id,
    observedAt,
    publisher: "US100 Budget Research",
    title,
    url
  };
}

function requestUrlWithParams(base: string, params: Record<string, string>): URL {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url;
}

function defaultNewsRssUrl(): string {
  return "https://news.google.com/rss/search?q=Nasdaq%20100%20OR%20US100%20OR%20NVDA%20OR%20semiconductors%20OR%20Federal%20Reserve&hl=en-US&gl=US&ceid=US:en";
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function createBudgetResearchCollector(config: BudgetCollectorConfig = {}): ResearchCollector {
  const env = config.env ?? process.env;
  const fetcher = config.fetch ?? fetch;
  const maxRequests = config.maxRequests ?? positiveNumber(env.US100_BUDGET_MAX_REQUESTS, 30);
  const requestTimeoutMs =
    config.requestTimeoutMs ?? positiveNumber(env.US100_BUDGET_REQUEST_TIMEOUT_MS, 8000);
  let requestCount = 0;

  async function request(input: string | URL): Promise<Response> {
    if (requestCount >= maxRequests) {
      throw new Error(`Budget research request cap reached (${maxRequests}).`);
    }
    requestCount += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      return await fetcher(input, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  async function collectPriceSnapshots(context: ResearchRunContext): Promise<{
    snapshots: MarketSnapshot[];
    sources: SourceDocument[];
  }> {
    const start = yyyymmdd(lookbackDate(context.date, 360));
    const end = yyyymmdd(context.date);
    const results: CollectorItemResult[] = await Promise.all(
      defaultTrackedPrices.map(async (item) => {
        const url = requestUrlWithParams("https://stooq.com/q/d/l/", {
          d1: start,
          d2: end,
          i: "d",
          s: item.symbol
        });
        try {
          const response = await request(url);
          if (!response.ok) {
            throw new Error(`Stooq returned ${response.status}`);
          }
          const payload = pricePayload(item.symbol, item.label, parseStooqCsv(await response.text()));
          if (!payload) {
            return { snapshot: null, source: null };
          }
          return {
            snapshot: {
              capturedAt: (context.now ?? new Date()).toISOString(),
              payload,
              source: item.sourceId
            } satisfies MarketSnapshot,
            source: sourceDocument(
              item.sourceId,
              `${item.label} daily prices`,
              String(url),
              payload.date
            )
          };
        } catch (error) {
          return {
            snapshot: {
              capturedAt: (context.now ?? new Date()).toISOString(),
              payload: {
                error: error instanceof Error ? error.message : String(error),
                label: item.label,
                symbol: item.symbol
              },
              source: `${item.sourceId}-error`
            } satisfies MarketSnapshot,
            source: null
          };
        }
      })
    );

    return {
      snapshots: results
        .map((result) => result.snapshot)
        .filter((snapshot): snapshot is MarketSnapshot => snapshot !== null),
      sources: results
        .map((result) => result.source)
        .filter((source): source is SourceDocument => source !== null)
    };
  }

  async function collectFredSnapshots(context: ResearchRunContext): Promise<{
    snapshots: MarketSnapshot[];
    sources: SourceDocument[];
  }> {
    const apiKey = env.FRED_API_KEY;
    if (!apiKey) {
      return { snapshots: [], sources: [] };
    }

    const results: CollectorItemResult[] = await Promise.all(
      fredSeries.map(async (series) => {
        const url = requestUrlWithParams("https://api.stlouisfed.org/fred/series/observations", {
          api_key: apiKey,
          file_type: "json",
          observation_end: context.date,
          observation_start: lookbackDate(context.date, 14),
          series_id: series.seriesId,
          sort_order: "asc"
        });
        try {
          const response = await request(url);
          if (!response.ok) {
            throw new Error(`FRED returned ${response.status}`);
          }
          const observations = parseFredObservations(await response.json());
          const latest = observations.at(-1);
          if (!latest) {
            return { snapshot: null, source: null };
          }
          const previous = observations.at(-2);
          return {
            snapshot: {
              capturedAt: (context.now ?? new Date()).toISOString(),
              payload: {
                change: previous ? latest.value - previous.value : null,
                date: latest.date,
                label: series.label,
                seriesId: series.seriesId,
                value: latest.value
              },
              source: series.sourceId
            } satisfies MarketSnapshot,
            source: sourceDocument(
              series.sourceId,
              `${series.label} via FRED`,
              `https://fred.stlouisfed.org/series/${series.seriesId}`,
              latest.date
            )
          };
        } catch (error) {
          return {
            snapshot: {
              capturedAt: (context.now ?? new Date()).toISOString(),
              payload: {
                error: error instanceof Error ? error.message : String(error),
                label: series.label,
                seriesId: series.seriesId
              },
              source: `${series.sourceId}-error`
            } satisfies MarketSnapshot,
            source: null
          };
        };
      })
    );
    return {
      snapshots: results
        .map((result) => result.snapshot)
        .filter((snapshot): snapshot is MarketSnapshot => snapshot !== null),
      sources: results
        .map((result) => result.source)
        .filter((source): source is SourceDocument => source !== null)
    };
  }

  async function collectNewsSources(): Promise<SourceDocument[]> {
    const enabled = env.US100_BUDGET_NEWS_RSS_ENABLED !== "false";
    if (!enabled) {
      return [];
    }
    const url = env.US100_BUDGET_NEWS_RSS_URL ?? defaultNewsRssUrl();
    const limit = Number(env.US100_BUDGET_NEWS_LIMIT ?? 6);
    try {
      const response = await request(url);
      if (!response.ok) {
        return [];
      }
      return parseRssItems(await response.text(), limit);
    } catch {
      return [];
    }
  }

  return {
    async collect(context) {
      requestCount = 0;
      const collectedAt = (context.now ?? new Date()).toISOString();
      const price = await collectPriceSnapshots(context);
      const fred = await collectFredSnapshots(context);
      const news = await collectNewsSources();

      return {
        collectedAt,
        date: context.date,
        locale: context.locale,
        snapshots: [
          ...price.snapshots,
          ...fred.snapshots,
          {
            capturedAt: collectedAt,
            payload: {
              maxRequests,
              requestCount,
              researchProvider: "budget",
              usesRealtimeData: false
            },
            source: "budget-research-metadata"
          }
        ],
        sources: [...price.sources, ...fred.sources, ...news]
      } satisfies EvidencePack;
    }
  };
}

function priceSnapshot(
  evidencePack: EvidencePack,
  symbol: string
): PriceSnapshotPayload | undefined {
  return evidencePack.snapshots
    .map((snapshot) => snapshot.payload)
    .find(
      (payload): payload is PriceSnapshotPayload =>
        typeof payload.symbol === "string" &&
        payload.symbol === symbol &&
        typeof payload.close === "number"
    );
}

function rateSnapshot(
  evidencePack: EvidencePack,
  seriesId: string
): { change: number | null; value: number } | undefined {
  return evidencePack.snapshots
    .map((snapshot) => snapshot.payload)
    .find(
      (payload): payload is { change: number | null; value: number } =>
        payload.seriesId === seriesId && typeof payload.value === "number"
    );
}

function label(locale: Locale, pl: string, en: string): string {
  return locale === "pl" ? pl : en;
}

function impactFromBoolean(
  condition: boolean | null,
  whenTrue: SignalImpact,
  whenFalse: SignalImpact
): SignalImpact {
  if (condition === null) {
    return "unchanged";
  }
  return condition ? whenTrue : whenFalse;
}

function averageKnown(values: Array<number | null>): number | null {
  const known = values.filter((value): value is number => typeof value === "number");
  return average(known);
}

export function createBudgetSignalAnalyzer(): SignalAnalyzer {
  return {
    async analyze(evidencePack, context) {
      const ndx = priceSnapshot(evidencePack, "^ndx");
      const vix = priceSnapshot(evidencePack, "^vix");
      const leaders = [
        "nvda.us",
        "avgo.us",
        "msft.us",
        "aapl.us",
        "amzn.us",
        "meta.us",
        "googl.us",
        "tsla.us"
      ]
        .map((symbol) => priceSnapshot(evidencePack, symbol))
        .filter((snapshot): snapshot is PriceSnapshotPayload => Boolean(snapshot));
      const semis = ["nvda.us", "avgo.us"]
        .map((symbol) => priceSnapshot(evidencePack, symbol))
        .filter((snapshot): snapshot is PriceSnapshotPayload => Boolean(snapshot));
      const dgs2 = rateSnapshot(evidencePack, "DGS2");
      const dgs10 = rateSnapshot(evidencePack, "DGS10");
      const sourceIds = evidencePack.sources.map((source) => source.id);
      const priceSource = ndx ? ["stooq-ndx"] : sourceIds.slice(0, 1);
      const vixSource = vix ? ["stooq-vix"] : priceSource;
      const ratesSource = [dgs2 ? "fred-dgs2" : null, dgs10 ? "fred-dgs10" : null].filter(
        (source): source is string => source !== null
      );
      const leaderBreadth20 = leaders.length
        ? leaders.filter((snapshot) => snapshot.aboveSma20).length / leaders.length
        : null;
      const leaderBreadth50 = leaders.length
        ? leaders.filter((snapshot) => snapshot.aboveSma50).length / leaders.length
        : null;
      const leaderDayChange = averageKnown(leaders.map((snapshot) => snapshot.dayChangePct));
      const semiDayChange = averageKnown(semis.map((snapshot) => snapshot.dayChangePct));
      const ratesPressure =
        (dgs2?.change ?? 0) > 0.05 || (dgs10?.change ?? 0) > 0.05
          ? true
          : (dgs2?.change ?? 0) < -0.05 || (dgs10?.change ?? 0) < -0.05
            ? false
            : null;
      const indexNearHigh =
        ndx?.distanceFromHigh20Pct !== null && ndx?.distanceFromHigh20Pct !== undefined
          ? ndx.distanceFromHigh20Pct > -2
          : null;
      const broadEnough = leaderBreadth50 === null ? null : leaderBreadth50 >= 0.65;
      const vixContained = vix ? vix.close < 20 && (vix.dayChangePct ?? 0) < 5 : null;

      const signals: DeterministicSignal[] = [
        {
          evidence: priceSource,
          impact: impactFromBoolean(
            indexNearHigh,
            "short_thesis_weakened",
            "short_thesis_strengthened"
          ),
          label: label(context.locale, "Akcja cenowa", "Price action"),
          score: indexNearHigh ? 1.2 : 3.4,
          whyItMatters: label(
            context.locale,
            "Indeks blisko 20-sesyjnego szczytu oznacza, że sprzedający nadal nie przejęli kontroli nad samą ceną; oddalenie od szczytu wzmacniałoby tezę short.",
            "An index near its 20-session high means sellers have not yet taken control of price itself; distance from the high would strengthen the short thesis."
          )
        },
        {
          evidence: leaders.length
            ? leaders.map((snapshot) => `stooq-${snapshot.symbol.replace(".us", "").replace("^", "")}`)
            : priceSource,
          impact: impactFromBoolean(
            broadEnough,
            "short_thesis_weakened",
            "short_thesis_strengthened"
          ),
          label: label(context.locale, "Szerokość proxy liderów", "Leader breadth proxy"),
          score: broadEnough ? 1.6 : 3.8,
          whyItMatters: label(
            context.locale,
            "Tani pipeline mierzy szerokość przez koszyk największych liderów. Jeżeli większość nie utrzymuje trendu, indeks może wyglądać lepiej niż popyt pod powierzchnią.",
            "The budget pipeline measures breadth through a basket of major leaders. If most are not holding trend, the index can look healthier than underlying demand."
          )
        },
        {
          evidence: semis.length
            ? semis.map((snapshot) => `stooq-${snapshot.symbol.replace(".us", "")}`)
            : priceSource,
          impact:
            semiDayChange !== null && semiDayChange > 1 && indexNearHigh === false
              ? "short_thesis_strengthened"
              : semiDayChange !== null && semiDayChange > 0
                ? "short_thesis_weakened"
                : "mixed",
          label: label(context.locale, "AI / półprzewodniki", "AI / semiconductors"),
          score: semiDayChange !== null && semiDayChange > 0 ? 1.8 : 3,
          whyItMatters: label(
            context.locale,
            "NVDA i AVGO są tanim proxy narracji AI/semis. Siła tej grupy osłabia short, chyba że indeks mimo dobrego impulsu nie potrafi potwierdzić nowych szczytów.",
            "NVDA and AVGO are a low-cost proxy for the AI/semis narrative. Strength weakens the short unless the index cannot confirm highs despite that positive impulse."
          )
        },
        {
          evidence: ratesSource.length ? ratesSource : sourceIds.slice(0, 1),
          impact: impactFromBoolean(
            ratesPressure,
            "short_thesis_strengthened",
            "short_thesis_weakened"
          ),
          label: label(context.locale, "Stopy / Fed", "Rates / Fed"),
          score: ratesPressure ? 3.5 : 1.8,
          whyItMatters: label(
            context.locale,
            "Wzrost rentowności 2Y/10Y podnosi stopę dyskontową dla spółek wzrostowych i utrudnia obronę wysokich mnożników w US100.",
            "Rising 2Y/10Y yields lift the discount rate for growth equities and make elevated US100 multiples harder to defend."
          )
        },
        {
          evidence: vixSource,
          impact: impactFromBoolean(
            vixContained,
            "short_thesis_weakened",
            "short_thesis_strengthened"
          ),
          label: label(context.locale, "Zmienność", "Volatility"),
          score: vixContained ? 1.3 : 3.7,
          whyItMatters: label(
            context.locale,
            "Niski i spokojny VIX zmniejsza presję na hedging oraz wymuszone redukowanie ryzyka; rosnący VIX przy słabej szerokości wzmacniałby short.",
            "A low and calm VIX reduces hedging pressure and forced risk reduction; rising VIX alongside weak breadth would strengthen the short."
          )
        }
      ];

      const divergences: string[] = [];
      if (indexNearHigh && broadEnough === false) {
        divergences.push(
          label(
            context.locale,
            "Indeks pozostaje blisko lokalnych szczytów, ale koszyk liderów nie daje szerokiego potwierdzenia trendu.",
            "The index remains near local highs, but the leader basket does not provide broad confirmation."
          )
        );
      }
      if (
        semiDayChange !== null &&
        semiDayChange > 0 &&
        ndx?.dayChangePct !== null &&
        ndx?.dayChangePct !== undefined &&
        ndx.dayChangePct < 0
      ) {
        divergences.push(
          label(
            context.locale,
            "AI/semis są relatywnie mocne, ale sam indeks nie korzysta w pełni z tego impulsu.",
            "AI/semis are relatively firm, but the index is not fully benefiting from that impulse."
          )
        );
      }

      return {
        generatedAt: (context.now ?? new Date()).toISOString(),
        keyDivergences: divergences,
        signals,
        summary: label(
          context.locale,
          `Budget pipeline: NDX ${ndx?.close ?? "brak danych"}, liderzy powyżej 50 DMA ${leaderBreadth50 === null ? "brak danych" : `${Math.round(leaderBreadth50 * 100)}%`}, średnia zmiana liderów ${leaderDayChange === null ? "brak danych" : `${leaderDayChange.toFixed(2)}%`}.`,
          `Budget pipeline: NDX ${ndx?.close ?? "missing"}, leaders above 50 DMA ${leaderBreadth50 === null ? "missing" : `${Math.round(leaderBreadth50 * 100)}%`}, average leader move ${leaderDayChange === null ? "missing" : `${leaderDayChange.toFixed(2)}%`}.`
        )
      } satisfies AnalysisOutput;
    }
  };
}
