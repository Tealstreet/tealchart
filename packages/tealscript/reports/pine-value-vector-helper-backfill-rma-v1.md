# Pine Value Vector Helper Backfill RMA v1

Generated: 2026-09-12T07:05:40.445Z
Measured source commit: `2628bdbd1a` with this report script/report dirty in the worktree.

## Purpose

`ta.rma` is the load-bearing primitive behind the queued `ta.atr` and `ta.rsi` helper expectations. This checkpoint verifies the existing RMA expectations against the published Wilder/RMA formula before those downstream compositions are treated as oracles.

## Inputs

- Extrema/RMA chain checkpoint: `pine-value-vector-helper-backfill-extrema-rma-v1.json @ 9176246f80`.
- Value-vector runner source: `scripts/run-pine-value-vectors.ts`.

## Headline

- RMA rows backfilled: 8.
- Seed-discriminating rows: 7.
- No-seed by construction rows: 1.
- Discrimination proof failures among RMA rows: 0.

Re-derivation reproduced the current expectations. The published formula is `alpha = 1 / length`, `rma = alpha * source + (1 - alpha) * rma[1]`, seeded by `ta.sma(source, length)`. The seed is the protected point: seven rows include a red-first mutation of the first non-null seeded value. `hostile.rma.overlong` never forms a seed because fewer than `length` non-`na` values are available, so it is verified as a full-length all-`na` no-seed row rather than as a seed-discriminating row.

## Rows

| Case | First non-null bar | First non-null value | Proof mutations | Seed-discriminating | Compiled | Public path |
| --- | --- | --- | --- | --- | --- | --- |
| `ta.rma` | 2 | 11.333333333333334 | `flip-first-non-null-value` | yes | true | true |
| `ta.smma` | 19 | -0.08224291739330045 | `flip-first-non-null-value` | yes | true | true |
| `hostile.rma.long` | 19 | -0.08224291739330045 | `flip-first-non-null-value` | yes | true | true |
| `hostile.rma.long-middle-na` | 20 | 0.3799197921145995 | `flip-first-non-null-value` | yes | true | true |
| `hostile.rma.middle-na` | 2 | -0.6666666666666666 | `flip-first-non-null-value` | yes | true | true |
| `hostile.rma.multi-middle-na` | 3 | 0 | `flip-first-non-null-value` | yes | true | true |
| `hostile.rma.synthetic.multi-middle-na` | 3 | 0 | `flip-first-non-null-value` | yes | true | true |
| `hostile.rma.overlong` | `none` | `none` | `truncate-first-output` | no | true | true |

## Downstream Implication

`ta.atr` and `ta.rsi` can now cite RMA as a verified primitive when their helper rows are backfilled. They still need their own composition citations, but they do not need independent first-principles re-derivation unless a later RMA audit disagreement appears. `ta.mfi` remains standalone and is not blocked by RMA.

## Gate Catch

The red-first enforcement paid for itself immediately after the parity merge: the value-vector gate caught four newly merged vectors without discrimination metadata before this RMA checkpoint could go green. Those rows came from semantic argument-type/qualifier work and runtime operator/versioned-operator work, and were given proof metadata before the checkpoint continued.
