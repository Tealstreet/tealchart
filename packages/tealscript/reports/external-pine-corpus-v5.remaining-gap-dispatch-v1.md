> Superseded by external-pine-corpus-v5.remaining-gap-dispatch-v5.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Remaining Gap Dispatch V1

Pinned measurement commit: `1bd0cf4926b508a143fa3b57f585b191215b17a7`. This list is the raw v5 TealScript-gap remainder after overlaying the row-level V4 verdicts. It is **73 rows, not 9**: the earlier 9-row figure double-counted rows already in the raw invalid-Pine bucket.

Corrected buckets: `832 supported / 73 TealScript gap / 85 invalid Pine / 10 unsupported-by-design`; achievable denominator `905`; support `832/905 = 91.93%`.

Rows are grouped by current first-failure stage. “Pending” means the row is still a gap/measurement item, not that its Pine validity has been proven.

## parse (26)

### sources/0165__mihakralj-pinescript__fft.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/fft.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Diagnostic: `22:18: Expected "#", "'", "(", ".", "/*", "//", "[", "\"", "\"\"\"", "array", "bool", "color", "const", "false", "float", "input", "int", "map", "matrix", "na", "not", "series", "simple", "string", "true", [ \t], [+\-], [0-9], or [\n\r] but "<" found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0197__mihakralj-pinescript__apo.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/oscillators/apo.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Diagnostic: `21:12: Expected ".", "/*", "[", "[]", or [ \t] but "n" found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0502__casoon-pine-scripts__auto_trendlines.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/market_structure/auto_trendlines/auto_trendlines.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `275:45: Expected ".", "/*", "[", "[]", or [ \t] but "\n" found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0519__casoon-pine-scripts__smc_structure_expectation.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/market_structure/smc_structure_expectation/smc_structure_expectation.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `1083:51: Expected ".", "/*", "=", "[", "[]", or [ \t] but "+" found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0564__casoon-pine-scripts__money_flow_delta_profile.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/money_flow/money_flow_delta_profile/money_flow_delta_profile.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `239:29: Expected ",", "/*", "//", ">", "[", "array", "bool", "color", "const", "float", "input", "int", "map", "matrix", "series", "simple", "string", [ \t], or [\n\r] but "(" found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0651__knectardev-pine_scripts__v2.5.6_v2.5.10.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8/archive/v2.5.6_v2.5.9/archive/v2.5.6_v2.5.10.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Diagnostic: `150:17: Expected ".", "/*", "[", "[]", or [ \t] but "\n" found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0652__knectardev-pine_scripts__v2.5.6_v2.5.11.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8/archive/v2.5.6_v2.5.9/archive/v2.5.6_v2.5.10/archive/v2.5.6_v2.5.11.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Diagnostic: `151:17: Expected ".", "/*", "[", "[]", or [ \t] but "\n" found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0653__knectardev-pine_scripts__v2.5.6_v2.5.12.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8/archive/v2.5.6_v2.5.9/archive/v2.5.6_v2.5.10/archive/v2.5.6_v2.5.11/archive/v2.5.6_v2.5.12.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Diagnostic: `152:17: Expected ".", "/*", "[", "[]", or [ \t] but "\n" found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0720__deepentropy-lightweight-charts-indicators__Performance.pine
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_standard/Performance.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Diagnostic: `7:120: Expected "\"" or "\\" but "\n" found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0732__deepentropy-lightweight-charts-indicators__Multi-Time-Period-Charts.pine
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_standard/Multi-Time Period Charts.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Diagnostic: `5:120: Expected "\"" or "\\" but "\n" found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0796__Leci37-tuisku_Web_selling__R09PRyAtIDFEYXkgLSAyU1YwIC0gNGZlMjJhYTk.pine
- Source: https://github.com/Leci37/tuisku_Web_selling :: `d_result/pine_TW_hide/R09PRyAtIDFEYXkgLSAyU1YwIC0gNGZlMjJhYTk.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0798__Leci37-tuisku_Web_selling__RERPRyAtIDMwTWluIC0gMlRWMCAtIGFiYzFhN2Rj.pine
- Source: https://github.com/Leci37/tuisku_Web_selling :: `d_result/pine_TW_hide/RERPRyAtIDMwTWluIC0gMlRWMCAtIGFiYzFhN2Rj.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0827__deepentropy-lightweight-charts-indicators__Open-Interest-Suite-Aggregated---By-Leviathan.pine
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_community/Open Interest Suite [Aggregated] - By Leviathan.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Diagnostic: `196:25: Expected "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "else", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "matrix", "method", "na", "not", "once", "overload", "series", "simple", "strategy", "string", "study", "switch", "true", "type", "var", "varip", "while", [ \t], [+\-], [0-9], [\n\r], or end of input but "=" found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0828__deepentropy-lightweight-charts-indicators__Support-Resistance-Classification-VR-LuxAlgo-.pine
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_community/Support Resistance Classification (VR) [LuxAlgo].pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Diagnostic: `262:55: Expected "/*", "=", or [ \t] but "\r" found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0838__SenkuSupreme-TradingView-MT4-MT5-Indicators-Strategies-Collection__VP-MAPS-OB-S-R-GGSHOT-HH-BY-LEO.pine
- Source: https://github.com/SenkuSupreme/TradingView-MT4-MT5-Indicators-Strategies-Collection :: `Indicators/VP(MAPS)+OB+S&R+GGSHOT+HH BY LEO.pine` @ `b6b6f454c641d84690acd02d0323518357de2a66`
- Diagnostic: `43:53: Expected "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "matrix", "method", "na", "not", "once", "overload", "series", "simple", "strategy", "string", "study", "switch", "true", "type", "var", "varip", "while", [ \t], [+\-], [0-9], [\n\r], or end of input but "," found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0880__Leci37-tuisku_Web_selling__VFJYVVNEVCAtIDFEYXkgLSAxTUFEIC0gZGI4ODk1Zjk.pine
- Source: https://github.com/Leci37/tuisku_Web_selling :: `d_result/pine_TW_hide/VFJYVVNEVCAtIDFEYXkgLSAxTUFEIC0gZGI4ODk1Zjk.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0894__Leci37-tuisku_Web_selling__TUVUQSAtIDFEYXkgLSAyQ1YwIC0gOGRmN2I1MTc.pine
- Source: https://github.com/Leci37/tuisku_Web_selling :: `d_result/pine_TW_hide/TUVUQSAtIDFEYXkgLSAyQ1YwIC0gOGRmN2I1MTc.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0895__Leci37-tuisku_Web_selling__Q1JXRCAtIDFEYXkgLSAyVFYwIC0gNjk2ZDY4OTc.pine
- Source: https://github.com/Leci37/tuisku_Web_selling :: `d_result/pine_TW_hide/Q1JXRCAtIDFEYXkgLSAyVFYwIC0gNjk2ZDY4OTc.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0897__Leci37-tuisku_Web_selling__R1RMQiAtIDFIb3VyIC0gMVNRVSAtIDA2OWQwNjZh.pine
- Source: https://github.com/Leci37/tuisku_Web_selling :: `d_result/pine_TW_hide/R1RMQiAtIDFIb3VyIC0gMVNRVSAtIDA2OWQwNjZh.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0909__deepentropy-oakscriptJS__Open-Interest-Suite-Aggregated---By-Leviathan.pine
- Source: https://github.com/deepentropy/oakscriptJS :: `docs/official/indicators_community/Open Interest Suite [Aggregated] - By Leviathan.pine` @ `d7bbd272e9ba6e12bb304a4c6d83d67f57afd2a0`
- Diagnostic: `196:25: Expected "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "else", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "matrix", "method", "na", "not", "once", "overload", "series", "simple", "strategy", "string", "study", "switch", "true", "type", "var", "varip", "while", [ \t], [+\-], [0-9], [\n\r], or end of input but "=" found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0910__deepentropy-oakscriptJS__Support-Resistance-Classification-VR-LuxAlgo-.pine
- Source: https://github.com/deepentropy/oakscriptJS :: `docs/official/indicators_community/Support Resistance Classification (VR) [LuxAlgo].pine` @ `d7bbd272e9ba6e12bb304a4c6d83d67f57afd2a0`
- Diagnostic: `262:55: Expected "/*", "=", or [ \t] but "\r" found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0916__Leci37-tuisku_Web_selling__RE9UVVNEVCAtIDFIb3VyIC0gMlRWMCAtIDU0YjQ3ODk4.pine
- Source: https://github.com/Leci37/tuisku_Web_selling :: `d_result/pine_TW_hide/RE9UVVNEVCAtIDFIb3VyIC0gMlRWMCAtIDU0YjQ3ODk4.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0919__g-moe-Trading-Indicators__divergence-scanner.pine
- Source: https://github.com/g-moe/Trading-Indicators :: `Tradingview/divergence-scanner.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Diagnostic: `19:259: Expected "'" or "\\" but "\n" found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0927__ferranbt-pinecone__not_a_library.pine
- Source: https://github.com/ferranbt/pinecone :: `tests/testdata/import/not_a_library.pine` @ `cd8b96da56ef9657f6ce33eb52753c5945adf3bc`
- Diagnostic: `4:15: Expected "/*", "=", or [ \t] but "a" found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0936__Leci37-tuisku_Web_selling__TklPIC0gMURheSAtIDJNTTAgLSA1MDVlZGYxZg.pine
- Source: https://github.com/Leci37/tuisku_Web_selling :: `d_result/pine_TW_hide/TklPIC0gMURheSAtIDJNTTAgLSA1MDVlZGYxZg.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0949__g-moe-Trading-Indicators__xact-technical-analysis.pine
- Source: https://github.com/g-moe/Trading-Indicators :: `Tradingview/xact-technical-analysis.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Diagnostic: `11:103: Expected "\"" or "\\" but "\n" found.`
- Construct: source construct rejected during parsing
- v6 rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

