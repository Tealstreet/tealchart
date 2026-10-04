# array-percentrank-fraction-and-ties v14 v1

Question: Does native int percentrank round/truncate fractional percentage, and do ties count less-than-or-equal?
Ledger rows: 1228. Native outcome remains UNOBSERVED; expected phase/values UNSPECIFIED.

1. Use standard BINANCE:BTCUSDT, 2 minutes, default inputs, at least 32 historical bars starting at actual Pine bar_index 0. Remove the previous probe; paste this source unchanged by itself.
2. Record COMPILE-ERROR, RUNTIME-ERROR or RUNS separately. Preserve complete diagnostic/code/line/column or bar, source SHA, chart context and screenshot; do not repair a refusal.
3. If RUNS, export every named column, preserving raw precision and blanks; retain source/settings/context screenshot. Observation: Float first-of-three gives100/3 under documented rank definition; capture the exact int result separately. Tie controls distinguish75 (<=) from25 (<) or any third result.
4. Save the unmodified CSV/error evidence under v14/captures/v14/ and record the attempt in v14/captures/v14/RESPONSE-v14.md.

Scope limit: Does not resolve other finite-index errors, arbitrary NA ordering or precision outside these fixtures. A grouped refusal does not settle calls that never executed. Expected observations distinguish alternatives; they are not native predictions or full-row parity credit.
