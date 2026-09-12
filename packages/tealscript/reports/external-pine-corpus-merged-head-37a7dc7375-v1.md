# External Pine Corpus Merged-Head Rerun v1

Date: 2026-09-12

Measurement commit: `37a7dc7375`

Baseline commit: `8db55d66ae`

Raw reports:

- `external-pine-corpus-v5.daily-rerun-37a7dc7375.json`
- `external-pine-corpus-v6.daily-rerun-37a7dc7375.json`
- `external-pine-corpus-v7.daily-rerun-37a7dc7375.json`

## Headline

The merged tree moved from `1959/2260` achievable output rows to `1949/2260`:
net `-10`.

That net is not one movement. It is `15` output-to-non-output transitions offset
by `5` non-output-to-output recoveries.

No unattributed regression remains. Every output-to-non-output transition maps
to an intentional refusal or documented runtime semantic correction.

| Corpus | Baseline | Current | Raw output | Achievable output | Produced -> non-output | Non-output -> produced |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| v5 | `8db55d66ae` | `37a7dc7375` | `867/1000 -> 866/1000` (`-1`) | `867/925 -> 866/925` (`-1`) | 1 | 0 |
| v6 | `8db55d66ae` | `37a7dc7375` | `787/1000 -> 776/1000` (`-11`) | `787/935 -> 776/935` (`-11`) | 12 | 1 |
| v7 | `8db55d66ae` | `37a7dc7375` | `305/456 -> 307/456` (`+2`) | `305/400 -> 307/400` (`+2`) | 2 | 4 |
| Total |  |  | `1959/2456 -> 1949/2456` (`-10`) | `1959/2260 -> 1949/2260` (`-10`) | 15 | 5 |

## Output Drops

| Cause | Rows | Verdict |
| --- | ---: | --- |
| TA `simple` qualifier enforcement | 10 | Correct refusals. The earlier blast-radius report predicted 6; all 6 materialized and 4 additional series-length rows were exposed, so the estimate undercounted the actual blast radius by 40%. |
| v5 untyped `= na` version rule | 2 | Correct refusals under declared v5. Introduced by `bff8ee1203`; TradingView's v5 variable-declaration docs reject an untyped declaration initialized only with `na` because `na` has no determinate type, and show explicit type/cast forms instead. |
| `array.percentile_*` percentage type checking | 2 | Correct refusals: string percentage arguments now fail before runtime. |
| `matrix.concat()` non-mutation/runtime matrix bounds | 1 | Correct semantic/runtime fallout from the documented return-value behavior. Confirmed shape: the script calls `matrix.concat(c1, c2)` as a bare statement, then reads row 1 from `c1`; because `matrix.concat()` returns a matrix value rather than mutating `c1`, `c1` remains one row and row 1 is out of bounds. |

TA qualifier rows:

- v5 `sources/0758__palitojendthen-pinescript__adaptive_mfi.pine`
- v6 `sources/0170__helenananaa-pine-compat-runtime__supported_const_selector_switch_statement_reassignment_qualifier.pine`
- v6 `sources/0416__kantomu-prm__STRICT_RSI.pine`
- v6 `sources/0425__regalouisei-collect-tradingview__langlands-operadic-m-bius-vortex-lomv.pine`
- v6 `sources/0557__tripolskypetr-backtest-kit__feb_2026.pine`
- v6 `sources/0586__helenananaa-pine-compat-runtime__weighted_averages_dynamic_length.pine`
- v6 `sources/0626__agutinbaigo28-trading-backtest-kit__feb_2026.pine`
- v6 `sources/0985__deepentropy-lightweight-charts-indicators__ta-v10.pine`
- v6 `sources/0993__deepentropy-oakscriptJS__ta-v12.pine`
- v7 `sources/0258__JasonTeixeira-Nexural_Automation__NexTransform.pine`

