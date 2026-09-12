> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v4 Parse Audit

This audit covers every v4 row whose first failure is `unexpected-token`. Each source was fetched from its pinned repository/path/SHA and its raw bytes matched the harvested source byte-for-byte (31/31). `harvest-artifact` maps to the report validity bucket `corpus-hygiene`.

## Split

| Verdict | Count | Meaning |
| --- | ---: | --- |
| `tealscript-gap` | 1 | Valid Pine construct rejected by the TealScript parser |
| `invalid-pine` | 19 | The exact construct is rejected by Pine syntax/semantics |
| `harvest-artifact` | 11 | Non-runnable page, merge, paywall, or repository-fixture content |
| Total | 31 | All unexpected-token rows |

## Evidence

### invalid-pine: sources/0075__somat3k-Braga-Bielany-czycus__fib_gann.pine
- Row: 0025:https://github.com/somat3k/Braga-Bielany-czycus:pinnacle_strats/04_fib_gann/fib_gann.pine
- Pinned source: https://github.com/somat3k/Braga-Bielany-czycus :: pinnacle_strats/04_fib_gann/fib_gann.pine @ a4306b8d9720e530582f207321a90cc2216bdca8
- Location: line 417
- Construct: semicolon-separated assignments
- Source line: `            hB2 = array.get(pivHBar,   2); hP2 = array.get(pivHPrice, 2)`
- Evidence: Pine statements do not use semicolon as a statement separator.

### invalid-pine: sources/0157__deepentropy-oakscriptJS__Performance.pine
- Row: 0007:https://github.com/deepentropy/oakscriptJS:docs/official/indicators_standard/Performance.pine
- Pinned source: https://github.com/deepentropy/oakscriptJS :: docs/official/indicators_standard/Performance.pine @ d7bbd272e9ba6e12bb304a4c6d83d67f57afd2a0
- Location: line 7
- Construct: raw newline inside a double-quoted string literal
- Source line: `string TT_LT = "A list of timeframe strings, separated by commas and optional spaces. A valid timeframe string contains`
- Evidence: The string opens on line 7 and continues across a physical newline before its closing quote.

### invalid-pine: sources/0187__mushroom-men-Trading-clean-litter__apo.pine
- Row: 0012:https://github.com/mushroom-men-Trading/clean-litter:Indicators/indicators/premade indicators/oscillators/apo.pine
- Pinned source: https://github.com/mushroom-men-Trading/clean-litter :: Indicators/indicators/premade indicators/oscillators/apo.pine @ 95f5f7d4bcb4e0e95cff86291bf343484842fbe6
- Location: line 23
- Construct: comma-separated reassignment statements
- Source line: `            emaFast := source, emaSlow := source, result := 0`
- Evidence: The line combines two reassignments with a comma instead of using separate statements.

### invalid-pine: sources/0208__regalouisei-collect-tradingview__multitimeframe-fair-value-gap-fvg-zeiierman.pine
- Row: 0008:https://github.com/regalouisei/collect-tradingview:pinescript/editors_picks/multitimeframe-fair-value-gap-fvg-zeiierman.pine
- Pinned source: https://github.com/regalouisei/collect-tradingview :: pinescript/editors_picks/multitimeframe-fair-value-gap-fvg-zeiierman.pine @ 5847fd3b47540ddd107be02b8c658409d35660ae
- Location: line 9
- Construct: raw newline inside a double-quoted string literal
- Source line: `var string t1 = "Select the timeframe for calculating Fair Value Gaps (FVGs).\n\nThis setting controls which candle data `
- Evidence: The tooltip string crosses a physical newline before its closing quote.

### invalid-pine: sources/0224__deepentropy-oakscriptJS__Multi-Time-Period-Charts.pine
- Row: 0024:https://github.com/deepentropy/oakscriptJS:docs/official/indicators_standard/Multi-Time Period Charts.pine
- Pinned source: https://github.com/deepentropy/oakscriptJS :: docs/official/indicators_standard/Multi-Time Period Charts.pine @ d7bbd272e9ba6e12bb304a4c6d83d67f57afd2a0
- Location: line 5
- Construct: raw newline inside a double-quoted string literal
- Source line: `string TT_AT = "If selected, the indicator automatically chooses the timeframe of the displayed bars. The chosen higher`
- Evidence: The tooltip string crosses a physical newline before its closing quote.

