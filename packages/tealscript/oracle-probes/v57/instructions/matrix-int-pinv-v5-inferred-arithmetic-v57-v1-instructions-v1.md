# matrix-int-pinv-v5-inferred-arithmetic-v57-v1 instructions v1

Paste the exact source alone into a new TradingView indicator. Use BINANCE:BTCUSDT, standard candles, 2-minute timeframe, Etc/UTC, Bar Replay off, at least 32 closed bars. No inputs or source changes. Remove other indicators.

If refused, capture the full compiler/runtime message, code if visible, line and bar in a screenshot; do not change the result annotation to obtain a run. If it runs, export chart CSV including VALUE_A, VALUE_B, DIV_A_2, DIV_B_2 and MUL_A_3, and capture the Data Window for one closed bar. Preserve raw decimal text; do not round or infer missing digits. Include symbol/timeframe and source SHA in the capture notes.

Candidate answers: compile refusal of the explicit integer result versus admission; fractional values versus truncation/rounding; division reflecting retained fractional values versus integer arithmetic. V5 is isolated because its integer division can discriminate inferred element kind; v6 division alone cannot establish integer kind. For eigenvalues, ordering/sign and irrational rounding are independently observable in both VALUE columns. Exact native phase/values are UNSPECIFIED. If exported precision cannot distinguish models, mark that facet UNOBSERVED. No whole-kernel correctness credit follows from this single matrix.

## Round v57 record

Source: `matrix-int-pinv-v5-inferred-arithmetic-v57-v1.pine`; SHA256 `e5c8b8609a4aee33595a41ebc6cdfc421054ceed5036a2d51257bc353957b273`. Capture independently; preserve all source bytes and default inputs. Native phase and values are UNSPECIFIED. Record contrary values, zero, missing cells and refusals without editing the source. Hidden columns remain UNOBSERVED.

Preserve explicit result annotations and exact decimals. Refusal and runtime errors are separate outcomes; v6 division alone does not establish integer kind. No whole-kernel credit.

Return artifacts beneath `captures/v57/matrix-int-pinv-v5-inferred-arithmetic-v57-v1/` and reference them in `captures/v57/RESPONSE-v57.md`. Include exact source hash, symbol/ticker modifiers, timeframe, chart type/timezone, input values, capture time, closed/realtime cutoff, raw CSV, diagnostics, settings and Data Window screenshot. Preserve request symbols such as REMOTE:ALT or REMOTE:VERIFY; unavailable-symbol diagnostics are outcomes, not permission to substitute a feed.