## semantic (31)

### sources/0010__mihakralj-pinescript__jbands.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/channels/jbands.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Diagnostic: `46:1: tuple-shape-mismatch: Tuple declaration expects 2 values but initializer arm returns a non-tuple value`
- Construct: runtime construct failed under corpus inputs
- v6 rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0089__mihakralj-pinescript__theilu.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/errors/theilu.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Diagnostic: `21:24: unknown-function: Unknown function: ta.sum`
- Construct: builtin/function call not resolved
- v6 rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0091__mihakralj-pinescript__wmape.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/errors/wmape.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Diagnostic: `19:25: unknown-function: Unknown function: ta.sum`
- Construct: builtin/function call not resolved
- v6 rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0092__mihakralj-pinescript__wrmse.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/errors/wrmse.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Diagnostic: `21:30: unknown-function: Unknown function: ta.sum`
- Construct: builtin/function call not resolved
- v6 rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0484__casoon-pine-scripts__candle_pressure_response_jma.pine
- Source: https://github.com/casoon/pine-scripts :: `archive/indicators/candle_pressure_response_jma/candle_pressure_response_jma.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `166:9: unknown-function: Unknown function: ta.sum`
- Construct: builtin/function call not resolved
- v6 rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0498__casoon-pine-scripts__wavetrend_v3_strategy.pine
- Source: https://github.com/casoon/pine-scripts :: `archive/strategies/wavetrend/wavetrend_v3_strategy.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `748:13: type-mismatch: Cannot assign float value to int variable _binIdx`
- Construct: nteger `math.floor()` result passed through integer `math.min`/`math.max`
- v6 rule/status: `math.floor()` returns an integer, and integer overloads of `math.min`/`math.max` preserve the integer type; assigning the result to `_binIdx` is valid. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0539__casoon-pine-scripts__fisher_transform_advanced.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/fisher_transform_advanced/fisher_transform_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `106:20: unknown-identifier: Unknown identifier: e6`
- Construct: ocal variable referenced after its declaration in a UDF return expression
- v6 rule/status: A local variable declared earlier in the same function scope is available to later expressions and may be returned; these are not forward references. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0550__casoon-pine-scripts__roc_advanced.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/roc_advanced/roc_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `106:20: unknown-identifier: Unknown identifier: e6`
- Construct: ocal variable referenced after its declaration in a UDF return expression
- v6 rule/status: A local variable declared earlier in the same function scope is available to later expressions and may be returned; these are not forward references. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0551__casoon-pine-scripts__rsi_advanced.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/rsi_advanced/rsi_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `109:20: unknown-identifier: Unknown identifier: e6`
- Construct: ocal variable referenced after its declaration in a UDF return expression
- v6 rule/status: A local variable declared earlier in the same function scope is available to later expressions and may be returned; these are not forward references. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0553__casoon-pine-scripts__tsi_advanced.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/tsi_advanced/tsi_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `107:20: unknown-identifier: Unknown identifier: e6`
- Construct: ocal variable referenced after its declaration in a UDF return expression
- v6 rule/status: A local variable declared earlier in the same function scope is available to later expressions and may be returned; these are not forward references. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0556__casoon-pine-scripts__wavetrend_v3.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/wavetrend/wavetrend_v3.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `547:13: type-mismatch: Cannot assign float value to int variable _binIdx`
- Construct: nteger `math.floor()` result passed through integer `math.min`/`math.max`
- v6 rule/status: `math.floor()` returns an integer, and integer overloads of `math.min`/`math.max` preserve the integer type; assigning the result to `_binIdx` is valid. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0558__casoon-pine-scripts__williams_r_advanced.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/williams_r_advanced/williams_r_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `109:20: unknown-identifier: Unknown identifier: e6`
- Construct: ocal variable referenced after its declaration in a UDF return expression
- v6 rule/status: A local variable declared earlier in the same function scope is available to later expressions and may be returned; these are not forward references. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0588__casoon-pine-scripts__market_memory_decay_oscillator.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/trend_strength/market_memory_decay_oscillator/market_memory_decay_oscillator.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `100:8: unknown-function: Unknown function: ta.sum`
- Construct: builtin/function call not resolved
- v6 rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0598__casoon-pine-scripts__time_to_react_volatility_time.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/volatility/time_to_react_volatility_time/time_to_react_volatility_time.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `423:31: unknown-function: Unknown function: math.tanh`
- Construct: builtin/function call not resolved
- v6 rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0604__casoon-pine-scripts__RTAStrategy.pine
- Source: https://github.com/casoon/pine-scripts :: `libraries/RTAStrategy.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `1049:10: library-export: Exported function getMOSTDirectionHTF request expression cannot depend on exported parameters`
- Construct: runtime construct failed under corpus inputs
- v6 rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0639__knectardev-pine_scripts__es-professional-fade-strategy.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Diagnostic: `196:22: unknown-function: Unknown function: ta.sum`
- Construct: builtin/function call not resolved
- v6 rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0643__knectardev-pine_scripts__es-professional-fade-strategy-v2.5.7-FIXED.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy-v2.5.7-FIXED.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Diagnostic: `135:22: unknown-function: Unknown function: ta.sum`
- Construct: builtin/function call not resolved
- v6 rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0644__knectardev-pine_scripts__es-professional-fade-strategy.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Diagnostic: `120:22: unknown-function: Unknown function: ta.sum`
- Construct: builtin/function call not resolved
- v6 rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0645__knectardev-pine_scripts__v2.5.5.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Diagnostic: `135:22: unknown-function: Unknown function: ta.sum`
- Construct: builtin/function call not resolved
- v6 rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0646__knectardev-pine_scripts__v2.5.6.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Diagnostic: `129:22: unknown-function: Unknown function: ta.sum`
- Construct: builtin/function call not resolved
- v6 rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0649__knectardev-pine_scripts__v2.5.6_v2.5.8.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Diagnostic: `129:22: unknown-function: Unknown function: ta.sum`
- Construct: builtin/function call not resolved
- v6 rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0753__Opus-Aether-AI-pine-transpiler__scanner_momentum_setup_-_rsi_directional_momentum.pine
- Source: https://github.com/Opus-Aether-AI/pine-transpiler :: `tests/corpus/community/arunkbhaskar/scanner_momentum_setup_-_rsi_directional_momentum.pine` @ `6506237f3a34c8082851e8f8d7da69062f0f4f3b`
- Diagnostic: `698:31: argument-count: matrix.add_row() expects at most 2 arguments`
- Construct: alid namespace call counted as an over-arity method call
- v6 rule/status: The documented namespace forms accept these arguments: `matrix.add_row(id, row, array)`, `line.get_y1(line)`, and `table.clear(table_id, start_column, start_row, end_column, end_row)`. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0767__TraderOracle-TradingView__Tidal-Wave.pine
- Source: https://github.com/TraderOracle/TradingView :: `Tidal Wave.pine` @ `08b33c19614e00361b6a2fa775f6d0038a205726`
- Diagnostic: `63:32: argument-count: line.get_y1() expects at most 0 arguments`
- Construct: alid namespace call counted as an over-arity method call
- v6 rule/status: The documented namespace forms accept these arguments: `matrix.add_row(id, row, array)`, `line.get_y1(line)`, and `table.clear(table_id, start_column, start_row, end_column, end_row)`. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0771__msongkiet-TDV_share__ZigZag_EMA.pine
- Source: https://github.com/msongkiet/TDV_share :: `ZigZag_EMA.pine` @ `7eac7fabc4fc75ef13ca2d81036504032eb460ea`
- Diagnostic: `4:1: unresolved-import: Official TradingView library 'TradingView/ZigZag' version 6 is not implemented by TealScript; implement that documented standard-library surface or remove/change the import`
- Construct: official/library import unresolved
- v6 rule/status: The v6 library/import surface requires the referenced library to be available to the host; this is a library-registry implementation/input dependency. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0805__Opus-Aether-AI-pine-transpiler__scanner_ict_mitigation_block_scanner.pine
- Source: https://github.com/Opus-Aether-AI/pine-transpiler :: `tests/corpus/community/arunkbhaskar/scanner_ict_mitigation_block_scanner.pine` @ `6506237f3a34c8082851e8f8d7da69062f0f4f3b`
- Diagnostic: `685:31: argument-count: matrix.add_row() expects at most 2 arguments`
- Construct: alid namespace call counted as an over-arity method call
- v6 rule/status: The documented namespace forms accept these arguments: `matrix.add_row(id, row, array)`, `line.get_y1(line)`, and `table.clear(table_id, start_column, start_row, end_column, end_row)`. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0853__g-moe-Trading-Indicators__hooplah-high-low-table.pine
- Source: https://github.com/g-moe/Trading-Indicators :: `Tradingview/hooplah-high-low-table.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Diagnostic: `452:33: argument-count: table.clear() expects at most 4 arguments`
- Construct: alid namespace call counted as an over-arity method call
- v6 rule/status: The documented namespace forms accept these arguments: `matrix.add_row(id, row, array)`, `line.get_y1(line)`, and `table.clear(table_id, start_column, start_row, end_column, end_row)`. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0865__hasnocool-tradingview-pine-scripts__John-F.-Ehlers-Center-Of-Gravity-Balanced-by-DM-.pine
- Source: https://github.com/hasnocool/tradingview-pine-scripts :: `John F. Ehlers Center Of Gravity Balanced by [DM].pine` @ `e031cab2819a7d56fb8bb9d000252f51439986e2`
- Diagnostic: `40:6: unknown-identifier: Unknown identifier: avg_sig`
- Construct: ocal variable referenced after its declaration in a UDF return expression
- v6 rule/status: A local variable declared earlier in the same function scope is available to later expressions and may be returned; these are not forward references. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0866__SenkuSupreme-TradingView-MT4-MT5-Indicators-Strategies-Collection__ALGOX-v13.pine
- Source: https://github.com/SenkuSupreme/TradingView-MT4-MT5-Indicators-Strategies-Collection :: `Strategy/ALGOX v13.pine` @ `b6b6f454c641d84690acd02d0323518357de2a66`
- Diagnostic: `374:1: tuple-shape-mismatch: Tuple declaration expects 1 values but initializer arm returns a non-tuple value`
- Construct: runtime construct failed under corpus inputs
- v6 rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0948__g-moe-Trading-Indicators__lower-forecast.pine
- Source: https://github.com/g-moe/Trading-Indicators :: `Tradingview/lower-forecast.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Diagnostic: `210:20: unknown-argument: Unknown argument 'table_id' for table.cell()`
- Construct: table.cell(table_id = table, ...)` named first parameter
- v6 rule/status: `table.cell()` exposes its first parameter as `table_id`; named arguments may be used for it, so this call is valid v6. [v6 tables](https://www.tradingview.com/pine-script-docs/visuals/tables/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0987__deepentropy-lightweight-charts-indicators__ICT-Algorithmic-Macro-Tracker-Open-Source-by-toodegrees.pine
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_community/ICT Algorithmic Macro Tracker° (Open-Source) by toodegrees.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Diagnostic: `51:12: invalid-na-bool: na cannot be used as a boolean expression; wrap it in bool(...) or test a value with na(...)`
- Construct: runtime construct failed under corpus inputs
- v6 rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0999__g-moe-Trading-Indicators__xact-internals.pine
- Source: https://github.com/g-moe/Trading-Indicators :: `Tradingview/xact-internals.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Diagnostic: `122:1: tuple-shape-mismatch: Tuple declaration expects 2 values but initializer arm returns a non-tuple value`
- Construct: runtime construct failed under corpus inputs
- v6 rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## compile (2)

