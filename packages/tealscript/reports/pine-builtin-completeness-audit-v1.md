> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Builtin Completeness Audit v1

Generated: 2026-09-05

Scope: `ta.*`, `math.*`, `str.*`, `array.*`, `matrix.*`, `map.*`, `request.*`, `strategy.*`, visual globals, and drawing namespaces (`line`, `box`, `label`, `linefill`, `polyline`, `table`, `chart.point`).

Sources:

- Official Pine v6 reference manual: https://www.tradingview.com/pine-script-reference/v6/
- Committed manual snapshot: `src/compat/pineV6ReferenceManualIndex.ts`, retrieved 2026-08-30 from the official manual index.
- Committed signature inventory: `src/compat/pineV6BuiltinSignatures.ts`.
- Runtime/checker implementation paths audited: `src/semantic/checker.ts`, `src/runtime/codegen/execute.ts`, `src/runtime/strategy.ts`, `src/runtime/arrays.ts`, `src/runtime/matrices.ts`, `src/runtime/maps.ts`, `src/runtime/builtins/drawings.ts`, `src/runtime/drawings/*`.

## Summary

- Requested official documented surface audited: 489 members across the requested namespaces and visual/drawing globals.
- Implemented/committed surface in those namespaces: 525 names, including compatibility aliases and local extensions that are not counted as official v6 coverage.
- Missing official members in the requested namespaces: 2 (`strategy.convert_to_account`, `strategy.convert_to_symbol`).
- Narrower overload sets than the committed v6 signature inventory: 0.
- Accepted documented arguments with no or materially incomplete runtime effect: 9 argument sites.
- Adjacent provider metadata outside the requested namespaces remains unresolved: 6 `syminfo.recommendations_*` series and 7 future corporate-action/earnings fields.

## Ranked Completeness Table

| Rank | Namespace | Official documented surface | TealScript committed surface | Missing official members | Narrower documented overloads | Accepted but ignored / materially partial |
| ---: | --- | ---: | ---: | --- | ---: | --- |
| 1 | `strategy.*` | 97 | 98 | `strategy.convert_to_account`, `strategy.convert_to_symbol` | 0 | 6: `strategy.exit(oca_name)` is accepted but generated exits synthesize their own OCA group; `strategy()` accepts/stores `margin_long`, `margin_short`, `calc_on_order_fills`, `risk_free_rate`, and `fill_orders_on_standard_ohlc`, but the broker emulator does not use them for margin calls, recalc-on-fill, risk-adjusted metrics, or standard-OHLC fill selection. |
| 2 | `request.*` | 11 | 11 | none | 0 | 3: `request.dividends(..., lookahead=)`, `request.earnings(..., lookahead=)`, and `request.splits(..., lookahead=)` are accepted/validated, but point-series merging only applies `gaps`; it does not apply the documented `lookahead` mode. |
| 3 | `ta.*` | 67 | 74 | none | 0 | none found in this audit. The extra committed names are local aliases/extensions (`ta.adx`, `ta.bar_index`, `ta.covariance`, `ta.dema`, `ta.kst`, `ta.smma`, `ta.tema`) and are not counted as official v6 surface. |
| 4 | `matrix.*` | 49 | 58 | none | 0 | none found in this audit. The extra committed names are local typed constructors/helpers and compatibility aliases. |
| 5 | `array.*` | 55 | 57 | none | 0 | none found in this audit. The extra committed names are `array.new_chart_point` and `array.new_polyline`. |
| 6 | `label.*` | 44 | 51 | none | 0 | none found in this audit. Extra committed getter helpers are local extensions. |
| 7 | `box.*` | 31 | 36 | none | 0 | none found in this audit. Extra committed getter helpers are local extensions. |
| 8 | `line.*` | 29 | 29 | none | 0 | none found in this audit. |
| 9 | `math.*` | 28 | 30 | none | 0 | none found in this audit. The extra committed names are `math.clamp` and `math.trunc`. |
| 10 | visual globals (`plot`, `plotshape`, `plotchar`, `plotarrow`, `plotbar`, `plotcandle`, `hline`, `fill`, `bgcolor`, `barcolor`) | 10 | 10 | none | 0 | none found in this audit. Documented output args are either applied immediately (`transp`, `offset`) or preserved on the emitted `PlotOutput` (`display`, `show_last`, `editable`, `force_overlay`, `format`, `precision`, style metadata). |
| 11 | `table.*` | 24 | 24 | none | 0 | none found in this audit. |
| 12 | `str.*` | 18 | 18 | none | 0 | none found in this audit. |
| 13 | `timeframe.*` | 14 | 15 | none | 0 | none found in this audit. Extra committed name: `timeframe.to_seconds`. |
| 14 | `input.*` | 14 | 14 | none | 0 | none found in this audit. Metadata args are preserved in `InputDefinition`; source inputs preserve source-series identity. |
| 15 | `map.*` | 11 | 11 | none | 0 | none found in this audit. |
| 16 | `ticker.*` | 9 | 9 | none | 0 | none found in this audit. |
| 17 | `session.*` | 9 | 9 | none | 0 | none found in this audit. Runtime values depend on host-provided session classification data. |
| 18 | `linefill.*` | 7 | 9 | none | 0 | none found in this audit. Extra committed names are local extensions. |
| 19 | `chart.point.*` | 5 | 5 | none | 0 | none found in this audit. |
| 20 | `polyline.*` | 3 | 4 | none | 0 | none found in this audit. Extra committed name: `polyline.copy`. |