### tealscript-gap: sources/0329__levanelereal-pruebatrading__Estructura_Mayor.pine
- Row: 0004:https://github.com/levanelereal/pruebatrading:Estructura_Mayor.pine
- Pinned source: https://github.com/levanelereal/pruebatrading :: Estructura_Mayor.pine @ cccce361d393a61f2aeaea3cc0de9850a3e8a511
- Location: line 1404
- Construct: compound reassignment operator +=
- Source line: `                                            eventosD += 1`
- Evidence: Pine v6 documents += as a valid compound assignment equivalent to := x + y; the parser rejects the operator.

### invalid-pine: sources/0334__regalouisei-collect-tradingview__time-sales-tape-by-muqwishi.pine
- Row: 0009:https://github.com/regalouisei/collect-tradingview:pinescript/editors_picks/time-sales-tape-by-muqwishi.pine
- Pinned source: https://github.com/regalouisei/collect-tradingview :: pinescript/editors_picks/time-sales-tape-by-muqwishi.pine @ 5847fd3b47540ddd107be02b8c658409d35660ae
- Location: line 207
- Construct: comma-separated reassignment and method call
- Source line: `        pVol := vol0, recVol.unshift(cVol)`
- Evidence: The line uses a comma to chain two statements.

### harvest-artifact: sources/0343__jonathan-nascimento51-tradeCripto2025__combined_indicators.pine
- Row: 0018:https://github.com/jonathan-nascimento51/tradeCripto2025:combined_indicators.pine
- Pinned source: https://github.com/jonathan-nascimento51/tradeCripto2025 :: combined_indicators.pine @ a5fa58dae8affea1e2bdfdf8cf302d3dfd558873
- Location: line 106
- Construct: Git conflict marker <<<<<<< ours
- Source line: `<<<<<<< ours`
- Evidence: The pinned source contains an unresolved merge-conflict marker, not Pine syntax.