### sources/0583__casoon-pine-scripts__vein_structure_zones.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/trend_direction/vein/vein_structure_zones.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `Compilation error: Identifier '_iter' has already been declared`
- Construct: compiled-path construct rejected
- v6 rule/status: The v6 language construct parsed and passed semantics; compiled support remains to be implemented or classified. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0680__gktrk0530-pine-script-indicators.__mtf_trend_dashboard.pine
- Source: https://github.com/gktrk0530/pine-script-indicators. :: `mtf_trend_dashboard.pine` @ `2a1124ad5f3a92dee9fb791411f08f27c41cb5e2`
- Diagnostic: `Compilation error: Duplicate parameter name not allowed in this context`
- Construct: compiled-path construct rejected
- v6 rule/status: The v6 language construct parsed and passed semantics; compiled support remains to be implemented or classified. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

## execute (9)

### sources/0134__mihakralj-pinescript__mlp.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/forecasts/mlp.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Diagnostic: `Matrix multiplication requires left columns to match right rows. Left is undefinedxundefined, right is 8x4`
- Construct: runtime construct failed under corpus inputs
- v6 rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

### sources/0497__casoon-pine-scripts__wavetrend_strategy.pine
- Source: https://github.com/casoon/pine-scripts :: `archive/strategies/wavetrend/wavetrend_strategy.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `Array index 0 is out of bounds. Array size is 0`
- Construct: rray access on an empty runtime array (`array.last`, `array.get`, or equivalent)
- v6 rule/status: The array APIs are valid Pine; an empty-array access is a runtime condition and must be reproduced or diagnosed at the execution boundary, not rejected as invalid source. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

