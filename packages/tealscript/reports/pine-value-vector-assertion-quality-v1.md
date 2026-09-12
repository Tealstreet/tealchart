> Superseded by pine-value-vector-assertion-quality-v8.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vector Assertion Quality V1

## Basis

- Source: `packages/tealscript/scripts/run-pine-value-vectors.ts` at current HEAD.
- Member denominator: the 811 official names already covered by at least one vector case in `pine-value-vector-member-map-v22`.
- Rule: value-checked means the member is the target of an exact-value or payload assertion.
- Rule: property-checked means the member is the target of a derived invariant assertion.
- Rule: ran-only means the member appears only as scaffolding, a dependency, or a trace-required exact-value placeholder.
- Trace-required TA exact series do not count as value coverage because `PINE_TRACE_REQUIRED_v2.md` says their seed, hole, and recovery values remain unsettled.

## Headline

- Covered official members: 811.
- Value-checked: 783/811 (96.55%).
- Property-checked only: 13/811 (1.60%).
- Ran-only: 15/811 (1.85%).

## Namespace Counts

| Namespace | Total | Value | Property only | Ran-only |
| --- | ---: | ---: | ---: | ---: |
| `(global)` | 55 | 54 | 0 | 1 |
| `adjustment` | 3 | 3 | 0 | 0 |
| `alert` | 3 | 3 | 0 | 0 |
| `array` | 55 | 55 | 0 | 0 |
| `backadjustment` | 3 | 3 | 0 | 0 |
| `barmerge` | 4 | 4 | 0 | 0 |
| `barstate` | 5 | 5 | 0 | 0 |
| `box` | 30 | 30 | 0 | 0 |
| `chart` | 16 | 16 | 0 | 0 |
| `color` | 24 | 24 | 0 | 0 |
| `currency` | 56 | 56 | 0 | 0 |
| `dayofweek` | 7 | 7 | 0 | 0 |
| `display` | 7 | 7 | 0 | 0 |
| `dividends` | 2 | 2 | 0 | 0 |
| `earnings` | 2 | 2 | 0 | 0 |
| `extend` | 4 | 4 | 0 | 0 |
| `font` | 2 | 2 | 0 | 0 |
| `format` | 5 | 5 | 0 | 0 |
| `hline` | 3 | 3 | 0 | 0 |
| `input` | 13 | 13 | 0 | 0 |
| `label` | 43 | 43 | 0 | 0 |
| `line` | 28 | 28 | 0 | 0 |
| `linefill` | 6 | 6 | 0 | 0 |
| `location` | 5 | 5 | 0 | 0 |
| `log` | 3 | 3 | 0 | 0 |
| `map` | 11 | 11 | 0 | 0 |
| `math` | 28 | 28 | 0 | 0 |
| `matrix` | 49 | 49 | 0 | 0 |
| `order` | 2 | 2 | 0 | 0 |
| `plot` | 14 | 14 | 0 | 0 |
| `polyline` | 3 | 3 | 0 | 0 |
| `position` | 9 | 9 | 0 | 0 |
| `request` | 8 | 8 | 0 | 0 |
| `scale` | 3 | 3 | 0 | 0 |
| `session` | 7 | 7 | 0 | 0 |
| `settlement_as_close` | 3 | 3 | 0 | 0 |
| `shape` | 12 | 12 | 0 | 0 |
| `size` | 6 | 6 | 0 | 0 |
| `splits` | 2 | 2 | 0 | 0 |
| `str` | 18 | 18 | 0 | 0 |
| `strategy` | 91 | 91 | 0 | 0 |
| `syminfo` | 33 | 33 | 0 | 0 |
| `ta` | 67 | 40 | 13 | 14 |
| `table` | 23 | 23 | 0 | 0 |
| `text` | 10 | 10 | 0 | 0 |
| `ticker` | 9 | 9 | 0 | 0 |
| `timeframe` | 14 | 14 | 0 | 0 |
| `xloc` | 2 | 2 | 0 | 0 |
| `yloc` | 3 | 3 | 0 | 0 |

## Property-Checked Only Members

- `ta.bb - derived invariant assertion in invariant.bb.tuple-coherence; exact seed/hole/recovery remains trace-required`
- `ta.bbw - derived invariant assertion in invariant.bbw.zero-basis-na; exact seed/hole/recovery remains trace-required`
- `ta.cmo - derived invariant assertion in invariant.cmo.bounds; exact seed/hole/recovery remains trace-required`
- `ta.dmi - derived invariant assertion in invariant.dmi.bounds; exact seed/hole/recovery remains trace-required`
- `ta.kc - derived invariant assertion in invariant.kc.tuple-coherence; exact seed/hole/recovery remains trace-required`
- `ta.mfi - derived invariant assertion in invariant.mfi.bounds; exact seed/hole/recovery remains trace-required`
- `ta.pivothigh - derived invariant assertion in invariant.pivothigh.confirmation-offset; exact seed/hole/recovery remains trace-required`
- `ta.pivotlow - derived invariant assertion in invariant.pivotlow.confirmation-offset; exact seed/hole/recovery remains trace-required`
- `ta.rci - derived invariant assertion in invariant.rci.bounds; exact seed/hole/recovery remains trace-required`
- `ta.rsi - derived invariant assertion in invariant.rsi.bounds; exact seed/hole/recovery remains trace-required`
- `ta.stoch - derived invariant assertion in invariant.stoch.bounds; exact seed/hole/recovery remains trace-required`
- `ta.tsi - derived invariant assertion in invariant.tsi.bounds; exact seed/hole/recovery remains trace-required`
- `ta.wpr - derived invariant assertion in invariant.wpr.bounds; exact seed/hole/recovery remains trace-required`

## Ran-Only Members

- `indicator - appears only as scaffolding, dependency, or trace-required exact-value placeholder; first seen in ta.sma`
- `ta.accdist - appears only as scaffolding, dependency, or trace-required exact-value placeholder; first seen in ta.accdist`
- `ta.alma - appears only as scaffolding, dependency, or trace-required exact-value placeholder; first seen in ta.alma`
- `ta.cross - appears only as scaffolding, dependency, or trace-required exact-value placeholder; first seen in ta.cross`
- `ta.crossover - appears only as scaffolding, dependency, or trace-required exact-value placeholder; first seen in ta.crossover`
- `ta.crossunder - appears only as scaffolding, dependency, or trace-required exact-value placeholder; first seen in ta.crossunder`
- `ta.cum - appears only as scaffolding, dependency, or trace-required exact-value placeholder; first seen in ta.cum`
- `ta.hma - appears only as scaffolding, dependency, or trace-required exact-value placeholder; first seen in ta.hma`
- `ta.kcw - appears only as scaffolding, dependency, or trace-required exact-value placeholder; first seen in ta.kcw`
- `ta.macd - appears only as scaffolding, dependency, or trace-required exact-value placeholder; first seen in ta.macd`
- `ta.pivot_point_levels - appears only as scaffolding, dependency, or trace-required exact-value placeholder; first seen in ta.pivot_point_levels.size`
- `ta.sar - appears only as scaffolding, dependency, or trace-required exact-value placeholder; first seen in ta.sar`
- `ta.supertrend - appears only as scaffolding, dependency, or trace-required exact-value placeholder; first seen in ta.supertrend`
- `ta.swma - appears only as scaffolding, dependency, or trace-required exact-value placeholder; first seen in ta.swma`
- `ta.vwap - appears only as scaffolding, dependency, or trace-required exact-value placeholder; first seen in ta.vwap`
