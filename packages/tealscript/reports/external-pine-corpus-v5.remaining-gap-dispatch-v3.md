> Superseded by external-pine-corpus-v5.remaining-gap-dispatch-v5.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Remaining Gap Dispatch V3

Pinned measurement commit: `cc4423655d8a2b699e6b7ed79dec0fd976db55da`.

This dispatch list is derived from a fresh pinned v5 run against the fixed corpus at current committed HEAD. It contains **81 current TealScript-gap rows**. The previous v2 list contained **83 rows** at `1bd0cf4926b508a143fa3b57f585b191215b17a7`.

Current headline: **844 supported / 81 TealScript gap / 57 invalid Pine / 8 corpus hygiene / 10 unsupported-by-design**; achievable denominator **925**; support **844/925 = 91.24%**.

Rows are grouped by normalized failure cause and ranked by current count. Each row records declared version, failing stage, diagnostic, source evidence, construct, and the current classifier rule/status.

## Stale Since V2

Stale v2 entries no longer classified as TealScript gaps in this run: **25**.
- sources/0089__mihakralj-pinescript__theilu.pine — now supported (no failed stage: Pipeline reached visible output.)
- sources/0091__mihakralj-pinescript__wmape.pine — now supported (no failed stage: Pipeline reached visible output.)
- sources/0092__mihakralj-pinescript__wrmse.pine — now supported (no failed stage: Pipeline reached visible output.)
- sources/0467__everget-tradingview-pinescript-indicators__roi_return_on_investment.pine — now supported (no failed stage: Pipeline reached visible output.)
- sources/0469__everget-tradingview-pinescript-indicators__us_treasury_yields.pine — now supported (no failed stage: Pipeline reached visible output.)
- sources/0470__everget-tradingview-pinescript-indicators__ytd_year_to_date_percent_return.pine — now supported (no failed stage: Pipeline reached visible output.)
- sources/0484__casoon-pine-scripts__candle_pressure_response_jma.pine — now invalid-pine (semantic: TradingView rejects duplicate declarations in the same scope.)
- sources/0498__casoon-pine-scripts__wavetrend_v3_strategy.pine — now supported (no failed stage: Pipeline reached visible output.)
- sources/0519__casoon-pine-scripts__smc_structure_expectation.pine — now supported (no failed stage: Pipeline reached visible output.)
- sources/0556__casoon-pine-scripts__wavetrend_v3.pine — now supported (no failed stage: Pipeline reached visible output.)
- sources/0588__casoon-pine-scripts__market_memory_decay_oscillator.pine — now supported (no failed stage: Pipeline reached visible output.)
- sources/0618__knectardev-pine_scripts__acrypto-weigthed-strategy-v149_v1.0.0.pine — now supported (no failed stage: Pipeline reached visible output.)
- sources/0673__SammyEnigma-pine-scripts__pivot-popints.pine — now supported (no failed stage: Pipeline reached visible output.)
- sources/0692__oguzhandilber-PineScripts__Pmax.pine — now supported (no failed stage: Pipeline reached visible output.)
- sources/0762__MinorLeopard-Indicator__Indicator-FalseRemovals-.pine — now supported (no failed stage: Pipeline reached visible output.)
- sources/0771__msongkiet-TDV_share__ZigZag_EMA.pine — now supported (no failed stage: Pipeline reached visible output.)
- sources/0796__Leci37-tuisku_Web_selling__R09PRyAtIDFEYXkgLSAyU1YwIC0gNGZlMjJhYTk.pine — now corpus-hygiene (parse: The harvested source contains a standalone literal ellipsis marker, indicating truncated or elided Pine rather than a complete standalone script.)
- sources/0798__Leci37-tuisku_Web_selling__RERPRyAtIDMwTWluIC0gMlRWMCAtIGFiYzFhN2Rj.pine — now corpus-hygiene (parse: The harvested source contains a standalone literal ellipsis marker, indicating truncated or elided Pine rather than a complete standalone script.)
- sources/0880__Leci37-tuisku_Web_selling__VFJYVVNEVCAtIDFEYXkgLSAxTUFEIC0gZGI4ODk1Zjk.pine — now corpus-hygiene (parse: The harvested source contains a standalone literal ellipsis marker, indicating truncated or elided Pine rather than a complete standalone script.)
- sources/0894__Leci37-tuisku_Web_selling__TUVUQSAtIDFEYXkgLSAyQ1YwIC0gOGRmN2I1MTc.pine — now corpus-hygiene (parse: The harvested source contains a standalone literal ellipsis marker, indicating truncated or elided Pine rather than a complete standalone script.)
- sources/0895__Leci37-tuisku_Web_selling__Q1JXRCAtIDFEYXkgLSAyVFYwIC0gNjk2ZDY4OTc.pine — now corpus-hygiene (parse: The harvested source contains a standalone literal ellipsis marker, indicating truncated or elided Pine rather than a complete standalone script.)
- sources/0897__Leci37-tuisku_Web_selling__R1RMQiAtIDFIb3VyIC0gMVNRVSAtIDA2OWQwNjZh.pine — now corpus-hygiene (parse: The harvested source contains a standalone literal ellipsis marker, indicating truncated or elided Pine rather than a complete standalone script.)
- sources/0916__Leci37-tuisku_Web_selling__RE9UVVNEVCAtIDFIb3VyIC0gMlRWMCAtIDU0YjQ3ODk4.pine — now corpus-hygiene (parse: The harvested source contains a standalone literal ellipsis marker, indicating truncated or elided Pine rather than a complete standalone script.)
- sources/0921__kankinku-AutoResearchFinance_v2__cand-b061508a.pine — now supported (no failed stage: Pipeline reached visible output.)
- sources/0936__Leci37-tuisku_Web_selling__TklPIC0gMURheSAtIDJNTTAgLSA1MDVlZGYxZg.pine — now corpus-hygiene (parse: The harvested source contains a standalone literal ellipsis marker, indicating truncated or elided Pine rather than a complete standalone script.)

## 1. semantic:unknown-identifier (15)

