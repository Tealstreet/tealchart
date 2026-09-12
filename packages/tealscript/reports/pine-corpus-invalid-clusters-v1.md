# Pine Corpus Invalid Cluster Audit V1

Generated at 2026-09-11T12:52:10.487Z. Measured at commit `f48dfe0e63`.

## Headline

The current invalid-Pine pool contains 149 rows across 64 normalized shapes.

2 shapes are promoted to compile-evidence questions; 33 more are watch-list shapes rather than paste-queue items.

Most invalid-Pine shapes remain small or source-specific, but several repeated shapes deserve TradingView compile evidence before the invalid label is allowed to disappear into the denominator.

Most high-count clusters are either source-incomplete standalone files or deliberate runtime/domain violations. The compile-evidence set is narrower: repeated signatures where public authors or targeted fixtures may be pointing at a legal Pine acceptance shape we currently reject.

## Method

- Sources: `external-pine-corpus-v5.dispatch-routing-audit-v1.md`, `external-pine-corpus-v6.current-gap-pool-a75ebd88d7-v1.md`, `external-pine-corpus-v7.current-gap-pool-bbcbf3d220-v1.json`.
- Clustering: Rows classified invalid Pine in the current v5 dispatch audit, v6 current gap pool audit, and v7 current gap pool audit are normalized to construct/error shapes.
- Independence: Independent exposure is counted by distinct pinned source rows plus distinct GitHub owner/repo and owner names.
- Promotion rule: recommended requires a compile-evidence-shaped cluster plus at least 4 rows across at least 2 repos. watch means source-only judgement may still be worth revisiting, or the shape is acceptance-like but lacks independent-source support.

## Ranked Clusters