### sources/0529__casoon-pine-scripts__zigzag_core.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/market_structure/zigzag_core/zigzag_core.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `Array index 0 is out of bounds. Array size is 0`
- Construct: rray access on an empty runtime array (`array.last`, `array.get`, or equivalent)
- v6 rule/status: The array APIs are valid Pine; an empty-array access is a runtime condition and must be reproduced or diagnosed at the execution boundary, not rejected as invalid source. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

### sources/0554__casoon-pine-scripts__wavetrend.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/wavetrend/wavetrend.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `Array index 0 is out of bounds. Array size is 0`
- Construct: rray access on an empty runtime array (`array.last`, `array.get`, or equivalent)
- v6 rule/status: The array APIs are valid Pine; an empty-array access is a runtime condition and must be reproduced or diagnosed at the execution boundary, not rejected as invalid source. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

### sources/0760__supertonka-tradingview-ict-indicator__orderblock_indicator.pine
- Source: https://github.com/supertonka/tradingview-ict-indicator :: `orderblock_indicator.pine` @ `a65385012d39d44e53e0c27ee2f7f02aa2802a34`
- Diagnostic: `Array index 0 is out of bounds. Array size is 0`
- Construct: rray access on an empty runtime array (`array.last`, `array.get`, or equivalent)
- v6 rule/status: The array APIs are valid Pine; an empty-array access is a runtime condition and must be reproduced or diagnosed at the execution boundary, not rejected as invalid source. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

