import type { Locale, MorningBrew, SignalImpact } from "@us100/contracts";

import {
  createMorningBrewPipeline,
  type AnalysisOutput,
  type BriefingGenerator,
  type EvidencePack,
  type ResearchCollector,
  type ResearchRunContext,
  type SignalAnalyzer
} from "./pipeline";

function fixtureObservedAt(context: ResearchRunContext): string {
  return (context.now ?? new Date(`${context.date}T06:00:00.000Z`)).toISOString();
}

export function createFixtureCollector(): ResearchCollector {
  return {
    async collect(context) {
      const observedAt = fixtureObservedAt(context);
      return {
        collectedAt: observedAt,
        date: context.date,
        locale: context.locale,
        snapshots: [
          {
            capturedAt: observedAt,
            payload: {
              breadthParticipation: "selective",
              indexTrend: "near_highs",
              ratesImpulse: "neutral",
              volatility: "contained"
            },
            source: "fixture-market-data"
          }
        ],
        sources: [
          {
            id: "fixture-market-data",
            observedAt,
            publisher: "US100 Morning Brew",
            title:
              context.locale === "pl"
                ? "Dane testowe do rozwoju produktu"
                : "Test data for product development",
            url: "https://example.com/us100-fixture"
          }
        ]
      } satisfies EvidencePack;
    }
  };
}

function signalLabel(locale: Locale, label: "price" | "breadth" | "volatility"): string {
  const labels = {
    pl: {
      breadth: "Szerokość rynku",
      price: "Akcja cenowa",
      volatility: "Zmienność"
    },
    en: {
      breadth: "Breadth",
      price: "Price action",
      volatility: "Volatility"
    }
  } as const;
  return labels[locale][label];
}

export function createFixtureAnalyzer(): SignalAnalyzer {
  return {
    async analyze(evidencePack, context) {
      const generatedAt = fixtureObservedAt(context);
      return {
        generatedAt,
        keyDivergences: [
          context.locale === "pl"
            ? "Indeks pozostaje blisko szczytów, ale partycypacja wymaga potwierdzenia."
            : "The index remains near highs, but participation still needs confirmation."
        ],
        signals: [
          {
            evidence: ["fixture-market-data"],
            impact: "short_thesis_weakened" satisfies SignalImpact,
            label: signalLabel(evidencePack.locale, "price"),
            score: 0.9,
            whyItMatters:
              evidencePack.locale === "pl"
                ? "Cena nie potwierdziła jeszcze układu niższego szczytu, więc sama teza short pozostaje scenariuszem ryzyka."
                : "Price has not confirmed a lower-high structure yet, so the short thesis remains a risk scenario."
          },
          {
            evidence: ["fixture-market-data"],
            impact: "short_thesis_strengthened" satisfies SignalImpact,
            label: signalLabel(evidencePack.locale, "breadth"),
            score: 4,
            whyItMatters:
              evidencePack.locale === "pl"
                ? "Wąska partycypacja zwiększa zależność indeksu od kilku liderów i ułatwia gwałtowną zmianę sentymentu."
                : "Narrow participation increases index dependence on a few leaders and makes sentiment more fragile."
          },
          {
            evidence: ["fixture-market-data"],
            impact: "short_thesis_weakened" satisfies SignalImpact,
            label: signalLabel(evidencePack.locale, "volatility"),
            score: 0.9,
            whyItMatters:
              evidencePack.locale === "pl"
                ? "Ograniczona zmienność zmniejsza presję na wymuszone delewarowanie i hedging."
                : "Contained volatility reduces pressure for forced deleveraging and hedging."
          }
        ],
        summary:
          context.locale === "pl"
            ? "Fixture analyzer wskazuje mieszany obraz: cena osłabia tezę short, szerokość ją wzmacnia."
            : "The fixture analyzer shows a mixed picture: price weakens the short thesis, breadth strengthens it."
      } satisfies AnalysisOutput;
    }
  };
}

