# External Pine Corpus V7 Size-Recovery Report

Navigation note: this size-threshold recovery measurement feeds the current
corpus evidence synthesis. For tomorrow's actionable build order, start at
`pine-corpus-priority-queue-v1.md`.

Generated at 2026-09-11T11:39:28.510Z. Measured at commit `3c2c00ac84`.

## Headline

The size filter was discarding usable Pine. Recovering the 50 suspect rows produced 27 visible-output scripts. The oversized half is valuable: 10/24 produced output and the remaining failures include 5 closed-host TradingView-library imports, 6 invalid Pine rows, and 3 runner-labeled TealScript gaps. The undersized half is mostly cheap fixture evidence: 17/26 produced output, 5 are correct no-output snippets, and 4 are runner-labeled TealScript gaps.

The recovered set does **not** add a new official member beyond the accepted v5/v6/v7 corpus surface. It retouches 17 members that v7 already reached, so its value is extra acceptance/execution evidence, not expansion of the official-member frontier.

The 180,000-byte ceiling has been removed from `harvest-external-pine-corpus-v7.ts`; byte size remains measurement metadata, not a validity filter. The 120-byte floor was removed for the same reason.

## Funnel

| Class | Scripts | Parse | Semantic | Compile | Execute | Output | Validity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| oversized | 24 | 24 | 11 | 10 | 10 | 10 | supported 10, invalid-pine 6, unsupported-by-design 5, tealscript-gap 3 |
| undersized | 26 | 26 | 24 | 24 | 24 | 17 | supported 22, tealscript-gap 4 |

## Coverage

Recovered official members touched: 451.

By class: oversized 438, undersized 22.

New official members versus v5/v6 plus accepted v7: 0.

The undersized half adds 0 new official members, so it should not be used to pad the corpus unless its fixture-style rows are wanted as regression evidence.

Targeted previously-untouched members retouched by recovery: array.every, label.style_cross, line.set_first_point, line.set_second_point, matrix.eigenvalues, matrix.eigenvectors, matrix.is_identity, matrix.is_square, matrix.is_symmetric, matrix.median, matrix.pinv, matrix.sum, matrix.swap_columns, request.footprint, strategy.closedtrades.entry_comment, strategy.risk.max_cons_loss_days, weekofyear.

Heuristic construct tags not seen in accepted v7 cache: none.

## Runner-Labeled Gaps

| Class | Stage | Source | Version | Members | Diagnostic |
| --- | --- | --- | --- | --- | --- |
| oversized | semantic | https://github.com/DrinkBoooz/PyTrade/pine scripts/pine-overlay-strategy-april-1.pine | 6 |  | 1196:29: qualifier-mismatch: Cannot pass series value to simple parameter 'len' for function f_knn_pivots; use an input/simple value or declare a compatible parameter |
| oversized | compile | https://github.com/MeridianAlgo/Pine-A-Script/examples/Smart_Trader_Episode_03_by_Ata_Sabanci_Candles_and_Tradelines.pine | 6 |  | Compilation error: Duplicate parameter name not allowed in this context |
| oversized | semantic | https://github.com/regalouisei/collect-tradingview/pinescript/editors_picks/template-trailing-strategy-backtester.pine | 6 | strategy.risk.max_cons_loss_days | 70:41: unsupported-feature: strategy fill_orders_on_standard_ohlc=true requires host-supplied standard OHLC bars for non-standard charts before TealScript can simulate it |
| undersized | output | https://github.com/helenananaa/pine-compat-runtime/tests/fixtures/sema/unsupported_matrix_median.pine | 6 | matrix.median | output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series. |
| undersized | output | https://github.com/helenananaa/pine-compat-runtime/tests/fixtures/sema/unsupported_matrix_pinv.pine | 6 | matrix.pinv | output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series. |
| undersized | semantic | https://github.com/helenananaa/pine-compat-runtime/tests/fixtures/sema/unsupported_matrix_sum.pine | 6 | matrix.sum | 4:20: argument-count: matrix.sum() expects at least 2 arguments |
| undersized | semantic | https://github.com/helenananaa/pine-compat-runtime/tests/fixtures/sema/unsupported_strategy_risk_max_cons_loss_days_zero.pine | 5 | strategy.risk.max_cons_loss_days | 3:34: type-mismatch: strategy.risk.max_cons_loss_days count must be a positive number |

One runner-labeled semantic row is the already-known host-required `fill_orders_on_standard_ohlc=true` case, not a direct implementation handoff from this report.

## Caveats

- The v7 rejection audit replay reconstructed candidate reasons because the original harvest manifest did not store per-candidate rejection records.
- Member novelty is checked against the v5/v6 corpus member map plus a direct scan of the accepted v7 source cache. Construct novelty is heuristic and only compared against the accepted v7 source cache because no v5/v6 construct census exists.
- The runner validity bucket is measurement output, not a defended ownership handoff audit. Host-required rows are called out separately when the diagnostic already identifies host-only context.
