> Superseded by pine-value-vector-invariants-v2.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vector Invariants V1

## Basis

- Source register: `packages/tealscript/PINE_TRACE_REQUIRED_v2.md`.
- Coverage file: `pine-value-vectors-coverage-v111.json`.
- Harness source: `packages/tealscript/scripts/run-pine-value-vectors.ts`.
- Purpose: add independently derived safety checks for functions whose exact
  seed, hole, and recovery values still require TradingView traces.

## Headline

- Invariant cases added: 37.
- Passing invariant cases: 35.
- Expected-red invariant cases: 2.
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

## Expected-Red Invariant Defects

- `invariant.mfi.bounds`: `ta.mfi(close, 3)` emits finite values outside
  `[0, 100]` on hostile interior-hole bars.
- `invariant.mfi.leading-na-bounds`: `ta.mfi(close, 3)` emits finite values
  outside `[0, 100]` after a leading-`na` bar.

Both failures are reportable without a TradingView trace because the Reference
Manual documents MFI as a bounded oscillator. The exact `na` recovery sequence
remains trace-required, but out-of-range finite values violate the invariant.

## Skipped From Invariant Coverage

The remaining trace-required functions without invariant cases either have no
documented bound/order/confirmation property independent of their unresolved
seed and hole policy, or depend on provider/host state. They remain listed in
`PINE_TRACE_REQUIRED_v2.md` and should not be treated as covered by these
invariants.