## Adjacent Official Surface Not In Requested Table

| Namespace | Official documented surface | TealScript committed surface | Missing official members | Reason already recorded |
| --- | ---: | ---: | --- | --- |
| `syminfo.*` | 40 | 41 | `syminfo.recommendations_buy`, `syminfo.recommendations_buy_strong`, `syminfo.recommendations_hold`, `syminfo.recommendations_sell`, `syminfo.recommendations_sell_strong`, `syminfo.recommendations_total` | Requires host/provider recommendation series. `syminfo.recommendations_date` is implemented. |
| `dividends.*` / `earnings.*` provider fields | 7 | 0 | `dividends.future_amount`, `dividends.future_ex_date`, `dividends.future_pay_date`, `earnings.future_eps`, `earnings.future_period_end_time`, `earnings.future_revenue`, `earnings.future_time` | Requires forecast/future provider series and a freshness contract. |

## Evidence Notes

- The committed signature inventory has no missing or mismatched documented signatures for the requested namespaces. `checker.test.ts` already gates this with coverage helpers over `PINE_V6_REFERENCE_SIGNATURES`.
- `strategy.exit()` accepts the official `oca_name` argument in the checker and runtime binding list, but `execute.ts` computes `const ocaName = suffixOrders ? (fromEntry === undefined ? id : \`${fromEntry}:${id}\`) : undefined;`, so the user-supplied `oca_name` does not determine the OCA group for generated bracket exits.
- `strategy()` declaration extraction stores `margin_long`, `margin_short`, `calc_on_order_fills`, `risk_free_rate`, and `fill_orders_on_standard_ohlc` into `StrategyLedgerSettings`; source search shows those settings are not consumed outside default/storage paths. `process_orders_on_close`, `calc_on_every_tick`, `use_bar_magnifier`, `backtest_fill_limits_assumption`, and `close_entries_rule` are consumed.
- Point-series request builtins accept `lookahead` in the semantic checker and runtime arg list. `requestPointSeriesSpec()` returns `{ family, key, gaps, ignoreInvalid }`, and `requestPointSeries()` calls `mergeRequestSeriesValue(..., spec.gaps)` with no `lookahead` input, so the documented argument has no runtime effect for `request.dividends`, `request.earnings`, and `request.splits`.

No implementation was started from this audit.
