> Superseded by external-pine-corpus-v5.remaining-gap-dispatch-v5.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Remaining Gap Dispatch V2

Pinned measurement commit: `1bd0cf4926b508a143fa3b57f585b191215b17a7`. This dispatch list is derived from the pinned v5 report and the committed row/version audits. It contains **83 unique remaining TealScript-gap rows** after applying the 10 declared-version corrections. The earlier v1 list contained 73 rows and predates those corrections.

Corrected headline: **832 supported / 83 TealScript gap / 75 invalid Pine / 10 unsupported-by-design**; achievable denominator **915**; support **832/915 = 90.93%**. Rows are ranked by root-cause count, then retain their exact pinned evidence.

The version audit's accepted corrections are included as gaps because their declared-version semantics are supported Pine: v4/v5 linewidth zero, numeric-to-bool coercion, and boolean `na`/`nz` behavior.

## 1. parser rejection: version-valid syntax not accepted (13)

### sources/0197__mihakralj-pinescript__apo.pine
- Declared Pine version: v6
- Source: https://github.com/mihakralj/pinescript :: `indicators/oscillators/apo.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Stage: parse
- Diagnostic: `21:12: Expected ".", "/*", "[", "[]", or [ \t] but "n" found.`
- Evidence: line 21: `if na(emaFast)`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0519__casoon-pine-scripts__smc_structure_expectation.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `indicators/market_structure/smc_structure_expectation/smc_structure_expectation.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: parse
- Diagnostic: `1083:51: Expected ".", "/*", "=", "[", "[]", or [ \t] but "+" found.`
- Evidence: line 1083: `score += 10.0`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0796__Leci37-tuisku_Web_selling__R09PRyAtIDFEYXkgLSAyU1YwIC0gNGZlMjJhYTk.pine
- Declared Pine version: v5
- Source: https://github.com/Leci37/tuisku_Web_selling :: `d_result/pine_TW_hide/R09PRyAtIDFEYXkgLSAyU1YwIC0gNGZlMjJhYTk.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Stage: parse
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Evidence: line 61: `...`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0798__Leci37-tuisku_Web_selling__RERPRyAtIDMwTWluIC0gMlRWMCAtIGFiYzFhN2Rj.pine
- Declared Pine version: v5
- Source: https://github.com/Leci37/tuisku_Web_selling :: `d_result/pine_TW_hide/RERPRyAtIDMwTWluIC0gMlRWMCAtIGFiYzFhN2Rj.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Stage: parse
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Evidence: line 61: `...`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0828__deepentropy-lightweight-charts-indicators__Support-Resistance-Classification-VR-LuxAlgo-.pine
- Declared Pine version: v5
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_community/Support Resistance Classification (VR) [LuxAlgo].pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Stage: parse
- Diagnostic: `262:55: Expected "/*", "=", or [ \t] but "\r" found.`
- Evidence: line 262: `for d = 0 to bars`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0880__Leci37-tuisku_Web_selling__VFJYVVNEVCAtIDFEYXkgLSAxTUFEIC0gZGI4ODk1Zjk.pine
- Declared Pine version: v5
- Source: https://github.com/Leci37/tuisku_Web_selling :: `d_result/pine_TW_hide/VFJYVVNEVCAtIDFEYXkgLSAxTUFEIC0gZGI4ODk1Zjk.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Stage: parse
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Evidence: line 61: `...`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0894__Leci37-tuisku_Web_selling__TUVUQSAtIDFEYXkgLSAyQ1YwIC0gOGRmN2I1MTc.pine
- Declared Pine version: v5
- Source: https://github.com/Leci37/tuisku_Web_selling :: `d_result/pine_TW_hide/TUVUQSAtIDFEYXkgLSAyQ1YwIC0gOGRmN2I1MTc.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Stage: parse
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Evidence: line 61: `...`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0895__Leci37-tuisku_Web_selling__Q1JXRCAtIDFEYXkgLSAyVFYwIC0gNjk2ZDY4OTc.pine
- Declared Pine version: v5
- Source: https://github.com/Leci37/tuisku_Web_selling :: `d_result/pine_TW_hide/Q1JXRCAtIDFEYXkgLSAyVFYwIC0gNjk2ZDY4OTc.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Stage: parse
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Evidence: line 61: `...`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0897__Leci37-tuisku_Web_selling__R1RMQiAtIDFIb3VyIC0gMVNRVSAtIDA2OWQwNjZh.pine
- Declared Pine version: v5
- Source: https://github.com/Leci37/tuisku_Web_selling :: `d_result/pine_TW_hide/R1RMQiAtIDFIb3VyIC0gMVNRVSAtIDA2OWQwNjZh.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Stage: parse
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Evidence: line 61: `...`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0910__deepentropy-oakscriptJS__Support-Resistance-Classification-VR-LuxAlgo-.pine
- Declared Pine version: v5
- Source: https://github.com/deepentropy/oakscriptJS :: `docs/official/indicators_community/Support Resistance Classification (VR) [LuxAlgo].pine` @ `d7bbd272e9ba6e12bb304a4c6d83d67f57afd2a0`
- Stage: parse
- Diagnostic: `262:55: Expected "/*", "=", or [ \t] but "\r" found.`
- Evidence: line 262: `for d = 0 to bars`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0916__Leci37-tuisku_Web_selling__RE9UVVNEVCAtIDFIb3VyIC0gMlRWMCAtIDU0YjQ3ODk4.pine
- Declared Pine version: v5
- Source: https://github.com/Leci37/tuisku_Web_selling :: `d_result/pine_TW_hide/RE9UVVNEVCAtIDFIb3VyIC0gMlRWMCAtIDU0YjQ3ODk4.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Stage: parse
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Evidence: line 61: `...`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0927__ferranbt-pinecone__not_a_library.pine
- Declared Pine version: v5
- Source: https://github.com/ferranbt/pinecone :: `tests/testdata/import/not_a_library.pine` @ `cd8b96da56ef9657f6ce33eb52753c5945adf3bc`
- Stage: parse
- Diagnostic: `4:15: Expected "/*", "=", or [ \t] but "a" found.`
- Evidence: line 4: `import notlib as n`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0936__Leci37-tuisku_Web_selling__TklPIC0gMURheSAtIDJNTTAgLSA1MDVlZGYxZg.pine
- Declared Pine version: v5
- Source: https://github.com/Leci37/tuisku_Web_selling :: `d_result/pine_TW_hide/TklPIC0gMURheSAtIDJNTTAgLSA1MDVlZGYxZg.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Stage: parse
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Evidence: line 61: `...`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

