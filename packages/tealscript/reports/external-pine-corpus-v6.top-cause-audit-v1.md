> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V6 Top Cause Audit V1

Source dispatch: `external-pine-corpus-v6.remaining-gap-dispatch-v1.md`.
Measurement commit: `94cae779898ba55e04e67df644e6025f7e281251`.
Corpus: `packages/tealscript/.cache/tealscript/pine-corpus-v6-20260911`.

This audit checks the three largest raw v6 buckets before handing work to
implementation. Raw bucket counts are not implementation queues: v5 already
showed that parse and output buckets can be dominated by invalid source,
harvest artifacts, and fixture context.

## Summary

| Bucket | Raw rows | Real TealScript gaps | Not ours / not dispatchable | Finding |
| --- | ---: | ---: | ---: | --- |
| `parse:unexpected-token` | 50 | 24 | 26 | No literal `...` rows survived the harvester filter; the largest real parser gap is comma-chained reassignment/call statements. |
| `output:conditional-or-data-gated-output-not-triggered` | 35 | 0 proven | 35 | A third 8,000-bar volatile intraday/session/volume profile recovered none: 34 stayed silent and 1 timed out. Do not dispatch as engine bugs without targeted per-script trigger fixtures. |
| `semantic:type-mismatch` | 12 | 1 | 11 | Only `chart.point.price` is a TealScript typing gap; the other 11 are correct refusals against Pine typing, argument, or declaration rules. |

## Parse Unexpected Token

Result: 24 real parser gaps, 26 not ours.

Literal elision check: 0 of 50 contain the standalone literal `...` pattern
that the v5 harvester defect admitted. The v6 harvest rejection worked for this
bucket.

### Real Parser Gaps

| Cause | Rows | Representative |
| --- | ---: | --- |
| Comma-chained reassignment/declaration/call side effects | 16 | `sources/0335__itmakesyousick-HTF-Candles-Pivots__Next.pine` |
| Typed `for` counter declarations | 2 | `sources/0293__regalouisei-collect-tradingview__trendflex-oscillator-dr-john-ehlers.pine` |
| Wrapped expression continuation parsed as a new statement | 1 | `sources/0144__regalouisei-collect-tradingview__superrsi-enhanced-momentum.pine` |
| Method parameter list after UDT parameter plus typed array parameter | 1 | `sources/0382__helenananaa-pine-compat-runtime__user_methods.pine` |
| `for index, item in array` destructuring | 1 | `sources/0442__helenananaa-pine-compat-runtime__user_type_array_scalar_tree_helpers.pine` |
| Signed switch-arm literal | 1 | `sources/0551__Electrified-Trading-Indicators__MACD-Duo.pine` |
| Official-library syntax form not accepted | 1 | `sources/0983__deepentropy-lightweight-charts-indicators__TechnicalRating-v3.pine` |
| Unclassified parser gap, likely loop bound method-call context | 1 | `sources/0410__AubakirovArman-SaltanatbotV2__4-fundamentals-graphing.pine` |

Dispatch these 24 rows. The 16-row comma-chain class is the first parser target.

### Not Ours

| Cause | Rows | Representative | Reason |
| --- | ---: | --- | --- |
| Non-ASCII layout whitespace in syntax | 10 | `sources/0461__deepentropy-lightweight-charts-indicators__Realtime-Footprint.pine` | Full-width or non-breaking spaces appear where Pine syntax requires ordinary layout. Treat as harvest/copy artifact unless a TradingView trace proves otherwise. |
| Raw newline inside quoted single-line string | 7 | `sources/0270__g-moe-Trading-Indicators__csw-sentiment-line.pine` | TradingView string docs distinguish single-line strings from triple-quoted multiline strings; arbitrary raw newlines inside a quoted string are not valid source. |
| JavaScript syntax harvested as Pine | 4 | `sources/0845__raybird-pine-trading-strategies__TnSovereignScalpingProV6.pine` | Rows use JS separators/operators such as `;` or `||`. |
| Prompt/prose harvested as Pine | 2 | `sources/0188__trsdn-meta-strategy__ai-rsi.pine` | AI prompt text, not standalone Pine source. |
| Invalid `switch` default `=> break` | 1 | `sources/0423__regalouisei-collect-tradingview__monte-carlo-polyline-traceback-kioseff-trading.pine` | A switch arm returns an expression; `break` is a loop statement. |
| Unsupported JS callback syntax | 1 | `sources/0496__alboogycOdR-dev-projects__v0.7.0-0801DST_ALERTS-V0.7.0.pine` | `function(a, b) ...` callback syntax is not Pine. |
| Invalid switch-arm block indentation | 1 | `sources/0520__quant5-lab-runner__test-switch-indent-3case-7body.pine` | The arm body is written as a statement block rather than an expression/continuation. |

Reference: TradingView string literals and multiline strings are documented in
the official strings page:
`https://www.tradingview.com/pine-script-docs/concepts/strings/`.

## Data-Gated Output

Result: 0 recovered, 34 still silent, 1 timeout.

