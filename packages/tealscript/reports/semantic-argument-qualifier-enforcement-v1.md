# Semantic Argument Qualifier Enforcement v1

Date: 2026-09-12

**Superseded on 2026-09-12 by
`semantic-ta-qualifier-live-reference-correction-v1.md`.** The enforcement
described below used an over-broad TA simple-parameter table. The corrected
live-reference-derived table enforces 21 v5 simple-only TA pairs and 22 v6+
pairs, while documented-series length parameters such as `ta.sma:length`,
`ta.highest:length`, `ta.lowest:length`, `ta.correlation:length`, and
`ta.vwma:length` must accept `series int`. The six corpus rows listed below
are false refusals under the corrected reference-derived rule.

## Verdict

Direct builtin argument qualifier enforcement is now wired for the two clusters
measured in `semantic-argument-qualifier-blast-radius-v1.md`:

- Declared Pine v5+ direct `ta.*` calls reject `series` arguments passed to the
  73 TA parameters that require `simple` values.
- Direct typed `input.*` calls reject non-`const` `defval` arguments for the 11
  typed input helpers in `INPUT_DEFAULT_TYPE_REQUIREMENTS`.

The TA rule is intentionally version-scoped. The current/v6 docs explicitly
show `ta.ema(..., series int length)` as a compile-time error, and the v5 docs
define the same qualifier hierarchy. The v4 manual uses the older "form"
vocabulary and this audit did not find a v4-specific statement covering the 73
TA parameters, so v4 sources are not covered by the new direct-call TA-simple
diagnostic.

## Corpus Delta

The expected corpus acceptance delta is six accepted scripts, all from the
TA-simple cluster. This is a correctness win reported honestly, not an output
regression: the affected scripts pass genuinely dynamic `series` lengths to
TA parameters that Pine documents as requiring `simple` values.

| Corpus | Declared version | Source | Trigger |
| --- | --- | --- | --- |
| v6 | v5 | `0416 kantomu/prm STRICT_RSI.pine` | `ta.lowest(..., bars_since_ob + 1)` |
| v6 | v5 | `0425 regalouisei LOMV` | `ta.correlation(..., math.min(frobenius_lookback, bar_index + 1))` |
| v6 | v5 | `0557 tripolskypetr backtest-kit feb_2026.pine` | `ta.highest(..., barsSinceEntry)` |
| v6 | v5 | `0586 helenananaa fixture weighted_averages_dynamic_length.pine` | `ta.vwma(close, length)` |
| v6 | v5 | `0626 agutinbaigo28 trading-backtest-kit feb_2026.pine` | `ta.highest(..., barsSinceEntry)` |
| v7 | v6 | `0258 JasonTeixeira NexTransform.pine` | `ta.highest(weighted_source, adaptive_length)` |

The input-defval cluster has zero measured corpus exposure on the current
baseline. A direct probe showed it was still a real direct-call qualifier gap:
`input.int(input.int(10))` and `input.float(close)` were accepted before this
change. The earlier apparent input corpus rows were an instrument artifact from
classifying ordinary `int()`, `float()`, and `bool()` casts as input
constructors.

## Guard Coverage

Added guards:

- Semantic checker red-first tests for v6 direct TA-simple rejection.
- Semantic checker guard that v4 TA-simple direct-call enforcement is not
  applied without a supporting v4 manual statement.
- Semantic checker red-first tests for direct `input.* defval` const rejection.
- Value-vector case `semantic.builtin-argument-qualifier-rejection`, with
  documented provenance from TradingView's type-system docs.

## Verification

Focused red before implementation:

- `yarn vitest run packages/tealscript/src/semantic/checker.test.ts`
  failed only the two new direct-call qualifier tests.

Green after implementation:

- `yarn vitest run packages/tealscript/src/semantic/checker.test.ts`
  - 418 passed.
- `yarn workspace @tealstreet/tealscript pine:value-vectors /tmp/pine-value-vectors-qualifier-enforcement.json`
  - 991 cases.
  - 990 compiled matches.
  - 990 public-path matches.
  - only expected failure: `strategy.calc-on-order-fills-values`.
  - no unexpected failures or expected-red metadata failures.
- `yarn workspace @tealstreet/tealscript pine:external-corpus:fast-gate`
  - 12 rows, 12 output rows, 12 achievable output rows.
- `yarn workspace @tealstreet/tealscript pine:external-corpus:refusal-gate`
  - 6 rows, 6 expected refusals, 0 output rows.

## Instrument Note

This task had the same measurement hazard as several earlier external and
corpus findings: the first input blast-radius classifier counted cast calls as
input constructors. The engine gap was real, but the corpus exposure number was
not. The durable rule is still: a surprising uniform movement is an instrument
suspect before it is a finding.

## Sources

- TradingView current type system:
  https://www.tradingview.com/pine-script-docs/language/type-system/
- TradingView v5 type system:
  https://www.tradingview.com/pine-script-docs/v5/language/type-system/
- TradingView v4 type system:
  https://www.tradingview.com/pine-script-docs/v4/language/type-system/
- TradingView current inputs:
  https://www.tradingview.com/pine-script-docs/concepts/inputs/
- TradingView v5 inputs:
  https://www.tradingview.com/pine-script-docs/v5/concepts/inputs/