## 2. missing ta.sum builtin (11)

### sources/0089__mihakralj-pinescript__theilu.pine
- Declared Pine version: v6
- Source: https://github.com/mihakralj/pinescript :: `indicators/errors/theilu.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Stage: semantic
- Diagnostic: `21:24: unknown-function: Unknown function: ta.sum`
- Evidence: line 21: `float sumSqError = ta.sum(sqError, length)`
- Construct: builtin/function call not resolved
- Version-appropriate rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0091__mihakralj-pinescript__wmape.pine
- Declared Pine version: v6
- Source: https://github.com/mihakralj/pinescript :: `indicators/errors/wmape.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Stage: semantic
- Diagnostic: `19:25: unknown-function: Unknown function: ta.sum`
- Evidence: line 19: `float sumAbsError = ta.sum(absError, length)`
- Construct: builtin/function call not resolved
- Version-appropriate rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0092__mihakralj-pinescript__wrmse.pine
- Declared Pine version: v6
- Source: https://github.com/mihakralj/pinescript :: `indicators/errors/wrmse.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Stage: semantic
- Diagnostic: `21:30: unknown-function: Unknown function: ta.sum`
- Evidence: line 21: `float sumWeightedError = ta.sum(weightedSqError, length)`
- Construct: builtin/function call not resolved
- Version-appropriate rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0484__casoon-pine-scripts__candle_pressure_response_jma.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `archive/indicators/candle_pressure_response_jma/candle_pressure_response_jma.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `166:9: unknown-function: Unknown function: ta.sum`
- Evidence: line 166: `path  = ta.sum(math.abs(close - close[1]), mEff)`
- Construct: builtin/function call not resolved
- Version-appropriate rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0588__casoon-pine-scripts__market_memory_decay_oscillator.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `indicators/trend_strength/market_memory_decay_oscillator/market_memory_decay_oscillator.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `100:8: unknown-function: Unknown function: ta.sum`
- Evidence: line 100: `path = ta.sum(math.abs(src - src[1]), memoryLen)`
- Construct: builtin/function call not resolved
- Version-appropriate rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0639__knectardev-pine_scripts__es-professional-fade-strategy.pine
- Declared Pine version: v5
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: semantic
- Diagnostic: `196:22: unknown-function: Unknown function: ta.sum`
- Evidence: line 196: `bool tickExtremeUp = ta.sum(tickValue > tickFilterInput ? 1 : 0, tickLookbackInput) >= tickVetoCountInput`
- Construct: builtin/function call not resolved
- Version-appropriate rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0643__knectardev-pine_scripts__es-professional-fade-strategy-v2.5.7-FIXED.pine
- Declared Pine version: v6
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy-v2.5.7-FIXED.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: semantic
- Diagnostic: `135:22: unknown-function: Unknown function: ta.sum`
- Evidence: line 135: `bool tickExtremeUp = ta.sum(tickValue > tickFilterInput ? 1 : 0, tickLookbackInput) >= tickVetoCountInput`
- Construct: builtin/function call not resolved
- Version-appropriate rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0644__knectardev-pine_scripts__es-professional-fade-strategy.pine
- Declared Pine version: v6
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: semantic
- Diagnostic: `120:22: unknown-function: Unknown function: ta.sum`
- Evidence: line 120: `bool tickExtremeUp = ta.sum(tickValue > tickFilterInput ? 1 : 0, tickLookbackInput) >= tickVetoCountInput`
- Construct: builtin/function call not resolved
- Version-appropriate rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0645__knectardev-pine_scripts__v2.5.5.pine
- Declared Pine version: v6
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: semantic
- Diagnostic: `135:22: unknown-function: Unknown function: ta.sum`
- Evidence: line 135: `bool tickExtremeUp = ta.sum(tickValue > tickFilterInput ? 1 : 0, tickLookbackInput) >= tickVetoCountInput`
- Construct: builtin/function call not resolved
- Version-appropriate rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0646__knectardev-pine_scripts__v2.5.6.pine
- Declared Pine version: v6
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: semantic
- Diagnostic: `129:22: unknown-function: Unknown function: ta.sum`
- Evidence: line 129: `bool tickExtremeUp = ta.sum(tickValue > tickFilterInput ? 1 : 0, tickLookbackInput) >= tickVetoCountInput`
- Construct: builtin/function call not resolved
- Version-appropriate rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0649__knectardev-pine_scripts__v2.5.6_v2.5.8.pine
- Declared Pine version: v6
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: semantic
- Diagnostic: `129:22: unknown-function: Unknown function: ta.sum`
- Evidence: line 129: `bool tickExtremeUp = ta.sum(tickValue > tickFilterInput ? 1 : 0, tickLookbackInput) >= tickVetoCountInput`
- Construct: builtin/function call not resolved
- Version-appropriate rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## 3. unterminated string or comment literal (8)