### sources/0151__mihakralj-pinescript__sam.pine
- Declared Pine version: 6
- Source: https://github.com/mihakralj/pinescript :: `indicators/momentum/sam.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Stage: semantic
- Diagnostic: `31:107: unknown-identifier: Unknown identifier: ji`
- Evidence: `float ji = (0.0962 * i1 + 0.5769 * nz(i1[2]) - 0.5769 * nz(i1[4]) - 0.0962 * nz(i1[6])) * (0.075 * nz(ji[1]) + 0.54)`
- Construct: unresolved identifier ji
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-identifier.

### sources/0197__mihakralj-pinescript__apo.pine
- Declared Pine version: 6
- Source: https://github.com/mihakralj/pinescript :: `indicators/oscillators/apo.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Stage: semantic
- Diagnostic: `20:15: unknown-identifier: Unknown identifier: source`
- Evidence: `if not na(source)`
- Construct: unresolved identifier source
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-identifier.

### sources/0489__casoon-pine-scripts__flow_bias.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `archive/indicators/flow_bias/flow_bias.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `160:21: unknown-identifier: Unknown identifier: rsiLen`
- Evidence: `rsi = ta.rsi(close, rsiLen)`
- Construct: unresolved identifier rsiLen
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-identifier.

### sources/0495__casoon-pine-scripts__wave_navigator.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `archive/indicators/wave_navigator/wave_navigator.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `1255:34: unknown-identifier: Unknown identifier: pivotsToKeep`
- Evidence: `while array.size(pivPrice) > pivotsToKeep`
- Construct: unresolved identifier pivotsToKeep
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-identifier.

### sources/0539__casoon-pine-scripts__fisher_transform_advanced.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/fisher_transform_advanced/fisher_transform_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `106:20: unknown-identifier: Unknown identifier: e6`
- Evidence: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3`
- Construct: unresolved identifier e6
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-identifier.

### sources/0550__casoon-pine-scripts__roc_advanced.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/roc_advanced/roc_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `106:20: unknown-identifier: Unknown identifier: e6`
- Evidence: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3`
- Construct: unresolved identifier e6
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-identifier.

### sources/0551__casoon-pine-scripts__rsi_advanced.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/rsi_advanced/rsi_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `109:20: unknown-identifier: Unknown identifier: e6`
- Evidence: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3`
- Construct: unresolved identifier e6
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-identifier.

### sources/0553__casoon-pine-scripts__tsi_advanced.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/tsi_advanced/tsi_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `107:20: unknown-identifier: Unknown identifier: e6`
- Evidence: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3`
- Construct: unresolved identifier e6
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-identifier.

### sources/0558__casoon-pine-scripts__williams_r_advanced.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/williams_r_advanced/williams_r_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `109:20: unknown-identifier: Unknown identifier: e6`
- Evidence: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3`
- Construct: unresolved identifier e6
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-identifier.

### sources/0564__casoon-pine-scripts__money_flow_delta_profile.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `indicators/money_flow/money_flow_delta_profile/money_flow_delta_profile.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `246:61: unknown-identifier: Unknown identifier: vPOR`
- Evidence: `flow = rpSRC == "Money Flow" ? v_ * vPOR * mfPrice * wt : v_ * vPOR * wt`
- Construct: unresolved identifier vPOR
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-identifier.

### sources/0581__casoon-pine-scripts__vein_reversal_zones.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `indicators/trend_direction/vein/vein_reversal_zones/vein_reversal_zones.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `311:84: unknown-identifier: Unknown identifier: relVol`
- Evidence: `float conflScoreLong = (structureLong ? 3.0 : 0.0) + (momentumLong ? 2.0 : 0.0) + (relVol > 1.2 ? 2.0 : 0.0) + (emaLong ? 2.0 : 0.0) + (stLong ? 1.0 : 0.0)`
- Construct: unresolved identifier relVol
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-identifier.

### sources/0772__milocaetano-quantick__delta_histogram.pine
- Declared Pine version: 5
- Source: https://github.com/milocaetano/quantick :: `crates/app/scripts/delta_histogram.pine` @ `6bd9dd86a50d7d2b67504a6729784ac94fe8e276`
- Stage: semantic
- Diagnostic: `3:6: unknown-identifier: Unknown identifier: delta`
- Evidence: `plot(delta, title="delta", style=plot.style_histogram, color=color.aqua)`
- Construct: unresolved identifier delta
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-identifier.

### sources/0773__suyons-tradingview-indicators__02-rsi-signal.pine
- Declared Pine version: 5
- Source: https://github.com/suyons/tradingview-indicators :: `relative-strength-index/02-rsi-signal.pine` @ `fe3d061b99afc3dcc2400893e42f8dc3c7c414ad`
- Stage: semantic
- Diagnostic: `44:19: unknown-identifier: Unknown identifier: buy`
- Evidence: `buy_series = not (buy[1] or buy[2] or buy[3] or buy[4] or buy[5])`
- Construct: unresolved identifier buy
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-identifier.

### sources/0865__hasnocool-tradingview-pine-scripts__John-F.-Ehlers-Center-Of-Gravity-Balanced-by-DM-.pine
- Declared Pine version: 5
- Source: https://github.com/hasnocool/tradingview-pine-scripts :: `John F. Ehlers Center Of Gravity Balanced by [DM].pine` @ `e031cab2819a7d56fb8bb9d000252f51439986e2`
- Stage: semantic
- Diagnostic: `40:6: unknown-identifier: Unknown identifier: avg_sig`
- Evidence: `[avg_sig]`
- Construct: unresolved identifier avg_sig
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-identifier.

### sources/0952__chauhanvishaal-tv-indicators__Zone_Identifier.pine
- Declared Pine version: 5
- Source: https://github.com/chauhanvishaal/tv-indicators :: `Zone_Identifier.pine` @ `74778b3f18d8562666e1b17e880a420ab5d967c2`
- Stage: semantic
- Diagnostic: `260:28: unknown-identifier: Unknown identifier: float`
- Evidence: `displacementStart = na(float)`
- Construct: unresolved identifier float
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-identifier.

