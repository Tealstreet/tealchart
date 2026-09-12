# Pine v6 Snapshot-Extra Live Review V1

Date: 2026-09-12

Measurement commit: `56777b842a+dirty`

## Purpose

Review the inverse reference-integrity queue: members or parameters TealScript
accepts through the committed v6 signature surface, but TradingView's live v6
callable reference bundle does not expose.

This is the direction that can make a script compile in TealScript and fail on
TradingView. Each row was checked against the live v6 callable bundle produced
by `scripts/report-pine-v6-reference-snapshot-integrity.ts`, not against the
committed snapshot or TealScript's checker.

## Count Correction

The routed count was 57 snapshot-extra rows. Re-measurement on the merged tree
does not reproduce that count.

After refreshing the live reference bundle and fixing two extractor false
positives, the current actionable queue is 28 rows:

- 24 local callable members absent from live callable entries.
- 4 local parameters absent from matching live callable entries.

Rows removed from the queue by instrument fixes:

- `strategy.cancel_all()` is documented by the live reference as a zero-argument
  callable. The extractor skipped live items whose `args` array was absent, so
  zero-argument functions looked missing.
- `math.avg`, `math.max`, `math.min`, `array.from`, and `str.format` variadic
  labels were storage-format mismatches. The live bundle stores names such as
  `number0, number1, ...` in one arg label; the comparison now normalizes those
  into individual names before diffing.

## Result

No row is safe to remove from TealScript on live-reference silence alone.

The remaining 28 rows are now in `pine-compile-evidence-request-v1.md` as
Priority 0S batches. Accepted on TradingView means the live callable bundle or
docs are incomplete and the row should stay. Rejected means TealScript is
over-accepting source that Pine refuses, and the corresponding checker/runtime
surface should be tightened.

`bgcolor:transp` already has separate compatibility/value evidence in the value
vector index, but the live v6 callable bundle still omits the parameter, so it
is included in the compiler request to settle source acceptance directly.

## Individual Rows

