> Superseded by pine-value-vectors-adjudication-v3.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Adjudication v1

## Result

The first vector run reported four mismatches out of 14 cases. After checking
the formulas against Pine v6's documented history and `na` behavior, two were
incorrect expected vectors and two are confirmed TealScript engine defects.

The corrected run reports `12/14` compiled matches and `12/14` public-path
matches, using 12 synthetic OHLCV bars and an absolute float tolerance of
`1e-9`. The public path is the package's public compiled execution wrapper; it
is not an independent interpreter implementation.

Reference material:

- [Pine Script v6 Language Reference Manual](https://www.tradingview.com/pine-script-reference/v6/)
- [Pine Script execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)
- [Pine Script built-ins](https://www.tradingview.com/pine-script-docs/language/built-ins/)
- [Pine Script functions FAQ](https://www.tradingview.com/pine-script-docs/faq/functions/)
- [Pine Script type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## Initial Mismatches

The initial run was saved as `/tmp/pine-value-vectors-v1.json`. It used a
full-window oracle for all rolling functions and an SMA-seeded EMA:

| Case | Initial oracle | Engine | Adjudication |
| --- | --- | --- | --- |
| `ta.ema(close, 3)` | `na, na, 11.3333, 11.6667, ...` | `10, 10.5, 11.75, 11.875, ...` | Corrected oracle |
| `ta.rsi(close, 3)` | `na, na, 100, 66.6667, ...` | `na, na, na, 75, 85.7143, ...` | Corrected oracle |
| `ta.highest(high, 3)` | `na, na, 14, 14, ...` | `11, 12, 14, 14, ...` | Confirmed engine defect |
| `ta.lowest(low, 3)` | `na, na, 9, 10, ...` | `9, 9, 9, 10, ...` | Confirmed engine defect |

## Adjudicated Rules

| Function and length | Leading `na` bars | Expected rule | Verdict |
| --- | ---: | --- | --- |
| `ta.ema(source, 3)` | 0 | Seed `EMA[0]` with the first non-`na` source value. For subsequent bars, `EMA[t] = source[t] * alpha + EMA[t-1] * (1 - alpha)`, where `alpha = 2 / (length + 1)`. | Engine correct; oracle used an unsupported SMA warm-up. |
| `ta.rsi(source, 3)` | 3 | RSI uses Wilder RMA smoothing of gains and losses. The first delta is between bars 0 and 1, so three deltas are available only at bar 3; seed each RMA with the arithmetic mean of those three gains/losses, then apply the Wilder recurrence. | Engine correct; oracle counted the bar-0 zero delta and emitted one bar early. |
| `ta.highest(source, 3)` | 2 | A length-3 call requires the current value and the preceding two committed values before it returns a value. | Confirmed engine defect; current implementation returns partial-window values. |
| `ta.lowest(source, 3)` | 2 | Same full-window warm-up rule as `ta.highest`. | Confirmed engine defect; current implementation returns partial-window values. |

The execution-model documentation explicitly describes the full-window
`ta.highest(high, 20)` case as `na` for the first 19 bars. Applied to these
length-3 vectors, that means two leading `na` bars for both extrema functions.
The prior available-history oracle contradicted that explicit v6 statement and
has been corrected; the remaining mismatch is therefore an engine defect.

The v6 reference identifies `ta.ema` and its simple-length contract, while the
public reference prose does not state the initial seed as a standalone
equation. The seed above is the Pine v6 series convention used for this
adjudication, and is distinguished from the incorrect SMA-seeded oracle by the
bar-0 output and recurrence. This seed rule must remain covered by the vector
rather than being inferred from a generic EMA textbook definition.

## Independent Formula Coverage

The harness currently covers 14 builtin call forms with deterministic formulas:
`ta.sma`, `ta.ema`, `ta.rma`, `ta.rsi`, `ta.stdev`, `ta.variance`, `ta.atr`,
`ta.wma`, `ta.dev`, `ta.highest`, `ta.lowest`, `ta.vwma`, `ta.cum`, and
`ta.change`. These cover documented rolling windows, Wilder smoothing,
true-range construction, weighted means, extrema, cumulative state, and
one-bar differences.

Independent vectors do not establish parity for behavior whose result depends
on TradingView context or undocumented runtime policy. Those areas require
TradingView ground truth or an equivalent authoritative trace:

- `request.*` data, provider responses, synthetic ticker contexts, and
  `barmerge` gaps/lookahead mapping;
- session/timezone/DST behavior, chart and visible-range metadata, and
  realtime/bar-state execution;
- drawing/table/line/box/polyline lifecycles, object limits, rollback, and
  rendering metadata;
- strategy broker-emulator fills, order timing, equity, and risk state;
- imported-library registry contents and host input overrides;
- repainting, unconfirmed-bar behavior, and other path-dependent execution;
- builtins whose edge cases or seed behavior are not specified by the public
  v6 reference and cannot be reduced to a documented mathematical formula.

These are not counted as numeric parity by the vector harness. The harness
reports formula coverage, not TradingView-equivalent output for those domains.

## Dispatchable Engine Defects

- `ta.highest(source, length)` returns partial-window values instead of `na`
  until `length` values are available. The length-3 vector differs at bars 0
  and 1 on both compiled and public paths.
- `ta.lowest(source, length)` has the same warm-up defect and differs at bars
  0 and 1 on both paths.
