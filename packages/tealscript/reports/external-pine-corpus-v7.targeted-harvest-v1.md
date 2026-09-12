> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V7 Targeted Harvest V1

Date: 2026-09-11

## Answer First

V7 reaches 75/75 of the historical previously-untouched members from `pine-corpus-member-map-v1.json` (100.00%).

None of that historical 75-member harvest spec remains untouched after V7.

The current value-vector index has since reduced the live untouched denominator to 32/861, so this report is a historical-spec delta, not a replacement for the current vector-expanded member map.

This harvest was stopped at evidence rather than volume: 456 accepted v5/v6 scripts were enough to hit every historical target, and padding to 1,000 with more already-settled members would not add useful acceptance evidence.

## Basis

- Manifest: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-corpus/packages/tealscript/reports/external-pine-corpus-v7.manifest.json`.
- Method: `github-code-search-v7-targeted-untouched-members`; exact GitHub code-search queries for the 75 members from `pine-corpus-member-map-v1.json`.
- Source exclusions: 3113 repo/path pairs from v3-v6, so v7 measures new source references rather than reusing earlier corpora.
- Pinning: each accepted row records repo URL, source path, latest path commit SHA, normalized source SHA-256, declared Pine version, and declaration kind.
- Member-delta method: explicit references after stripping `//` comments and double-quoted strings, matching `pine-corpus-member-map-v1`.

## Harvest Funnel

- Accepted scripts: 456/1000.
- Repositories: 109.
- Declared versions: {"5":214,"6":242}.
- Declaration kinds: {"indicator":318,"strategy":132,"library":6}.

## Delta Against The 75

- Previously untouched members reached by v7: 75/75 (100.00%).
- Still untouched after v7: 0.

Reached:

- `array.abs`
- `array.every`
- `array.percentile_nearest_rank`
- `box.set_text_font_family`
- `box.set_text_formatting`
- `box.set_text_wrap`
- `box.set_xloc`
- `chart.point.copy`
- `display.pine_screener`
- `dividends.future_amount`
- `dividends.future_ex_date`
- `dividends.future_pay_date`
- `earnings.future_period_end_time`
- `footprint.buy_volume`
- `footprint.delta`
- `footprint.get_row_by_price`
- `footprint.poc`
- `footprint.rows`
- `footprint.sell_volume`
- `footprint.total_volume`
- `footprint.vah`
- `footprint.val`
- `label.set_text_font_family`
- `label.set_text_formatting`
- `label.style_cross`
- `line.set_first_point`
- `line.set_second_point`
- `math.rphi`
- `matrix.eigenvalues`
- `matrix.eigenvectors`
- `matrix.is_identity`
- `matrix.is_square`
- `matrix.is_symmetric`
- `matrix.median`
- `matrix.pinv`
- `matrix.remove_col`
- `matrix.sum`
- `matrix.swap_columns`
- `plot.linestyle_solid`
- `request.footprint`
- `request.quandl`
- `scale.left`
- `strategy.closedtrades.entry_comment`
- `strategy.closedtrades.first_index`
- `strategy.closedtrades.max_drawdown_percent`
- `strategy.closedtrades.max_runup_percent`
- `strategy.direction.all`
- `strategy.direction.short`
- `strategy.margin_liquidation_price`
- `strategy.oca.none`
- `strategy.opentrades.commission`
- `strategy.opentrades.entry_comment`
- `strategy.opentrades.max_drawdown_percent`
- `strategy.opentrades.max_runup_percent`
- `strategy.risk.max_cons_loss_days`
- `syminfo.minmove`
- `syminfo.recommendations_buy`
- `syminfo.recommendations_buy_strong`
- `syminfo.recommendations_date`
- `syminfo.recommendations_hold`
- `syminfo.recommendations_sell`
- `syminfo.recommendations_sell_strong`
- `syminfo.recommendations_total`
- `text.format_none`
- `text.wrap_auto`
- `text.wrap_none`
- `volume_row.buy_volume`
- `volume_row.delta`
- `volume_row.down_price`
- `volume_row.has_buy_imbalance`
- `volume_row.has_sell_imbalance`
- `volume_row.sell_volume`
- `volume_row.total_volume`
- `volume_row.up_price`
- `weekofyear`