The six rows predicted in
`semantic-argument-qualifier-blast-radius-v1.md` are included in that list:
v6 `0416`, `0425`, `0557`, `0586`, `0626`, and v7 `0258`. The four extra rows
are genuine series-where-simple cases found by the actual rerun, so the
prediction was directionally right but undercounted the blast radius. Treat
future blast-radius samples as lower bounds, not forecasts.

Other output drops:

- v6 `sources/0305__milocaetano-quantick__exhaustion_reversal.pine`:
  declared v5 `paint = na`.
- v6 `sources/0419__milocaetano-quantick__force_bar.pine`: declared v5
  `paint = na`.
- v6 `sources/0445__helenananaa-pine-compat-runtime__unsupported_array_percentile_linear_interpolation_percentage.pine`:
  string percentage argument.
- v7 `sources/0062__helenananaa-pine-compat-runtime__unsupported_array_percentile_nearest_rank_percentage.pine`:
  string percentage argument.
- v6 `sources/0508__ferranbt-pinecone__matrix_sort_concat.pine`: bare
  `matrix.concat(c1, c2)` followed by `matrix.row(c1, 1)`.

Evidence notes:

- The two declared-v5 untyped `= na` refusals were introduced by
  `bff8ee1203` when the version-rule table centralized
  `allowsUntypedNaDeclaration`. The affected lines are `paint = na` in v6
  rows `0305` and `0419`, both declared `//@version=5`. TradingView's v5
  variable-declaration documentation says a standalone `= na` declaration
  cannot be typed and requires an explicit type or cast:
  `https://www.tradingview.com/pine-script-docs/v5/language/variable-declarations/#initialization-with-na`.
- The `matrix.concat()` loss is a script depending on mutation: it calls
  `matrix.concat(c1, c2)` without assigning the returned matrix, then reads
  `matrix.row(c1, 1)`. The reference signature returns `matrix<type>`, and the
  standing runtime vector guards non-mutation, so the matrix-bounds refusal is
  the intended Pine-compatible outcome.

## Output Recoveries

| Cause | Rows | Attribution |
| --- | ---: | --- |
| Switch-arm arrow continuation parse support | 2 | v7 `0079` and `0080` now parse and produce drawings/alerts. |
| Extrema-bars sign/default-source fixes | 1 | v6 `0202` now triggers AVWAP drawing output after highestbars/lowestbars-derived offsets behave correctly. |
| Matrix runtime behavior | 1 | v7 `0159` now runs the coverage matrix script through to a plot. |
| `ticker.kagi(symbol, reversal)` overload | 1 | v7 `0249` now passes semantic binding and produces output. |

Recovered rows:

- v6 `sources/0202__ak2k2-Custom-AAVWAP-Pinescript__v1-source.pine`
- v7 `sources/0079__btcjon-pine__TTB_MTF_SnD.pine`
- v7 `sources/0080__btcjon-pine__TTB_MTF_SnD_strat.pine`
- v7 `sources/0159__folknor-pine-tools__coverage-matrix-uncovered.pine`
- v7 `sources/0249__folknor-pine-tools__coverage-misc-uncovered.pine`

## Specific Checks

- The predicted TA qualifier refusals materialized, and the actual run found
  four more. Actual qualifier-caused output drops: `10`; the prediction of `6`
  undercounted by `40%`, so this blast-radius method should be read as a lower
  bound rather than a forecast.
- The `request.currency_rate(..., to = ...)` parser fix recovered `0` corpus
  rows. A source scan across v5/v6/v7 found `0` such calls. The fix remains a
  real parser correction; this corpus simply has no exposure for that named
  argument shape.
- The executable default-oracle sweep does not show a distinct acceptance
  transition in this row diff. Its value impact is outside this acceptance
  measurement.
- No unattributed regression remains in this diff.

## Method

- Ran the full daily-profile v5, v6, and v7 corpora at `37a7dc7375`.
- Compared against the committed `8db55d66ae` daily-profile JSON reports by
  `localPath`.
- Counted output movement only when a row crossed the
  `produced-output-compiled` boundary.
- Attributed drops by the current failed stage and diagnostic, then source-read
  the rows where the cause was not self-evident.