### sources/0502__casoon-pine-scripts__auto_trendlines.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `indicators/market_structure/auto_trendlines/auto_trendlines.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: parse
- Diagnostic: `275:45: Expected ".", "/*", "[", "[]", or [ \t] but "\n" found.`
- Evidence: line 275: `else`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0651__knectardev-pine_scripts__v2.5.6_v2.5.10.pine
- Declared Pine version: v6
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8/archive/v2.5.6_v2.5.9/archive/v2.5.6_v2.5.10.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: parse
- Diagnostic: `150:17: Expected ".", "/*", "[", "[]", or [ \t] but "\n" found.`
- Evidence: line 150: `else`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0652__knectardev-pine_scripts__v2.5.6_v2.5.11.pine
- Declared Pine version: v6
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8/archive/v2.5.6_v2.5.9/archive/v2.5.6_v2.5.10/archive/v2.5.6_v2.5.11.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: parse
- Diagnostic: `151:17: Expected ".", "/*", "[", "[]", or [ \t] but "\n" found.`
- Evidence: line 151: `else`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0653__knectardev-pine_scripts__v2.5.6_v2.5.12.pine
- Declared Pine version: v6
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8/archive/v2.5.6_v2.5.9/archive/v2.5.6_v2.5.10/archive/v2.5.6_v2.5.11/archive/v2.5.6_v2.5.12.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: parse
- Diagnostic: `152:17: Expected ".", "/*", "[", "[]", or [ \t] but "\n" found.`
- Evidence: line 152: `else`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0720__deepentropy-lightweight-charts-indicators__Performance.pine
- Declared Pine version: v6
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_standard/Performance.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Stage: parse
- Diagnostic: `7:120: Expected "\"" or "\\" but "\n" found.`
- Evidence: line 7: `string TT_LT = "A list of timeframe strings, separated by commas and optional spaces. A valid timeframe string contains`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0732__deepentropy-lightweight-charts-indicators__Multi-Time-Period-Charts.pine
- Declared Pine version: v6
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_standard/Multi-Time Period Charts.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Stage: parse
- Diagnostic: `5:120: Expected "\"" or "\\" but "\n" found.`
- Evidence: line 5: `string TT_AT = "If selected, the indicator automatically chooses the timeframe of the displayed bars. The chosen higher`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0919__g-moe-Trading-Indicators__divergence-scanner.pine
- Declared Pine version: v5
- Source: https://github.com/g-moe/Trading-Indicators :: `Tradingview/divergence-scanner.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Stage: parse
- Diagnostic: `19:259: Expected "'" or "\\" but "\n" found.`
- Evidence: line 19: `stop_amount = input.int(5, minval = 1, title = "Stop Amount",group = "Additional Trade Settings", inline = '6', tooltip = 'If Stop Type is set to recent high/low and the stop amount is 5 we use the highest high or lowest low from the past 5 bars from entry.`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0949__g-moe-Trading-Indicators__xact-technical-analysis.pine
- Declared Pine version: v5
- Source: https://github.com/g-moe/Trading-Indicators :: `Tradingview/xact-technical-analysis.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Stage: parse
- Diagnostic: `11:103: Expected "\"" or "\\" but "\n" found.`
- Evidence: line 11: `instructions_tooltip = "• Supply/Demand = zones where buyers or sellers will look to enter the market.`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

## 4. local/UDF symbol resolution (6)

### sources/0539__casoon-pine-scripts__fisher_transform_advanced.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/fisher_transform_advanced/fisher_transform_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `106:20: unknown-identifier: Unknown identifier: e6`
- Evidence: line 106: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3`
- Construct: local variable referenced after its declaration in a UDF return expression
- Version-appropriate rule/status: A local variable declared earlier in the same function scope is available to later expressions and may be returned; these are not forward references. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0550__casoon-pine-scripts__roc_advanced.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/roc_advanced/roc_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `106:20: unknown-identifier: Unknown identifier: e6`
- Evidence: line 106: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3`
- Construct: local variable referenced after its declaration in a UDF return expression
- Version-appropriate rule/status: A local variable declared earlier in the same function scope is available to later expressions and may be returned; these are not forward references. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0551__casoon-pine-scripts__rsi_advanced.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/rsi_advanced/rsi_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `109:20: unknown-identifier: Unknown identifier: e6`
- Evidence: line 109: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3`
- Construct: local variable referenced after its declaration in a UDF return expression
- Version-appropriate rule/status: A local variable declared earlier in the same function scope is available to later expressions and may be returned; these are not forward references. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0553__casoon-pine-scripts__tsi_advanced.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/tsi_advanced/tsi_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `107:20: unknown-identifier: Unknown identifier: e6`
- Evidence: line 107: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3`
- Construct: local variable referenced after its declaration in a UDF return expression
- Version-appropriate rule/status: A local variable declared earlier in the same function scope is available to later expressions and may be returned; these are not forward references. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0558__casoon-pine-scripts__williams_r_advanced.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/williams_r_advanced/williams_r_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `109:20: unknown-identifier: Unknown identifier: e6`
- Evidence: line 109: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3`
- Construct: local variable referenced after its declaration in a UDF return expression
- Version-appropriate rule/status: A local variable declared earlier in the same function scope is available to later expressions and may be returned; these are not forward references. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0865__hasnocool-tradingview-pine-scripts__John-F.-Ehlers-Center-Of-Gravity-Balanced-by-DM-.pine
- Declared Pine version: v5
- Source: https://github.com/hasnocool/tradingview-pine-scripts :: `John F. Ehlers Center Of Gravity Balanced by [DM].pine` @ `e031cab2819a7d56fb8bb9d000252f51439986e2`
- Stage: semantic
- Diagnostic: `40:6: unknown-identifier: Unknown identifier: avg_sig`
- Evidence: line 40: `[avg_sig]`
- Construct: local variable referenced after its declaration in a UDF return expression
- Version-appropriate rule/status: A local variable declared earlier in the same function scope is available to later expressions and may be returned; these are not forward references. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## 5. empty-array runtime behavior (5)

### sources/0497__casoon-pine-scripts__wavetrend_strategy.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `archive/strategies/wavetrend/wavetrend_strategy.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: execute
- Diagnostic: `Array index 0 is out of bounds. Array size is 0`
- Evidence: line ?: ``
- Construct: array access on an empty runtime array (`array.last`, `array.get`, or equivalent)
- Version-appropriate rule/status: The array APIs are valid Pine; an empty-array access is a runtime condition and must be reproduced or diagnosed at the execution boundary, not rejected as invalid source. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