### sources/0902__helenananaa-pine-compat-runtime__array_methods.pine
- Source: https://github.com/helenananaa/pine-compat-runtime :: `tests/fixtures/runtime/array_methods.pine` @ `02afc1cb9005e2ae55a9862faaf41524895cbb34`
- Diagnostic: `Cannot use pop() if array is empty.`
- Construct: runtime construct failed under corpus inputs
- v6 rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

### sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine
- Source: https://github.com/helenananaa/pine-compat-runtime :: `tests/fixtures/syntax/deep_expression_limit.pine` @ `716fb7668557ffcdbcb3e9485a1d1a198d42f360`
- Diagnostic: `external corpus classifier timeout after 45s on isolated row`
- Construct: runtime construct failed under corpus inputs
- v6 rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

### sources/0984__deepentropy-lightweight-charts-indicators__Supply-and-Demand-Daily-LuxAlgo-.pine
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_community/Supply and Demand Daily [LuxAlgo].pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Diagnostic: `runtime.error: request.security_lower_tf requires a lower timeframe than the chart timeframe: 60`
- Construct: runtime construct failed under corpus inputs
- v6 rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

### sources/0992__ali-rajabpour-ARPS-Pivots__ARPS-Pivots.pine
- Source: https://github.com/ali-rajabpour/ARPS-Pivots :: `ARPS Pivots.pine` @ `1850e5adb5ca3fefc83eb036595ba24fa716feaf`
- Diagnostic: `172:1: runtime.error: Not enough data to calculate Pivot Points. Lower the Pivots Timeframe in the indicator settings.`
- Construct: runtime construct failed under corpus inputs
- v6 rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