### invalid-pine: sources/0359__folknor-pine-tools__INV046-missing-closing-paren.pine
- Row: 0009:https://github.com/folknor/pine-tools:packages/core/test/fixtures/regression/INV046-missing-closing-paren.pine
- Pinned source: https://github.com/folknor/pine-tools :: packages/core/test/fixtures/regression/INV046-missing-closing-paren.pine @ 50298392b7bae453972851246a4e67e27677090e
- Location: line 9
- Construct: unclosed ta.sma( call
- Source line: ``
- Evidence: The opening parenthesis in x = ta.sma(close, 14 is never closed; the source explicitly expects a parse failure.

### invalid-pine: sources/0383__alighten-dev-Alighten__AlightenLevelsMultiTimeframePatternEV0001.pine
- Row: 0008:https://github.com/alighten-dev/Alighten:TradingView/Indicators/AlightenLevelsMultiTimeframePatternEV0001.pine
- Pinned source: https://github.com/alighten-dev/Alighten :: TradingView/Indicators/AlightenLevelsMultiTimeframePatternEV0001.pine @ 7d0f0bcccaa786f5082f18fa37de4f09eb03ca4f
- Location: line 170
- Construct: comma-separated call and reassignment
- Source line: `            f_process_pivot(time, bar_index, h0, true, bodyHigh), createdPivot := true`
- Evidence: The local block chains a function call and reassignment with a comma.

### invalid-pine: sources/0414__regalouisei-collect-tradingview__correlation-heatmap-tradingfinder-sessions-data-science-stats.pine
- Row: 0014:https://github.com/regalouisei/collect-tradingview:pinescript/editors_picks/correlation-heatmap-tradingfinder-sessions-data-science-stats.pine
- Pinned source: https://github.com/regalouisei/collect-tradingview :: pinescript/editors_picks/correlation-heatmap-tradingfinder-sessions-data-science-stats.pine @ 5847fd3b47540ddd107be02b8c658409d35660ae
- Location: line 42
- Construct: comma-separated assignments in switch arm
- Source line: `    'Forex' => Main_Sym := syminfo.ticker, Sym_1  := 'EURUSD' , Sym_2 := 'GBPUSD' , Sym_3 := 'USDJPY' , Sym_4 := 'USDCHF' , Sym_5 := 'USDCAD' , Sym_6 := 'AUDUSD' , Sym_7 := 'NZDUSD' , Sym_8 := 'EURJPY' , Sym_9 := 'EURGBP' , Sym_10 := 'GBPJPY'`
- Evidence: The switch arm contains many assignments joined by commas, which are not Pine statement separators.

### harvest-artifact: sources/0423__jonathan-nascimento51-tradeCripto2025__style_lib_test.pine
- Row: 0023:https://github.com/jonathan-nascimento51/tradeCripto2025:tests/style_lib_test.pine
- Pinned source: https://github.com/jonathan-nascimento51/tradeCripto2025 :: tests/style_lib_test.pine @ e10ec3f87189371ad69d83eb242a122b511273fd
- Location: line 3
- Construct: relative local import ../libraries/style_lib.pine
- Source line: `import "../libraries/style_lib.pine" as st`
- Evidence: This is a repository-local test fixture with a relative file dependency, not a standalone TradingView import specifier.

### harvest-artifact: sources/0425__jonathan-nascimento51-tradeCripto2025__bucketing_lib_test.pine
- Row: 0025:https://github.com/jonathan-nascimento51/tradeCripto2025:tests/bucketing_lib_test.pine
- Pinned source: https://github.com/jonathan-nascimento51/tradeCripto2025 :: tests/bucketing_lib_test.pine @ 164362945454a4954c93de09d9eae965df3efd80
- Location: line 3
- Construct: relative local import ../libraries/bucketing_lib.pine
- Source line: `import "../libraries/bucketing_lib.pine" as buck`
- Evidence: This is a repository-local test fixture with relative file dependencies, not a standalone TradingView import specifier.

### invalid-pine: sources/0445__helenananaa-pine-compat-runtime__const_condition_qualifier_narrowing.pine
- Row: 0020:https://github.com/helenananaa/pine-compat-runtime:tests/fixtures/runtime/const_condition_qualifier_narrowing.pine
- Pinned source: https://github.com/helenananaa/pine-compat-runtime :: tests/fixtures/runtime/const_condition_qualifier_narrowing.pine @ 0e4f409acbab5dad943d622b1c2d68324a5daf46
- Location: line 116
- Construct: tuple returned from a ternary expression
- Source line: `[tuple_ternary_length] = false ? [bar_index] : [length]`
- Evidence: Pine v6 permits tuples from if/switch local blocks, but explicitly forbids tuples as ternary results.

### invalid-pine: sources/0486__radityakhs-crypto-scanner__HollowCat_Supreme_Indicator.pine
- Row: 0011:https://github.com/radityakhs/crypto-scanner:HollowCat_Supreme_Indicator.pine
- Pinned source: https://github.com/radityakhs/crypto-scanner :: HollowCat_Supreme_Indicator.pine @ 35919a179c067f9cfa110a07ba3a6bfff7e39382
- Location: line 418
- Construct: three-digit color literal #000
- Source line: `               (exitLong or exitShort) ? #000 :`
- Evidence: Pine color literals require six hexadecimal digits; #000 is not a valid color literal.

### invalid-pine: sources/0502__FlipWreck-test__pattern_detector.pine
- Row: 0002:https://github.com/FlipWreck/test:pattern_detector.pine
- Pinned source: https://github.com/FlipWreck/test :: pattern_detector.pine @ 19a9c8a5f037db7a78dd7f4c241e7546e21f1167
- Location: line 22
- Construct: braced function body
- Source line: `draw_pattern_lines(start_price, end_price, start_time, end_time, color, extend_right) => {`
- Evidence: Pine function bodies use indentation and do not use a C-style { ... } block.

### invalid-pine: sources/0504__bi-kash-Minddrift__experiment.pine
- Row: 0004:https://github.com/bi-kash/Minddrift:trendline/experiment.pine
- Pinned source: https://github.com/bi-kash/Minddrift :: trendline/experiment.pine @ 9d9674d534a8c8d4a48a225bda9e1c966534853a
- Location: line 61
- Construct: var-qualified function parameters
- Source line: `f_trim(var int[] aIdx, var float[] aPx) =>`
- Evidence: Pine function parameters use type qualifiers such as series/simple/const, not var declarations.

### invalid-pine: sources/0516__regalouisei-collect-tradingview__fundamentals-graphing-kioseff-trading.pine
- Row: 0016:https://github.com/regalouisei/collect-tradingview:pinescript/editors_picks/fundamentals-graphing-kioseff-trading.pine
- Pinned source: https://github.com/regalouisei/collect-tradingview :: pinescript/editors_picks/fundamentals-graphing-kioseff-trading.pine @ 5847fd3b47540ddd107be02b8c658409d35660ae
- Location: line 582
- Construct: comma-chained calls and tuple assignment
- Source line: `req(0 , tf("MSFT"   ,"BRK.B"   , "AAPL" , "JNJ"  , "CROX"  , "XOM" , "TSLA", "PYPL", "AMZN" , "UBER", "NEE" , input.symbol(defval = "MSFT", title = "Symbol 1",  inline = "0" , group = st))), [d1 ,s1 ] = req(1 , tf("GOOGL"  ,"JPM"   , "NVDA" , "LLY" , "BGS"   , "HES"  , "HAS"  , "NSSC", "W"    , "INSW" , "TRGP", input.symbol(defval = "AAPL", title = "Symbol 2 ", inline = "0" , group = st)))`
- Evidence: The line chains independent calls and assignments with commas.

### invalid-pine: sources/0517__regalouisei-collect-tradingview__excalibur-ehlers-autocorrelation-periodogram-modified.pine
- Row: 0017:https://github.com/regalouisei/collect-tradingview:pinescript/editors_picks/excalibur-ehlers-autocorrelation-periodogram-modified.pine
- Pinned source: https://github.com/regalouisei/collect-tradingview :: pinescript/editors_picks/excalibur-ehlers-autocorrelation-periodogram-modified.pine @ 5847fd3b47540ddd107be02b8c658409d35660ae
- Location: line 86
- Construct: typed for-loop header for int p=6
- Source line: `        for int p=6 to 49`
- Evidence: Pine for headers declare the counter as for p = 6 to 49; a type declaration is not legal in that position.

### harvest-artifact: sources/0528__Leci37-tuisku_Web_selling__QVNBTiAtIDFEYXkgLSAxQk9MIC0gYWI1ODIxNDI.pine
- Row: 0003:https://github.com/Leci37/tuisku_Web_selling:d_result/pine_TW_hide/QVNBTiAtIDFEYXkgLSAxQk9MIC0gYWI1ODIxNDI.pine
- Pinned source: https://github.com/Leci37/tuisku_Web_selling :: d_result/pine_TW_hide/QVNBTiAtIDFEYXkgLSAxQk9MIC0gYWI1ODIxNDI.pine @ 974c0f0e29f9dbb11292dd2571636f4e8d082c2b
- Location: line 61
- Construct: paywall truncation marker ...
- Source line: `	...`
- Evidence: The source ends its Pine body with an ellipsis and a paid-version notice.

### harvest-artifact: sources/0547__Leci37-tuisku_Web_selling__QUZSTSAtIDFNaW4gLSAxU1FVIC0gMjkyM2FlYWI.pine
- Row: 0022:https://github.com/Leci37/tuisku_Web_selling:d_result/pine_TW_hide/QUZSTSAtIDFNaW4gLSAxU1FVIC0gMjkyM2FlYWI.pine
- Pinned source: https://github.com/Leci37/tuisku_Web_selling :: d_result/pine_TW_hide/QUZSTSAtIDFNaW4gLSAxU1FVIC0gMjkyM2FlYWI.pine @ 974c0f0e29f9dbb11292dd2571636f4e8d082c2b
- Location: line 61
- Construct: paywall truncation marker ...
- Source line: `	...`
- Evidence: The source ends its Pine body with an ellipsis and a paid-version notice.

### harvest-artifact: sources/0548__Leci37-tuisku_Web_selling__R1RMQiAtIDVNaW4gLSAyVFYwIC0gZjE4ZDlhNGQ.pine
- Row: 0023:https://github.com/Leci37/tuisku_Web_selling:d_result/pine_TW_hide/R1RMQiAtIDVNaW4gLSAyVFYwIC0gZjE4ZDlhNGQ.pine
- Pinned source: https://github.com/Leci37/tuisku_Web_selling :: d_result/pine_TW_hide/R1RMQiAtIDVNaW4gLSAyVFYwIC0gZjE4ZDlhNGQ.pine @ 974c0f0e29f9dbb11292dd2571636f4e8d082c2b
- Location: line 61
- Construct: paywall truncation marker ...
- Source line: `	...`
- Evidence: The source ends its Pine body with an ellipsis and a paid-version notice.

### harvest-artifact: sources/0549__Leci37-tuisku_Web_selling__QUFQTCAtIDVNaW4gLSAxU1FVIC0gMDgxNmNhZWQ.pine
- Row: 0024:https://github.com/Leci37/tuisku_Web_selling:d_result/pine_TW_hide/QUFQTCAtIDVNaW4gLSAxU1FVIC0gMDgxNmNhZWQ.pine
- Pinned source: https://github.com/Leci37/tuisku_Web_selling :: d_result/pine_TW_hide/QUFQTCAtIDVNaW4gLSAxU1FVIC0gMDgxNmNhZWQ.pine @ 974c0f0e29f9dbb11292dd2571636f4e8d082c2b
- Location: line 61
- Construct: paywall truncation marker ...
- Source line: `	...`
- Evidence: The source ends its Pine body with an ellipsis and a paid-version notice.

### harvest-artifact: sources/0552__Leci37-tuisku_Web_selling__RERPRyAtIDFIb3VyIC0gMVNRVSAtIDM0NjkwZGZh.pine
- Row: 0002:https://github.com/Leci37/tuisku_Web_selling:d_result/pine_TW_hide/RERPRyAtIDFIb3VyIC0gMVNRVSAtIDM0NjkwZGZh.pine
- Pinned source: https://github.com/Leci37/tuisku_Web_selling :: d_result/pine_TW_hide/RERPRyAtIDFIb3VyIC0gMVNRVSAtIDM0NjkwZGZh.pine @ 974c0f0e29f9dbb11292dd2571636f4e8d082c2b
- Location: line 61
- Construct: paywall truncation marker ...
- Source line: `	...`
- Evidence: The source ends its Pine body with an ellipsis and a paid-version notice.

### invalid-pine: sources/0557__toxictrader2024-NQ-Analyst__nq_confluence_v1.pine
- Row: 0007:https://github.com/toxictrader2024/NQ-Analyst:tradingview/nq_confluence_v1.pine
- Pinned source: https://github.com/toxictrader2024/NQ-Analyst :: tradingview/nq_confluence_v1.pine @ 592b4ffbabe8ae26d5153b376801fb84562de7e1
- Location: line 211
- Construct: semicolon-separated assignments
- Source line: `        tp = low[0]; bp = high[2]; mp = (tp+bp)/2`
- Evidence: The line chains three assignments with semicolons.

### invalid-pine: sources/0559__cc4wang-ui-Auto-trade__pattern_detector_v2_strategy.pine
- Row: 0009:https://github.com/cc4wang-ui/Auto-trade:pattern_detector_v2_strategy.pine
- Pinned source: https://github.com/cc4wang-ui/Auto-trade :: pattern_detector_v2_strategy.pine @ 4bc2fbe285c57fe9c73b6a2397a29722f3a5d542
- Location: line 495
- Construct: comma-separated array assignments
- Source line: `                ts := array.get(resDir, j),   array.set(resDir, j, array.get(resDir, j+1)),     array.set(resDir, j+1, ts)`
- Evidence: The line chains array.get/array.set assignments with commas.

### invalid-pine: sources/0564__heyphat-piner__breaker.pine
- Row: 0014:https://github.com/heyphat/piner:test/pinescripts/breaker.pine
- Pinned source: https://github.com/heyphat/piner :: test/pinescripts/breaker.pine @ db6514474da2940f532655f36dfc20d118bf36b3
- Location: line 123
- Construct: comma-leading continuation of assignments
- Source line: ` ,      SW2breakUP = 6,  tpUP1 = 7,    tpUP2 = 8,    tpUP3 = 9,   BB_endBl =10`
- Evidence: The assignment list continues on a new line beginning with a comma.

### harvest-artifact: sources/0616__Leci37-tuisku_Web_selling__VFNMQSAtIDFEYXkgLSAyU1YwIC0gMjE4NGQwZDk.pine
- Row: 0016:https://github.com/Leci37/tuisku_Web_selling:d_result/pine_TW_hide/VFNMQSAtIDFEYXkgLSAyU1YwIC0gMjE4NGQwZDk.pine
- Pinned source: https://github.com/Leci37/tuisku_Web_selling :: d_result/pine_TW_hide/VFNMQSAtIDFEYXkgLSAyU1YwIC0gMjE4NGQwZDk.pine @ 974c0f0e29f9dbb11292dd2571636f4e8d082c2b
- Location: line 61
- Construct: paywall truncation marker ...
- Source line: `	...`
- Evidence: The source ends its Pine body with an ellipsis and a paid-version notice.

### harvest-artifact: sources/0633__ignaciocruz65-LABORATORIO1__MACDRSI.pine
- Row: 0008:https://github.com/ignaciocruz65/LABORATORIO1:TV/MACDRSI.pine
- Pinned source: https://github.com/ignaciocruz65/LABORATORIO1 :: TV/MACDRSI.pine @ 557db8e7107440453e19653a846eff02100d57d6
- Location: line 70
- Construct: hash-divider text
- Source line: `###############################################################################################################################################`
- Evidence: The source contains a long line of # characters outside a comment, indicating copied page/separator content.

### invalid-pine: sources/0640__regalouisei-collect-tradingview__flare.pine
- Row: 0015:https://github.com/regalouisei/collect-tradingview:pinescript/editors_picks/flare.pine
- Pinned source: https://github.com/regalouisei/collect-tradingview :: pinescript/editors_picks/flare.pine @ 5847fd3b47540ddd107be02b8c658409d35660ae
- Location: line 6
- Construct: raw newline inside a single-quoted string literal
- Source line: `_='         `
- Evidence: The assignment opens a single-quoted string and leaves it open across physical lines.

### harvest-artifact: sources/0650__Leci37-tuisku_Web_selling__R01FIC0gMURheSAtIDJCVjAgLSBiZDI3NDMxNg.pine
- Row: 0025:https://github.com/Leci37/tuisku_Web_selling:d_result/pine_TW_hide/R01FIC0gMURheSAtIDJCVjAgLSBiZDI3NDMxNg.pine
- Pinned source: https://github.com/Leci37/tuisku_Web_selling :: d_result/pine_TW_hide/R01FIC0gMURheSAtIDJCVjAgLSBiZDI3NDMxNg.pine @ 974c0f0e29f9dbb11292dd2571636f4e8d082c2b
- Location: line 61
- Construct: paywall truncation marker ...
- Source line: `	...`
- Evidence: The source ends its Pine body with an ellipsis and a paid-version notice.

## Timeout Row

`sources/0254__davidadff7-blip-CODE23__Aoi_alert_all.pine` is not a parser timeout or parser crash. The full classifier exceeded eight minutes with the process at 100% CPU and produced no report. The corrected parser-only invocation succeeded in 181 ms on the 125 KB fixture (124,977 bytes after fixture normalization; manifest raw size 125,147 bytes) and returned a valid `Program` with 692 top-level `body` entries. It remains a `tealscript-gap` only for the execute-stage scale/runtime finding: the full classifier exhausts CPU before producing a result.
