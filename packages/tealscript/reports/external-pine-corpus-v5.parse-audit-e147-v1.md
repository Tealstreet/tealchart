> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Parse Audit E147 V1

Measurement commit: `e147d42635fa2ee4f0b005883e5de471de6590f6`, pinned over the fixed v5 corpus. This audit covers all 20 current parse-stage failures.

## Verdict Summary

| Verdict | Rows |
| --- | ---: |
| Valid Pine; real TealScript grammar gap | 7 |
| Corpus-hygiene truncation | 8 |
| Invalid Pine under declared version | 5 |

Valid gaps are bitwise operators, nested control flow, comma-separated declarations, switch-case loops, and typed overloaded methods. The hygiene rows contain a literal paid-version placeholder and are not executable Pine sources. The invalid rows contain unterminated ordinary strings or deliberately import a non-library script. References: [TradingView v6 language](https://www.tradingview.com/pine-script-docs/language/) and [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/).

## valid grammar gap (7)

### sources/0165__mihakralj-pinescript__fft.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/numerics/fft.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: parse
- Diagnostic: `22:18: Expected "#", "'", "(", ".", "/*", "//", "[", "\"", "\"\"\"", "array", "bool", "color", "const", "false", "float", "input", "int", "map", "matrix", "na", "not", "series", "simple", "string", "true", [ \t], [+\-], [0-9], or [\n\r] but "<" found.`
- Evidence: line 22: `r := (r << 1) | (x & 1)`
- Verdict: **valid grammar gap**
- Version-appropriate rule: The construct is valid in the declared Pine version and the parser must accept it.

### sources/0502__casoon-pine-scripts__auto_trendlines.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `indicators/market_structure/auto_trendlines/auto_trendlines.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: parse
- Diagnostic: `279:49: Expected ".", "/*", "[", "[]", or [ \t] but "\n" found.`
- Evidence: line 279: `else`
- Verdict: **valid grammar gap**
- Version-appropriate rule: The construct is valid in the declared Pine version and the parser must accept it.

### sources/0827__deepentropy-lightweight-charts-indicators__Open-Interest-Suite-Aggregated---By-Leviathan.pine
- Repository: https://github.com/deepentropy/lightweight-charts-indicators
- Source: `docs/official/indicators_community/Open Interest Suite [Aggregated] - By Leviathan.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Declared Pine version: v5
- Stage: parse
- Diagnostic: `196:25: Expected "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "else", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "matrix", "method", "na", "not", "once", "overload", "series", "simple", "strategy", "string", "study", "switch", "true", "type", "var", "varip", "while", [ \t], [+\-], [0-9], [\n\r], or end of input but "=" found.`
- Evidence: line 196: `array.shift(x2), nx = array.indexof(x2, array.max(x2))`
- Verdict: **valid grammar gap**
- Version-appropriate rule: The construct is valid in the declared Pine version and the parser must accept it.

### sources/0828__deepentropy-lightweight-charts-indicators__Support-Resistance-Classification-VR-LuxAlgo-.pine
- Repository: https://github.com/deepentropy/lightweight-charts-indicators
- Source: `docs/official/indicators_community/Support Resistance Classification (VR) [LuxAlgo].pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Declared Pine version: v5
- Stage: parse
- Diagnostic: `268:37: Expected "                ", "            ", "            \t", "        \t    ", "        \t", "        \t\t", "    ", "    \t        ", "    \t    ", "    \t    \t", "    \t\t    ", "    \t\t", "    \t\t\t", "  ", "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "\t            ", "\t        ", "\t        \t", "\t    \t    ", "\t    \t", "\t    \t\t", "\t", "\t\t        ", "\t\t    ", "\t\t    \t", "\t\t\t    ", "\t\t\t", "\t\t\t\t", "array", "bool", "break", "color", "const", "continue", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "matrix", "method", "na", "not", "once", "overload", "series", "simple", "strategy", "string", "study", "switch", "true", "type", "var", "varip", "while", [ \t], [+\-], [0-9], [\n\r], or end of input but "=" found.`
- Evidence: line 268: `'s' =>`
- Verdict: **valid grammar gap**
- Version-appropriate rule: The construct is valid in the declared Pine version and the parser must accept it.

### sources/0838__SenkuSupreme-TradingView-MT4-MT5-Indicators-Strategies-Collection__VP-MAPS-OB-S-R-GGSHOT-HH-BY-LEO.pine
- Repository: https://github.com/SenkuSupreme/TradingView-MT4-MT5-Indicators-Strategies-Collection
- Source: `Indicators/VP(MAPS)+OB+S&R+GGSHOT+HH BY LEO.pine` @ `b6b6f454c641d84690acd02d0323518357de2a66`
- Declared Pine version: v5
- Stage: parse
- Diagnostic: `43:53: Expected "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "matrix", "method", "na", "not", "once", "overload", "series", "simple", "strategy", "string", "study", "switch", "true", "type", "var", "varip", "while", [ \t], [+\-], [0-9], [\n\r], or end of input but "," found.`
- Evidence: line 43: `method inOut(int  [] a, int   val) => a.unshift(val), a.pop()`
- Verdict: **valid grammar gap**
- Version-appropriate rule: The construct is valid in the declared Pine version and the parser must accept it.

### sources/0909__deepentropy-oakscriptJS__Open-Interest-Suite-Aggregated---By-Leviathan.pine
- Repository: https://github.com/deepentropy/oakscriptJS
- Source: `docs/official/indicators_community/Open Interest Suite [Aggregated] - By Leviathan.pine` @ `d7bbd272e9ba6e12bb304a4c6d83d67f57afd2a0`
- Declared Pine version: v5
- Stage: parse
- Diagnostic: `196:25: Expected "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "else", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "matrix", "method", "na", "not", "once", "overload", "series", "simple", "strategy", "string", "study", "switch", "true", "type", "var", "varip", "while", [ \t], [+\-], [0-9], [\n\r], or end of input but "=" found.`
- Evidence: line 196: `array.shift(x2), nx = array.indexof(x2, array.max(x2))`
- Verdict: **valid grammar gap**
- Version-appropriate rule: The construct is valid in the declared Pine version and the parser must accept it.

### sources/0910__deepentropy-oakscriptJS__Support-Resistance-Classification-VR-LuxAlgo-.pine
- Repository: https://github.com/deepentropy/oakscriptJS
- Source: `docs/official/indicators_community/Support Resistance Classification (VR) [LuxAlgo].pine` @ `d7bbd272e9ba6e12bb304a4c6d83d67f57afd2a0`
- Declared Pine version: v5
- Stage: parse
- Diagnostic: `268:37: Expected "                ", "            ", "            \t", "        \t    ", "        \t", "        \t\t", "    ", "    \t        ", "    \t    ", "    \t    \t", "    \t\t    ", "    \t\t", "    \t\t\t", "  ", "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "\t            ", "\t        ", "\t        \t", "\t    \t    ", "\t    \t", "\t    \t\t", "\t", "\t\t        ", "\t\t    ", "\t\t    \t", "\t\t\t    ", "\t\t\t", "\t\t\t\t", "array", "bool", "break", "color", "const", "continue", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "library", "map", "matrix", "method", "na", "not", "once", "overload", "series", "simple", "strategy", "string", "study", "switch", "true", "type", "var", "varip", "while", [ \t], [+\-], [0-9], [\n\r], or end of input but "=" found.`
- Evidence: line 268: `'s' =>`
- Verdict: **valid grammar gap**
- Version-appropriate rule: The construct is valid in the declared Pine version and the parser must accept it.

## invalid Pine (5)

### sources/0720__deepentropy-lightweight-charts-indicators__Performance.pine
- Repository: https://github.com/deepentropy/lightweight-charts-indicators
- Source: `docs/official/indicators_standard/Performance.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Declared Pine version: v6
- Stage: parse
- Diagnostic: `7:120: Expected "\"" or "\\" but "\n" found.`
- Evidence: line 7: `string TT_LT = "A list of timeframe strings, separated by commas and optional spaces. A valid timeframe string contains`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version requires valid Pine syntax; this source construct is malformed or intentionally violates the import rule.

### sources/0732__deepentropy-lightweight-charts-indicators__Multi-Time-Period-Charts.pine
- Repository: https://github.com/deepentropy/lightweight-charts-indicators
- Source: `docs/official/indicators_standard/Multi-Time Period Charts.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Declared Pine version: v6
- Stage: parse
- Diagnostic: `5:120: Expected "\"" or "\\" but "\n" found.`
- Evidence: line 5: `string TT_AT = "If selected, the indicator automatically chooses the timeframe of the displayed bars. The chosen higher`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version requires valid Pine syntax; this source construct is malformed or intentionally violates the import rule.

### sources/0919__g-moe-Trading-Indicators__divergence-scanner.pine
- Repository: https://github.com/g-moe/Trading-Indicators
- Source: `Tradingview/divergence-scanner.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Declared Pine version: v5
- Stage: parse
- Diagnostic: `19:259: Expected "'" or "\\" but "\n" found.`
- Evidence: line 19: `stop_amount = input.int(5, minval = 1, title = "Stop Amount",group = "Additional Trade Settings", inline = '6', tooltip = 'If Stop Type is set to recent high/low and the stop amount is 5 we use the highest high or lowest low from the past 5 bars from entry.`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version requires valid Pine syntax; this source construct is malformed or intentionally violates the import rule.

### sources/0927__ferranbt-pinecone__not_a_library.pine
- Repository: https://github.com/ferranbt/pinecone
- Source: `tests/testdata/import/not_a_library.pine` @ `cd8b96da56ef9657f6ce33eb52753c5945adf3bc`
- Declared Pine version: v5
- Stage: parse
- Diagnostic: `4:15: Expected "/*", "=", or [ \t] but "a" found.`
- Evidence: line 4: `import notlib as n`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version requires valid Pine syntax; this source construct is malformed or intentionally violates the import rule.

### sources/0949__g-moe-Trading-Indicators__xact-technical-analysis.pine
- Repository: https://github.com/g-moe/Trading-Indicators
- Source: `Tradingview/xact-technical-analysis.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Declared Pine version: v5
- Stage: parse
- Diagnostic: `11:103: Expected "\"" or "\\" but "\n" found.`
- Evidence: line 11: `instructions_tooltip = "• Supply/Demand = zones where buyers or sellers will look to enter the market.`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version requires valid Pine syntax; this source construct is malformed or intentionally violates the import rule.

## corpus-hygiene truncation (8)

### sources/0796__Leci37-tuisku_Web_selling__R09PRyAtIDFEYXkgLSAyU1YwIC0gNGZlMjJhYTk.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source: `d_result/pine_TW_hide/R09PRyAtIDFEYXkgLSAyU1YwIC0gNGZlMjJhYTk.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Declared Pine version: v5
- Stage: parse
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Evidence: line 61: `...`
- Verdict: **corpus-hygiene truncation**
- Version-appropriate rule: The source is explicitly truncated/redacted by the upstream corpus; classify as corpus hygiene, not a language rejection.

### sources/0798__Leci37-tuisku_Web_selling__RERPRyAtIDMwTWluIC0gMlRWMCAtIGFiYzFhN2Rj.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source: `d_result/pine_TW_hide/RERPRyAtIDMwTWluIC0gMlRWMCAtIGFiYzFhN2Rj.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Declared Pine version: v5
- Stage: parse
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Evidence: line 61: `...`
- Verdict: **corpus-hygiene truncation**
- Version-appropriate rule: The source is explicitly truncated/redacted by the upstream corpus; classify as corpus hygiene, not a language rejection.

### sources/0880__Leci37-tuisku_Web_selling__VFJYVVNEVCAtIDFEYXkgLSAxTUFEIC0gZGI4ODk1Zjk.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source: `d_result/pine_TW_hide/VFJYVVNEVCAtIDFEYXkgLSAxTUFEIC0gZGI4ODk1Zjk.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Declared Pine version: v5
- Stage: parse
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Evidence: line 61: `...`
- Verdict: **corpus-hygiene truncation**
- Version-appropriate rule: The source is explicitly truncated/redacted by the upstream corpus; classify as corpus hygiene, not a language rejection.

### sources/0894__Leci37-tuisku_Web_selling__TUVUQSAtIDFEYXkgLSAyQ1YwIC0gOGRmN2I1MTc.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source: `d_result/pine_TW_hide/TUVUQSAtIDFEYXkgLSAyQ1YwIC0gOGRmN2I1MTc.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Declared Pine version: v5
- Stage: parse
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Evidence: line 61: `...`
- Verdict: **corpus-hygiene truncation**
- Version-appropriate rule: The source is explicitly truncated/redacted by the upstream corpus; classify as corpus hygiene, not a language rejection.

### sources/0895__Leci37-tuisku_Web_selling__Q1JXRCAtIDFEYXkgLSAyVFYwIC0gNjk2ZDY4OTc.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source: `d_result/pine_TW_hide/Q1JXRCAtIDFEYXkgLSAyVFYwIC0gNjk2ZDY4OTc.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Declared Pine version: v5
- Stage: parse
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Evidence: line 61: `...`
- Verdict: **corpus-hygiene truncation**
- Version-appropriate rule: The source is explicitly truncated/redacted by the upstream corpus; classify as corpus hygiene, not a language rejection.

### sources/0897__Leci37-tuisku_Web_selling__R1RMQiAtIDFIb3VyIC0gMVNRVSAtIDA2OWQwNjZh.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source: `d_result/pine_TW_hide/R1RMQiAtIDFIb3VyIC0gMVNRVSAtIDA2OWQwNjZh.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Declared Pine version: v5
- Stage: parse
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Evidence: line 61: `...`
- Verdict: **corpus-hygiene truncation**
- Version-appropriate rule: The source is explicitly truncated/redacted by the upstream corpus; classify as corpus hygiene, not a language rejection.

### sources/0916__Leci37-tuisku_Web_selling__RE9UVVNEVCAtIDFIb3VyIC0gMlRWMCAtIDU0YjQ3ODk4.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source: `d_result/pine_TW_hide/RE9UVVNEVCAtIDFIb3VyIC0gMlRWMCAtIDU0YjQ3ODk4.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Declared Pine version: v5
- Stage: parse
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Evidence: line 61: `...`
- Verdict: **corpus-hygiene truncation**
- Version-appropriate rule: The source is explicitly truncated/redacted by the upstream corpus; classify as corpus hygiene, not a language rejection.

### sources/0936__Leci37-tuisku_Web_selling__TklPIC0gMURheSAtIDJNTTAgLSA1MDVlZGYxZg.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source: `d_result/pine_TW_hide/TklPIC0gMURheSAtIDJNTTAgLSA1MDVlZGYxZg.pine` @ `974c0f0e29f9dbb11292dd2571636f4e8d082c2b`
- Declared Pine version: v5
- Stage: parse
- Diagnostic: `61:6: Expected "/*", [ \t], or [0-9] but "." found.`
- Evidence: line 61: `...`
- Verdict: **corpus-hygiene truncation**
- Version-appropriate rule: The source is explicitly truncated/redacted by the upstream corpus; classify as corpus hygiene, not a language rejection.