## 2. parse:unexpected-token (12)

### sources/0165__mihakralj-pinescript__fft.pine
- Declared Pine version: 6
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/fft.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Stage: parse
- Diagnostic: `22:18: Expected "#", "'", "(", ".", "/*", "//", "[", "\"", "\"\"\"", "array", "bool", "color", "const", "false", "float", "input", "int", "map", "matrix", "na", "not", "series", "simple", "string", "true", [ \t], [+\-], [0-9], or [\n\r] but "<" found.`
- Evidence: `r := (r << 1) | (x & 1)`
- Construct: parse rejected: r := (r << 1) | (x & 1)
- Version-appropriate rule/status: Parse failure is not proven invalid Pine or corpus hygiene, so it remains counted as a TealScript parser gap.

### sources/0502__casoon-pine-scripts__auto_trendlines.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `indicators/market_structure/auto_trendlines/auto_trendlines.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: parse
- Diagnostic: `279:49: Expected ".", "/*", "[", "[]", or [ \t] but "\n" found.`
- Evidence: `else`
- Construct: parse rejected: else
- Version-appropriate rule/status: Parse failure is not proven invalid Pine or corpus hygiene, so it remains counted as a TealScript parser gap.

### sources/0720__deepentropy-lightweight-charts-indicators__Performance.pine
- Declared Pine version: 6
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_standard/Performance.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Stage: parse
- Diagnostic: `7:120: Expected "\"" or "\\" but "\n" found.`
- Evidence: `string TT_LT = "A list of timeframe strings, separated by commas and optional spaces. A valid timeframe string contains`
- Construct: parse rejected: string TT_LT = "A list of timeframe strings, separated by commas and optional spaces. A valid timeframe string contains
- Version-appropriate rule/status: Parse failure is not proven invalid Pine or corpus hygiene, so it remains counted as a TealScript parser gap.

### sources/0732__deepentropy-lightweight-charts-indicators__Multi-Time-Period-Charts.pine
- Declared Pine version: 6
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_standard/Multi-Time Period Charts.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Stage: parse
- Diagnostic: `5:120: Expected "\"" or "\\" but "\n" found.`
- Evidence: `string TT_AT = "If selected, the indicator automatically chooses the timeframe of the displayed bars. The chosen higher`
- Construct: parse rejected: string TT_AT = "If selected, the indicator automatically chooses the timeframe of the displayed bars. The chosen higher
- Version-appropriate rule/status: Parse failure is not proven invalid Pine or corpus hygiene, so it remains counted as a TealScript parser gap.

### sources/0827__deepentropy-lightweight-charts-indicators__Open-Interest-Suite-Aggregated---By-Leviathan.pine
- Declared Pine version: 5
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_community/Open Interest Suite [Aggregated] - By Leviathan.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Stage: parse
- Diagnostic: `196:25: Expected "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "else", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "matrix", "method", "na", "not", "once", "overload", "series", "simple", "strategy", "string", "study", "switch", "true", "type", "var", "varip", "while", [ \t], [+\-], [0-9], [\n\r], or end of input but "=" found.`
- Evidence: `array.shift(x2), nx = array.indexof(x2, array.max(x2))`
- Construct: parse rejected: array.shift(x2), nx = array.indexof(x2, array.max(x2))
- Version-appropriate rule/status: Parse failure is not proven invalid Pine or corpus hygiene, so it remains counted as a TealScript parser gap.

### sources/0828__deepentropy-lightweight-charts-indicators__Support-Resistance-Classification-VR-LuxAlgo-.pine
- Declared Pine version: 5
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_community/Support Resistance Classification (VR) [LuxAlgo].pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Stage: parse
- Diagnostic: `268:37: Expected "                ", "            ", "            \t", "        \t    ", "        \t", "        \t\t", "    ", "    \t        ", "    \t    ", "    \t    \t", "    \t\t    ", "    \t\t", "    \t\t\t", "  ", "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "\t            ", "\t        ", "\t        \t", "\t    \t    ", "\t    \t", "\t    \t\t", "\t", "\t\t        ", "\t\t    ", "\t\t    \t", "\t\t\t    ", "\t\t\t", "\t\t\t\t", "array", "bool", "break", "color", "const", "continue", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "matrix", "method", "na", "not", "once", "overload", "series", "simple", "strategy", "string", "study", "switch", "true", "type", "var", "varip", "while", [ \t], [+\-], [0-9], [\n\r], or end of input but "=" found.`
- Evidence: `'s' =>`
- Construct: parse rejected: 's' =>
- Version-appropriate rule/status: Parse failure is not proven invalid Pine or corpus hygiene, so it remains counted as a TealScript parser gap.

### sources/0838__SenkuSupreme-TradingView-MT4-MT5-Indicators-Strategies-Collection__VP-MAPS-OB-S-R-GGSHOT-HH-BY-LEO.pine
- Declared Pine version: 5
- Source: https://github.com/SenkuSupreme/TradingView-MT4-MT5-Indicators-Strategies-Collection :: `Indicators/VP(MAPS)+OB+S&R+GGSHOT+HH BY LEO.pine` @ `b6b6f454c641d84690acd02d0323518357de2a66`
- Stage: parse
- Diagnostic: `43:53: Expected "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "matrix", "method", "na", "not", "once", "overload", "series", "simple", "strategy", "string", "study", "switch", "true", "type", "var", "varip", "while", [ \t], [+\-], [0-9], [\n\r], or end of input but "," found.`
- Evidence: `method inOut(int  [] a, int   val) => a.unshift(val), a.pop()`
- Construct: parse rejected: method inOut(int  [] a, int   val) => a.unshift(val), a.pop()
- Version-appropriate rule/status: Parse failure is not proven invalid Pine or corpus hygiene, so it remains counted as a TealScript parser gap.