export function createFixtureGenerator(
  overrides: Partial<Record<Locale, MorningBrew>> = {}
): BriefingGenerator {
  return {
    async generate(input) {
      const source = input.evidencePack.sources[0];
      if (!source) {
        throw new Error("Fixture generator requires at least one source.");
      }
      const override = overrides[input.context.locale];
      const base =
        override ??
        ({
          schemaVersion: "0.1.0",
          date: input.context.date,
          deck:
            input.context.locale === "pl"
              ? "Indeks nie pokazuje jeszcze załamania, ale breadth pozostaje głównym testem dla scenariusza short."
              : "The index is not breaking down yet, but breadth remains the main test for the short scenario.",
          headline:
            input.context.locale === "pl"
              ? "US100 trzyma się blisko szczytów, ale szerokość rynku nadal musi potwierdzić ruch"
              : "US100 holds near highs, but breadth still has to confirm the move",
          keySignal: {
            evidence: [
              {
                label: input.context.locale === "pl" ? "Partycypacja" : "Participation",
                sourceIds: [source.id],
                value: input.analysis.keyDivergences[0] ?? input.analysis.summary
              }
            ],
            impact: "short_thesis_strengthened",
            observation:
              input.context.locale === "pl"
                ? "US100 pozostaje mocny, ale konstruktywny scenariusz potrzebuje większego udziału pozostałych spółek z indeksu."
                : "US100 remains firm, but the constructive case needs more participation from the rest of the index.",
            title:
              input.context.locale === "pl"
                ? "Ciężar dowodu jest po stronie szerokości rynku"
                : "The burden of proof sits with breadth",
            whyItMatters:
              input.context.locale === "pl"
                ? "Gdy kupujący koncentrują się w kilku mega-capach, indeks może wyglądać silnie mimo słabszego popytu pod powierzchnią."
                : "When buyers concentrate in a few mega-caps, the index can look strong while underlying demand is weaker."
          },
          language: input.context.locale,
          levelsToWatch: [
            {
              label: input.context.locale === "pl" ? "Ostatni szczyt" : "Recent high",
              trigger:
                input.context.locale === "pl"
                  ? "Wybicie przy poprawiającej się szerokości rynku."
                  : "Breakout with improving breadth.",
              whyItMatters:
                input.context.locale === "pl"
                  ? "Szerokie wybicie osłabiłoby tezę short, bo pokazałoby, że popyt się rozszerza, a nie zawęża."
                  : "A broad breakout would weaken the short thesis because demand would be expanding rather than narrowing."
            }
          ],
          publishedAt: "2026-08-13T06:00:00.000Z",
          sections: {
            aiSemis: {
              evidence: [],
              impact: "unchanged",
              observation:
                input.context.locale === "pl"
                  ? "Przywództwo AI i półprzewodników pozostaje centralnym elementem narracji indeksu."
                  : "AI and semiconductor leadership remains central to the index narrative.",
              title: input.context.locale === "pl" ? "AI / półprzewodniki" : "AI / semiconductors",
              whyItMatters:
                input.context.locale === "pl"
                  ? "Koncentracja US100 oznacza, że liderzy AI mogą przykrywać słabość w innych miejscach indeksu."
                  : "US100 concentration means AI leaders can mask weakness elsewhere in the index."
            },
            breadth: {
              evidence: [],
              impact: "short_thesis_strengthened",
              observation:
                input.context.locale === "pl"
                  ? "Partycypacja jest główną nierozwiązaną słabością ruchu."
                  : "Participation is the main unresolved weakness in the move.",
              title: input.context.locale === "pl" ? "Szerokość rynku" : "Breadth",
              whyItMatters:
                input.context.locale === "pl"
                  ? "Szerokość pokazuje, czy apetyt na ryzyko jest szeroki, czy tylko skoncentrowany w liderach."
                  : "Breadth shows whether risk appetite is broad or concentrated in the leaders."
            },
            priceAction: {
              evidence: [],
              impact: "short_thesis_weakened",
              observation:
                input.context.locale === "pl"
                  ? "Indeks nadal handluje blisko ostatnich szczytów."
                  : "The index still trades near recent highs.",
              title: input.context.locale === "pl" ? "Akcja cenowa" : "Price action",
              whyItMatters:
                input.context.locale === "pl"
                  ? "Cena ma ostatnie słowo, więc bez nieudanego wybicia teza short pozostaje scenariuszem ryzyka."
                  : "Price has the final say, so without a failed breakout the short thesis remains a risk scenario."
            },
            ratesFed: {
              evidence: [],
              impact: "unchanged",
              observation:
                input.context.locale === "pl"
                  ? "Stopy procentowe nie dają świeżego, rozstrzygającego sygnału."
                  : "Rates are not giving a fresh, decisive signal.",
              title: input.context.locale === "pl" ? "Stopy / Fed" : "Rates / Fed",
              whyItMatters:
                input.context.locale === "pl"
                  ? "Spółki wzrostowe są wrażliwe na stopy dyskontowe, więc rentowności mogą szybko zmienić mnożniki."
                  : "Growth stocks are sensitive to discount rates, so yields can quickly change multiples."
            },
            volatility: {
              evidence: [],
              impact: "short_thesis_weakened",
              observation:
                input.context.locale === "pl"
                  ? "Zmienność pozostaje ograniczona."
                  : "Volatility remains contained.",
              title: input.context.locale === "pl" ? "Zmienność" : "Volatility",
              whyItMatters:
                input.context.locale === "pl"
                  ? "Ograniczona zmienność zmniejsza presję na wymuszone delewarowanie i stresowy hedging."
                  : "Contained volatility reduces pressure for forced deleveraging and stress hedging."
            }
          },
          slug: `${input.context.date}-us100-morning-brew`,
          sources: [],
          status: "published",
          thesisScorecard: [
            {
              factor: input.context.locale === "pl" ? "Szerokość rynku" : "Breadth",
              observation:
                input.context.locale === "pl"
                  ? "Partycypacja nadal musi się rozszerzyć."
                  : "Participation still needs to broaden.",
              signal: "short_thesis_strengthened",
              whyItMatters:
                input.context.locale === "pl"
                  ? "Słaba partycypacja sprawia, że rajd jest bardziej zależny od małej grupy liderów."
                  : "Weak participation makes the rally more dependent on a small group of leaders."
            },
            {
              factor: input.context.locale === "pl" ? "Trend cenowy indeksu" : "Index price trend",
              observation:
                input.context.locale === "pl"
                  ? "Indeks pozostaje odporny blisko szczytów."
                  : "The index remains resilient near highs.",
              signal: "short_thesis_weakened",
              whyItMatters:
                input.context.locale === "pl"
                  ? "Teza short potrzebuje potwierdzenia w cenie; odporność oznacza brak kontroli sprzedających."
                  : "A short thesis needs price confirmation; resilience means sellers are not in control."
            }
          ],
          verdict: {
            conviction: "medium",
            stance: "mixed",
            summary:
              input.context.locale === "pl"
                ? "Teza short nie jest dziś potwierdzona, ale breadth nadal jej nie falsyfikuje."
                : "The short thesis is not confirmed today, but breadth still does not falsify it.",
            whyItMatters:
              input.context.locale === "pl"
                ? "Odporny indeks może ukrywać kruchość rynku, gdy wzrost zależy od małej grupy liderów."
                : "A resilient index can hide market fragility when gains depend on a small group of leaders."
          },
          whatChanged: [
            {
              label:
                input.context.locale === "pl"
                  ? "Uwaga przesuwa się z poziomu indeksu na partycypację"
                  : "Focus shifts from index level to participation",
              trigger:
                input.context.locale === "pl"
                  ? "Potwierdzenie albo porażka szerokości rynku w okolicy szczytów indeksu."
                  : "Breadth confirmation or failure around index highs.",
              whyItMatters:
                input.context.locale === "pl"
                  ? "Indeks może pozostawać wysoko, gdy pod powierzchnią narasta słabość, więc breadth jest czystszym testem."
                  : "The index can stay high while weakness builds underneath, so breadth is a cleaner test."
            }
          ]
        } satisfies MorningBrew);
      return {
        ...base,
        date: input.context.date,
        language: override ? base.language : input.context.locale,
        slug: `${input.context.date}-us100-morning-brew`,
        sources: input.evidencePack.sources.map((source) => ({
          id: source.id,
          observedAt: source.observedAt,
          publisher: source.publisher,
          title: source.title,
          url: source.url
        }))
      } satisfies MorningBrew;
    }
  };
}

export function createFixtureMorningBrewPipeline() {
  return createMorningBrewPipeline({
    analyzer: createFixtureAnalyzer(),
    collector: createFixtureCollector(),
    generator: createFixtureGenerator()
  });
}
