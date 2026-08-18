import {
  LocaleSchema,
  MorningBrewSchema,
  type Locale,
  type MorningBrew
} from "@us100/contracts";

const sharedMeta = {
  schemaVersion: "0.1.0",
  date: "2026-08-13",
  slug: "2026-08-13-us100-morning-brew",
  status: "published",
  publishedAt: "2026-08-13T06:00:00.000Z",
  weeklySummary: null
} as const;

const fixtureBriefings = [
  {
    ...sharedMeta,
    language: "pl",
    headline: "US100 trzyma się blisko szczytów, ale szerokość rynku nadal musi potwierdzić ruch",
    deck:
      "Indeks nie pokazuje jeszcze załamania, ale kluczowe pytanie brzmi, czy wzrost przestanie opierać się głównie na mega-capach i segmencie AI.",
    verdict: {
      stance: "mixed",
      conviction: "medium",
      summary:
        "Teza short nie jest dziś potwierdzona, ale nie została też zanegowana, dopóki udział spółek w ruchu pozostaje selektywny.",
      whyItMatters:
        "Odporny indeks może ukrywać kruchość rynku, gdy wzrost zależy od małej grupy liderów. Dla tezy short najważniejsze jest, czy to wąskie wsparcie zacznie pękać, czy rozszerzy się w zdrowszy apetyt na ryzyko."
    },
    keySignal: {
      title: "Ciężar dowodu jest po stronie szerokości rynku, nie samego indeksu",
      observation:
        "US100 pozostaje mocny, ale konstruktywny scenariusz potrzebuje większego udziału pozostałych spółek z indeksu.",
      whyItMatters:
        "Gdy kupujący koncentrują się w kilku mega-capach, indeks może wyglądać silnie mimo słabszego popytu pod powierzchnią. To ważne, bo pauza liderów może wywołać gwałtowniejszą reakcję indeksu, niż sugerował sam trend indeksu.",
      impact: "short_thesis_strengthened",
      evidence: [
        {
          label: "Partycypacja",
          value: "Selektywne przywództwo pozostaje głównym ryzykiem dla scenariusza wzrostowego.",
          sourceIds: ["fixture-market-data"]
        }
      ]
    },
    sections: {
      priceAction: {
        title: "Akcja cenowa",
        observation:
          "Indeks nadal handluje blisko ostatnich szczytów i nie zbudował jeszcze czytelnego układu niższego szczytu.",
        whyItMatters:
          "Cena ma ostatnie słowo. Bez nieudanego wybicia, niższego szczytu albo utraty kluczowych średnich kroczących teza short pozostaje scenariuszem ryzyka, a nie potwierdzonym zachowaniem rynku.",
        impact: "short_thesis_weakened",
        evidence: [
          {
            label: "Trend",
            value: "Brak potwierdzonej struktury niższego szczytu w danych testowych.",
            sourceIds: ["fixture-market-data"]
          }
        ]
      },
      breadth: {
        title: "Szerokość rynku",
        observation:
          "Partycypacja jest główną nierozwiązaną słabością: ruch potrzebuje potwierdzenia poza największymi wagami indeksu.",
        whyItMatters:
          "Szerokość pokazuje, czy apetyt na ryzyko jest szeroki, czy tylko skoncentrowany. Dywergencja między poziomem indeksu a partycypacją często pojawia się zanim kruchy rajd zacznie zawodzić.",
        impact: "short_thesis_strengthened",
        evidence: [
          {
            label: "Obserwacja dywergencji",
            value: "Siła indeksu bez szerokiego potwierdzenia.",
            sourceIds: ["fixture-market-data"]
          }
        ]
      },
      aiSemis: {
        title: "AI / półprzewodniki",
        observation:
          "Przywództwo AI i półprzewodników pozostaje centralnym elementem narracji indeksu.",
        whyItMatters:
          "Koncentracja US100 oznacza, że liderzy AI mogą przykrywać słabość w innych miejscach. Jeśli dobre informacje z AI przestaną prowadzić do nowych szczytów, będzie to sygnał, że kupujący są mniej skłonni płacić coraz więcej za tę samą historię.",
        impact: "unchanged",
        evidence: [
          {
            label: "Przywództwo",
            value: "Kompleks AI nadal jest grupą, która może przesuwać sentyment dla indeksu.",
            sourceIds: ["fixture-market-data"]
          }
        ]
      },
      ratesFed: {
        title: "Stopy / Fed",
        observation:
          "Stopy procentowe nie dają w tym przebiegu testowym świeżego, rozstrzygającego sygnału.",
        whyItMatters:
          "Spółki wzrostowe o długim duration są wrażliwe na presję stóp dyskontowych. Ponowny wzrost rentowności 2Y lub 10Y utrudniałby obronę ekspansji mnożników.",
        impact: "unchanged",
        evidence: [
          {
            label: "Stopy",
            value: "Brak rozstrzygającego impulsu ze stóp w danych testowych.",
            sourceIds: ["fixture-market-data"]
          }
        ]
      },
      volatility: {
        title: "Zmienność",
        observation:
          "Zmienność pozostaje ograniczona, więc nie ma pilnego dowodu na wymuszone zmniejszanie ryzyka.",
        whyItMatters:
          "Rosnąca zmienność zmienia zachowanie uczestników rynku: rośnie popyt na hedging, spada dźwignia, a słaba szerokość rynku zaczyna szybciej mieć znaczenie.",
        impact: "short_thesis_weakened",
        evidence: [
          {
            label: "Zachowanie VIX",
            value: "Ograniczone w danych testowych.",
            sourceIds: ["fixture-market-data"]
          }
        ]
      }
    },
    thesisScorecard: [
      {
        factor: "Trend cenowy indeksu",
        signal: "short_thesis_weakened",
        observation: "Indeks pozostaje odporny blisko szczytów.",
        whyItMatters:
          "Teza short potrzebuje potwierdzenia w cenie; odporność oznacza, że sprzedający nie przejęli jeszcze kontroli."
      },
      {
        factor: "Szerokość rynku",
        signal: "short_thesis_strengthened",
        observation: "Partycypacja nadal musi się rozszerzyć.",
        whyItMatters:
          "Słaba partycypacja sprawia, że rajd jest bardziej zależny od małej grupy mocno posiadanych liderów."
      },
      {
        factor: "Zmienność",
        signal: "short_thesis_weakened",
        observation: "Zmienność pozostaje ograniczona.",
        whyItMatters:
          "Bez presji zmienności jest mniej dowodów na wymuszone delewarowanie albo stresowy hedging."
      }
    ],
    whatChanged: [
      {
        label: "Uwaga przesuwa się z poziomu indeksu na partycypację",
        trigger: "Potwierdzenie albo porażka szerokości rynku w okolicy szczytów indeksu.",
        whyItMatters:
          "Indeks może pozostawać wysoko, gdy pod powierzchnią narasta słabość, dlatego partycypacja jest czystszym testem falsyfikującym."
      }
    ],
    levelsToWatch: [
      {
        label: "Ostatni szczyt",
        trigger: "Wybicie przy poprawiającej się szerokości rynku.",
        whyItMatters:
          "Szerokie wybicie osłabiłoby tezę short, bo pokazałoby, że popyt się rozszerza, a nie zawęża."
      },
      {
        label: "20 DMA",
        trigger: "Utrata krótkoterminowego wsparcia trendu.",
        whyItMatters:
          "Zamknięcie poniżej krótkoterminowego wsparcia sugerowałoby, że sami liderzy nie wystarczają już do utrzymania indeksu."
      }
    ],
    sources: [
      {
        id: "fixture-market-data",
        title: "Dane testowe do rozwoju produktu",
        publisher: "US100 Morning Brew",
        url: "https://example.com/us100-fixture",
        observedAt: "2026-08-13T06:00:00.000Z"
      }
    ]
  },
  {
    ...sharedMeta,
    language: "en",
    headline: "US100 holds near highs, but breadth still has to confirm the move",
    deck:
      "The index is not breaking down yet, but the key question is whether the rally can stop depending mainly on mega-caps and the AI complex.",
    verdict: {
      stance: "mixed",
      conviction: "medium",
      summary:
        "The short thesis is not confirmed today, but it is not invalidated while participation remains selective.",
      whyItMatters:
        "A resilient index can hide fragility when gains depend on a small group of leaders. For the short thesis, the key question is whether that narrow support starts to fail or broadens into healthier risk appetite."
    },
    keySignal: {
      title: "The burden of proof sits with breadth, not the headline index",
      observation:
        "US100 remains firm, but the constructive case needs more participation from the rest of the index.",
      whyItMatters:
        "When buyers concentrate in a few mega-caps, the index can look strong while underlying demand is weaker. That matters because a pause in leaders can trigger a sharper index reaction than the headline trend suggested.",
      impact: "short_thesis_strengthened",
      evidence: [
        {
          label: "Participation",
          value: "Selective leadership remains the main risk to the bullish scenario.",
          sourceIds: ["fixture-market-data"]
        }
      ]
    },
    sections: {
      priceAction: {
        title: "Price action",
        observation:
          "The index still trades near recent highs and has not yet built a clear lower-high structure.",
        whyItMatters:
          "Price has the final say. Without a failed breakout, lower high, or loss of key moving averages, the short thesis remains a risk scenario rather than confirmed market behavior.",
        impact: "short_thesis_weakened",
        evidence: [
          {
            label: "Trend",
            value: "No confirmed lower-high structure in the test data.",
            sourceIds: ["fixture-market-data"]
          }
        ]
      },
      breadth: {
        title: "Breadth",
        observation:
          "Participation is the main unresolved weakness: the move needs confirmation beyond the index's largest weights.",
        whyItMatters:
          "Breadth shows whether risk appetite is broad or concentrated. Divergence between index level and participation often appears before a fragile rally starts to fail.",
        impact: "short_thesis_strengthened",
        evidence: [
          {
            label: "Divergence watch",
            value: "Index strength without broad confirmation.",
            sourceIds: ["fixture-market-data"]
          }
        ]
      },
      aiSemis: {
        title: "AI / semiconductors",
        observation:
          "AI and semiconductor leadership remains central to the index narrative.",
        whyItMatters:
          "US100 concentration means AI leaders can mask weakness elsewhere. If good AI news stops producing new highs, it would suggest buyers are less willing to pay up for the same story.",
        impact: "unchanged",
        evidence: [
          {
            label: "Leadership",
            value: "The AI complex still acts as the swing group for index sentiment.",
            sourceIds: ["fixture-market-data"]
          }
        ]
      },
      ratesFed: {
        title: "Rates / Fed",
        observation:
          "Rates are not giving a fresh, decisive signal in this test run.",
        whyItMatters:
          "Long-duration growth stocks are sensitive to discount-rate pressure. A renewed rise in 2Y or 10Y yields would make multiple expansion harder to defend.",
        impact: "unchanged",
        evidence: [
          {
            label: "Rates",
            value: "No decisive rates impulse in the test data.",
            sourceIds: ["fixture-market-data"]
          }
        ]
      },
      volatility: {
        title: "Volatility",
        observation:
          "Volatility remains contained, so there is no urgent evidence of forced de-risking.",
        whyItMatters:
          "Rising volatility changes participant behavior: hedging demand rises, leverage comes down, and weak breadth starts to matter faster.",
        impact: "short_thesis_weakened",
        evidence: [
          {
            label: "VIX behavior",
            value: "Contained in the test data.",
            sourceIds: ["fixture-market-data"]
          }
        ]
      }
    },
    thesisScorecard: [
      {
        factor: "Index price trend",
        signal: "short_thesis_weakened",
        observation: "The index remains resilient near highs.",
        whyItMatters:
          "A short thesis needs price confirmation; resilience means sellers have not yet taken control."
      },
      {
        factor: "Breadth",
        signal: "short_thesis_strengthened",
        observation: "Participation still needs to broaden.",
        whyItMatters:
          "Weak participation makes a rally more dependent on a small group of heavily owned leaders."
      },
      {
        factor: "Volatility",
        signal: "short_thesis_weakened",
        observation: "Volatility remains contained.",
        whyItMatters:
          "Without volatility pressure, there is less evidence of forced deleveraging or stress hedging."
      }
    ],
    whatChanged: [
      {
        label: "Focus shifts from index level to participation",
        trigger: "Breadth confirmation or failure around index highs.",
        whyItMatters:
          "The index can remain elevated while weakness builds underneath, so participation is a cleaner falsification test."
      }
    ],
    levelsToWatch: [
      {
        label: "Recent high",
        trigger: "Breakout with improving breadth.",
        whyItMatters:
          "A broad breakout would weaken the short thesis because it would show demand expanding rather than narrowing."
      },
      {
        label: "20 DMA",
        trigger: "Loss of short-term trend support.",
        whyItMatters:
          "A close below short-term support would suggest leaders are no longer enough to hold the index."
      }
    ],
    sources: [
      {
        id: "fixture-market-data",
        title: "Test data for product development",
        publisher: "US100 Morning Brew",
        url: "https://example.com/us100-fixture",
        observedAt: "2026-08-13T06:00:00.000Z"
      }
    ]
  }
] satisfies MorningBrew[];

function parseLocale(locale: string): Locale {
  return LocaleSchema.parse(locale);
}

export function listBriefings(locale: Locale | string = "pl"): MorningBrew[] {
  const parsedLocale = parseLocale(locale);
  return fixtureBriefings
    .map((briefing) => MorningBrewSchema.parse(briefing))
    .filter((briefing) => briefing.language === parsedLocale);
}

export function getLatestBriefing(locale: Locale | string = "pl"): MorningBrew {
  const [latest] = listBriefings(locale);
  if (!latest) {
    throw new Error(`No Morning Brew fixture briefings are available for locale ${locale}.`);
  }
  return latest;
}

export function getBriefingBySlug(slug: string, locale: Locale | string = "pl"): MorningBrew | null {
  return listBriefings(locale).find((briefing) => briefing.slug === slug) ?? null;
}

export * from "./fixture-pipeline";
export * from "./budget-pipeline";
export * from "./ai-funding";
export * from "./generation";
export * from "./pipeline";