### sources/0529__casoon-pine-scripts__zigzag_core.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `indicators/market_structure/zigzag_core/zigzag_core.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: execute
- Diagnostic: `Array index 0 is out of bounds. Array size is 0`
- Evidence: line ?: ``
- Construct: array access on an empty runtime array (`array.last`, `array.get`, or equivalent)
- Version-appropriate rule/status: The array APIs are valid Pine; an empty-array access is a runtime condition and must be reproduced or diagnosed at the execution boundary, not rejected as invalid source. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

### sources/0554__casoon-pine-scripts__wavetrend.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/wavetrend/wavetrend.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: execute
- Diagnostic: `Array index 0 is out of bounds. Array size is 0`
- Evidence: line ?: ``
- Construct: array access on an empty runtime array (`array.last`, `array.get`, or equivalent)
- Version-appropriate rule/status: The array APIs are valid Pine; an empty-array access is a runtime condition and must be reproduced or diagnosed at the execution boundary, not rejected as invalid source. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

### sources/0760__supertonka-tradingview-ict-indicator__orderblock_indicator.pine
- Declared Pine version: v5
- Source: https://github.com/supertonka/tradingview-ict-indicator :: `orderblock_indicator.pine` @ `a65385012d39d44e53e0c27ee2f7f02aa2802a34`
- Stage: execute
- Diagnostic: `Array index 0 is out of bounds. Array size is 0`
- Evidence: line ?: ``
- Construct: array access on an empty runtime array (`array.last`, `array.get`, or equivalent)
- Version-appropriate rule/status: The array APIs are valid Pine; an empty-array access is a runtime condition and must be reproduced or diagnosed at the execution boundary, not rejected as invalid source. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

### sources/0902__helenananaa-pine-compat-runtime__array_methods.pine
- Declared Pine version: v5
- Source: https://github.com/helenananaa/pine-compat-runtime :: `tests/fixtures/runtime/array_methods.pine` @ `02afc1cb9005e2ae55a9862faaf41524895cbb34`
- Stage: execute
- Diagnostic: `Cannot use pop() if array is empty.`
- Evidence: line ?: ``
- Construct: runtime construct failed under corpus inputs
- Version-appropriate rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

## 6. matrix shape/runtime initialization (5)

### sources/0165__mihakralj-pinescript__fft.pine
- Declared Pine version: v6
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/fft.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Stage: parse
- Diagnostic: `22:18: Expected "#", "'", "(", ".", "/*", "//", "[", "\"", "\"\"\"", "array", "bool", "color", "const", "false", "float", "input", "int", "map", "matrix", "na", "not", "series", "simple", "string", "true", [ \t], [+\-], [0-9], or [\n\r] but "<" found.`
- Evidence: line 22: `r := (r << 1) | (x & 1)`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0564__casoon-pine-scripts__money_flow_delta_profile.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `indicators/money_flow/money_flow_delta_profile/money_flow_delta_profile.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: parse
- Diagnostic: `239:29: Expected ",", "/*", "//", ">", "[", "array", "bool", "color", "const", "float", "input", "int", "map", "matrix", "series", "simple", "string", [ \t], or [\n\r] but "(" found.`
- Evidence: line 239: `(h_ - pLL) / (h_ - l_)`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0827__deepentropy-lightweight-charts-indicators__Open-Interest-Suite-Aggregated---By-Leviathan.pine
- Declared Pine version: v5
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_community/Open Interest Suite [Aggregated] - By Leviathan.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Stage: parse
- Diagnostic: `196:25: Expected "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "else", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "matrix", "method", "na", "not", "once", "overload", "series", "simple", "strategy", "string", "study", "switch", "true", "type", "var", "varip", "while", [ \t], [+\-], [0-9], [\n\r], or end of input but "=" found.`
- Evidence: line 196: `array.shift(x2), nx = array.indexof(x2, array.max(x2))`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0838__SenkuSupreme-TradingView-MT4-MT5-Indicators-Strategies-Collection__VP-MAPS-OB-S-R-GGSHOT-HH-BY-LEO.pine
- Declared Pine version: v5
- Source: https://github.com/SenkuSupreme/TradingView-MT4-MT5-Indicators-Strategies-Collection :: `Indicators/VP(MAPS)+OB+S&R+GGSHOT+HH BY LEO.pine` @ `b6b6f454c641d84690acd02d0323518357de2a66`
- Stage: parse
- Diagnostic: `43:53: Expected "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "matrix", "method", "na", "not", "once", "overload", "series", "simple", "strategy", "string", "study", "switch", "true", "type", "var", "varip", "while", [ \t], [+\-], [0-9], [\n\r], or end of input but "," found.`
- Evidence: line 43: `method inOut(int  [] a, int   val) => a.unshift(val), a.pop()`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

### sources/0909__deepentropy-oakscriptJS__Open-Interest-Suite-Aggregated---By-Leviathan.pine
- Declared Pine version: v5
- Source: https://github.com/deepentropy/oakscriptJS :: `docs/official/indicators_community/Open Interest Suite [Aggregated] - By Leviathan.pine` @ `d7bbd272e9ba6e12bb304a4c6d83d67f57afd2a0`
- Stage: parse
- Diagnostic: `196:25: Expected "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "else", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "matrix", "method", "na", "not", "once", "overload", "series", "simple", "strategy", "string", "study", "switch", "true", "type", "var", "varip", "while", [ \t], [+\-], [0-9], [\n\r], or end of input but "=" found.`
- Evidence: line 196: `array.shift(x2), nx = array.indexof(x2, array.max(x2))`
- Construct: source construct rejected during parsing
- Version-appropriate rule/status: The v6 grammar must accept valid v6 syntax; validity remains to be adjudicated for this row. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