Still untouched:

- none

## Fixture Profile Measurements

- Daily-standard profile: parse 436/456 (95.61%), semantic 329/456 (72.15%), compile 329/456 (72.15%), execute 300/456 (65.79%), raw output 293/456 (64.25%), achievable output 293/401 (73.07%); validity {"corpus-hygiene":3,"invalid-pine":21,"supported":299,"tealscript-gap":102,"unsupported-by-design":31}.
- Context-stress profile: parse 435/456 (95.39%), semantic 328/456 (71.93%), compile 328/456 (71.93%), execute 299/456 (65.57%), raw output 292/456 (64.04%), achievable output 292/401 (72.82%); validity {"corpus-hygiene":3,"invalid-pine":21,"supported":298,"tealscript-gap":103,"unsupported-by-design":31}.

## Output-Property Audit Shape

- Daily profile produces output for 293/456 V7 rows; those rows are the immediate pool for trace-free all-NaN, constant-series, impossible-finite, and bounded-output checks.
- Context-stress profile produces output for 292/456 V7 rows, giving the property audit a second chart-context probe without TradingView traces.
- Target namespaces deliberately include bounded/value-shaped surfaces (`ta`-adjacent public scripts, matrix/array numeric helpers, footprint/volume-row objects, strategy trade ledgers, and metadata/request surfaces), but this harvest report does not adjudicate output correctness.

## Member Hit Map