| Shape | Kind | Rows | Repos | Authors | Compile evidence | Corpora | Sample repos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| standalone source references undeclared identifiers | source-incomplete | 21 | 16 | 16 | not-recommended | v5 6, v6 12, v7 3 | Hugs-4-Bugs/Trading-Indicator<br>Jarvis-jpg/flask-trading-bot<br>TraderOracle/TradingView<br>alboogycOdR/dev-projects |
| v6 bool assigned na/float value | semantic | 6 | 4 | 3 | watch | v6 1, v7 5 | deepentropy/lightweight-charts-indicators<br>deepentropy/oakscriptJS<br>folknor/pine-tools<br>helenananaa/pine-compat-runtime |
| request.footprint one-argument form | semantic | 4 | 4 | 4 | recommended | v7 4 | ferranbt/pinecone<br>folknor/pine-tools<br>piecioshka/tradingview-pine-scripts<br>raybird/pine-trading-strategies |
| unknown named argument | semantic | 4 | 4 | 4 | watch | v6 4 | Alaamo7/pine-script-indicators<br>fercreek/vigil<br>helenananaa/pine-compat-runtime<br>mushroom-men-Trading/clean-litter |
| matrix.sum used as zero/one-argument aggregate | semantic | 10 | 2 | 2 | recommended | v7 10 | folknor/pine-tools<br>helenananaa/pine-compat-runtime |
| series value passed to simple UDF parameter | semantic | 5 | 3 | 3 | watch | v5 4, v6 1 | casoon/pine-scripts<br>gorx1/TradingView<br>mihakralj/pinescript |
| array index out of bounds | runtime | 3 | 3 | 3 | not-recommended | v6 3 | alboogycOdR/dev-projects<br>helenananaa/pine-compat-runtime<br>skywalker0803r/Sentinel-System |
| TA function arity misuse | semantic | 3 | 3 | 3 | not-recommended | v6 3 | cetio/indicators<br>danielbodnar/skills<br>hcindus/AOS-Brain |
| typed array element mismatch | semantic | 4 | 2 | 2 | not-recommended | v6 4 | DemasJ2k/Strategies-Indicators<br>helenananaa/pine-compat-runtime |
| camelCase strategy declaration arguments | semantic | 7 | 1 | 1 | watch | v5 7 | knectardev/pine_scripts |
| table.cell_set_text_wrap helper/member | semantic | 7 | 1 | 1 | watch | v7 7 | helenananaa/pine-compat-runtime |
| block-local variable used outside scope | semantic | 3 | 2 | 2 | watch | v7 3 | ainell-owi/LePine<br>alboogycOdR/dev-projects |
| matrix algebra requires square matrix | runtime | 3 | 2 | 2 | not-recommended | v7 3 | folknor/pine-tools<br>helenananaa/pine-compat-runtime |
| matrix column index invalid | runtime | 4 | 1 | 1 | not-recommended | v7 4 | helenananaa/pine-compat-runtime |
| v6 bool assigned float/na ternary | semantic | 4 | 1 | 1 | watch | v5 4 | knectardev/pine_scripts |
| v6 enum fields with numeric values | syntax | 4 | 1 | 1 | watch | v7 4 | raybird/pine-trading-strategies |
| duplicate same-scope value declaration | semantic | 2 | 2 | 1 | watch | v5 2 | deepentropy/lightweight-charts-indicators<br>deepentropy/oakscriptJS |
| incompatible matrix/array element type fixture | corpus-fixture | 3 | 1 | 1 | not-recommended | v7 3 | helenananaa/pine-compat-runtime |
| nested collection template type | semantic | 3 | 1 | 1 | watch | v6 3 | helenananaa/pine-compat-runtime |
| semicolon statement separators | syntax | 3 | 1 | 1 | not-recommended | v6 3 | raybird/pine-trading-strategies |
| hline price is not numeric | semantic | 2 | 1 | 1 | not-recommended | v7 2 | helenananaa/pine-compat-runtime |
| matrix.add_col dimension mismatch | runtime | 2 | 1 | 1 | not-recommended | v7 2 | helenananaa/pine-compat-runtime |
| alertcondition in local scope | semantic | 1 | 1 | 1 | not-recommended | v6 1 | mitchell-917/tradingview-pinescript-lab |
| array cleared before indexed access | runtime | 1 | 1 | 1 | not-recommended | v7 1 | quant5-lab/runner |
| array maximum size runtime constraint | runtime | 1 | 1 | 1 | not-recommended | v6 1 | helenananaa/pine-compat-runtime |
| array<float> assigned into array<bool> field | semantic | 1 | 1 | 1 | watch | v7 1 | darkforest-x/fable-trading |
| comma-chained import statements | syntax | 1 | 1 | 1 | watch | v7 1 | regalouisei/collect-tradingview |
| empty array pop runtime constraint | runtime | 1 | 1 | 1 | not-recommended | v5 1 | helenananaa/pine-compat-runtime |
| exported library parameter captured by request.security expression | semantic | 1 | 1 | 1 | watch | v5 1 | casoon/pine-scripts |
| fill() missing required third argument | semantic | 1 | 1 | 1 | watch | v7 1 | helenananaa/pine-compat-runtime |
| function-call expression used as tuple lvalue | syntax | 1 | 1 | 1 | watch | v7 1 | tibicrypto/chibao |
| generic input step argument under v5 | semantic | 1 | 1 | 1 | watch | v7 1 | mikejuliano2/pine |
| if statement uses then keyword | syntax | 1 | 1 | 1 | not-recommended | v6 1 | shevateshubham/tradingbot |
| inclusive loop reads array index at size | runtime | 1 | 1 | 1 | not-recommended | v5 1 | supertonka/tradingview-ict-indicator |
| indicator script calls strategy.entry | corpus-fixture | 1 | 1 | 1 | not-recommended | v5 1 | quant5-lab/runner |
| input.float defval below minval | semantic | 1 | 1 | 1 | not-recommended | v6 1 | Finnlayy/ai_trading_jules_prompt_pack |
| invalid table position constant | semantic | 1 | 1 | 1 | not-recommended | v5 1 | helenananaa/pine-compat-runtime |
| JavaScript-style inline callback function | syntax | 1 | 1 | 1 | not-recommended | v6 1 | alboogycOdR/dev-projects |
| malformed import fixture | corpus-fixture | 1 | 1 | 1 | not-recommended | v5 1 | ferranbt/pinecone |
| matrix loop indexes past collection bounds | runtime | 1 | 1 | 1 | not-recommended | v5 1 | mihakralj/pinescript |
| matrix power exponent invalid | runtime | 1 | 1 | 1 | not-recommended | v6 1 | helenananaa/pine-compat-runtime |
| matrix value assigned to array variable | semantic | 1 | 1 | 1 | watch | v7 1 | folknor/pine-tools |
| negative array size runtime constraint | runtime | 1 | 1 | 1 | not-recommended | v6 1 | ak2k2/Custom-AAVWAP-Pinescript |
| polyline used in declared v5 script | semantic | 1 | 1 | 1 | watch | v6 1 | helenananaa/pine-compat-runtime |
| script-authored runtime.error guard | runtime | 1 | 1 | 1 | not-recommended | v5 1 | ali-rajabpour/ARPS-Pivots |
| semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 11:23: type-mismatch: ta.highest length must be a number, got string | unknown | 1 | 1 | 1 | watch | v6 1 | folknor/pine-tools |
| semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 26:9: unknown-assignment-target: Cannot assign to undeclared identifier: gapRed | unknown | 1 | 1 | 1 | watch | v6 1 | TraderOracle/TradingView |
| semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 62:133: type-mismatch: Invalid plot style: plot.style_dashed | unknown | 1 | 1 | 1 | watch | v6 1 | caizongxun/bb-channel-ai-predictor |
| semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol; 62:35: type-mismatch: Invalid table.new position: position.middle. Use one of the position.* constants such as positi... | unknown | 1 | 1 | 1 | watch | v6 1 | jfernandogg/pinescript_ind_estrat |
| strategy.close_all when argument | semantic | 1 | 1 | 1 | watch | v7 1 | hasnocool/tradingview-pine-scripts |
| strategy.exit trail offset without trail price | semantic | 1 | 1 | 1 | not-recommended | v7 1 | taichunmin/tradingview-pine |
| strategy.exit without exit price | semantic | 1 | 1 | 1 | not-recommended | v6 1 | zelosleone/pinescript-vsc-server-rust |
| strategy.opentrades.capital_held called as function | semantic | 1 | 1 | 1 | watch | v7 1 | ferranbt/pinecone |
| syntax rejected under the row declared Pine version; 282:9: Expected "(", ")", ".", "/*", "//", "[", [ \t], or [\n\r] but "o" found. | unknown | 1 | 1 | 1 | watch | v6 1 | itmakesyousick/HTF-Candles-Pivots |
| syntax rejected under the row declared Pine version; 67:33: Pine Script uses the word operator `or`; JavaScript-style `\\|\\|` is not valid Pine syntax. | unknown | 1 | 1 | 1 | watch | v6 1 | raybird/pine-trading-strategies |
| syntax rejected under the row declared Pine version; 82:9: Pine Script has no `return` statement; a Pine function returns the value of its last expression. | unknown | 1 | 1 | 1 | watch | v6 1 | alboogycOdR/dev-projects |
| table.cell text_wrap argument | semantic | 1 | 1 | 1 | watch | v7 1 | outraday-org/chartlang |
| time_close second positional argument has wrong type | semantic | 1 | 1 | 1 | watch | v7 1 | helenananaa/pine-compat-runtime |
| tuple branch arity mismatch | semantic | 1 | 1 | 1 | not-recommended | v6 1 | deepentropy/lightweight-charts-indicators |
| unknown math.cbrt builtin | semantic | 1 | 1 | 1 | watch | v7 1 | helenananaa/pine-compat-runtime |
| unknown runtime.log builtin | semantic | 1 | 1 | 1 | watch | v6 1 | raybird/pine-trading-strategies |
| unknown strategy declaration argument | semantic | 1 | 1 | 1 | watch | v6 1 | Young666YHF/xauusd_backtest |
| v6 division float assigned to int | semantic | 1 | 1 | 1 | watch | v5 1 | mihakralj/pinescript |
| wrong argument type for builtin | semantic | 1 | 1 | 1 | not-recommended | v6 1 | folknor/pine-tools |