## output (5)

### sources/0511__casoon-pine-scripts__market_scenario_projector.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/market_structure/market_scenario_projector/market_scenario_projector.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.`
- Construct: visible output not observed on synthetic input
- v6 rule/status: A valid script may legitimately produce conditional/data-gated output; this is an instrumentation/behavior question, not a syntax rule. [v6 visuals](https://www.tradingview.com/pine-script-docs/visuals/)

### sources/0603__casoon-pine-scripts__RTAMonitoring.pine
- Source: https://github.com/casoon/pine-scripts :: `libraries/RTAMonitoring.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Diagnostic: `output-silence:table-or-coloring-only-output: The source only declares table or bar/background-color outputs, and the corpus visible-output funnel did not receive counted plot, drawing, alert, or log payloads.`
- Construct: visible output not observed on synthetic input
- v6 rule/status: A valid script may legitimately produce conditional/data-gated output; this is an instrumentation/behavior question, not a syntax rule. [v6 visuals](https://www.tradingview.com/pine-script-docs/visuals/)

### sources/0647__knectardev-pine_scripts__v2.5.6_v2.5.13.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.13.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Diagnostic: `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.`
- Construct: visible output not observed on synthetic input
- v6 rule/status: A valid script may legitimately produce conditional/data-gated output; this is an instrumentation/behavior question, not a syntax rule. [v6 visuals](https://www.tradingview.com/pine-script-docs/visuals/)

### sources/0759__iamhuraira-trading-view-script__FVG_with_IFVG_Indicator.pine
- Source: https://github.com/iamhuraira/trading-view-script :: `FVG_with_IFVG_Indicator.pine` @ `558a170383d5d4f4f3df1a6bb245b1ecad51fe08`
- Diagnostic: `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.`
- Construct: visible output not observed on synthetic input
- v6 rule/status: A valid script may legitimately produce conditional/data-gated output; this is an instrumentation/behavior question, not a syntax rule. [v6 visuals](https://www.tradingview.com/pine-script-docs/visuals/)

### sources/0806__quant5-lab-runner__05_scientific_notation.pine
- Source: https://github.com/quant5-lab/runner :: `tests/number_format_edge_cases/05_scientific_notation.pine` @ `8035872a7c65f8bfce370976a9a4aabc80342ad9`
- Diagnostic: `output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.`
- Construct: visible output not observed on synthetic input
- v6 rule/status: A valid script may legitimately produce conditional/data-gated output; this is an instrumentation/behavior question, not a syntax rule. [v6 visuals](https://www.tradingview.com/pine-script-docs/visuals/)