Probe: each of the 35 dispatch rows was run in isolation against an 8,000-bar
stress profile with intraday timestamps, regular session boundaries, large
price swings, gaps, volume spikes, and longer history than both committed
profiles. The aggregate all-row run wedged before producing an artifact, so the
final probe used per-row processes with a 45-second timeout.

Scratch artifact:
`packages/tealscript/.cache/tealscript/pine-corpus-v6-20260911/top-cause-audit/data-gated-gate-stress-summary.json`.

| Result | Rows | Meaning |
| --- | ---: | --- |
| Stayed `output:conditional-or-data-gated-output-not-triggered` | 34 | The stronger generic profile still did not satisfy the script gates. This is not evidence of an engine bug; it means the row needs a targeted trigger fixture or correct-silence adjudication. |
| Timed out | 1 | `sources/0339__deepentropy-oakscriptJS__ICT-Algorithmic-Macro-Tracker-Open-Source-by-toodegrees.pine`; this is a stress-profile performance/scale finding, not an output correctness finding. |
| Recovered output | 0 | No rows can be reclassified as fixture-input gaps solely from the generic third profile. |

Dependency shape among the 35 rows:

| Dependency class | Rows |
| --- | ---: |
| Strategy order gates | 23 |
| Session/time gates | 23 |
| Drawing creation gates | 13 |
| Pivot/swing gates | 7 |
| Last-bar/barstate gates | 6 |
| Volume gates | 4 |
| Request-context gates | 3 |
| Alert gates | 2 |

Do not hand this bucket to implementation as 35 TealScript gaps. The next useful
step is targeted fixtures for representative strategy/session, drawing/pivot,
and library/export rows. A generic third profile did not settle them.

## Type Mismatch

Result: 1 real TealScript gap, 11 correct refusals.

### Real Gap

| Row | Construct | Rule |
| --- | --- | --- |
| `sources/0846__Borisder1-skalpel__SMC_Agent_v6.pine` | Assigns `self.breakoutPoint.price` to `float yBreak`. | `chart.point.price` is the point's price coordinate and is a `series float`; TealScript currently types it as `chart.point`. |

Reference: TradingView's v6 reference for `chart.point.price` documents
`price` as a `series float` y-coordinate:
`https://www.tradingview.com/pine-script-reference/v6/#var_chart.point.price`.

### Correct Refusals / Not Ours

| Cause | Rows | Representative | Rule |
| --- | ---: | --- | --- |
| Deliberately wrong builtin argument types | 2 | `sources/0086__folknor-pine-tools__INV183-plain-param-expected-noun.pine` | `ta.highest` length, `math.round` precision, and `str.length` source types must match documented parameter types. |
| v6 boolean `na()` / bool-as-`na` misuse | 1 | `sources/0087__folknor-pine-tools__INV184-format-tail-poisoned-call.pine` | v6 booleans cannot be `na`; the migration guide removed tri-state bool behavior. |
| Float passed where string is required | 1 | `sources/0163__folknor-pine-tools__INV182-user-variable-qualifier.pine` | `str.length()` requires a string argument. |
| Float value assigned to `int` array | 1 | `sources/0223__DemasJ2k-Strategies-Indicators__flowrex_tradingview_indicator.pine` | Pine does not implicitly cast float values to int storage. |
| Invalid table position enum | 1 | `sources/0284__jfernandogg-pinescript_ind_estrat__stock_valuation_matrix.pine` | `position.middle` is not one of the documented table positions. |
| Mixed UDT element type in array mutation | 3 | `sources/0376__helenananaa-pine-compat-runtime__unsupported_array_set_mixed_udt.pine` | An array created from `Point` values cannot accept `Marker` values. |
| Invalid plot style enum | 1 | `sources/0617__caizongxun-bb-channel-ai-predictor__bb_predictor_final.pine` | `plot.style_dashed` is not a documented `plot()` style. |
| `strategy.exit()` without any exit price/profit/loss/trailing parameter | 1 | `sources/0737__zelosleone-pinescript-vsc-server-rust__subtle_logic_error_suite.pine` | `strategy.exit()` must specify an exit condition such as limit, stop, profit, loss, or trailing-stop parameters. |
| `input.float()` default below `minval` | 1 | `sources/0848__Finnlayy-ai_trading_jules_prompt_pack__Top1_HYPEUSDT_GA_CrossAlgo_Optimized.pine` | Input constraints require the default value to satisfy its declared minimum. |

References:
- Type system and numeric casting:
  `https://www.tradingview.com/pine-script-docs/language/type-system/`
- v6 boolean changes:
  `https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/`
- Strategy exits:
  `https://www.tradingview.com/pine-script-docs/concepts/strategies/`
- Tables and positions:
  `https://www.tradingview.com/pine-script-docs/visuals/tables/`

## Dispatch

Hand to zx4rrg:

- Parser: 24 rows, led by the 16-row comma-chained reassignment/call class.
- Semantics: 1 row, `chart.point.price` field typing.

Do not hand over as engine work yet:

- Data-gated output: 35 rows. The generic third profile did not recover them,
  but it also did not prove engine ownership. Treat this as targeted fixture
  work first.
- Type-mismatch correct refusals: 11 rows. These should move out of the
  TealScript-gap denominator if the audit owner agrees.
