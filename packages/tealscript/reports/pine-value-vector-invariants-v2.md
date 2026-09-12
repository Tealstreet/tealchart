# Pine Value Vector Invariants V2

## Basis

- Source register: `packages/tealscript/PINE_TRACE_REQUIRED_v2.md`.
- Coverage file: `pine-value-vectors-coverage-v112.json`.
- Harness source: `packages/tealscript/scripts/run-pine-value-vectors.ts`.
- Purpose: add independently derived safety checks for covered members whose
  exact value policy is not settled by the Reference Manual or trace.

## Headline

- Invariant cases: 45.
- Passing invariant cases: 43.
- Expected-red invariant cases: 2.
- Members with property-only coverage: 23.
- Ran-only members left: 5.
- Trace-required entries removed by invariants: 0.

Invariants do not leave the trace register. A function leaves
`PINE_TRACE_REQUIRED_v2.md` only when its exact seed, hole, and recovery values
are specified by the reference or captured by trace. These vectors prove
narrower properties that are still derivable from the Reference Manual.

## Covered Invariant Classes

| Class | Cases | Result |
| --- | ---: | --- |
| Bounded oscillators (`ta.rsi`, `ta.mfi`, `ta.stoch`, `ta.rci`, `ta.cmo`, `ta.wpr`, `ta.tsi`) | 28 | 26 pass, 2 expected-red MFI failures |
| `ta.dmi` ADX/+DI/-DI bounds | 4 | pass |
| Band/channel tuple coherence (`ta.bb`, `ta.kc`) | 2 | pass |
| Degenerate denominator guard (`ta.bbw` zero basis) | 1 | pass |
| Pivot confirmation timing (`ta.pivothigh`, `ta.pivotlow`) | 2 | pass |
| Cross-family coherence (`ta.cross`, `ta.crossover`, `ta.crossunder`) | 1 | pass |
| Accumulator monotonicity for nonnegative input (`ta.cum`) | 1 | pass |
| Convex weighted-average bounds (`ta.alma`, `ta.swma`) | 2 | pass |
| Channel-width nonnegativity on positive basis (`ta.kcw`) | 1 | pass |
| MACD tuple arithmetic (`ta.macd`) | 1 | pass |
| Supertrend direction domain (`ta.supertrend`) | 1 | pass |
| VWAP running-range bound with positive volume (`ta.vwap`) | 1 | pass |

## Expected-Red Invariant Defects

- `invariant.mfi.bounds`: `ta.mfi(close, 3)` emits finite values outside
  `[0, 100]` on hostile interior-hole bars.
- `invariant.mfi.leading-na-bounds`: `ta.mfi(close, 3)` emits finite values
  outside `[0, 100]` after a leading-`na` bar.

Both failures are reportable without a TradingView trace because the Reference
Manual documents MFI as a bounded oscillator. The exact `na` recovery sequence
remains trace-required, but out-of-range finite values violate the invariant.

## Remaining Ran-Only Members

- `indicator`: declaration scaffolding; no value/property invariant separate
  from the script output it enables.
- `ta.accdist`: the register has no composition that settles state or hole
  behavior, and no independent bound/order invariant is documented.
- `ta.hma`: the Hull construction can overshoot ordinary window bounds, so a
  convex-window invariant would be wrong.
- `ta.pivot_point_levels`: pivot level values and developing/anchor behavior
  remain host/session dependent.
- `ta.sar`: SAR is a reversal state machine; no narrow property independent of
  its unresolved initialization/reversal trace was derived.