## Promoted Compile-Evidence Samples

| Shape | Corpus | Row | Version | Stage | Repo | Path | Diagnostic/evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| request.footprint one-argument form | v7 | 0103 | v6 | semantic | folknor/pine-tools | packages/core/test/fixtures/regression/coverage-footprint.pine | 8:24: argument-count: request.footprint() expects at least 2 arguments |
| request.footprint one-argument form | v7 | 0227 | v6 | semantic | raybird/pine-trading-strategies | strategies/stacked_imbalance_sovereign_v6.pine | 19:24: argument-count: request.footprint() expects at least 2 arguments |
| request.footprint one-argument form | v7 | 0239 | v6 | semantic | piecioshka/tradingview-pine-scripts | indicators-premium/volume/volume-delta-histogram/volume-delta-histogram.pine | 37:24: argument-count: request.footprint() expects at least 2 arguments |
| request.footprint one-argument form | v7 | 0248 | v6 | semantic | ferranbt/pinecone | tests/testdata/basics/request_data.pine | argument-count: request.footprint() expects at least 2 arguments |
| matrix.sum used as zero/one-argument aggregate | v7 | 0155 | v6 | semantic | helenananaa/pine-compat-runtime | tests/fixtures/runtime/matrix_int.pine | 177:17: argument-count: matrix.sum() expects at least 2 arguments |
| matrix.sum used as zero/one-argument aggregate | v7 | 0167 | v6 | semantic | helenananaa/pine-compat-runtime | tests/fixtures/runtime/builtin_namespace_matrix_call_result_reads.pine | argument-count: matrix.sum() expects at least 1 argument |
| matrix.sum used as zero/one-argument aggregate | v7 | 0168 | v6 | semantic | helenananaa/pine-compat-runtime | tests/fixtures/sema/supported_builtin_namespace_matrix_call_result_reads.pine | argument-count: matrix.sum() expects at least 1 argument |
| matrix.sum used as zero/one-argument aggregate | v7 | 0201 | v6 | semantic | folknor/pine-tools | packages/core/test/fixtures/regression/INV056-overload-missing-required-arg.pine | 11:19: argument-count: matrix.sum() expects at least 2 arguments |
| matrix.sum used as zero/one-argument aggregate | v7 | 0202 | v6 | semantic | helenananaa/pine-compat-runtime | tests/fixtures/sema/supported_matrix_sum.pine | 5:17: argument-count: matrix.sum() expects at least 2 arguments |

## Interpretation

- A one-row shape remains an author/source error unless other evidence appears.
- A high row count inside one synthetic/fixture repo is weaker than the same count across independent authors; it stays watch-listed unless independent-source support appears.
- Rejected compile evidence keeps these rows in invalid-Pine. Accepted compile evidence reopens the corresponding parser/semantic/runtime ownership route.
