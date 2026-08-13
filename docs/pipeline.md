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
- Structured generation adapter umie wywolywac OpenAI Responses API przez
  `OPENAI_API_KEY` i strict JSON schema.
- CRON endpoint jest w `apps/web/app/api/cron/morning-brew/route.ts`.
- Prawdziwe collectory danych rynkowych/newsowych nadal sa do podpiecia.
- Pipeline moze opcjonalnie zapisac briefing przez `BriefingWriter`, czyli np.
  storage repository z Etapu 2.