| Member | V7 source hits | Sample rows |
| --- | ---: | --- |
| `array.abs` | 26 | `sources/0001__folknor-pine-tools__coverage-map-array.pine`, `sources/0002__helenananaa-pine-compat-runtime__supported_array_abs_same_as_arg_return_qualifier.pine`, `sources/0003__folknor-pine-tools__INV147-generic-overload-return.pine`, `sources/0004__helenananaa-pine-compat-runtime__unsupported_array_abs_same_as_arg_return_qualifier.pine` |
| `array.every` | 17 | `sources/0001__folknor-pine-tools__coverage-map-array.pine`, `sources/0011__ferranbt-pinecone__array_more.pine`, `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine` |
| `array.percentile_nearest_rank` | 41 | `sources/0001__folknor-pine-tools__coverage-map-array.pine`, `sources/0009__helenananaa-pine-compat-runtime__builtin_array_call_result_reads.pine`, `sources/0023__helenananaa-pine-compat-runtime__array_statistics.pine`, `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine` |
| `box.set_text_font_family` | 11 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0073__cvladan-trading-svko-pinescripts__SVKO_CFD_NQ-ES_Levels.pine` |
| `box.set_text_formatting` | 4 | `sources/0075__folknor-pine-tools__coverage-drawing-setters.pine`, `sources/0076__helenananaa-pine-compat-runtime__box_mutation.pine`, `sources/0077__helenananaa-pine-compat-runtime__box_control_flow.pine`, `sources/0081__ferranbt-pinecone__drawing_point_setters.pine` |
| `box.set_text_wrap` | 7 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0075__folknor-pine-tools__coverage-drawing-setters.pine` |
| `box.set_xloc` | 4 | `sources/0075__folknor-pine-tools__coverage-drawing-setters.pine`, `sources/0076__helenananaa-pine-compat-runtime__box_mutation.pine`, `sources/0077__helenananaa-pine-compat-runtime__box_control_flow.pine`, `sources/0083__jpantsjoha-pinescript-vscode-extension__modern-api-strategy.pine` |
| `chart.point.copy` | 16 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0084__deepentropy-lightweight-charts-indicators__Auto-Pitchfork.pine` |
| `display.pine_screener` | 2 | `sources/0097__regalouisei-collect-tradingview__digital-macd-divergences-mtf-lupen.pine`, `sources/0098__folknor-pine-tools__coverage-vars-consts.pine` |
| `dividends.future_amount` | 5 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0098__folknor-pine-tools__coverage-vars-consts.pine` |
| `dividends.future_ex_date` | 5 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0098__folknor-pine-tools__coverage-vars-consts.pine` |
| `dividends.future_pay_date` | 4 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0098__folknor-pine-tools__coverage-vars-consts.pine` |
| `earnings.future_period_end_time` | 4 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0098__folknor-pine-tools__coverage-vars-consts.pine` |
| `footprint.buy_volume` | 3 | `sources/0101__DarthBuddha-TradingView__MoneyFlow.pine`, `sources/0102__DarthBuddha-TradingView__BuddhaMoneyFlow.pine`, `sources/0103__folknor-pine-tools__coverage-footprint.pine` |
| `footprint.delta` | 4 | `sources/0101__DarthBuddha-TradingView__MoneyFlow.pine`, `sources/0102__DarthBuddha-TradingView__BuddhaMoneyFlow.pine`, `sources/0103__folknor-pine-tools__coverage-footprint.pine`, `sources/0106__ferranbt-pinecone__no_feed.pine` |
| `footprint.get_row_by_price` | 1 | `sources/0103__folknor-pine-tools__coverage-footprint.pine` |
| `footprint.poc` | 4 | `sources/0101__DarthBuddha-TradingView__MoneyFlow.pine`, `sources/0102__DarthBuddha-TradingView__BuddhaMoneyFlow.pine`, `sources/0103__folknor-pine-tools__coverage-footprint.pine`, `sources/0106__ferranbt-pinecone__no_feed.pine` |
| `footprint.rows` | 4 | `sources/0101__DarthBuddha-TradingView__MoneyFlow.pine`, `sources/0102__DarthBuddha-TradingView__BuddhaMoneyFlow.pine`, `sources/0103__folknor-pine-tools__coverage-footprint.pine`, `sources/0107__303webhouse-pandoras-box__trojan_horse_footprint_v2.pine` |
| `footprint.sell_volume` | 3 | `sources/0101__DarthBuddha-TradingView__MoneyFlow.pine`, `sources/0102__DarthBuddha-TradingView__BuddhaMoneyFlow.pine`, `sources/0103__folknor-pine-tools__coverage-footprint.pine` |
| `footprint.total_volume` | 3 | `sources/0101__DarthBuddha-TradingView__MoneyFlow.pine`, `sources/0102__DarthBuddha-TradingView__BuddhaMoneyFlow.pine`, `sources/0103__folknor-pine-tools__coverage-footprint.pine` |
| `footprint.vah` | 3 | `sources/0101__DarthBuddha-TradingView__MoneyFlow.pine`, `sources/0102__DarthBuddha-TradingView__BuddhaMoneyFlow.pine`, `sources/0103__folknor-pine-tools__coverage-footprint.pine` |
| `footprint.val` | 3 | `sources/0101__DarthBuddha-TradingView__MoneyFlow.pine`, `sources/0102__DarthBuddha-TradingView__BuddhaMoneyFlow.pine`, `sources/0103__folknor-pine-tools__coverage-footprint.pine` |
| `label.set_text_font_family` | 9 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0075__folknor-pine-tools__coverage-drawing-setters.pine` |
| `label.set_text_formatting` | 4 | `sources/0075__folknor-pine-tools__coverage-drawing-setters.pine`, `sources/0081__ferranbt-pinecone__drawing_point_setters.pine`, `sources/0112__helenananaa-pine-compat-runtime__label_mutation.pine`, `sources/0113__helenananaa-pine-compat-runtime__label_control_flow.pine` |
| `label.style_cross` | 15 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0117__regalouisei-collect-tradingview__filtered-tema-crossover.pine` |
| `line.set_first_point` | 16 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0081__ferranbt-pinecone__drawing_point_setters.pine` |
| `line.set_second_point` | 17 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0081__ferranbt-pinecone__drawing_point_setters.pine` |
| `math.rphi` | 8 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0098__folknor-pine-tools__coverage-vars-consts.pine` |
| `matrix.eigenvalues` | 22 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0031__helenananaa-pine-compat-runtime__builtin_namespace_array_call_result_reads.pine` |
| `matrix.eigenvectors` | 18 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0142__MeridianAlgo-Pine-A-Script__Singular_Spectrum_Decomposition_LuxAlgo.pine` |
| `matrix.is_identity` | 8 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0159__folknor-pine-tools__coverage-matrix-uncovered.pine` |
| `matrix.is_square` | 8 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0159__folknor-pine-tools__coverage-matrix-uncovered.pine` |
| `matrix.is_symmetric` | 9 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0155__helenananaa-pine-compat-runtime__matrix_int.pine` |
| `matrix.median` | 10 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0159__folknor-pine-tools__coverage-matrix-uncovered.pine` |
| `matrix.pinv` | 15 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0153__helenananaa-pine-compat-runtime__supported_matrix_fixed_float_collection_return_qualifier.pine` |
| `matrix.remove_col` | 16 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0159__folknor-pine-tools__coverage-matrix-uncovered.pine` |
| `matrix.sum` | 18 | `sources/0003__folknor-pine-tools__INV147-generic-overload-return.pine`, `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine` |
| `matrix.swap_columns` | 13 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0159__folknor-pine-tools__coverage-matrix-uncovered.pine` |
| `plot.linestyle_solid` | 10 | `sources/0098__folknor-pine-tools__coverage-vars-consts.pine`, `sources/0216__wjc0712h-forex-tradingview__maribbon.pine`, `sources/0217__sritradingnse-debug-pine01__BB_HTF_30.pine`, `sources/0218__sritradingnse-debug-pine01__BB_HTF_60.pine` |
| `request.footprint` | 36 | `sources/0101__DarthBuddha-TradingView__MoneyFlow.pine`, `sources/0102__DarthBuddha-TradingView__BuddhaMoneyFlow.pine`, `sources/0103__folknor-pine-tools__coverage-footprint.pine`, `sources/0104__kantomu-prm__keltner_footprint_fusion.pine` |
| `request.quandl` | 10 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0058__regalouisei-collect-tradingview__portfolio-laboratory-kioseff-trading.pine` |
| `scale.left` | 18 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0254__deepentropy-lightweight-charts-indicators__Global-Liquidity-Index.pine` |
| `strategy.closedtrades.entry_comment` | 11 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0269__Sachingkrishna-smc-v16-indicator__smtDivergenceStrategy.pine` |
| `strategy.closedtrades.first_index` | 7 | `sources/0270__folknor-pine-tools__coverage-strategy-uncovered.pine`, `sources/0277__helenananaa-pine-compat-runtime__supported_strategy_trade_counts.pine`, `sources/0278__helenananaa-pine-compat-runtime__strategy_trade_counts.pine`, `sources/0279__helenananaa-pine-compat-runtime__unsupported_strategy_state_mutation.pine` |
| `strategy.closedtrades.max_drawdown_percent` | 9 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0270__folknor-pine-tools__coverage-strategy-uncovered.pine` |
| `strategy.closedtrades.max_runup_percent` | 9 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0270__folknor-pine-tools__coverage-strategy-uncovered.pine` |
| `strategy.direction.all` | 29 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0284__deepentropy-lightweight-charts-indicators__Bollinger-Bands-Strategy-directed.pine` |
| `strategy.direction.short` | 32 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0284__deepentropy-lightweight-charts-indicators__Bollinger-Bands-Strategy-directed.pine` |
| `strategy.margin_liquidation_price` | 11 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0270__folknor-pine-tools__coverage-strategy-uncovered.pine` |
| `strategy.oca.none` | 13 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0270__folknor-pine-tools__coverage-strategy-uncovered.pine` |
| `strategy.opentrades.commission` | 15 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0281__helenananaa-pine-compat-runtime__unsupported_request_strategy_state.pine` |
| `strategy.opentrades.entry_comment` | 10 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0270__folknor-pine-tools__coverage-strategy-uncovered.pine` |
| `strategy.opentrades.max_drawdown_percent` | 9 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0270__folknor-pine-tools__coverage-strategy-uncovered.pine` |
| `strategy.opentrades.max_runup_percent` | 9 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0270__folknor-pine-tools__coverage-strategy-uncovered.pine` |
| `strategy.risk.max_cons_loss_days` | 13 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0303__sysvar-pine-script-template__template.pine` |
| `syminfo.minmove` | 7 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0098__folknor-pine-tools__coverage-vars-consts.pine` |
| `syminfo.recommendations_buy` | 4 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0098__folknor-pine-tools__coverage-vars-consts.pine` |
| `syminfo.recommendations_buy_strong` | 4 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0098__folknor-pine-tools__coverage-vars-consts.pine` |
| `syminfo.recommendations_date` | 4 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0098__folknor-pine-tools__coverage-vars-consts.pine` |
| `syminfo.recommendations_hold` | 4 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0098__folknor-pine-tools__coverage-vars-consts.pine` |
| `syminfo.recommendations_sell` | 4 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0098__folknor-pine-tools__coverage-vars-consts.pine` |
| `syminfo.recommendations_sell_strong` | 4 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0098__folknor-pine-tools__coverage-vars-consts.pine` |
| `syminfo.recommendations_total` | 5 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0098__folknor-pine-tools__coverage-vars-consts.pine` |
| `text.format_none` | 11 | `sources/0074__cvladan-trading-svko-pinescripts__SVKO_Info.pine`, `sources/0075__folknor-pine-tools__coverage-drawing-setters.pine`, `sources/0113__helenananaa-pine-compat-runtime__label_control_flow.pine`, `sources/0259__ferranbt-pinecone__const_namespaces.pine` |
| `text.wrap_auto` | 22 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0076__helenananaa-pine-compat-runtime__box_mutation.pine` |
| `text.wrap_none` | 10 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0073__cvladan-trading-svko-pinescripts__SVKO_CFD_NQ-ES_Levels.pine` |
| `volume_row.buy_volume` | 2 | `sources/0103__folknor-pine-tools__coverage-footprint.pine`, `sources/0106__ferranbt-pinecone__no_feed.pine` |
| `volume_row.delta` | 3 | `sources/0101__DarthBuddha-TradingView__MoneyFlow.pine`, `sources/0102__DarthBuddha-TradingView__BuddhaMoneyFlow.pine`, `sources/0103__folknor-pine-tools__coverage-footprint.pine` |
| `volume_row.down_price` | 3 | `sources/0101__DarthBuddha-TradingView__MoneyFlow.pine`, `sources/0102__DarthBuddha-TradingView__BuddhaMoneyFlow.pine`, `sources/0103__folknor-pine-tools__coverage-footprint.pine` |
| `volume_row.has_buy_imbalance` | 5 | `sources/0101__DarthBuddha-TradingView__MoneyFlow.pine`, `sources/0102__DarthBuddha-TradingView__BuddhaMoneyFlow.pine`, `sources/0103__folknor-pine-tools__coverage-footprint.pine`, `sources/0106__ferranbt-pinecone__no_feed.pine` |
| `volume_row.has_sell_imbalance` | 4 | `sources/0101__DarthBuddha-TradingView__MoneyFlow.pine`, `sources/0102__DarthBuddha-TradingView__BuddhaMoneyFlow.pine`, `sources/0103__folknor-pine-tools__coverage-footprint.pine`, `sources/0107__303webhouse-pandoras-box__trojan_horse_footprint_v2.pine` |
| `volume_row.sell_volume` | 1 | `sources/0103__folknor-pine-tools__coverage-footprint.pine` |
| `volume_row.total_volume` | 1 | `sources/0103__folknor-pine-tools__coverage-footprint.pine` |
| `volume_row.up_price` | 3 | `sources/0101__DarthBuddha-TradingView__MoneyFlow.pine`, `sources/0102__DarthBuddha-TradingView__BuddhaMoneyFlow.pine`, `sources/0103__folknor-pine-tools__coverage-footprint.pine` |
| `weekofyear` | 86 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine`, `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine`, `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine`, `sources/0115__agejevasv-tradingview__marketprofile.pine` |
