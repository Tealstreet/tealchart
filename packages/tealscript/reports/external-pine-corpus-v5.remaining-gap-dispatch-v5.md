> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Remaining Gap Dispatch V5

Measurement commit: `73df52e69ba58fb49483384bec87327ee06448da`.
Corpus: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910`.
Daily report: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910/fixture-profiles/8543ed0574-v4/external-pine-corpus-v5-daily-standard.json`.
Context-stress report: `/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910/fixture-profiles/8543ed0574-v4/external-pine-corpus-v5-context-stress.json`.
Method: fresh current-HEAD run over the fixed pinned v5 corpus using both calibrated fixture profiles. Rows failing on only one profile are classified as chart-context-dependent instead of mixed with unconditional gaps.

## Headline

- Daily profile: 856/926 achievable output (92.44%), validity {"corpus-hygiene":8,"invalid-pine":56,"supported":861,"tealscript-gap":65,"unsupported-by-design":10}.
- Context-stress profile: 856/926 achievable output (92.44%), validity {"corpus-hygiene":8,"invalid-pine":56,"supported":861,"tealscript-gap":65,"unsupported-by-design":10}.
- Current TealScript-gap rows across either profile: 65.
- Unconditional gaps on both profiles: 65.
- Chart-context-dependent gaps: 0.
- Known trace-required rows among current gaps: 3.
- V4 current-gap entries now stale: 26/91.
- Current gaps not present in V4: 0.

## Ranked Root Causes

| Rank | Cause | Rows | Profiles | Trace-required |
| ---: | --- | ---: | --- | ---: |
| 1 | parse:unexpected-token | 11 | daily+context-stress | 0 |
| 2 | output:undecided | 9 | daily+context-stress | 0 |
| 3 | execute:array-bounds-runtime-error | 7 | daily+context-stress | 0 |
| 4 | semantic:unknown-argument:strategy initialCapital camelCase | 7 | daily+context-stress | 0 |
| 5 | semantic:type-mismatch | 6 | daily+context-stress | 0 |
| 6 | semantic:qualifier-mismatch:simple parameter receives series | 4 | daily+context-stress | 0 |
| 7 | semantic:unsupported-feature:strategy calc_on_order_fills trace-required | 3 | daily+context-stress | 3 |
| 8 | output:tealscript-gap | 2 | daily+context-stress | 0 |
| 9 | compile:duplicate-parameter-name | 1 | daily+context-stress | 0 |
| 10 | compile:iterator-name-collision | 1 | daily+context-stress | 0 |
| 11 | execute:dynamic-request-local-scope | 1 | daily+context-stress | 0 |
| 12 | execute:matrix-dimension-runtime-error | 1 | daily+context-stress | 0 |
| 13 | execute:script-authored-runtime.error | 1 | daily+context-stress | 0 |
| 14 | execute:security-lower-tf-timeframe-refusal | 1 | daily+context-stress | 0 |
| 15 | execute:timeout | 1 | daily+context-stress | 0 |
| 16 | semantic:invalid-na-bool:version bool na rule | 1 | daily+context-stress | 0 |
| 17 | semantic:library-export:request expression depends on exported parameter | 1 | daily+context-stress | 0 |
| 18 | semantic:unknown-identifier:buy | 1 | daily+context-stress | 0 |
| 19 | semantic:unknown-identifier:delta | 1 | daily+context-stress | 0 |
| 20 | semantic:unknown-identifier:float | 1 | daily+context-stress | 0 |
| 21 | semantic:unknown-identifier:pivotsToKeep | 1 | daily+context-stress | 0 |
| 22 | semantic:unknown-identifier:relVol | 1 | daily+context-stress | 0 |
| 23 | semantic:unknown-identifier:rsiLen | 1 | daily+context-stress | 0 |
| 24 | semantic:unknown-identifier:vPOR | 1 | daily+context-stress | 0 |

## Chart-Context-Dependent Gaps

- none

## Unconditional Gaps By Cause

### parse:unexpected-token (11)