### sources/0909__deepentropy-oakscriptJS__Open-Interest-Suite-Aggregated---By-Leviathan.pine
- Declared Pine version: 5
- Source: https://github.com/deepentropy/oakscriptJS :: `docs/official/indicators_community/Open Interest Suite [Aggregated] - By Leviathan.pine` @ `d7bbd272e9ba6e12bb304a4c6d83d67f57afd2a0`
- Stage: parse
- Diagnostic: `196:25: Expected "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "else", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "matrix", "method", "na", "not", "once", "overload", "series", "simple", "strategy", "string", "study", "switch", "true", "type", "var", "varip", "while", [ \t], [+\-], [0-9], [\n\r], or end of input but "=" found.`
- Evidence: `array.shift(x2), nx = array.indexof(x2, array.max(x2))`
- Construct: parse rejected: array.shift(x2), nx = array.indexof(x2, array.max(x2))
- Version-appropriate rule/status: Parse failure is not proven invalid Pine or corpus hygiene, so it remains counted as a TealScript parser gap.

### sources/0910__deepentropy-oakscriptJS__Support-Resistance-Classification-VR-LuxAlgo-.pine
- Declared Pine version: 5
- Source: https://github.com/deepentropy/oakscriptJS :: `docs/official/indicators_community/Support Resistance Classification (VR) [LuxAlgo].pine` @ `d7bbd272e9ba6e12bb304a4c6d83d67f57afd2a0`
- Stage: parse
- Diagnostic: `268:37: Expected "                ", "            ", "            \t", "        \t    ", "        \t", "        \t\t", "    ", "    \t        ", "    \t    ", "    \t    \t", "    \t\t    ", "    \t\t", "    \t\t\t", "  ", "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "\t            ", "\t        ", "\t        \t", "\t    \t    ", "\t    \t", "\t    \t\t", "\t", "\t\t        ", "\t\t    ", "\t\t    \t", "\t\t\t    ", "\t\t\t", "\t\t\t\t", "array", "bool", "break", "color", "const", "continue", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "matrix", "method", "na", "not", "once", "overload", "series", "simple", "strategy", "string", "study", "switch", "true", "type", "var", "varip", "while", [ \t], [+\-], [0-9], [\n\r], or end of input but "=" found.`
- Evidence: `'s' =>`
- Construct: parse rejected: 's' =>
- Version-appropriate rule/status: Parse failure is not proven invalid Pine or corpus hygiene, so it remains counted as a TealScript parser gap.