| Row | Live-reference finding | Current verdict | Compile-evidence batch |
| --- | --- | --- | --- |
| `array.new_chart_point` | No live callable entry. Live does document generic `array.new<type>(size, initial_value)` and typed helpers for other array element types. | Needs compiler evidence; do not infer from generic syntax. | P0S-B |
| `array.new_polyline` | No live callable entry. Live does document generic `array.new<type>(size, initial_value)` and typed helpers for other array element types. | Needs compiler evidence; do not infer from generic syntax. | P0S-B |
| `math.clamp` | No live callable entry. The live math namespace documents adjacent math helpers but not `math.clamp`. | Needs compiler evidence before treating this reachable helper as over-acceptance. | P0S-B |
| `math.tanh` | No live callable entry. The live math namespace documents `math.tan` but not `math.tanh`. | Needs compiler evidence before treating this reachable helper as over-acceptance. | P0S-B |
| `math.trunc` | No live callable entry. The v6 migration guide points integer-division rounding users to `math.round`, `math.floor`, or `math.ceil`, not `math.trunc`. | Needs compiler evidence before treating this reachable helper as over-acceptance. | P0S-B |
| `matrix.add_column` | No live callable entry. Live documents `matrix.add_col(id, column, array_id)`. | Needs compiler evidence; likely alias, but alias acceptance is the question. | P0S-B |
| `matrix.column` | No live callable entry. Live documents `matrix.col(id, column)` and `matrix.columns(id)`. | Needs compiler evidence; likely alias, but alias acceptance is the question. | P0S-B |
| `matrix.is_valid` | No live callable entry. Live documents the specific `matrix.is_*` shape predicates. | Needs compiler evidence before treating this reachable helper as over-acceptance. | P0S-B |
| `matrix.new_bool` | No live callable entry. Live documents generic `matrix.new<type>(rows, columns, initial_value)`. | Needs compiler evidence; do not infer typed-helper acceptance from generic syntax. | P0S-B |
| `matrix.new_color` | No live callable entry. Live documents generic `matrix.new<type>(rows, columns, initial_value)`. | Needs compiler evidence; do not infer typed-helper acceptance from generic syntax. | P0S-B |
| `matrix.new_float` | No live callable entry. Live documents generic `matrix.new<type>(rows, columns, initial_value)`. | Needs compiler evidence; do not infer typed-helper acceptance from generic syntax. | P0S-B |
| `matrix.new_int` | No live callable entry. Live documents generic `matrix.new<type>(rows, columns, initial_value)`. | Needs compiler evidence; do not infer typed-helper acceptance from generic syntax. | P0S-B |
| `matrix.new_string` | No live callable entry. Live documents generic `matrix.new<type>(rows, columns, initial_value)`. | Needs compiler evidence; do not infer typed-helper acceptance from generic syntax. | P0S-B |
| `matrix.remove_column` | No live callable entry. Live documents `matrix.remove_col(id, column)`. | Needs compiler evidence; likely alias, but alias acceptance is the question. | P0S-B |
| `ta.adx` | No live callable entry. Live documents `ta.dmi(diLength, adxSmoothing)`, whose tuple includes ADX. | Needs compiler evidence before treating this reachable helper as over-acceptance. | P0S-C |
| `ta.bar_index` | No live callable entry. Live documents the root `bar_index` variable, not a `ta.bar_index(source)` callable. | Needs compiler evidence before treating this reachable helper as over-acceptance. | P0S-C |
| `ta.covariance` | No live callable entry. Live documents `ta.correlation` and `array.covariance`; this row is a callable gap in live docs. | Needs compiler evidence before treating this reachable helper as over-acceptance. | P0S-C |
| `ta.dema` | No live callable entry. TealScript also supports `TradingView/ta/7` library `dema`; that is not evidence for root `ta.dema`. | Needs compiler evidence before treating the root callable as over-acceptance. | P0S-C |
| `ta.kst` | No live callable entry. | Needs compiler evidence before treating this reachable helper as over-acceptance. | P0S-C |
| `ta.obv` callable form | No live callable entry for a function. Pine migration docs list `ta.obv` as the v5 namespaced variable. | Needs compiler evidence for the callable form; variable use is a separate documented surface. | P0S-C |
| `ta.smma` | No live callable entry. | Needs compiler evidence before treating this reachable helper as over-acceptance. | P0S-C |
| `ta.sum` | No live callable entry. Pine v5 migration docs map legacy `sum()` to `math.sum()`. | Needs compiler evidence before treating this reachable helper as over-acceptance. | P0S-C |
| `ta.tema` | No live callable entry. TealScript also supports `TradingView/ta/7` library `tema`; that is not evidence for root `ta.tema`. | Needs compiler evidence before treating the root callable as over-acceptance. | P0S-C |
| `timeframe.to_seconds` | No live callable entry. Live documents `timeframe.in_seconds(timeframe)` and `timeframe.from_seconds(seconds)`. | Needs compiler evidence; likely alias, but alias acceptance is the question. | P0S-B |
| `bgcolor:transp` | Matching live callable omits `transp`. Earlier compatibility work treats legacy `bgcolor(transp=...)` as accepted, but the live bundle does not settle it. | Needs direct compiler evidence for v6 source acceptance. | P0S-A |
| `input.text_area:inline` | Matching live callable omits `inline`; sibling input helpers include it. | Needs compiler evidence; do not infer `input.text_area` from sibling inputs. | P0S-A |
| `str.length:source` | Matching live callable names the parameter `string`, not `source`. | Needs compiler evidence for the `source=` alias. | P0S-A |
| `str.split:source` | Matching live callable names the first parameter `string`, not `source`. | Needs compiler evidence for the `source=` alias. | P0S-A |

## Sources Consulted

- TradingView live v6 reference bundle via `report-pine-v6-reference-snapshot-integrity.ts`.
- TradingView Pine v6 reference page: https://www.tradingview.com/pine-script-reference/v6/
- TradingView Pine v5 migration guide for namespace migrations:
  https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/
