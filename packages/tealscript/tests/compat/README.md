# Pine Compatibility Fixtures

Compatibility fixtures are deterministic checkpoints for Pine-like behavior.
They should be small enough to review directly and stable enough to run in CI
without TradingView, network access, live market data, or public scripts at test
time.

Source-linked real Pine checkpoint provenance is tracked in
[`PINE_CHECKPOINTS.md`](./PINE_CHECKPOINTS.md).

The compatibility steering contract lives in `src/compat`. Use it when adding
real-script intake metadata or corpus summaries:

- `PineScriptLedgerEntry` records source URL/search context, license status,
  Pine version, script category, feature tags, and raw-source storage policy.
- `PineScriptLedger` wraps ledger entries with the compatibility schema version;
  `validatePineScriptLedger()` validates each entry and rejects duplicate ids.
- `CompatibilityRunOutcome` records parse, semantic, runtime, datafeed, output,
  and render stage results for a script.
- `normalizeCompatibilityStageOutcomes()` expands partial stage lists into the
  canonical six-stage order, filling missing stages with `not_run`.
- `not_run` marks an incomplete outcome and does not count as passing; use
  `skipped` with a message for an intentionally out-of-scope stage.
- `CompatibilityFailureClass` keeps failure buckets stable across reports:
  `parse_gap`, `semantic_gap`, `unsupported_planned`, `runtime_gap`,
  `data_gap`, `output_gap`, `render_gap`, `oracle_gap`, and
  `licensing_blocked`.
- `validateCompatibilityStageSequence()` rejects invalid stage statuses,
  duplicate stages, and failure classes on non-failed stages.
- `runPineCompatibilityCorpus()` converts ledger entries plus deterministic
  stage outcomes into an offline report with pass/fail counts, first-failure
  buckets, feature tag summaries, and validation errors.
- `runPineCompatibilityLedger()` builds that same report from a
  `PineScriptLedger` plus a deterministic stage provider.
- `createPineCompatibilityCoverageIndex()` counts checkpoint metadata by
  category, source kind, Pine version, storage policy, and feature tag.
- `yarn workspace @tealstreet/tealscript pine:compat:dashboard` writes the
  checkpoint corpus and coverage dashboard artifacts to
  `packages/tealscript/coverage/pine-compatibility` by default. Pass
  `--outDir <path>` to target a CI artifact directory.
- `formatPineCompatibilityCoverageJson()` renders the coverage index as a
  stable JSON artifact.
- `formatPineCompatibilityCoverageMarkdown()` renders that coverage index for
  PR notes or generated reports.
- `formatPineCompatibilityCorpusMarkdown()` renders the report for PR notes or
  generated artifacts without adding network or TradingView dependencies to CI.
- `formatPineCompatibilityCorpusJson()` renders the normalized run object as a
  stable JSON artifact.

Use `fixtures.ts` helpers by default:

- `compatibilityBars` for fixed OHLCV input.
- `runCompatScript()` for parse plus execute.
- `getPlot()` for title-based plot assertions.
- `roundSeries()` for stable numeric expectations.

## Topic Files

Keep fixtures grouped by behavior:

- `pine-basics.test.ts` for broad smoke coverage.
- `pine-language.test.ts` for core language/runtime semantics.
- `pine-arrays.test.ts` for array and method idioms.
- `pine-builtins.test.ts` for `ta.*`, `math.*`, `str.*`, `input.*`, `color.*`,
  and global helpers.
- `pine-visuals.test.ts` for plots, fills, alerts, and non-object visuals.
- `pine-control-time.test.ts` for switch, loops, barstate, chart info, calendar,
  sessions, and timeframes.
- `pine-drawings.test.ts` for labels, lines, boxes, linefills, polylines,
  tables, and future visual object checkpoints.
- `pine-real-checkpoints.test.ts` for source-linked, reduced fixtures derived
  from official TradingView docs and later public idiom checkpoints.

## Fixture Rules

- Prefer reduced snippets derived from official TradingView docs or common
  public idioms.
- Preserve the semantic shape of the Pine idiom, but remove unrelated UI,
  styling, and large-script scaffolding.
- Do not commit large public scripts unless licensing explicitly allows
  redistribution; use reduced fixtures and source links instead.
- Add a short source comment or link when it clarifies the behavior being
  modeled.
- Assert concrete plots, drawings, alerts, inputs, or diagnostics.
- Use hand-checked expected values over `compatibilityBars`.
- Keep unsupported behavior explicit with a negative diagnostic fixture when a
  feature is intentionally out of scope for the current epic.