### sources/0919__g-moe-Trading-Indicators__divergence-scanner.pine
- Declared Pine version: 5
- Source: https://github.com/g-moe/Trading-Indicators :: `Tradingview/divergence-scanner.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Stage: parse
- Diagnostic: `19:259: Expected "'" or "\\" but "\n" found.`
- Evidence: `stop_amount = input.int(5, minval = 1, title = "Stop Amount",group = "Additional Trade Settings", inline = '6', tooltip = 'If Stop Type is set to recent high/low and the stop amount is 5 we use the highest high or lowest low from the past 5 bars from entry.`
- Construct: parse rejected: stop_amount = input.int(5, minval = 1, title = "Stop Amount",group = "Additional Trade Settings", inline = '6', tooltip = 'If Stop Type is set to recent high/low and the stop amount is 5 we use the highest high or lowest low from the past 5 bars from entry.
- Version-appropriate rule/status: Parse failure is not proven invalid Pine or corpus hygiene, so it remains counted as a TealScript parser gap.

### sources/0927__ferranbt-pinecone__not_a_library.pine
- Declared Pine version: 5
- Source: https://github.com/ferranbt/pinecone :: `tests/testdata/import/not_a_library.pine` @ `cd8b96da56ef9657f6ce33eb52753c5945adf3bc`
- Stage: parse
- Diagnostic: `4:15: Expected "/*", "=", or [ \t] but "a" found.`
- Evidence: `import notlib as n`
- Construct: parse rejected: import notlib as n
- Version-appropriate rule/status: Parse failure is not proven invalid Pine or corpus hygiene, so it remains counted as a TealScript parser gap.

### sources/0949__g-moe-Trading-Indicators__xact-technical-analysis.pine
- Declared Pine version: 5
- Source: https://github.com/g-moe/Trading-Indicators :: `Tradingview/xact-technical-analysis.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Stage: parse
- Diagnostic: `11:103: Expected "\"" or "\\" but "\n" found.`
- Evidence: `instructions_tooltip = "• Supply/Demand = zones where buyers or sellers will look to enter the market.`
- Construct: parse rejected: instructions_tooltip = "• Supply/Demand = zones where buyers or sellers will look to enter the market.
- Version-appropriate rule/status: Parse failure is not proven invalid Pine or corpus hygiene, so it remains counted as a TealScript parser gap.

## 3. output:conditional-or-data-gated-output-not-triggered (9)

### sources/0511__casoon-pine-scripts__market_scenario_projector.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `indicators/market_structure/market_scenario_projector/market_scenario_projector.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: output
- Diagnostic: `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.`
- Construct: conditional-or-data-gated-output-not-triggered
- Version-appropriate rule/status: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.

### sources/0639__knectardev-pine_scripts__es-professional-fade-strategy.pine
- Declared Pine version: 5
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: output
- Diagnostic: `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.`
- Construct: conditional-or-data-gated-output-not-triggered
- Version-appropriate rule/status: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.

### sources/0643__knectardev-pine_scripts__es-professional-fade-strategy-v2.5.7-FIXED.pine
- Declared Pine version: 6
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy-v2.5.7-FIXED.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: output
- Diagnostic: `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.`
- Construct: conditional-or-data-gated-output-not-triggered
- Version-appropriate rule/status: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.

### sources/0644__knectardev-pine_scripts__es-professional-fade-strategy.pine
- Declared Pine version: 6
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: output
- Diagnostic: `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.`
- Construct: conditional-or-data-gated-output-not-triggered
- Version-appropriate rule/status: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.

### sources/0645__knectardev-pine_scripts__v2.5.5.pine
- Declared Pine version: 6
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: output
- Diagnostic: `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.`
- Construct: conditional-or-data-gated-output-not-triggered
- Version-appropriate rule/status: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.

### sources/0646__knectardev-pine_scripts__v2.5.6.pine
- Declared Pine version: 6
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: output
- Diagnostic: `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.`
- Construct: conditional-or-data-gated-output-not-triggered
- Version-appropriate rule/status: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.

### sources/0647__knectardev-pine_scripts__v2.5.6_v2.5.13.pine
- Declared Pine version: 5
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.13.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: output
- Diagnostic: `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.`
- Construct: conditional-or-data-gated-output-not-triggered
- Version-appropriate rule/status: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.

### sources/0649__knectardev-pine_scripts__v2.5.6_v2.5.8.pine
- Declared Pine version: 6
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: output
- Diagnostic: `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.`
- Construct: conditional-or-data-gated-output-not-triggered
- Version-appropriate rule/status: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.

### sources/0759__iamhuraira-trading-view-script__FVG_with_IFVG_Indicator.pine
- Declared Pine version: 5
- Source: https://github.com/iamhuraira/trading-view-script :: `FVG_with_IFVG_Indicator.pine` @ `558a170383d5d4f4f3df1a6bb245b1ecad51fe08`
- Stage: output
- Diagnostic: `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.`
- Construct: conditional-or-data-gated-output-not-triggered
- Version-appropriate rule/status: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.

## 4. semantic:unknown-argument (8)

### sources/0640__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.0.pine
- Declared Pine version: 5
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/archive/es-professional-fade-strategy_v2.5.0.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: semantic
- Diagnostic: `20:20: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Evidence: `initialCapital = 50000,`
- Construct: initialCapital on strategy()
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-argument.

### sources/0641__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.1.pine
- Declared Pine version: 5
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/archive/es-professional-fade-strategy_v2.5.1.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: semantic
- Diagnostic: `20:20: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Evidence: `initialCapital = 50000,`
- Construct: initialCapital on strategy()
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-argument.

### sources/0642__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.4_exec-gap.pine
- Declared Pine version: 5
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/archive/es-professional-fade-strategy_v2.5.4_exec-gap.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: semantic
- Diagnostic: `20:20: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Evidence: `initialCapital = 50000,`
- Construct: initialCapital on strategy()
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-argument.

### sources/0648__knectardev-pine_scripts__v2.5.6_v2.5.7.pine
- Declared Pine version: 6
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: semantic
- Diagnostic: `18:87: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Evidence: `"ES Professional Fade v2.5.4 (Execution Gap Modeled)", overlay=true, initialCapital=50000, defaultQtyValue=1, commissionType=strategy.commission.cash_per_contract, commissionValue=2.01)`
- Construct: initialCapital on strategy()
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-argument.

### sources/0654__knectardev-pine_scripts__momentum-breakout-strategy_v1.0.0.pine
- Declared Pine version: 5
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/momentum-breakout-strategy/archive/momentum-breakout-strategy_v1.0.0.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: semantic
- Diagnostic: `17:71: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Evidence: `strategy("Momentum Breakout v1.0.0", overlay = true, initialCapital = 25000)`
- Construct: initialCapital on strategy()
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-argument.

### sources/0655__knectardev-pine_scripts__momentum-breakout-strategy_v1.1.0_volume-filter.pine
- Declared Pine version: 5
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/momentum-breakout-strategy/archive/momentum-breakout-strategy_v1.1.0_volume-filter.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: semantic
- Diagnostic: `17:71: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Evidence: `strategy("Momentum Breakout v1.1.0", overlay = true, initialCapital = 25000)`
- Construct: initialCapital on strategy()
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-argument.

### sources/0656__knectardev-pine_scripts__momentum-breakout-strategy.pine
- Declared Pine version: 5
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/momentum-breakout-strategy/momentum-breakout-strategy.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: semantic
- Diagnostic: `16:71: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Evidence: `strategy("Momentum Breakout v1.2.0", overlay = true, initialCapital = 25000)`
- Construct: initialCapital on strategy()
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-argument.

### sources/0948__g-moe-Trading-Indicators__lower-forecast.pine
- Declared Pine version: 5
- Source: https://github.com/g-moe/Trading-Indicators :: `Tradingview/lower-forecast.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Stage: semantic
- Diagnostic: `210:20: unknown-argument: Unknown argument 'table_id' for table.cell()`
- Evidence: `table.cell(table_id = table, column = 0, row = 0, text = "MOM: " + str.tostring(math.round(momentum,1)) +`
- Construct: table_id on table.cell()
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-argument.

## 5. semantic:type-mismatch (6)

### sources/0650__knectardev-pine_scripts__v2.5.6_v2.5.9.pine
- Declared Pine version: 6
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8/archive/v2.5.6_v2.5.9.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: semantic
- Diagnostic: `115:1: type-mismatch: Cannot assign float value to bool variable 'gapPoints'`
- Evidence: `bool gapPoints = not na(rthOpenCurrent) and not na(rthClosePrev) ?`
- Construct: typed assignment compatibility
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: type-mismatch.

### sources/0651__knectardev-pine_scripts__v2.5.6_v2.5.10.pine
- Declared Pine version: 6
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8/archive/v2.5.6_v2.5.9/archive/v2.5.6_v2.5.10.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: semantic
- Diagnostic: `115:9: type-mismatch: Cannot assign float value to bool variable 'gapPoints'`
- Evidence: `bool gapPoints = not na(rthOpenCurrent) and not na(rthClosePrev) ?`
- Construct: typed assignment compatibility
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: type-mismatch.

### sources/0652__knectardev-pine_scripts__v2.5.6_v2.5.11.pine
- Declared Pine version: 6
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8/archive/v2.5.6_v2.5.9/archive/v2.5.6_v2.5.10/archive/v2.5.6_v2.5.11.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: semantic
- Diagnostic: `116:9: type-mismatch: Cannot assign float value to bool variable 'gapPoints'`
- Evidence: `bool gapPoints = not na(rthOpenCurrent) and not na(rthClosePrev) ?`
- Construct: typed assignment compatibility
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: type-mismatch.

### sources/0653__knectardev-pine_scripts__v2.5.6_v2.5.12.pine
- Declared Pine version: 6
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8/archive/v2.5.6_v2.5.9/archive/v2.5.6_v2.5.10/archive/v2.5.6_v2.5.11/archive/v2.5.6_v2.5.12.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: semantic
- Diagnostic: `117:9: type-mismatch: Cannot assign float value to bool variable 'gapPoints'`
- Evidence: `bool gapPoints = not na(rthOpenCurrent) and not na(rthClosePrev) ?`
- Construct: typed assignment compatibility
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: type-mismatch.

### sources/0802__YooooungLee-clever-meme__.pine
- Declared Pine version: 5
- Source: https://github.com/YooooungLee/clever-meme :: `Quant-code/strategy/艾略特波浪理论.pine` @ `b7499d764e5086f9707cb56abfc734d7e0be0537`
- Stage: semantic
- Diagnostic: `211:64: type-mismatch: Cannot assign na value to bool field fibL._break_`
- Evidence: `,                         _break_   =   na`
- Construct: typed assignment compatibility
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: type-mismatch.

### sources/0979__helenananaa-pine-compat-runtime__unsupported_table_set_position_values.pine
- Declared Pine version: 5
- Source: https://github.com/helenananaa/pine-compat-runtime :: `tests/fixtures/sema/unsupported_table_set_position_values.pine` @ `ad3ff56c67eb6a6dc8279746b5e43898be56716f`
- Stage: semantic
- Diagnostic: `4:24: type-mismatch: Invalid table.set_position position: position.bad`
- Evidence: `table.set_position(id, "position.bad")`
- Construct: table.set_position(id, "position.bad")
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: type-mismatch.

## 6. execute:array-bounds-runtime-error (4)

### sources/0497__casoon-pine-scripts__wavetrend_strategy.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `archive/strategies/wavetrend/wavetrend_strategy.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: execute
- Diagnostic: `Array index 0 is out of bounds. Array size is 0`
- Construct: Array index 0 is out of bounds. Array size is 0
- Version-appropriate rule/status: Pipeline failed at execute.

### sources/0529__casoon-pine-scripts__zigzag_core.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `indicators/market_structure/zigzag_core/zigzag_core.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: execute
- Diagnostic: `Array index 0 is out of bounds. Array size is 0`
- Construct: Array index 0 is out of bounds. Array size is 0
- Version-appropriate rule/status: Pipeline failed at execute.

### sources/0554__casoon-pine-scripts__wavetrend.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/wavetrend/wavetrend.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: execute
- Diagnostic: `Array index 0 is out of bounds. Array size is 0`
- Construct: Array index 0 is out of bounds. Array size is 0
- Version-appropriate rule/status: Pipeline failed at execute.

### sources/0760__supertonka-tradingview-ict-indicator__orderblock_indicator.pine
- Declared Pine version: 5
- Source: https://github.com/supertonka/tradingview-ict-indicator :: `orderblock_indicator.pine` @ `a65385012d39d44e53e0c27ee2f7f02aa2802a34`
- Stage: execute
- Diagnostic: `Array index 0 is out of bounds. Array size is 0`
- Construct: Array index 0 is out of bounds. Array size is 0
- Version-appropriate rule/status: Pipeline failed at execute.

## 7. semantic:argument-count (4)

### sources/0753__Opus-Aether-AI-pine-transpiler__scanner_momentum_setup_-_rsi_directional_momentum.pine
- Declared Pine version: 6
- Source: https://github.com/Opus-Aether-AI/pine-transpiler :: `tests/corpus/community/arunkbhaskar/scanner_momentum_setup_-_rsi_directional_momentum.pine` @ `6506237f3a34c8082851e8f8d7da69062f0f4f3b`
- Stage: semantic
- Diagnostic: `698:31: argument-count: matrix.add_row() expects at most 2 arguments`
- Evidence: `matrix.add_row(matrix, 0, array.from(symbol, _time, price, pchg, vol_pchg, signal))`
- Construct: matrix.add_row argument shape
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: argument-count.

### sources/0767__TraderOracle-TradingView__Tidal-Wave.pine
- Declared Pine version: 5
- Source: https://github.com/TraderOracle/TradingView :: `Tidal Wave.pine` @ `08b33c19614e00361b6a2fa775f6d0038a205726`
- Stage: semantic
- Diagnostic: `63:32: argument-count: line.get_y1() expects at most 0 arguments`
- Evidence: `if (high > line.get_y1(line) and low < line.get_y1(line))`
- Construct: drawing getter receiver argument shape
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: argument-count.

### sources/0805__Opus-Aether-AI-pine-transpiler__scanner_ict_mitigation_block_scanner.pine
- Declared Pine version: 5
- Source: https://github.com/Opus-Aether-AI/pine-transpiler :: `tests/corpus/community/arunkbhaskar/scanner_ict_mitigation_block_scanner.pine` @ `6506237f3a34c8082851e8f8d7da69062f0f4f3b`
- Stage: semantic
- Diagnostic: `685:31: argument-count: matrix.add_row() expects at most 2 arguments`
- Evidence: `matrix.add_row(matrix, 0, array.from(symbol, _time, price, _cum_pchg, _cum_vol_pchg, signal))`
- Construct: matrix.add_row argument shape
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: argument-count.

### sources/0853__g-moe-Trading-Indicators__hooplah-high-low-table.pine
- Declared Pine version: 5
- Source: https://github.com/g-moe/Trading-Indicators :: `Tradingview/hooplah-high-low-table.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Stage: semantic
- Diagnostic: `452:33: argument-count: table.clear() expects at most 4 arguments`
- Evidence: `table.clear(table, 0, 0, 1, 6)`
- Construct: table.clear(table, 0, 0, 1, 6)
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: argument-count.

## 8. semantic:qualifier-mismatch (4)

### sources/0157__mihakralj-pinescript__binomdist.pine
- Declared Pine version: 6
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/binomdist.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Stage: semantic
- Diagnostic: `52:39: qualifier-mismatch: Cannot pass series value to simple parameter 'i' for function lnBinom; use an input/simple value or declare a compatible parameter`
- Evidence: `float lnTerm = lnBinom(n, i) + i * lnP + (n - i) * lnQ`
- Construct: qualifier inference compatibility
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: qualifier-mismatch.

### sources/0166__mihakralj-pinescript__gammadist.pine
- Declared Pine version: 6
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/gammadist.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Stage: semantic
- Diagnostic: `44:49: qualifier-mismatch: Cannot pass series value to simple parameter 'z' for function lnGamma; use an input/simple value or declare a compatible parameter`
- Evidence: `float lnPfx = a * math.log(x) - x - lnGamma(a)`
- Construct: qualifier inference compatibility
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: qualifier-mismatch.

### sources/0185__mihakralj-pinescript__poissondist.pine
- Declared Pine version: 6
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/poissondist.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Stage: semantic
- Diagnostic: `44:49: qualifier-mismatch: Cannot pass series value to simple parameter 'z' for function lnGamma; use an input/simple value or declare a compatible parameter`
- Evidence: `float lnPfx = a * math.log(x) - x - lnGamma(a)`
- Construct: qualifier inference compatibility
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: qualifier-mismatch.

### sources/0535__casoon-pine-scripts__vwap_cross_visuals.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `indicators/mean_reversion/vwap_cross_visuals/vwap_cross_visuals.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `1663:100: qualifier-mismatch: Cannot pass series value to simple parameter 'windowLength' for function calculateProfile; use an input/simple value or declare a compatible parameter`
- Evidence: `windowHigh, windowLow, binVolumes, binPrices] = calculateProfile(adaptiveConfig, windowStart, windowLength)`
- Construct: qualifier inference compatibility
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: qualifier-mismatch.

## 9. semantic:tuple-shape-mismatch (3)

### sources/0010__mihakralj-pinescript__jbands.pine
- Declared Pine version: 6
- Source: https://github.com/mihakralj/pinescript :: `indicators/channels/jbands.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Stage: semantic
- Diagnostic: `46:1: tuple-shape-mismatch: Tuple declaration expects 2 values but initializer arm returns a non-tuple value`
- Evidence: `[upperBand, lowerBand] = jbands(i_source, i_period)`
- Construct: tuple initializer shape
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: tuple-shape-mismatch.

### sources/0866__SenkuSupreme-TradingView-MT4-MT5-Indicators-Strategies-Collection__ALGOX-v13.pine
- Declared Pine version: 5
- Source: https://github.com/SenkuSupreme/TradingView-MT4-MT5-Indicators-Strategies-Collection :: `Strategy/ALGOX v13.pine` @ `b6b6f454c641d84690acd02d0323518357de2a66`
- Stage: semantic
- Diagnostic: `374:1: tuple-shape-mismatch: Tuple declaration expects 1 values but initializer arm returns a non-tuple value`
- Evidence: `[tp3Line]    = f_tp(condition, 1.2,leTrigger, seTrigger, i_src, i_lxLvlTP3, i_sxLvlTP3)`
- Construct: tuple initializer shape
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: tuple-shape-mismatch.

### sources/0999__g-moe-Trading-Indicators__xact-internals.pine
- Declared Pine version: 5
- Source: https://github.com/g-moe/Trading-Indicators :: `Tradingview/xact-internals.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Stage: semantic
- Diagnostic: `122:1: tuple-shape-mismatch: Tuple declaration expects 2 values but initializer arm returns a non-tuple value`
- Evidence: `[r1, r1_ticker] = f_sc(`
- Construct: tuple initializer shape
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: tuple-shape-mismatch.

## 10. semantic:unsupported-feature (3)

### sources/0496__casoon-pine-scripts__wavetrend_base_strategy.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `archive/strategies/wavetrend/wavetrend_base_strategy.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `24:28: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it`
- Evidence: `calc_on_order_fills = true,`
- Construct: calc_on_order_fills = true,
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unsupported-feature.

### sources/0610__casoon-pine-scripts__vein_reversal_labeler_strategy.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `strategies/vein_reversal_labeler/vein_reversal_labeler_strategy.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `23:28: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it`
- Evidence: `calc_on_order_fills = true,`
- Construct: calc_on_order_fills = true,
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unsupported-feature.

### sources/0611__casoon-pine-scripts__wavetrend_v4_strategy.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `strategies/wavetrend/wavetrend_v4_strategy.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `24:28: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it`
- Evidence: `calc_on_order_fills = true,`
- Construct: calc_on_order_fills = true,
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unsupported-feature.

## 11. execute:runtime.error (2)

### sources/0858__regalouisei-collect-tradingview__tabela-rsi-5-emas-dd.pine
- Declared Pine version: 5
- Source: https://github.com/regalouisei/collect-tradingview :: `pinescript/oscillators/tabela-rsi-5-emas-dd.pine` @ `5847fd3b47540ddd107be02b8c658409d35660ae`
- Stage: execute
- Diagnostic: `runtime.error: request.* calls in local scopes require dynamic_requests=true: request.security`
- Construct: runtime.error: request.* calls in local scopes require dynamic_requests=true: request.security
- Version-appropriate rule/status: Pipeline failed at execute.

### sources/0984__deepentropy-lightweight-charts-indicators__Supply-and-Demand-Daily-LuxAlgo-.pine
- Declared Pine version: 5
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_community/Supply and Demand Daily [LuxAlgo].pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Stage: execute
- Diagnostic: `runtime.error: request.security_lower_tf requires a lower timeframe than the chart timeframe: 60`
- Construct: runtime.error: request.security_lower_tf requires a lower timeframe than the chart timeframe: 60
- Version-appropriate rule/status: Pipeline failed at execute.

## 12. compile:Compilation error: Duplicate parameter name not allowed in this context (1)

### sources/0680__gktrk0530-pine-script-indicators.__mtf_trend_dashboard.pine
- Declared Pine version: 6
- Source: https://github.com/gktrk0530/pine-script-indicators. :: `mtf_trend_dashboard.pine` @ `2a1124ad5f3a92dee9fb791411f08f27c41cb5e2`
- Stage: compile
- Diagnostic: `Compilation error: Duplicate parameter name not allowed in this context`
- Construct: duplicate generated parameter
- Version-appropriate rule/status: Pipeline failed at compile.

## 13. compile:Compilation error: Identifier '_iter' has already been declared (1)

### sources/0583__casoon-pine-scripts__vein_structure_zones.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `indicators/trend_direction/vein/vein_structure_zones.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: compile
- Diagnostic: `Compilation error: Identifier '_iter' has already been declared`
- Construct: generated loop iterator collision
- Version-appropriate rule/status: Pipeline failed at compile.

## 14. execute:172:1: runtime.error: Not enough data to calculate Pivot Points. Lower the Pivots Timeframe in the indicator settings. (1)

### sources/0992__ali-rajabpour-ARPS-Pivots__ARPS-Pivots.pine
- Declared Pine version: 5
- Source: https://github.com/ali-rajabpour/ARPS-Pivots :: `ARPS Pivots.pine` @ `1850e5adb5ca3fefc83eb036595ba24fa716feaf`
- Stage: execute
- Diagnostic: `172:1: runtime.error: Not enough data to calculate Pivot Points. Lower the Pivots Timeframe in the indicator settings.`
- Evidence: `if (barstate.islastconfirmedhistory and drawnGraphics.columns() == 0)`
- Construct: 172:1: runtime.error: Not enough data to calculate Pivot Points. Lower the Pivots Timeframe in the indicator settings.
- Version-appropriate rule/status: Pipeline failed at execute.

## 15. execute:Cannot use pop() if array is empty. (1)

### sources/0902__helenananaa-pine-compat-runtime__array_methods.pine
- Declared Pine version: 5
- Source: https://github.com/helenananaa/pine-compat-runtime :: `tests/fixtures/runtime/array_methods.pine` @ `02afc1cb9005e2ae55a9862faaf41524895cbb34`
- Stage: execute
- Diagnostic: `Cannot use pop() if array is empty.`
- Construct: Cannot use pop() if array is empty.
- Version-appropriate rule/status: Pipeline failed at execute.

## 16. execute:classifier-timeout (1)

### sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine
- Declared Pine version: 5
- Source: https://github.com/helenananaa/pine-compat-runtime :: `tests/fixtures/syntax/deep_expression_limit.pine` @ `716fb7668557ffcdbcb3e9485a1d1a198d42f360`
- Stage: execute
- Diagnostic: `external corpus classifier timeout after 45s on isolated row`
- Construct: execution scale timeout
- Version-appropriate rule/status: The pinned classifier timed out during execution after a 45s isolated-row limit; parser and execution scale require follow-up.

## 17. execute:Matrix multiplication requires left columns to match right rows. Left is undefinedxundefined, right is 8x4 (1)

### sources/0134__mihakralj-pinescript__mlp.pine
- Declared Pine version: 6
- Source: https://github.com/mihakralj/pinescript :: `indicators/forecasts/mlp.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Stage: execute
- Diagnostic: `Matrix multiplication requires left columns to match right rows. Left is undefinedxundefined, right is 8x4`
- Construct: Matrix multiplication requires left columns to match right rows. Left is undefinedxundefined, right is 8x4
- Version-appropriate rule/status: Pipeline failed at execute.

## 18. output:global-output-declared-but-not-evaluated (1)

### sources/0806__quant5-lab-runner__05_scientific_notation.pine
- Declared Pine version: 5
- Source: https://github.com/quant5-lab/runner :: `tests/number_format_edge_cases/05_scientific_notation.pine` @ `8035872a7c65f8bfce370976a9a4aabc80342ad9`
- Stage: output
- Diagnostic: `output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.`
- Construct: global-output-declared-but-not-evaluated
- Version-appropriate rule/status: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.

## 19. output:table-or-coloring-only-output (1)

### sources/0603__casoon-pine-scripts__RTAMonitoring.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `libraries/RTAMonitoring.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: output
- Diagnostic: `output-silence:table-or-coloring-only-output: The source only declares table or bar/background-color outputs, and the corpus visible-output funnel did not receive counted plot, drawing, alert, or log payloads.`
- Construct: table-or-coloring-only-output
- Version-appropriate rule/status: The source only declares table or bar/background-color outputs, and the corpus visible-output funnel did not receive counted plot, drawing, alert, or log payloads.

## 20. semantic:invalid-na-bool (1)

### sources/0987__deepentropy-lightweight-charts-indicators__ICT-Algorithmic-Macro-Tracker-Open-Source-by-toodegrees.pine
- Declared Pine version: 5
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_community/ICT Algorithmic Macro Tracker° (Open-Source) by toodegrees.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Stage: semantic
- Diagnostic: `51:12: invalid-na-bool: na cannot be used as a boolean expression; wrap it in bool(...) or test a value with na(...)`
- Evidence: `if na or _lines.last().get_x2() == time`
- Construct: if na or _lines.last().get_x2() == time
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: invalid-na-bool.

## 21. semantic:library-export (1)

### sources/0604__casoon-pine-scripts__RTAStrategy.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `libraries/RTAStrategy.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `1049:10: library-export: Exported function getMOSTDirectionHTF request expression cannot depend on exported parameters`
- Evidence: `calculateMOSTDirection(atrLength, multiplier),`
- Construct: calculateMOSTDirection(atrLength, multiplier),
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: library-export.

## 22. semantic:unknown-function (1)

### sources/0598__casoon-pine-scripts__time_to_react_volatility_time.pine
- Declared Pine version: 6
- Source: https://github.com/casoon/pine-scripts :: `indicators/volatility/time_to_react_volatility_time/time_to_react_volatility_time.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `423:31: unknown-function: Unknown function: math.tanh`
- Evidence: `activityScore = 50.0 + 50.0 * math.tanh((ratio - 1.0) * activityK)`
- Construct: missing function math.tanh
- Version-appropriate rule/status: Semantic failure is not proven invalid Pine: unknown-function.