## 7. output normalization and conditional visibility (5)

### sources/0511__casoon-pine-scripts__market_scenario_projector.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `indicators/market_structure/market_scenario_projector/market_scenario_projector.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: output
- Diagnostic: `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.`
- Evidence: line ?: ``
- Construct: visible output not observed on synthetic input
- Version-appropriate rule/status: A valid script may legitimately produce conditional/data-gated output; this is an instrumentation/behavior question, not a syntax rule. [v6 visuals](https://www.tradingview.com/pine-script-docs/visuals/)

### sources/0603__casoon-pine-scripts__RTAMonitoring.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `libraries/RTAMonitoring.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: output
- Diagnostic: `output-silence:table-or-coloring-only-output: The source only declares table or bar/background-color outputs, and the corpus visible-output funnel did not receive counted plot, drawing, alert, or log payloads.`
- Evidence: line ?: ``
- Construct: visible output not observed on synthetic input
- Version-appropriate rule/status: A valid script may legitimately produce conditional/data-gated output; this is an instrumentation/behavior question, not a syntax rule. [v6 visuals](https://www.tradingview.com/pine-script-docs/visuals/)

### sources/0647__knectardev-pine_scripts__v2.5.6_v2.5.13.pine
- Declared Pine version: v5
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.13.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: output
- Diagnostic: `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.`
- Evidence: line ?: ``
- Construct: visible output not observed on synthetic input
- Version-appropriate rule/status: A valid script may legitimately produce conditional/data-gated output; this is an instrumentation/behavior question, not a syntax rule. [v6 visuals](https://www.tradingview.com/pine-script-docs/visuals/)

### sources/0759__iamhuraira-trading-view-script__FVG_with_IFVG_Indicator.pine
- Declared Pine version: v5
- Source: https://github.com/iamhuraira/trading-view-script :: `FVG_with_IFVG_Indicator.pine` @ `558a170383d5d4f4f3df1a6bb245b1ecad51fe08`
- Stage: output
- Diagnostic: `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.`
- Evidence: line ?: ``
- Construct: visible output not observed on synthetic input
- Version-appropriate rule/status: A valid script may legitimately produce conditional/data-gated output; this is an instrumentation/behavior question, not a syntax rule. [v6 visuals](https://www.tradingview.com/pine-script-docs/visuals/)

### sources/0806__quant5-lab-runner__05_scientific_notation.pine
- Declared Pine version: v5
- Source: https://github.com/quant5-lab/runner :: `tests/number_format_edge_cases/05_scientific_notation.pine` @ `8035872a7c65f8bfce370976a9a4aabc80342ad9`
- Stage: output
- Diagnostic: `output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.`
- Evidence: line ?: ``
- Construct: visible output not observed on synthetic input
- Version-appropriate rule/status: A valid script may legitimately produce conditional/data-gated output; this is an instrumentation/behavior question, not a syntax rule. [v6 visuals](https://www.tradingview.com/pine-script-docs/visuals/)

## 8. namespace call arity and receiver binding (4)

### sources/0753__Opus-Aether-AI-pine-transpiler__scanner_momentum_setup_-_rsi_directional_momentum.pine
- Declared Pine version: v6
- Source: https://github.com/Opus-Aether-AI/pine-transpiler :: `tests/corpus/community/arunkbhaskar/scanner_momentum_setup_-_rsi_directional_momentum.pine` @ `6506237f3a34c8082851e8f8d7da69062f0f4f3b`
- Stage: semantic
- Diagnostic: `698:31: argument-count: matrix.add_row() expects at most 2 arguments`
- Evidence: line 698: `matrix.add_row(matrix, 0, array.from(symbol, _time, price, pchg, vol_pchg, signal))`
- Construct: valid namespace call counted as an over-arity method call
- Version-appropriate rule/status: The documented namespace forms accept these arguments: `matrix.add_row(id, row, array)`, `line.get_y1(line)`, and `table.clear(table_id, start_column, start_row, end_column, end_row)`. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0767__TraderOracle-TradingView__Tidal-Wave.pine
- Declared Pine version: v5
- Source: https://github.com/TraderOracle/TradingView :: `Tidal Wave.pine` @ `08b33c19614e00361b6a2fa775f6d0038a205726`
- Stage: semantic
- Diagnostic: `63:32: argument-count: line.get_y1() expects at most 0 arguments`
- Evidence: line 63: `if (high > line.get_y1(line) and low < line.get_y1(line))`
- Construct: valid namespace call counted as an over-arity method call
- Version-appropriate rule/status: The documented namespace forms accept these arguments: `matrix.add_row(id, row, array)`, `line.get_y1(line)`, and `table.clear(table_id, start_column, start_row, end_column, end_row)`. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0805__Opus-Aether-AI-pine-transpiler__scanner_ict_mitigation_block_scanner.pine
- Declared Pine version: v5
- Source: https://github.com/Opus-Aether-AI/pine-transpiler :: `tests/corpus/community/arunkbhaskar/scanner_ict_mitigation_block_scanner.pine` @ `6506237f3a34c8082851e8f8d7da69062f0f4f3b`
- Stage: semantic
- Diagnostic: `685:31: argument-count: matrix.add_row() expects at most 2 arguments`
- Evidence: line 685: `matrix.add_row(matrix, 0, array.from(symbol, _time, price, _cum_pchg, _cum_vol_pchg, signal))`
- Construct: valid namespace call counted as an over-arity method call
- Version-appropriate rule/status: The documented namespace forms accept these arguments: `matrix.add_row(id, row, array)`, `line.get_y1(line)`, and `table.clear(table_id, start_column, start_row, end_column, end_row)`. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0853__g-moe-Trading-Indicators__hooplah-high-low-table.pine
- Declared Pine version: v5
- Source: https://github.com/g-moe/Trading-Indicators :: `Tradingview/hooplah-high-low-table.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Stage: semantic
- Diagnostic: `452:33: argument-count: table.clear() expects at most 4 arguments`
- Evidence: line 452: `table.clear(table, 0, 0, 1, 6)`
- Construct: valid namespace call counted as an over-arity method call
- Version-appropriate rule/status: The documented namespace forms accept these arguments: `matrix.add_row(id, row, array)`, `line.get_y1(line)`, and `table.clear(table_id, start_column, start_row, end_column, end_row)`. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## 9. plot linewidth=0 (4)

### sources/0467__everget-tradingview-pinescript-indicators__roi_return_on_investment.pine
- Declared Pine version: v4
- Source: https://github.com/everget/tradingview-pinescript-indicators :: `statistics/roi_return_on_investment.pine` @ `60c93d3711d222b8f2db96160defe568429348e0`
- Stage: semantic
- Diagnostic: `41:66: type-mismatch: plot linewidth must be a positive integer`
- Evidence: line 41: `zeroPlot = plot(0, title="", style=plot.style_circles, linewidth=0, color=labelColor, editable=false)`
- Construct: plot linewidth=0
- Version-appropriate rule/status: v4 permits plot linewidth 0 [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

### sources/0469__everget-tradingview-pinescript-indicators__us_treasury_yields.pine
- Declared Pine version: v4
- Source: https://github.com/everget/tradingview-pinescript-indicators :: `statistics/us_treasury_yields.pine` @ `60c93d3711d222b8f2db96160defe568429348e0`
- Stage: semantic
- Diagnostic: `93:57: type-mismatch: plot linewidth must be a positive integer`
- Evidence: line 93: `plot(0.0, title="", style=plot.style_circles, linewidth=0, color=levelLabelColor, editable=false)`
- Construct: plot linewidth=0
- Version-appropriate rule/status: v4 permits plot linewidth 0 [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

### sources/0470__everget-tradingview-pinescript-indicators__ytd_year_to_date_percent_return.pine
- Declared Pine version: v4
- Source: https://github.com/everget/tradingview-pinescript-indicators :: `statistics/ytd_year_to_date_percent_return.pine` @ `60c93d3711d222b8f2db96160defe568429348e0`
- Stage: semantic
- Diagnostic: `27:66: type-mismatch: plot linewidth must be a positive integer`
- Evidence: line 27: `zeroPlot = plot(0, title="", style=plot.style_circles, linewidth=0, color=labelColor, editable=false)`
- Construct: plot linewidth=0
- Version-appropriate rule/status: v4 permits plot linewidth 0 [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

### sources/0692__oguzhandilber-PineScripts__Pmax.pine
- Declared Pine version: v4
- Source: https://github.com/oguzhandilber/PineScripts :: `Pmax.pine` @ `7762f0d1c333a09d8369f29d33fa0ebb1828a8f3`
- Stage: semantic
- Diagnostic: `100:67: type-mismatch: plot linewidth must be a positive integer`
- Evidence: line 100: `mPlot = plot(ohlc4, title="", style=plot.style_circles, linewidth=0,display=display.none)`
- Construct: plot linewidth=0
- Version-appropriate rule/status: v4 permits plot linewidth 0 [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## 10. conditional tuple-shape inference (3)

### sources/0010__mihakralj-pinescript__jbands.pine
- Declared Pine version: v6
- Source: https://github.com/mihakralj/pinescript :: `indicators/channels/jbands.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Stage: semantic
- Diagnostic: `46:1: tuple-shape-mismatch: Tuple declaration expects 2 values but initializer arm returns a non-tuple value`
- Evidence: line 46: `[upperBand, lowerBand] = jbands(i_source, i_period)`
- Construct: runtime construct failed under corpus inputs
- Version-appropriate rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0866__SenkuSupreme-TradingView-MT4-MT5-Indicators-Strategies-Collection__ALGOX-v13.pine
- Declared Pine version: v5
- Source: https://github.com/SenkuSupreme/TradingView-MT4-MT5-Indicators-Strategies-Collection :: `Strategy/ALGOX v13.pine` @ `b6b6f454c641d84690acd02d0323518357de2a66`
- Stage: semantic
- Diagnostic: `374:1: tuple-shape-mismatch: Tuple declaration expects 1 values but initializer arm returns a non-tuple value`
- Evidence: line 374: `[tp3Line]    = f_tp(condition, 1.2,leTrigger, seTrigger, i_src, i_lxLvlTP3, i_sxLvlTP3)`
- Construct: runtime construct failed under corpus inputs
- Version-appropriate rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0999__g-moe-Trading-Indicators__xact-internals.pine
- Declared Pine version: v5
- Source: https://github.com/g-moe/Trading-Indicators :: `Tradingview/xact-internals.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Stage: semantic
- Diagnostic: `122:1: tuple-shape-mismatch: Tuple declaration expects 2 values but initializer arm returns a non-tuple value`
- Evidence: line 122: `[r1, r1_ticker] = f_sc(`
- Construct: runtime construct failed under corpus inputs
- Version-appropriate rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## 11. boolean nz() or boolean na state (2)

### sources/0673__SammyEnigma-pine-scripts__pivot-popints.pine
- Declared Pine version: v4
- Source: https://github.com/SammyEnigma/pine-scripts :: `pivot-popints.pine` @ `26dbe7fc88cb7960a48a46c54e5d2f609293614e`
- Stage: semantic
- Diagnostic: `45:36: type-mismatch: nz replacement cannot be a boolean`
- Evidence: line 45: `hcont := pl ? false : nz(hcont[1], true)`
- Construct: boolean nz() or boolean na state
- Version-appropriate rule/status: v4 permits boolean nz()/na state [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

### sources/0921__kankinku-AutoResearchFinance_v2__cand-b061508a.pine
- Declared Pine version: v5
- Source: https://github.com/kankinku/AutoResearchFinance_v2 :: `strategies/candidates/cand-b061508a.pine` @ `6da1522b63b1983e3362de697d5372673b03d4b4`
- Stage: semantic
- Diagnostic: `219:49: type-mismatch: nz replacement cannot be a boolean`
- Evidence: line 219: `newBullL1        = bullL1 and not nz(bullL1[1], false)`
- Construct: boolean nz() or boolean na state
- Version-appropriate rule/status: v5 permits boolean nz()/na state [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## 12. nteger math.floor() result passed through integer math.min/math.max (2)

### sources/0498__casoon-pine-scripts__wavetrend_v3_strategy.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `archive/strategies/wavetrend/wavetrend_v3_strategy.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `748:13: type-mismatch: Cannot assign float value to int variable _binIdx`
- Evidence: line 748: `_binIdx := math.max(0, math.min(bins - 1, _binIdx))`
- Construct: iinteger `math.floor()` result passed through integer `math.min`/`math.max`
- Version-appropriate rule/status: `math.floor()` returns an integer, and integer overloads of `math.min`/`math.max` preserve the integer type; assigning the result to `_binIdx` is valid. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### sources/0556__casoon-pine-scripts__wavetrend_v3.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/wavetrend/wavetrend_v3.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `547:13: type-mismatch: Cannot assign float value to int variable _binIdx`
- Evidence: line 547: `_binIdx := math.max(0, math.min(bins - 1, _binIdx))`
- Construct: integer `math.floor()` result passed through integer `math.min`/`math.max`
- Version-appropriate rule/status: `math.floor()` returns an integer, and integer overloads of `math.min`/`math.max` preserve the integer type; assigning the result to `_binIdx` is valid. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## 13. Compilation error: Duplicate parameter name not allowed in this context (1)

### sources/0680__gktrk0530-pine-script-indicators.__mtf_trend_dashboard.pine
- Declared Pine version: v6
- Source: https://github.com/gktrk0530/pine-script-indicators. :: `mtf_trend_dashboard.pine` @ `2a1124ad5f3a92dee9fb791411f08f27c41cb5e2`
- Stage: compile
- Diagnostic: `Compilation error: Duplicate parameter name not allowed in this context`
- Evidence: line ?: ``
- Construct: compiled-path construct rejected
- Version-appropriate rule/status: The v6 language construct parsed and passed semantics; compiled support remains to be implemented or classified. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

## 14. Compilation error: Identifier '_iter' has already been declared (1)

### sources/0583__casoon-pine-scripts__vein_structure_zones.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `indicators/trend_direction/vein/vein_structure_zones.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: compile
- Diagnostic: `Compilation error: Identifier '_iter' has already been declared`
- Evidence: line ?: ``
- Construct: compiled-path construct rejected
- Version-appropriate rule/status: The v6 language construct parsed and passed semantics; compiled support remains to be implemented or classified. [v6 language reference](https://www.tradingview.com/pine-script-docs/language/)

## 15. deep-expression execution cost (1)

### sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine
- Declared Pine version: v5
- Source: https://github.com/helenananaa/pine-compat-runtime :: `tests/fixtures/syntax/deep_expression_limit.pine` @ `716fb7668557ffcdbcb3e9485a1d1a198d42f360`
- Stage: execute
- Diagnostic: `external corpus classifier timeout after 45s on isolated row`
- Evidence: line ?: ``
- Construct: runtime construct failed under corpus inputs
- Version-appropriate rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

## 16. exported request expression analysis (1)

### sources/0604__casoon-pine-scripts__RTAStrategy.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `libraries/RTAStrategy.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `1049:10: library-export: Exported function getMOSTDirectionHTF request expression cannot depend on exported parameters`
- Evidence: line 1049: `calculateMOSTDirection(atrLength, multiplier),`
- Construct: runtime construct failed under corpus inputs
- Version-appropriate rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## 17. float/na ternary assigned to bool (1)

### sources/0650__knectardev-pine_scripts__v2.5.6_v2.5.9.pine
- Declared Pine version: v6
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8/archive/v2.5.6_v2.5.9.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: semantic
- Diagnostic: `115:1: type-mismatch: Cannot assign float value to bool variable 'gapPoints'`
- Evidence: line 115: `bool gapPoints = not na(rthOpenCurrent) and not na(rthClosePrev) ?`
- Construct: float/na ternary assigned to bool
- Version-appropriate rule/status: 

## 18. lower-timeframe request execution (1)

### sources/0984__deepentropy-lightweight-charts-indicators__Supply-and-Demand-Daily-LuxAlgo-.pine
- Declared Pine version: v5
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_community/Supply and Demand Daily [LuxAlgo].pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Stage: execute
- Diagnostic: `runtime.error: request.security_lower_tf requires a lower timeframe than the chart timeframe: 60`
- Evidence: line ?: ``
- Construct: runtime construct failed under corpus inputs
- Version-appropriate rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

## 19. missing math.tanh builtin (1)

### sources/0598__casoon-pine-scripts__time_to_react_volatility_time.pine
- Declared Pine version: v6
- Source: https://github.com/casoon/pine-scripts :: `indicators/volatility/time_to_react_volatility_time/time_to_react_volatility_time.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Stage: semantic
- Diagnostic: `423:31: unknown-function: Unknown function: math.tanh`
- Evidence: line 423: `activityScore = 50.0 + 50.0 * math.tanh((ratio - 1.0) * activityK)`
- Construct: builtin/function call not resolved
- Version-appropriate rule/status: The v6 reference defines the called function; the function-resolution surface must provide it. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## 20. na assigned to a bool UDT field (1)

### sources/0802__YooooungLee-clever-meme__.pine
- Declared Pine version: v5
- Source: https://github.com/YooooungLee/clever-meme :: `Quant-code/strategy/艾略特波浪理论.pine` @ `b7499d764e5086f9707cb56abfc734d7e0be0537`
- Stage: semantic
- Diagnostic: `211:64: type-mismatch: Cannot assign na value to bool field fibL._break_`
- Evidence: line 211: `,                         _break_   =   na`
- Construct: na assigned to a bool UDT field
- Version-appropriate rule/status: v5 permits boolean na fields [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## 21. numeric ta.change(basis) as ta.valuewhen condition (1)

### sources/0762__MinorLeopard-Indicator__Indicator-FalseRemovals-.pine
- Declared Pine version: v5
- Source: https://github.com/MinorLeopard/Indicator :: `Indicator(FalseRemovals).pine` @ `f6a7dddf0a09b2b932d0ab897f90b0df9b5cf0b7`
- Stage: semantic
- Diagnostic: `298:34: type-mismatch: ta.valuewhen condition must be a boolean, got float`
- Evidence: line 298: `previousBandWidth = ta.valuewhen(ta.change(basis), bandWidth, 1)`
- Construct: numeric ta.change(basis) as ta.valuewhen condition
- Version-appropriate rule/status: v5 implicitly casts numeric values to bool [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## 22. numeric ta.change(strategy.closedtrades) as ta.barssince condition (1)

### sources/0618__knectardev-pine_scripts__acrypto-weigthed-strategy-v149_v1.0.0.pine
- Declared Pine version: v5
- Source: https://github.com/knectardev/pine_scripts :: `scripts/indicators/acrypto-weigthed-strategy-v149/archive/acrypto-weigthed-strategy-v149_v1.0.0.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Stage: semantic
- Diagnostic: `254:18: type-mismatch: ta.barssince condition must be a boolean, got int`
- Evidence: line 254: `ta.barssince(ta.change(strategy.closedtrades))`
- Construct: numeric ta.change(strategy.closedtrades) as ta.barssince condition
- Version-appropriate rule/status: v5 implicitly casts numeric values to bool [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## 23. official library registry/import support (1)

### sources/0771__msongkiet-TDV_share__ZigZag_EMA.pine
- Declared Pine version: v5
- Source: https://github.com/msongkiet/TDV_share :: `ZigZag_EMA.pine` @ `7eac7fabc4fc75ef13ca2d81036504032eb460ea`
- Stage: semantic
- Diagnostic: `4:1: unresolved-import: Official TradingView library 'TradingView/ZigZag' version 6 is not implemented by TealScript; implement that documented standard-library surface or remove/change the import`
- Evidence: line 4: `import TradingView/ZigZag/6 as ZigZagLib`
- Construct: official/library import unresolved
- Version-appropriate rule/status: The v6 library/import surface requires the referenced library to be available to the host; this is a library-registry implementation/input dependency. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## 24. request warmup/data sufficiency (1)

### sources/0992__ali-rajabpour-ARPS-Pivots__ARPS-Pivots.pine
- Declared Pine version: v5
- Source: https://github.com/ali-rajabpour/ARPS-Pivots :: `ARPS Pivots.pine` @ `1850e5adb5ca3fefc83eb036595ba24fa716feaf`
- Stage: execute
- Diagnostic: `172:1: runtime.error: Not enough data to calculate Pivot Points. Lower the Pivots Timeframe in the indicator settings.`
- Evidence: line 172: `if (barstate.islastconfirmedhistory and drawnGraphics.columns() == 0)`
- Construct: runtime construct failed under corpus inputs
- Version-appropriate rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

## 25. runtime construct failed under corpus inputs (1)

### sources/0134__mihakralj-pinescript__mlp.pine
- Declared Pine version: v6
- Source: https://github.com/mihakralj/pinescript :: `indicators/forecasts/mlp.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Stage: execute
- Diagnostic: `Matrix multiplication requires left columns to match right rows. Left is undefinedxundefined, right is 8x4`
- Evidence: line ?: ``
- Construct: runtime construct failed under corpus inputs
- Version-appropriate rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 execution model](https://www.tradingview.com/pine-script-docs/language/execution-model/)

## 26. table.cell(table_id = table, ...) named first parameter (1)

### sources/0948__g-moe-Trading-Indicators__lower-forecast.pine
- Declared Pine version: v5
- Source: https://github.com/g-moe/Trading-Indicators :: `Tradingview/lower-forecast.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Stage: semantic
- Diagnostic: `210:20: unknown-argument: Unknown argument 'table_id' for table.cell()`
- Evidence: line 210: `table.cell(table_id = table, column = 0, row = 0, text = "MOM: " + str.tostring(math.round(momentum,1)) +`
- Construct: table.cell(table_id = table, ...)` named first parameter
- Version-appropriate rule/status: `table.cell()` exposes its first parameter as `table_id`; named arguments may be used for it, so this call is valid v6. [v6 tables](https://www.tradingview.com/pine-script-docs/visuals/tables/) [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## 27. versioned bool/na semantics (1)

### sources/0987__deepentropy-lightweight-charts-indicators__ICT-Algorithmic-Macro-Tracker-Open-Source-by-toodegrees.pine
- Declared Pine version: v5
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_community/ICT Algorithmic Macro Tracker° (Open-Source) by toodegrees.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Stage: semantic
- Diagnostic: `51:12: invalid-na-bool: na cannot be used as a boolean expression; wrap it in bool(...) or test a value with na(...)`
- Evidence: line 51: `if na or _lines.last().get_x2() == time`
- Construct: runtime construct failed under corpus inputs
- Version-appropriate rule/status: The v6 execution model permits the construct; exact data/input behavior must be matched. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

