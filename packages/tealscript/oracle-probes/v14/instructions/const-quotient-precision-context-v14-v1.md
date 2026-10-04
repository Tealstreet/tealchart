# Constant quotient precision context v14 v1

Owner: codex-1xjtos. Source: `const-quotient-precision-context-v14-v1.pine`.
SHA256: `bcaf8c8a1915760011eb5b7acaaf2f1dd3da50ba5d0406ee7c0a48ede7898401`.

The two existing coverage-tab source-composed EMA columns have 33,853 historical binary64 differences. Two coefficient policies fit all 48,270 native cells: 16 significant digits and 16 decimal places. Neither fit establishes a compiler rule. This capture distinguishes constant folding, literal parsing and runtime quotient precision without altering any EMA/SMA kernel.

1. Paste the exact source into a new indicator on ordinary BINANCE:BTCUSDT candles, **2-minute** timeframe, exchange timezone UTC. Keep Numerator=2 and Denominator=15. Do not use Replay or a synthetic chart. Screenshot symbol/timeframe, Inputs and source compile status. Preserve the exact compiler diagnostic if refused; do not edit the source to make it compile.
2. If accepted, load at least 96 bars and export the chart's raw CSV with all 43 titled indicator columns. Preserve the CSV untouched, including blanks and its last live row. Data Window screenshots alone cannot adjudicate internal precision. Screenshot first and last available timestamps and at least one Data Window showing the quotient/difference columns.
3. Export from Pine `INPUT_BAR_INDEX=0` through at least index95, including the physical holes40/41. If TV's export omits the initial prefix, retain the full export and mark recurrence adjudication INPUT-CONTEXT-REQUIRED; scalar precision can still be compared. Do not reset or rebase index. Close prices are exported so new-capture recurrences can be recomputed independently rather than compared against a different historical window.
4. Record capture attempt, source SHA, native version, symbol, chart type, timeframe, timezone, actual input settings and exported time unit. `INPUT_TIMEFRAME_MULTIPLIER` must be2. Join the context using exported index/time/close, not row ordinals alone.

Column mapping is `PROBE-COLUMNS-v1.json`. All native outcomes are **UNOBSERVED / UNSPECIFIED**. Local preflight twice on96 archived bars establishes only engine readiness and determinism.

`CONST_SMALL_OVER_3` and `CONST_LARGE_OVER_3` separate fractional places from significant digits. The amplified difference columns retain sub-ULP coefficient distinctions even when scalar CSV formatting rounds the quotient. CONST/INPUT/SIMPLE/SERIES/UDF outputs separate compiler context rules. LITERAL17/LITERAL16 recurrences distinguish decimal literal handling from quotient folding. EXACT_CONTROL uses binary-exact1/8 and7/8; its SMA seed still uses the authored divide-by14. There are no EMA/SMA builtin calls, epsilon thresholds or zero-denominator questions in this source.

Do not infer a shared engine rounding rule from a single equal displayed coefficient or a fitted recurrence. Compare the untouched raw export and amplified outputs across all contexts before deciding scope.
