# Pine Value Vector Helper Backfill SMA/EMA/ATR/RSI v1

Generated: 2026-09-12T07:06:03.217Z
Measured source commit: `2628bdbd1a` with this report script/report dirty in the worktree.

## Purpose

This checkpoint continues the helper-backfill queue after the extrema and RMA checkpoints. It backfills `ta.sma` and `ta.ema` by usage, then composes `ta.atr` and `ta.rsi` on the now-verified RMA primitive. It stops here and reports yield rather than continuing through the remaining broad-citation helper queue.

## Inputs

- RMA checkpoint: `pine-value-vector-helper-backfill-rma-v1.json @ 2628bdbd1a`.
- Value-vector runner source: `scripts/run-pine-value-vectors.ts`.

## Headline

- Rows backfilled in this checkpoint: 19.
- Disagreements found in this checkpoint: 0.
- Running yield across helper backfill: 33 rows backfilled, 0 disagreements found.
- Remaining broad-citation helper rows after this checkpoint: 59.

`ta.ema` is intentionally not treated like `ta.rma`: RMA seeds with an SMA; EMA follows the reference equivalent implementation and seeds from the first non-`na` source value before applying `alpha = 2 / (length + 1)`. The EMA rows therefore use first-non-null seed-discrimination, not an RMA-style SMA-seed expectation.

`ta.atr` and `ta.rsi` are now reference compositions on verified RMA rather than independent guesses. `ta.atr` composes true range with RMA, and `ta.rsi` composes upward/downward changes with RMA. The overlong ATR row is no-seed by construction and uses the same no-seed full-length proof shape as the overlong RMA row.

## Backfilled Rows

| Case | Helper | Member | First non-null bar | Proof mutations | Compiled | Public path |
| --- | --- | --- | --- | --- | --- | --- |
| `ta.sma` | `sma` | `ta.sma` | 2 | `flip-first-non-null-value` | true | true |
| `hostile.sma.middle-na` | `sma` | `ta.sma` | 2 | `flip-first-non-null-value` | true | true |
| `hostile.sma.multi-middle-na` | `sma` | `ta.sma` | 3 | `flip-first-non-null-value` | true | true |
| `ta.sma.nested-expression-source-order-values` | `sma` | `ta.sma` | 2 | `flip-first-non-null-value` | true | true |
| `language.block-boundary-unary-return-values` | `sma` | `ta.sma` | 1 | `flip-first-non-null-value` | true | true |
| `udf.ta.call-sites` | `sma` | `ta.sma` | 2 | `flip-first-non-null-value` | true | true |
| `ta.ema` | `ema` | `ta.ema` | 0 | `flip-first-non-null-value` | true | true |
| `hostile.ema.long` | `ema` | `ta.ema` | 0 | `flip-first-non-null-value` | true | true |
| `hostile.ema.long-middle-na` | `ema` | `ta.ema` | 0 | `flip-first-non-null-value` | true | true |
| `hostile.ema.middle-na` | `ema` | `ta.ema` | 0 | `flip-first-non-null-value` | true | true |
| `hostile.ema.multi-middle-na` | `ema` | `ta.ema` | 0 | `flip-first-non-null-value` | true | true |
| `ta.atr` | `atr` | `ta.atr` | 2 | `flip-first-non-null-value` | true | true |
| `hostile.atr.middle-na` | `atr` | `ta.atr` | 2 | `flip-first-non-null-value` | true | true |
| `hostile.atr.multi-middle-na` | `atr` | `ta.atr` | 3 | `flip-first-non-null-value` | true | true |
| `hostile.atr.overlong` | `atr` | `ta.atr` | `none` | `truncate-first-output` | true | true |
| `ta.rsi` | `rsi` | `ta.rsi` | 3 | `flip-first-non-null-value` | true | true |
| `hostile.rsi.flat` | `rsi` | `ta.rsi` | 3 | `flip-first-non-null-value` | true | true |
| `hostile.rsi.multi-middle-na` | `rsi` | `ta.rsi` | 4 | `flip-first-non-null-value` | true | true |
| `hostile.rsi.signed` | `rsi` | `ta.rsi` | 3 | `flip-first-non-null-value` | true | true |

## Immediate Gate Catch

The red-first enforcement paid for itself immediately after the parity merge: the value-vector gate caught four newly merged cases without discrimination metadata. They were fixed in the RMA commit before this checkpoint continued.

| Case | Lane | Source commit | Source subject |
| --- | --- | --- | --- |
| `semantic.array-percentile-string-percentage-rejection` | semantic/argument-type | `14ac4a40cf` | fix: reject string array percentile percentage |
| `semantic.builtin-argument-qualifier-rejection` | semantic/qualifier | `2d9aa7168e` | fix: enforce builtin argument qualifiers |
| `language.negative-modulo-floor-quotient` | runtime/operator | `8a1fb60dac` | fix: use pine modulo semantics for negatives |
| `language.v5-comparison-na-result-is-na` | runtime/versioned-operator | `58cff557c0` | fix: preserve v5 na comparison results |

## Yield

So far the helper backfill has retired `33` rows with `0` disagreements: `6` extrema-value rows, `8` RMA rows, and `19` SMA/EMA/ATR/RSI rows. The highest-risk arithmetic/helper rows have not reproduced the extrema-bars failure. That does not prove the remaining broad-citation rows are sound, but it lowers the expected return of a full 92-row grind; the remaining work should be re-authorized or re-ranked rather than continued by inertia.
