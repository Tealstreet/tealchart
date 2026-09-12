> Superseded by pine-value-vectors-blind-spot-v35.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Blind Spot V23

Superseded metric notice: this report is a historical measurement artifact. Quote `pine-value-vectors-index-v1.md` for authoritative value-vector figures; headline counts in this file may be stale.

Source reports:

- `/tmp/pine-value-vectors-visual-metadata-v3.json`
- `pine-value-vectors-practical-ceiling-v1.md`
- `pine-value-vectors-blind-spot-v22.md`

## Summary

- Independent-oracle value-vector cases: `342`.
- Context-sensitive cases run under a second chart context: `64`.
- Changed and should have: `28`.
- Unchanged and should have: `0`.
- Changed when should not have: `0`.
- Unchanged and should not have: `36`.
- Not comparable: `0`.
- Expected engine defects or trace-required surfaces tracked by id: `3`.

## Coverage

| Surface | Independent-oracle coverage | Fraction | Notes |
| --- | ---: | ---: | --- |
| Raw builtin audit denominator | `367/489` | `75.05%` | Up from `359/489`; this batch adds visual-global metadata coverage. |
| Practical no-trace ceiling | `367/471` | `77.92%` | Uses `pine-value-vectors-practical-ceiling-v1.md`; excludes trace/provider-exact members that should not be guessed. |
| `ta.*` | `74/74` | `100.00%` | Whole committed TA value surface has at least one vector. |
| `TradingView/ta` | `13/13` | `100.00%` | Official-library TA wrappers have value vectors. |
| Language categories | `16/23` | `69.57%` | Runtime language semantics remain the highest-yield vector area. |

## Harness Change

- The value-vector runner now supports `expectedPlots` for plot payload metadata.
- Plot payload comparison normalizes generated ids and `scriptId`, then checks only explicit oracle fields.
- Hline values are asserted through `price` metadata because hline outputs do not carry per-bar `values`.

## New Visual Coverage

- Added `visual.plot-hline-fill-metadata-values`: `plot`, `hline`, and `fill` value/payload metadata including style, offset, trackprice, histbase, join, editable, show_last, display, format, precision, force_overlay, line style, fill gaps, and per-bar colors.
- Added `visual.marker-candle-metadata-values`: `plotshape`, `plotchar`, `plotarrow`, `plotbar`, and `plotcandle` value/payload metadata including marker location, shape/char/text, size, show_last, force_overlay, and arrow height bounds.

## Practical Ceiling

- Remaining raw uncovered members: `122`.
- Remaining no-trace-verifiable members: `104`.
- The remaining set is concentrated in `bgcolor`/`barcolor` payload metadata, table clear/cell setter edge cases, deeper strategy/order/risk edge cases, and provider/trace-required surfaces.

## Gate Status

- Value-vector gate: `342` cases, `339` compiled/public matches, `3` expected failures, `0` unexpected failures, `0` unexpected passes.
- Typecheck: `yarn workspace @tealstreet/tealscript typecheck` passed.

## Expected Red Cases

- `drawing.chart-point-values` remains a chart point copy defect.
- `language.collection-history-containers` remains a collection history defect.
- `strategy.calc-on-order-fills-values` remains trace-required and explicitly rejected.
