# Research / Generation Pipeline

Etap 3 dodaje skeleton pipeline dla US100 Morning Brew.

## Przeplyw

```txt
ResearchRunContext
  -> ResearchCollector.collect()
  -> EvidencePack
  -> SignalAnalyzer.analyze()
  -> AnalysisOutput
  -> BriefingGenerator.generate()
  -> unknown structured output
  -> MorningBrewSchema strict validation
  -> quality gates
  -> optional BriefingWriter.saveBriefing()
```

## Elementy

- `ResearchRunContext` - data, locale, run id i docelowy status `draft` albo
  `published`.
- `ResearchCollector` - interfejs na collectory danych rynkowych, newsow i
  zrodel.
- `EvidencePack` - paczka danych wejsciowych dla analyzera i generatora.
- `SignalAnalyzer` - deterministyczna warstwa sygnalow: price action, breadth,
  volatility, divergences itd.
- `BriefingGenerator` - wymienny generator structured output.
- `StructuredGenerationClient` - miejsce na pozniejsze podpiecie OpenAI/ChatGPT.
- `MorningBrewSchema` - strict schema validation dla wyniku generatora.
- `QualityGate` - kontrola jakosci po schemie, przed zapisem/publikacja.

## Quality gates

Domyslne bramki:

- briefing date i locale musza odpowiadac run context,
- wszystkie glowne sekcje musza byc obecne,
- `whyItMatters` musi miec minimalna glebokosc przyczynowa,
- briefing i key signal musza miec zrodla/evidence,
- briefing powinien zawierac sygnaly wzmacniajace i oslabiajace teze short, chyba
  ze rynek jest naprawde jednostronny.

## Status

- Fixture pipeline dziala lokalnie.
- Budget Research Pipeline jest dodany jako pierwszy tani collector/analyzer:
  dzienne dane cenowe, opcjonalny FRED, ograniczony RSS news i deterministyczne
  sygnaly przed generowaniem.
- Structured generation adapter umie wywolywac OpenAI Responses API przez
  `OPENAI_API_KEY` i strict JSON schema.
- CRON endpoint jest w `apps/web/app/api/cron/morning-brew/route.ts`.
- Prawdziwe komercyjne feedy danych rynkowych/newsowych nadal nie sa
  podlaczone; pierwsza wersja celowo uzywa low-cost daily data.
- Pipeline moze opcjonalnie zapisac briefing przez `BriefingWriter`, czyli np.
  storage repository z Etapu 2.

## Budget Research Pipeline

Wlaczany przez:

```bash
US100_RESEARCH_PROVIDER=budget
```

Zakres v1:

- Stooq daily CSV jako tanie proxy dla NDX/QQQ/VIX i koszyka liderow US100.
- FRED dla 2Y/10Y/Fed Funds, jesli ustawiony jest darmowy `FRED_API_KEY`.
- Google News RSS albo wlasny RSS przez `US100_BUDGET_NEWS_RSS_URL`.
- Twardy limit requestow dziennych przez `US100_BUDGET_MAX_REQUESTS`.

To nie jest real-time market data. To budzetowy evidence pack dla porannego
briefingu i panelu review.