- `sources/0165__mihakralj-pinescript__fft.pine` — v6 — daily+context-stress — parse — parse:unexpected-token — `22:18: Expected "#", "'", "(", ".", "/*", "//", "[", "\"", "\"\"\"", "array", "bool", "color", "const", "false", "float", "input", "int", "map", "matrix", "na", "not", "series", "simple", "string", "true", [ \t], [+\-], ` — line: `r := (r << 1) | (x & 1)`
- `sources/0720__deepentropy-lightweight-charts-indicators__Performance.pine` — v6 — daily+context-stress — parse — parse:unexpected-token — `7:120: Expected "\"" or "\\" but "\n" found.` — line: `string TT_LT = "A list of timeframe strings, separated by commas and optional spaces. A valid timeframe string contains`
- `sources/0732__deepentropy-lightweight-charts-indicators__Multi-Time-Period-Charts.pine` — v6 — daily+context-stress — parse — parse:unexpected-token — `5:120: Expected "\"" or "\\" but "\n" found.` — line: `string TT_AT = "If selected, the indicator automatically chooses the timeframe of the displayed bars. The chosen higher`
- `sources/0827__deepentropy-lightweight-charts-indicators__Open-Interest-Suite-Aggregated---By-Leviathan.pine` — v5 — daily+context-stress — parse — parse:unexpected-token — `196:25: Expected "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "else", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", ` — line: `array.shift(x2), nx = array.indexof(x2, array.max(x2))`
- `sources/0828__deepentropy-lightweight-charts-indicators__Support-Resistance-Classification-VR-LuxAlgo-.pine` — v5 — daily+context-stress — parse — parse:unexpected-token — `268:37: Expected " ", " ", " \t", " \t ", " \t", " \t\t", " ", " \t ", " \t ", " \t \t", " \t\t ", " \t\t", " \t\t\t", " ", "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "\t ", "\t ", "\t \t", "\t \t ", "\t \` — line: `'s' =>`
- `sources/0838__SenkuSupreme-TradingView-MT4-MT5-Indicators-Strategies-Collection__VP-MAPS-OB-S-R-GGSHOT-HH-BY-LEO.pine` — v5 — daily+context-stress — parse — parse:unexpected-token — `43:53: Expected "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", "int", "l` — line: `method inOut(int  [] a, int   val) => a.unshift(val), a.pop()`
- `sources/0909__deepentropy-oakscriptJS__Open-Interest-Suite-Aggregated---By-Leviathan.pine` — v5 — daily+context-stress — parse — parse:unexpected-token — `196:25: Expected "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "array", "bool", "break", "color", "const", "continue", "else", "enum", "export", "false", "float", "for", "if", "import", "indicator", "input", ` — line: `array.shift(x2), nx = array.indexof(x2, array.max(x2))`
- `sources/0910__deepentropy-oakscriptJS__Support-Resistance-Classification-VR-LuxAlgo-.pine` — v5 — daily+context-stress — parse — parse:unexpected-token — `268:37: Expected " ", " ", " \t", " \t ", " \t", " \t\t", " ", " \t ", " \t ", " \t \t", " \t\t ", " \t\t", " \t\t\t", " ", "#", "'", "(", ".", "/*", "//", "<", "[", "\"", "\"\"\"", "\t ", "\t ", "\t \t", "\t \t ", "\t \` — line: `'s' =>`
- `sources/0919__g-moe-Trading-Indicators__divergence-scanner.pine` — v5 — daily+context-stress — parse — parse:unexpected-token — `19:259: Expected "'" or "\\" but "\n" found.` — line: `stop_amount = input.int(5, minval = 1, title = "Stop Amount",group = "Additional Trade Settings", inline = '6', tooltip = 'If Stop Type is set to recent high/low and the stop amount is 5 we use the highest high or lowest low from the past 5 bars from entry.`
- `sources/0927__ferranbt-pinecone__not_a_library.pine` — v5 — daily+context-stress — parse — parse:unexpected-token — `4:15: Expected "/*", "=", or [ \t] but "a" found.` — line: `import notlib as n`
- `sources/0949__g-moe-Trading-Indicators__xact-technical-analysis.pine` — v5 — daily+context-stress — parse — parse:unexpected-token — `11:103: Expected "\"" or "\\" but "\n" found.` — line: `instructions_tooltip = "• Supply/Demand = zones where buyers or sellers will look to enter the market.`

### output:undecided (9)

- `sources/0502__casoon-pine-scripts__auto_trendlines.pine` — v6 — daily+context-stress — output — output:undecided — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or `
- `sources/0603__casoon-pine-scripts__RTAMonitoring.pine` — v6 — daily+context-stress — output — output:undecided — `output-silence:table-or-coloring-only-output: The source only declares table or bar/background-color outputs, and the corpus visible-output funnel did not receive counted plot, drawing, alert, or log payloads.`
- `sources/0639__knectardev-pine_scripts__es-professional-fade-strategy.pine` — v5 — daily+context-stress — output — output:undecided — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or `
- `sources/0643__knectardev-pine_scripts__es-professional-fade-strategy-v2.5.7-FIXED.pine` — v6 — daily+context-stress — output — output:undecided — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or `
- `sources/0644__knectardev-pine_scripts__es-professional-fade-strategy.pine` — v6 — daily+context-stress — output — output:undecided — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or `
- `sources/0645__knectardev-pine_scripts__v2.5.5.pine` — v6 — daily+context-stress — output — output:undecided — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or `
- `sources/0646__knectardev-pine_scripts__v2.5.6.pine` — v6 — daily+context-stress — output — output:undecided — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or `
- `sources/0647__knectardev-pine_scripts__v2.5.6_v2.5.13.pine` — v5 — daily+context-stress — output — output:undecided — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or `
- `sources/0649__knectardev-pine_scripts__v2.5.6_v2.5.8.pine` — v6 — daily+context-stress — output — output:undecided — `output-silence:conditional-or-data-gated-output-not-triggered: All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or `

### execute:array-bounds-runtime-error (7)

- `sources/0272__mihakralj-pinescript__polyfit.pine` — v6 — daily+context-stress — execute — execute:array-bounds-runtime-error — `Array index 11 is out of bounds. Array size is 9`
- `sources/0497__casoon-pine-scripts__wavetrend_strategy.pine` — v6 — daily+context-stress — execute — execute:array-bounds-runtime-error — `Array index 0 is out of bounds. Array size is 0`
- `sources/0520__casoon-pine-scripts__sr_zones_mtf_v2.pine` — v6 — daily+context-stress — execute — execute:array-bounds-runtime-error — `Array index 0 is out of bounds. Array size is 0`
- `sources/0529__casoon-pine-scripts__zigzag_core.pine` — v6 — daily+context-stress — execute — execute:array-bounds-runtime-error — `Array index 0 is out of bounds. Array size is 0`
- `sources/0554__casoon-pine-scripts__wavetrend.pine` — v6 — daily+context-stress — execute — execute:array-bounds-runtime-error — `Array index 0 is out of bounds. Array size is 0`
- `sources/0760__supertonka-tradingview-ict-indicator__orderblock_indicator.pine` — v5 — daily+context-stress — execute — execute:array-bounds-runtime-error — `Array index 0 is out of bounds. Array size is 0`
- `sources/0902__helenananaa-pine-compat-runtime__array_methods.pine` — v5 — daily+context-stress — execute — execute:array-bounds-runtime-error — `Cannot use pop() if array is empty.`

### semantic:unknown-argument:strategy initialCapital camelCase (7)

- `sources/0640__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.0.pine` — v5 — daily+context-stress — semantic — semantic:unknown-argument:strategy initialCapital camelCase — `20:20: unknown-argument: Unknown argument 'initialCapital' for strategy()` — line: `initialCapital = 50000,`
- `sources/0641__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.1.pine` — v5 — daily+context-stress — semantic — semantic:unknown-argument:strategy initialCapital camelCase — `20:20: unknown-argument: Unknown argument 'initialCapital' for strategy()` — line: `initialCapital = 50000,`
- `sources/0642__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.4_exec-gap.pine` — v5 — daily+context-stress — semantic — semantic:unknown-argument:strategy initialCapital camelCase — `20:20: unknown-argument: Unknown argument 'initialCapital' for strategy()` — line: `initialCapital = 50000,`
- `sources/0648__knectardev-pine_scripts__v2.5.6_v2.5.7.pine` — v6 — daily+context-stress — semantic — semantic:unknown-argument:strategy initialCapital camelCase — `18:87: unknown-argument: Unknown argument 'initialCapital' for strategy()` — line: `"ES Professional Fade v2.5.4 (Execution Gap Modeled)", overlay=true, initialCapital=50000, defaultQtyValue=1, commissionType=strategy.commission.cash_per_contract, commissionValue=2.01)`
- `sources/0654__knectardev-pine_scripts__momentum-breakout-strategy_v1.0.0.pine` — v5 — daily+context-stress — semantic — semantic:unknown-argument:strategy initialCapital camelCase — `17:71: unknown-argument: Unknown argument 'initialCapital' for strategy()` — line: `strategy("Momentum Breakout v1.0.0", overlay = true, initialCapital = 25000)`
- `sources/0655__knectardev-pine_scripts__momentum-breakout-strategy_v1.1.0_volume-filter.pine` — v5 — daily+context-stress — semantic — semantic:unknown-argument:strategy initialCapital camelCase — `17:71: unknown-argument: Unknown argument 'initialCapital' for strategy()` — line: `strategy("Momentum Breakout v1.1.0", overlay = true, initialCapital = 25000)`
- `sources/0656__knectardev-pine_scripts__momentum-breakout-strategy.pine` — v5 — daily+context-stress — semantic — semantic:unknown-argument:strategy initialCapital camelCase — `16:71: unknown-argument: Unknown argument 'initialCapital' for strategy()` — line: `strategy("Momentum Breakout v1.2.0", overlay = true, initialCapital = 25000)`

### semantic:type-mismatch (6)

- `sources/0650__knectardev-pine_scripts__v2.5.6_v2.5.9.pine` — v6 — daily+context-stress — semantic — semantic:type-mismatch — `115:1: type-mismatch: Cannot assign float value to bool variable 'gapPoints'` — line: `bool gapPoints = not na(rthOpenCurrent) and not na(rthClosePrev) ?`
- `sources/0651__knectardev-pine_scripts__v2.5.6_v2.5.10.pine` — v6 — daily+context-stress — semantic — semantic:type-mismatch — `115:9: type-mismatch: Cannot assign float value to bool variable 'gapPoints'` — line: `bool gapPoints = not na(rthOpenCurrent) and not na(rthClosePrev) ?`
- `sources/0652__knectardev-pine_scripts__v2.5.6_v2.5.11.pine` — v6 — daily+context-stress — semantic — semantic:type-mismatch — `116:9: type-mismatch: Cannot assign float value to bool variable 'gapPoints'` — line: `bool gapPoints = not na(rthOpenCurrent) and not na(rthClosePrev) ?`
- `sources/0653__knectardev-pine_scripts__v2.5.6_v2.5.12.pine` — v6 — daily+context-stress — semantic — semantic:type-mismatch — `117:9: type-mismatch: Cannot assign float value to bool variable 'gapPoints'` — line: `bool gapPoints = not na(rthOpenCurrent) and not na(rthClosePrev) ?`
- `sources/0802__YooooungLee-clever-meme__.pine` — v5 — daily+context-stress — semantic — semantic:type-mismatch — `211:64: type-mismatch: Cannot assign na value to bool field fibL._break_` — line: `,                         _break_   =   na`
- `sources/0979__helenananaa-pine-compat-runtime__unsupported_table_set_position_values.pine` — v5 — daily+context-stress — semantic — semantic:type-mismatch — `4:24: type-mismatch: Invalid table.set_position position: position.bad` — line: `table.set_position(id, "position.bad")`

### semantic:qualifier-mismatch:simple parameter receives series (4)

- `sources/0157__mihakralj-pinescript__binomdist.pine` — v6 — daily+context-stress — semantic — semantic:qualifier-mismatch:simple parameter receives series — `52:39: qualifier-mismatch: Cannot pass series value to simple parameter 'i' for function lnBinom; use an input/simple value or declare a compatible parameter` — line: `float lnTerm = lnBinom(n, i) + i * lnP + (n - i) * lnQ`
- `sources/0166__mihakralj-pinescript__gammadist.pine` — v6 — daily+context-stress — semantic — semantic:qualifier-mismatch:simple parameter receives series — `44:49: qualifier-mismatch: Cannot pass series value to simple parameter 'z' for function lnGamma; use an input/simple value or declare a compatible parameter` — line: `float lnPfx = a * math.log(x) - x - lnGamma(a)`
- `sources/0185__mihakralj-pinescript__poissondist.pine` — v6 — daily+context-stress — semantic — semantic:qualifier-mismatch:simple parameter receives series — `44:49: qualifier-mismatch: Cannot pass series value to simple parameter 'z' for function lnGamma; use an input/simple value or declare a compatible parameter` — line: `float lnPfx = a * math.log(x) - x - lnGamma(a)`
- `sources/0535__casoon-pine-scripts__vwap_cross_visuals.pine` — v6 — daily+context-stress — semantic — semantic:qualifier-mismatch:simple parameter receives series — `1663:100: qualifier-mismatch: Cannot pass series value to simple parameter 'windowLength' for function calculateProfile; use an input/simple value or declare a compatible parameter` — line: `windowHigh, windowLow, binVolumes, binPrices] = calculateProfile(adaptiveConfig, windowStart, windowLength)`

### semantic:unsupported-feature:strategy calc_on_order_fills trace-required (3)

- `sources/0496__casoon-pine-scripts__wavetrend_base_strategy.pine` — v6 — daily+context-stress — semantic — semantic:unsupported-feature:strategy calc_on_order_fills trace-required — `24:28: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it` — line: `calc_on_order_fills = true,` — trace-required
- `sources/0610__casoon-pine-scripts__vein_reversal_labeler_strategy.pine` — v6 — daily+context-stress — semantic — semantic:unsupported-feature:strategy calc_on_order_fills trace-required — `23:28: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it` — line: `calc_on_order_fills = true,` — trace-required
- `sources/0611__casoon-pine-scripts__wavetrend_v4_strategy.pine` — v6 — daily+context-stress — semantic — semantic:unsupported-feature:strategy calc_on_order_fills trace-required — `24:28: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it` — line: `calc_on_order_fills = true,` — trace-required

### output:tealscript-gap (2)

- `sources/0467__everget-tradingview-pinescript-indicators__roi_return_on_investment.pine` — v4 — daily+context-stress — output — output:tealscript-gap — `output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.`
- `sources/0806__quant5-lab-runner__05_scientific_notation.pine` — v5 — daily+context-stress — output — output:tealscript-gap — `output-silence:global-output-declared-but-not-evaluated: The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.`

### compile:duplicate-parameter-name (1)

- `sources/0680__gktrk0530-pine-script-indicators.__mtf_trend_dashboard.pine` — v6 — daily+context-stress — compile — compile:duplicate-parameter-name — `Compilation error: Duplicate parameter name not allowed in this context`

### compile:iterator-name-collision (1)

- `sources/0583__casoon-pine-scripts__vein_structure_zones.pine` — v6 — daily+context-stress — compile — compile:iterator-name-collision — `Compilation error: Identifier '_iter' has already been declared`

### execute:dynamic-request-local-scope (1)

- `sources/0858__regalouisei-collect-tradingview__tabela-rsi-5-emas-dd.pine` — v5 — daily+context-stress — execute — execute:dynamic-request-local-scope — `runtime.error: request.* calls in local scopes require dynamic_requests=true: request.security`

### execute:matrix-dimension-runtime-error (1)

- `sources/0134__mihakralj-pinescript__mlp.pine` — v6 — daily+context-stress — execute — execute:matrix-dimension-runtime-error — `Matrix multiplication requires left columns to match right rows. Left is undefinedxundefined, right is 8x4`

### execute:script-authored-runtime.error (1)

- `sources/0992__ali-rajabpour-ARPS-Pivots__ARPS-Pivots.pine` — v5 — daily+context-stress — execute — execute:script-authored-runtime.error — `172:1: runtime.error: Not enough data to calculate Pivot Points. Lower the Pivots Timeframe in the indicator settings.` — line: `if (barstate.islastconfirmedhistory and drawnGraphics.columns() == 0)`

### execute:security-lower-tf-timeframe-refusal (1)

- `sources/0984__deepentropy-lightweight-charts-indicators__Supply-and-Demand-Daily-LuxAlgo-.pine` — v5 — daily+context-stress — execute — execute:security-lower-tf-timeframe-refusal — `runtime.error: request.security_lower_tf requires a lower timeframe than the chart timeframe: 60`

### execute:timeout (1)

- `sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine` — v5 — daily+context-stress — execute — execute:timeout — `external corpus classifier timeout after 45s on isolated row`

### semantic:invalid-na-bool:version bool na rule (1)

- `sources/0987__deepentropy-lightweight-charts-indicators__ICT-Algorithmic-Macro-Tracker-Open-Source-by-toodegrees.pine` — v5 — daily+context-stress — semantic — semantic:invalid-na-bool:version bool na rule — `51:12: invalid-na-bool: na cannot be used as a boolean expression; wrap it in bool(...) or test a value with na(...)` — line: `if na or _lines.last().get_x2() == time`

### semantic:library-export:request expression depends on exported parameter (1)

- `sources/0604__casoon-pine-scripts__RTAStrategy.pine` — v6 — daily+context-stress — semantic — semantic:library-export:request expression depends on exported parameter — `1049:10: library-export: Exported function getMOSTDirectionHTF request expression cannot depend on exported parameters` — line: `calculateMOSTDirection(atrLength, multiplier),`

### semantic:unknown-identifier:buy (1)

- `sources/0773__suyons-tradingview-indicators__02-rsi-signal.pine` — v5 — daily+context-stress — semantic — semantic:unknown-identifier:buy — `44:19: unknown-identifier: Unknown identifier: buy` — line: `buy_series = not (buy[1] or buy[2] or buy[3] or buy[4] or buy[5])`

### semantic:unknown-identifier:delta (1)

- `sources/0772__milocaetano-quantick__delta_histogram.pine` — v5 — daily+context-stress — semantic — semantic:unknown-identifier:delta — `3:6: unknown-identifier: Unknown identifier: delta` — line: `plot(delta, title="delta", style=plot.style_histogram, color=color.aqua)`

### semantic:unknown-identifier:float (1)

- `sources/0952__chauhanvishaal-tv-indicators__Zone_Identifier.pine` — v5 — daily+context-stress — semantic — semantic:unknown-identifier:float — `260:28: unknown-identifier: Unknown identifier: float` — line: `displacementStart = na(float)`

### semantic:unknown-identifier:pivotsToKeep (1)

- `sources/0495__casoon-pine-scripts__wave_navigator.pine` — v6 — daily+context-stress — semantic — semantic:unknown-identifier:pivotsToKeep — `1255:34: unknown-identifier: Unknown identifier: pivotsToKeep` — line: `while array.size(pivPrice) > pivotsToKeep`

### semantic:unknown-identifier:relVol (1)

- `sources/0581__casoon-pine-scripts__vein_reversal_zones.pine` — v6 — daily+context-stress — semantic — semantic:unknown-identifier:relVol — `311:84: unknown-identifier: Unknown identifier: relVol` — line: `float conflScoreLong = (structureLong ? 3.0 : 0.0) + (momentumLong ? 2.0 : 0.0) + (relVol > 1.2 ? 2.0 : 0.0) + (emaLong ? 2.0 : 0.0) + (stLong ? 1.0 : 0.0)`

### semantic:unknown-identifier:rsiLen (1)

- `sources/0489__casoon-pine-scripts__flow_bias.pine` — v6 — daily+context-stress — semantic — semantic:unknown-identifier:rsiLen — `160:21: unknown-identifier: Unknown identifier: rsiLen` — line: `rsi = ta.rsi(close, rsiLen)`

### semantic:unknown-identifier:vPOR (1)

- `sources/0564__casoon-pine-scripts__money_flow_delta_profile.pine` — v6 — daily+context-stress — semantic — semantic:unknown-identifier:vPOR — `246:61: unknown-identifier: Unknown identifier: vPOR` — line: `flow = rpSRC == "Money Flow" ? v_ * vPOR * mfPrice * wt : v_ * vPOR * wt`

## Known Trace-Required Current Gaps

- `sources/0496__casoon-pine-scripts__wavetrend_base_strategy.pine` — v6 — daily+context-stress — semantic — semantic:unsupported-feature:strategy calc_on_order_fills trace-required — `24:28: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it` — line: `calc_on_order_fills = true,` — trace-required
- `sources/0610__casoon-pine-scripts__vein_reversal_labeler_strategy.pine` — v6 — daily+context-stress — semantic — semantic:unsupported-feature:strategy calc_on_order_fills trace-required — `23:28: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it` — line: `calc_on_order_fills = true,` — trace-required
- `sources/0611__casoon-pine-scripts__wavetrend_v4_strategy.pine` — v6 — daily+context-stress — semantic — semantic:unsupported-feature:strategy calc_on_order_fills trace-required — `24:28: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it` — line: `calc_on_order_fills = true,` — trace-required

## V4 Entries Now Stale

- `sources/0010__mihakralj-pinescript__jbands.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.
- `sources/0121__mihakralj-pinescript__rmed.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.
- `sources/0151__mihakralj-pinescript__sam.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.
- `sources/0197__mihakralj-pinescript__apo.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.
- `sources/0263__mihakralj-pinescript__iqr.pine` — now invalid-pine / semantic / failed / color.new() accepts color and transp only; linewidth belongs to plot/drawing calls, not color construction.
- `sources/0269__mihakralj-pinescript__median.pine` — now invalid-pine / semantic / failed / color.new() accepts color and transp only; linewidth belongs to plot/drawing calls, not color construction.
- `sources/0271__mihakralj-pinescript__percentile.pine` — now invalid-pine / semantic / failed / color.new() accepts color and transp only; linewidth belongs to plot/drawing calls, not color construction.
- `sources/0273__mihakralj-pinescript__quantile.pine` — now invalid-pine / semantic / failed / color.new() accepts color and transp only; linewidth belongs to plot/drawing calls, not color construction.
- `sources/0352__mihakralj-pinescript__yzvama.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.
- `sources/0539__casoon-pine-scripts__fisher_transform_advanced.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.
- `sources/0550__casoon-pine-scripts__roc_advanced.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.
- `sources/0551__casoon-pine-scripts__rsi_advanced.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.
- `sources/0553__casoon-pine-scripts__tsi_advanced.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.
- `sources/0558__casoon-pine-scripts__williams_r_advanced.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.
- `sources/0566__casoon-pine-scripts__relative_leg_efficiency.pine` — now invalid-pine / semantic / failed / Pine does not implicitly cast float expressions to int variables; scripts must use int() or another explicit integer expression.
- `sources/0598__casoon-pine-scripts__time_to_react_volatility_time.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.
- `sources/0740__mihakralj-QuanTAlib__median.pine` — now invalid-pine / semantic / failed / color.new() accepts color and transp only; linewidth belongs to plot/drawing calls, not color construction.
- `sources/0753__Opus-Aether-AI-pine-transpiler__scanner_momentum_setup_-_rsi_directional_momentum.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.
- `sources/0767__TraderOracle-TradingView__Tidal-Wave.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.
- `sources/0805__Opus-Aether-AI-pine-transpiler__scanner_ict_mitigation_block_scanner.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.
- `sources/0853__g-moe-Trading-Indicators__hooplah-high-low-table.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.
- `sources/0865__hasnocool-tradingview-pine-scripts__John-F.-Ehlers-Center-Of-Gravity-Balanced-by-DM-.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.
- `sources/0866__SenkuSupreme-TradingView-MT4-MT5-Indicators-Strategies-Collection__ALGOX-v13.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.
- `sources/0948__g-moe-Trading-Indicators__lower-forecast.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.
- `sources/0978__helenananaa-pine-compat-runtime__unsupported_array_sort_box.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.
- `sources/0999__g-moe-Trading-Indicators__xact-internals.pine` — now supported / pass / produced-output-compiled / Pipeline reached visible output.

## Current Gaps New Since V4

- none
