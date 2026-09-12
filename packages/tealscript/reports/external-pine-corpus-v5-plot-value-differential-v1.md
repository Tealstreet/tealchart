> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v5 Plot Value Differential v1

## Scope

- Corpus: fixed v5 corpus at `packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910`
- Rows: 1,000 pinned scripts from `external-pine-corpus-v5.manifest.json`
- Bars: 160 synthetic bars from the existing external-corpus generator
- Current path: compiled execution at `51fad7bbde7e2317c16370ed734461906d871cfd`
- Reference path: archived interpreter execution at `18854ba662de46ef42461f060546432f9aa78861`
- Output dimensions compared: plot series values, including OHLC plot fields
- Numeric tolerance: `1e-8`

The current product tree no longer contains a live interpreter path. `sourceClassifier.ts`
still compares a public execution result against compiled output, but the public execution
entry now resolves through `runtime/compiledOnly.ts`, so that comparison is compiled vs
compiled. This harness recovers the retired interpreter signal by loading the interpreter
from the archived package at `18854ba662de46ef42461f060546432f9aa78861` and comparing it
against current compiled execution over the same bars.

## Command

```bash
yarn tsx packages/tealscript/scripts/measure-corpus-plot-value-differential.ts \
  --input packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910 \
  --timeout-script sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine \
  --output packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910/value-differential/report-51fad7bbde.json
```

## Funnel

| Status | Rows |
| --- | ---: |
| Matched | 649 |
| Mismatched | 130 |
| Skipped before comparison | 221 |
| Execution errors | 0 |

Skipped rows:

| Skip status | Rows |
| --- | ---: |
| `skipped-semantic` | 163 |
| `skipped-parse` | 55 |
| `skipped-compile` | 2 |
| `skipped-timeout` | 1 |

The comparable denominator is 779 rows. Of those, 130 diverge value-by-value between
the archived interpreter and current compiled execution.

## Ranked First-Difference Causes

| Cause | Rows | Representative |
| --- | ---: | --- |
| `values:number->na:bar0` | 31 | `sources/0026__mihakralj-pinescript__midpoint.pine` |
| `values:number->number:warmup` | 24 | `sources/0214__mihakralj-pinescript__fisher.pine` |
| `values:number->na:warmup` | 17 | `sources/0405__mihakralj-pinescript__vroc.pine` |
| `values:na->number:warmup` | 16 | `sources/0337__mihakralj-pinescript__mama.pine` |
| `values:number->na:later` | 15 | `sources/0482__casoon-pine-scripts__adaptive_fair_value_cloud.pine` |
| `plots.length` | 10 | `sources/0139__mihakralj-pinescript__cfb.pine` |
| `values:number->number:later` | 9 | `sources/0485__casoon-pine-scripts__directional_probability_engine_v1.pine` |
| `values:number->number:bar0` | 5 | `sources/0386__mihakralj-pinescript__cmf.pine` |
| `values:na->number:later` | 2 | `sources/0571__casoon-pine-scripts__ma_regime_bands.pine` |
| `values.length` | 1 | `sources/0134__mihakralj-pinescript__mlp.pine` |

## Finding

The corpus is saturated as an existence/output funnel, but it is not saturated as
a value source. The same 1,000 real scripts produce 130 plot-series value
divergences across 779 comparable rows when the retired interpreter and current
compiled path are compared directly.

This does not identify Pine ownership by itself. It ranks scripts and failure
shapes where the two TealScript implementations disagree without requiring new
TradingView traces. The largest clusters are warmup/leading-`na` differences,
early-bar numeric seed differences, later `na` retention differences, and plot
structure differences.
