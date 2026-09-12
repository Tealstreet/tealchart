> Superseded by external-pine-corpus-v5.row-audit-v4.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Row Audit V3

This is a row-level audit of the pinned v5 report at TealScript measurement commit `1bd0cf4926b508a143fa3b57f585b191215b17a7`. Sources are read from the fixed corpus directory and retain the report's repository, path, and source SHA. “Corpus artifact” is reserved for a harvester/normalization defect; a malformed construct present in the pinned source is invalid Pine instead.

Applying the 85 invalid-Pine verdicts in this audit to the raw v5 buckets changes the headline to `832 supported / 9 TealScript gap / 149 invalid Pine / 10 unsupported-by-design`. The comparable achievable denominator is `841`, so the audited support rate is `832/841 = 98.93%`. The 17 rows in this audit classified as real gaps remain in that denominator.

## Verdicts

### type-mismatch (33 rows)

Counts: real TealScript gap 2; invalid Pine 31; corpus artifact 0.

#### sources/0156__mihakralj-pinescript__betadist.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/betadist.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 56: `int mm = m / 2             if m == 0                 d_val := 1.0`
- TealScript diagnostic: `56:13: type-mismatch: Cannot assign float value to int variable 'mm'`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

#### sources/0164__mihakralj-pinescript__fdist.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/fdist.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 56: `int mm = m / 2             if m == 0                 d_val := 1.0`
- TealScript diagnostic: `56:13: type-mismatch: Cannot assign float value to int variable 'mm'`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

#### sources/0171__mihakralj-pinescript__ifft.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/ifft.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 19: `int halfN = N / 2     int H = math.min(numHarmonics, halfN)     float twoPiOverN = 2.0 * math.pi / N`
- TealScript diagnostic: `19:5: type-mismatch: Cannot assign float value to int variable 'halfN'`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

#### sources/0280__mihakralj-pinescript__trim.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/trim.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 22: `trimCount := (period - 1) / 2      // Collect values into array and sort`
- TealScript diagnostic: `22:9: type-mismatch: Cannot assign float value to int variable trimCount`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

#### sources/0283__mihakralj-pinescript__wins.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/wins.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 20: `winCount := (period - 1) / 2      // Collect values into array and sort`
- TealScript diagnostic: `20:9: type-mismatch: Cannot assign float value to int variable winCount`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

#### sources/0297__mihakralj-pinescript__hend.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/trends_FIR/hend.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 39: `int half = (period - 1) / 2         float n = (period + 3) / 2.0         float n2 = n * n`
- TealScript diagnostic: `39:9: type-mismatch: Cannot assign float value to int variable 'half'`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

#### sources/0304__mihakralj-pinescript__nyqma.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/trends_FIR/nyqma.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 21: `int n2 = math.min(math.max(nyquist_period, 1), period / 2)      // ── MA1: LWMA(source, period) with O(1) circular buffer ──`
- TealScript diagnostic: `21:5: type-mismatch: Cannot assign float value to int variable 'n2'`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

#### sources/0467__everget-tradingview-pinescript-indicators__roi_return_on_investment.pine
- Source: https://github.com/everget/tradingview-pinescript-indicators :: `statistics/roi_return_on_investment.pine` @ `60c93d3711d222b8f2db96160defe568429348e0`
- Evidence: line 41: `zeroPlot = plot(0, title="", style=plot.style_circles, linewidth=0, color=labelColor, editable=false) hline(0, title="Zero Level", linestyle=hline.style_dotted, color=levelColor)`
- TealScript diagnostic: `41:66: type-mismatch: plot linewidth must be a positive integer`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: invalid `color.new()`/`plot()` argument shape
- v6 rule: `color.new()` accepts a color and transparency, not a second `color` or `linewidth`; `plot()` linewidth must be a positive integer, so `linewidth=0` is outside the documented domain. [v6 plots](https://www.tradingview.com/pine-script-docs/visuals/plots/)

#### sources/0469__everget-tradingview-pinescript-indicators__us_treasury_yields.pine
- Source: https://github.com/everget/tradingview-pinescript-indicators :: `statistics/us_treasury_yields.pine` @ `60c93d3711d222b8f2db96160defe568429348e0`
- Evidence: line 93: `plot(0.0, title="", style=plot.style_circles, linewidth=0, color=levelLabelColor, editable=false) hline(0.0, title="Zero Level", linestyle=hline.style_dotted, color=levelColor)`
- TealScript diagnostic: `93:57: type-mismatch: plot linewidth must be a positive integer`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: invalid `color.new()`/`plot()` argument shape
- v6 rule: `color.new()` accepts a color and transparency, not a second `color` or `linewidth`; `plot()` linewidth must be a positive integer, so `linewidth=0` is outside the documented domain. [v6 plots](https://www.tradingview.com/pine-script-docs/visuals/plots/)

#### sources/0470__everget-tradingview-pinescript-indicators__ytd_year_to_date_percent_return.pine
- Source: https://github.com/everget/tradingview-pinescript-indicators :: `statistics/ytd_year_to_date_percent_return.pine` @ `60c93d3711d222b8f2db96160defe568429348e0`
- Evidence: line 27: `zeroPlot = plot(0, title="", style=plot.style_circles, linewidth=0, color=labelColor, editable=false) hline(0, title="Zero Level", linestyle=hline.style_dotted, color=levelColor)`
- TealScript diagnostic: `27:66: type-mismatch: plot linewidth must be a positive integer`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: invalid `color.new()`/`plot()` argument shape
- v6 rule: `color.new()` accepts a color and transparency, not a second `color` or `linewidth`; `plot()` linewidth must be a positive integer, so `linewidth=0` is outside the documented domain. [v6 plots](https://www.tradingview.com/pine-script-docs/visuals/plots/)

#### sources/0486__casoon-pine-scripts__directional_probability_engine_v2.pine
- Source: https://github.com/casoon/pine-scripts :: `archive/indicators/directional_probability_engine/directional_probability_engine_v2.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 269: `microPivotLen := math.max(2, pivotLen / 3)  // ============================================================================`
- TealScript diagnostic: `269:5: type-mismatch: Cannot assign float value to int variable microPivotLen`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

#### sources/0487__casoon-pine-scripts__directional_probability_engine_v3.pine
- Source: https://github.com/casoon/pine-scripts :: `archive/indicators/directional_probability_engine/directional_probability_engine_v3.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 343: `microPivotLen := math.max(2, pivotLen / 3)  // ============================================================================`
- TealScript diagnostic: `343:5: type-mismatch: Cannot assign float value to int variable microPivotLen`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

#### sources/0498__casoon-pine-scripts__wavetrend_v3_strategy.pine
- Source: https://github.com/casoon/pine-scripts :: `archive/strategies/wavetrend/wavetrend_v3_strategy.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 748: `_binIdx := math.max(0, math.min(bins - 1, _binIdx))             array.set(_binVols, _binIdx, array.get(_binVols, _binIdx) + nz(volume[j], 0))     var float pocPx = na`
- TealScript diagnostic: `748:13: type-mismatch: Cannot assign float value to int variable _binIdx`
- Pine accepts it: **yes**
- Verdict: **real TealScript gap**
- Construct: integer `math.floor()` result passed through integer `math.min`/`math.max`
- v6 rule: `math.floor()` returns an integer, and integer overloads of `math.min`/`math.max` preserve the integer type; assigning the result to `_binIdx` is valid. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0501__casoon-pine-scripts__trade_permission_engine_v1.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/composite/trade_permission_engine/trade_permission_engine_v1.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 311: `microPivotLen := math.max(2, pivotLen / 3)  // ============================================================================`
- TealScript diagnostic: `311:5: type-mismatch: Cannot assign float value to int variable microPivotLen`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

#### sources/0514__casoon-pine-scripts__market_tradability_engine.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/market_structure/market_tradability_engine/market_tradability_engine.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 548: `int shortWindow = math.max(3, qualityLength / 4)  float atr = ta.atr(atrLength)`
- TealScript diagnostic: `548:1: type-mismatch: Cannot assign float value to int variable 'shortWindow'`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

#### sources/0515__casoon-pine-scripts__market_tradability_engine_v2.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/market_structure/market_tradability_engine/market_tradability_engine_v2.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 885: `int shortWindow = math.max(3, qualityLength / 4)  float atr = ta.atr(atrLength)`
- TealScript diagnostic: `885:1: type-mismatch: Cannot assign float value to int variable 'shortWindow'`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

#### sources/0545__casoon-pine-scripts__mtf_wavetrend_opportunity_hunter.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/mtf_wavetrend_opportunity_hunter/mtf_wavetrend_opportunity_hunter.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 1107: `int cx = xL + rotW / 2     float cy = yB + rotHt / 2     float yT = yB + rotHt`
- TealScript diagnostic: `1107:5: type-mismatch: Cannot assign float value to int variable 'cx'`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

#### sources/0556__casoon-pine-scripts__wavetrend_v3.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/wavetrend/wavetrend_v3.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 547: `_binIdx := math.max(0, math.min(bins - 1, _binIdx))             array.set(_binVols, _binIdx, array.get(_binVols, _binIdx) + nz(volume[j], 0))     var float pocPx = na`
- TealScript diagnostic: `547:13: type-mismatch: Cannot assign float value to int variable _binIdx`
- Pine accepts it: **yes**
- Verdict: **real TealScript gap**
- Construct: integer `math.floor()` result passed through integer `math.min`/`math.max`
- v6 rule: `math.floor()` returns an integer, and integer overloads of `math.min`/`math.max` preserve the integer type; assigning the result to `_binIdx` is valid. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0566__casoon-pine-scripts__relative_leg_efficiency.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/relative_strength/relative_leg_efficiency/relative_leg_efficiency.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 255: `int mid = count / 2         count % 2 == 1 ? array.get(tmp, mid) : (array.get(tmp, mid - 1) + array.get(tmp, mid)) / 2.0`
- TealScript diagnostic: `255:9: type-mismatch: Cannot assign float value to int variable 'mid'`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

#### sources/0601__casoon-pine-scripts__RTAAdvanced.pine
- Source: https://github.com/casoon/pine-scripts :: `libraries/RTAAdvanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 371: `int numSwings = array.size(swings) / 2     for i = 0 to numSwings - 1         float start = array.get(swings, i * 2)`
- TealScript diagnostic: `371:5: type-mismatch: Cannot assign float value to int variable 'numSwings'`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

#### sources/0618__knectardev-pine_scripts__acrypto-weigthed-strategy-v149_v1.0.0.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/indicators/acrypto-weigthed-strategy-v149/archive/acrypto-weigthed-strategy-v149_v1.0.0.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Evidence: line 254: `ta.barssince(ta.change(strategy.closedtrades)) // ************************************************************************************************************************************************************************************************************************************************************************* // ADDITIONAL GLOBAL VARIABLES`
- TealScript diagnostic: `254:18: type-mismatch: ta.barssince condition must be a boolean, got int`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

#### sources/0629__knectardev-pine_scripts__rsi-divergence-indicator_v1.3.15.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/indicators/rsi-divergence-indicator/archive/rsi-divergence-indicator_v1.3.15.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Evidence: line 46: `bool timeChange = ta.change(time) bool naPivotHighPrice = na(pivotHighPrice) bool naPivotLowPrice = na(pivotLowPrice)`
- TealScript diagnostic: `46:1: type-mismatch: Cannot assign int value to bool variable 'timeChange'`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: numeric `ta.change()` result used where a bool condition is required
- v6 rule: `ta.change()` preserves the source numeric type; `ta.barssince()` and `ta.valuewhen()` require a bool condition, and an int cannot be assigned to bool. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0650__knectardev-pine_scripts__v2.5.6_v2.5.9.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8/archive/v2.5.6_v2.5.9.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Evidence: line 115: `bool gapPoints = not na(rthOpenCurrent) and not na(rthClosePrev) ?    math.abs(rthOpenCurrent - rthClosePrev) : na`
- TealScript diagnostic: `115:1: type-mismatch: Cannot assign float value to bool variable 'gapPoints'`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float ternary arm assigned to bool `gapPoints`
- v6 rule: Both conditional arms must be compatible with the declared bool type; `math.abs()` returns float and `na` is not a bool value in v6. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0673__SammyEnigma-pine-scripts__pivot-popints.pine
- Source: https://github.com/SammyEnigma/pine-scripts :: `pivot-popints.pine` @ `26dbe7fc88cb7960a48a46c54e5d2f609293614e`
- Evidence: line 45: `hcont := pl ? false : nz(hcont[1], true) lcont = true lcont := ph ? false : nz(lcont[1], true)`
- TealScript diagnostic: `45:36: type-mismatch: nz replacement cannot be a boolean`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: boolean `nz()` replacement / boolean `na` state
- v6 rule: Pine v6 booleans cannot hold `na`; numeric `nz()` overloads cannot be used to manufacture a boolean fallback in this expression. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0692__oguzhandilber-PineScripts__Pmax.pine
- Source: https://github.com/oguzhandilber/PineScripts :: `Pmax.pine` @ `7762f0d1c333a09d8369f29d33fa0ebb1828a8f3`
- Evidence: line 100: `mPlot = plot(ohlc4, title="", style=plot.style_circles, linewidth=0,display=display.none) longFillColor = highlighting ? (MAvg>PMax ? color.green : na) : na shortFillColor = highlighting ? (MAvg<PMax ? color.red : na) : na`
- TealScript diagnostic: `100:67: type-mismatch: plot linewidth must be a positive integer`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: invalid `color.new()`/`plot()` argument shape
- v6 rule: `color.new()` accepts a color and transparency, not a second `color` or `linewidth`; `plot()` linewidth must be a positive integer, so `linewidth=0` is outside the documented domain. [v6 plots](https://www.tradingview.com/pine-script-docs/visuals/plots/)

#### sources/0733__mihakralj-QuanTAlib__trim.pine
- Source: https://github.com/mihakralj/QuanTAlib :: `lib/statistics/trim/trim.pine` @ `467a8c1cefd5155f13af228581c042a3991256b6`
- Evidence: line 24: `trimCount := (period - 1) / 2      // Collect values into array and sort`
- TealScript diagnostic: `24:9: type-mismatch: Cannot assign float value to int variable trimCount`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

#### sources/0762__MinorLeopard-Indicator__Indicator-FalseRemovals-.pine
- Source: https://github.com/MinorLeopard/Indicator :: `Indicator(FalseRemovals).pine` @ `f6a7dddf0a09b2b932d0ab897f90b0df9b5cf0b7`
- Evidence: line 298: `previousBandWidth = ta.valuewhen(ta.change(basis), bandWidth, 1)  expansionThreshold = input(0.5, "Expansion Threshold")`
- TealScript diagnostic: `298:34: type-mismatch: ta.valuewhen condition must be a boolean, got float`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: numeric `ta.change()` result used where a bool condition is required
- v6 rule: `ta.change()` preserves the source numeric type; `ta.barssince()` and `ta.valuewhen()` require a bool condition, and an int cannot be assigned to bool. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0783__deepentropy-lightweight-charts-indicators__Order-Blocks-with-signals.pine
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_community/Order Blocks with signals.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Evidence: line 8: `sens /= 100  // OB`
- TealScript diagnostic: `8:1: type-mismatch: Cannot assign float value to int variable sens`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

#### sources/0802__YooooungLee-clever-meme__.pine
- Source: https://github.com/YooooungLee/clever-meme :: `Quant-code/strategy/艾略特波浪理论.pine` @ `b7499d764e5086f9707cb56abfc734d7e0be0537`
- Evidence: line 211: `,                         _break_   =   na                )         //`
- TealScript diagnostic: `211:64: type-mismatch: Cannot assign na value to bool field fibL._break_`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

#### sources/0921__kankinku-AutoResearchFinance_v2__cand-b061508a.pine
- Source: https://github.com/kankinku/AutoResearchFinance_v2 :: `strategies/candidates/cand-b061508a.pine` @ `6da1522b63b1983e3362de697d5372673b03d4b4`
- Evidence: line 219: `newBullL1        = bullL1 and not nz(bullL1[1], false) newBullCandidate = bullCandidate and not nz(bullCandidate[1], false) newBullStrong    = bullStrong and not nz(bullStrong[1], false)`
- TealScript diagnostic: `219:49: type-mismatch: nz replacement cannot be a boolean`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: boolean `nz()` replacement / boolean `na` state
- v6 rule: Pine v6 booleans cannot hold `na`; numeric `nz()` overloads cannot be used to manufacture a boolean fallback in this expression. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0955__hasnocool-tradingview-pine-scripts__BankNifty-5min-Supertrend-Based-Strategy.pine
- Source: https://github.com/hasnocool/tradingview-pine-scripts :: `BankNifty 5min Supertrend Based Strategy.pine` @ `e031cab2819a7d56fb8bb9d000252f51439986e2`
- Evidence: line 55: `strategy.exit("My Long Exit Id", "My Long Entry Id", stop=(entryPrice1 - stopLoss1),trail_points=onePercent ) //close long trade if exitce and inSession`
- TealScript diagnostic: `55:102: type-mismatch: strategy.exit trailing stop requires trail_offset`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `strategy.exit(trail_points=...)` without `trail_offset`
- v6 rule: A trailing stop requires both `trail_offset` and one activation parameter such as `trail_points` or `trail_price`. [v6 strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

#### sources/0979__helenananaa-pine-compat-runtime__unsupported_table_set_position_values.pine
- Source: https://github.com/helenananaa/pine-compat-runtime :: `tests/fixtures/sema/unsupported_table_set_position_values.pine` @ `ad3ff56c67eb6a6dc8279746b5e43898be56716f`
- Evidence: line 4: `table.set_position(id, "position.bad") plot(close)`
- TealScript diagnostic: `4:24: type-mismatch: Invalid table.set_position position: position.bad`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `table.set_position(id, "position.bad")`
- v6 rule: `table.set_position()` requires a valid `position.*` enum value; an arbitrary string/member is not accepted. [v6 tables](https://www.tradingview.com/pine-script-docs/visuals/tables/)

#### sources/0997__grantj-re3-LingoLog__HashFunction.pine
- Source: https://github.com/grantj-re3/LingoLog :: `pine_script/Ideas/HashFunction.pine` @ `af5dd3a961a1123e7ff1bca4848107f5e5c34547`
- Evidence: line 16: `_iValue /= 64     strList.reverse()     strList.join("")`
- TealScript diagnostic: `16:9: type-mismatch: Cannot assign float value to int variable _iValue`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: float-valued division or compound division assigned to an `int`
- v6 rule: The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment. [v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)

### unknown-argument (24 rows)

Counts: real TealScript gap 1; invalid Pine 23; corpus artifact 0.

#### sources/0070__mihakralj-pinescript__mae.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/errors/mae.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 43: `plot(error, "MAE", color.new(color.blue, 60, color=color.yellow, linewidth=2), linewidth = 2, style = plot.style_area) plot(i_source2, "EMA", color=color.yellow, linewidth=1, style = plot.style_line, force_overlay = true)`
- TealScript diagnostic: `43:66: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `color.new()` with extra named `color` and/or `linewidth` arguments
- v6 rule: `color.new()` has only the documented color and transparency parameters; `color=` and `linewidth=` are not parameters of that function. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0087__mihakralj-pinescript__rsquared.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/errors/rsquared.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 73: `plot(score, "R²", color.new(color.red, 60, color=color.yellow, linewidth=2), linewidth = 2, style = plot.style_area) plot(i_source2, "EMA", color.new(color.yellow, 0, linewidth=2), linewidth = 1, style = plot.style_line, force_overlay = true)`
- TealScript diagnostic: `73:64: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `color.new()` with extra named `color` and/or `linewidth` arguments
- v6 rule: `color.new()` has only the documented color and transparency parameters; `color=` and `linewidth=` are not parameters of that function. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0257__mihakralj-pinescript__cummean.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/cummean.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 26: `plot(cummean_value, "CumMean", color=color.new(color.blue, 0, color=color.yellow, linewidth=2), linewidth=2)`
- TealScript diagnostic: `26:83: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `color.new()` with extra named `color` and/or `linewidth` arguments
- v6 rule: `color.new()` has only the documented color and transparency parameters; `color=` and `linewidth=` are not parameters of that function. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0263__mihakralj-pinescript__iqr.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/iqr.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 65: `plot(iqr_value, title="IQR", color=color.new(color.yellow, 0, color=color.yellow, linewidth=2), linewidth=2)`
- TealScript diagnostic: `65:83: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `color.new()` with extra named `color` and/or `linewidth` arguments
- v6 rule: `color.new()` has only the documented color and transparency parameters; `color=` and `linewidth=` are not parameters of that function. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0264__mihakralj-pinescript__jb.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/jb.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 72: `plot(jb_value, "Jarque-Bera Statistic", color=color.new(color.teal, 0, color=color.yellow, linewidth=2), linewidth=2)  // Critical values for Chi-squared distribution with 2 degrees of freedom (approximate):`
- TealScript diagnostic: `72:92: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `color.new()` with extra named `color` and/or `linewidth` arguments
- v6 rule: `color.new()` has only the documented color and transparency parameters; `color=` and `linewidth=` are not parameters of that function. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0265__mihakralj-pinescript__kendall.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/kendall.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 61: `plot(kendall_value, "Kendall's Tau", color=color.new(color.yellow,0, color=color.yellow, linewidth=2), linewidth=2)`
- TealScript diagnostic: `61:90: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `color.new()` with extra named `color` and/or `linewidth` arguments
- v6 rule: `color.new()` has only the documented color and transparency parameters; `color=` and `linewidth=` are not parameters of that function. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0269__mihakralj-pinescript__median.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/median.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 41: `plot(median_value, "Median", color=color.new(color.orange, 0, color=color.yellow, linewidth=2), linewidth=2)`
- TealScript diagnostic: `41:83: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `color.new()` with extra named `color` and/or `linewidth` arguments
- v6 rule: `color.new()` has only the documented color and transparency parameters; `color=` and `linewidth=` are not parameters of that function. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0270__mihakralj-pinescript__mode.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/mode.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 43: `plot(mode_value, "Mode", color=color.new(color.green, 0, color=color.yellow, linewidth=2), linewidth=2)`
- TealScript diagnostic: `43:78: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `color.new()` with extra named `color` and/or `linewidth` arguments
- v6 rule: `color.new()` has only the documented color and transparency parameters; `color=` and `linewidth=` are not parameters of that function. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0271__mihakralj-pinescript__percentile.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/percentile.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 59: `plot(percentile_value, "Percentile", color=color.new(color.yellow, 0, color=color.yellow, linewidth=2), linewidth=2)`
- TealScript diagnostic: `59:91: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `color.new()` with extra named `color` and/or `linewidth` arguments
- v6 rule: `color.new()` has only the documented color and transparency parameters; `color=` and `linewidth=` are not parameters of that function. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0273__mihakralj-pinescript__quantile.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/quantile.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 54: `plot(quantile_value, title="Quantile", color=color.new(color.yellow, 0, color=color.yellow, linewidth=2), linewidth=2)`
- TealScript diagnostic: `54:93: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `color.new()` with extra named `color` and/or `linewidth` arguments
- v6 rule: `color.new()` has only the documented color and transparency parameters; `color=` and `linewidth=` are not parameters of that function. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0275__mihakralj-pinescript__spearman.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/spearman.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 123: `plot(spearman_value, "Spearman's Rho", color=color.new(color.orange, 0, color=color.yellow, linewidth=2), linewidth=2) hline(0, "Zero Line", color.gray, linestyle=hline.style_dashed) hline(0.5, "Moderate Positive Correlation", color.green, linestyle=hline.style_dotted)`
- TealScript diagnostic: `123:93: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `color.new()` with extra named `color` and/or `linewidth` arguments
- v6 rule: `color.new()` has only the documented color and transparency parameters; `color=` and `linewidth=` are not parameters of that function. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0279__mihakralj-pinescript__theil.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/theil.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 47: `plot(theil_value, "Theil T Index", color=color.new(color.yellow, 0, color=color.yellow, linewidth=2), linewidth=2)`
- TealScript diagnostic: `47:89: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `color.new()` with extra named `color` and/or `linewidth` arguments
- v6 rule: `color.new()` has only the documented color and transparency parameters; `color=` and `linewidth=` are not parameters of that function. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0381__mihakralj-pinescript__vr.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/volatility/vr.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 47: `plot(vrValue, title="VR", color=color.new(color.yellow, 0, color=color.yellow, linewidth=2), linewidth=2)`
- TealScript diagnostic: `47:80: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `color.new()` with extra named `color` and/or `linewidth` arguments
- v6 rule: `color.new()` has only the documented color and transparency parameters; `color=` and `linewidth=` are not parameters of that function. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0382__mihakralj-pinescript__yzv.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/volatility/yzv.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 44: `plot(yzvValue, title="YZV", color=color.new(color.yellow, 0, color=color.yellow, linewidth=2), linewidth=2)`
- TealScript diagnostic: `44:82: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `color.new()` with extra named `color` and/or `linewidth` arguments
- v6 rule: `color.new()` has only the documented color and transparency parameters; `color=` and `linewidth=` are not parameters of that function. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0384__mihakralj-pinescript__adosc.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/volume/adosc.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 39: `plot(osc, "ADOSC", color.new(color.yellow, 0, color=color.yellow, linewidth=2), linewidth=2)`
- TealScript diagnostic: `39:67: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `color.new()` with extra named `color` and/or `linewidth` arguments
- v6 rule: `color.new()` has only the documented color and transparency parameters; `color=` and `linewidth=` are not parameters of that function. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0640__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.0.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/archive/es-professional-fade-strategy_v2.5.0.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Evidence: line 20: `initialCapital = 50000,   defaultQtyValue = 1,   commissionType = strategy.commission.cash_per_contract,`
- TealScript diagnostic: `20:20: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `strategy(..., initialCapital=...)`
- v6 rule: The v6 declaration parameter is `initial_capital` (underscore); `initialCapital` is not a v6 named parameter. [v6 strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

#### sources/0641__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.1.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/archive/es-professional-fade-strategy_v2.5.1.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Evidence: line 20: `initialCapital = 50000,   defaultQtyValue = 1,   commissionType = strategy.commission.cash_per_contract,`
- TealScript diagnostic: `20:20: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `strategy(..., initialCapital=...)`
- v6 rule: The v6 declaration parameter is `initial_capital` (underscore); `initialCapital` is not a v6 named parameter. [v6 strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

#### sources/0642__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.4_exec-gap.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/archive/es-professional-fade-strategy_v2.5.4_exec-gap.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Evidence: line 20: `initialCapital = 50000,   defaultQtyValue = 1,   commissionType = strategy.commission.cash_per_contract,`
- TealScript diagnostic: `20:20: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `strategy(..., initialCapital=...)`
- v6 rule: The v6 declaration parameter is `initial_capital` (underscore); `initialCapital` is not a v6 named parameter. [v6 strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

#### sources/0648__knectardev-pine_scripts__v2.5.6_v2.5.7.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Evidence: line 18: `"ES Professional Fade v2.5.4 (Execution Gap Modeled)", overlay=true, initialCapital=50000, defaultQtyValue=1, commissionType=strategy.commission.cash_per_contract, commissionValue=2.01)  const float DEFAULT_COMMISSION      = 2.01`
- TealScript diagnostic: `18:87: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `strategy(..., initialCapital=...)`
- v6 rule: The v6 declaration parameter is `initial_capital` (underscore); `initialCapital` is not a v6 named parameter. [v6 strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

#### sources/0654__knectardev-pine_scripts__momentum-breakout-strategy_v1.0.0.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/momentum-breakout-strategy/archive/momentum-breakout-strategy_v1.0.0.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Evidence: line 17: `strategy("Momentum Breakout v1.0.0", overlay = true, initialCapital = 25000)  // Basic implementation without volume filter`
- TealScript diagnostic: `17:71: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `strategy(..., initialCapital=...)`
- v6 rule: The v6 declaration parameter is `initial_capital` (underscore); `initialCapital` is not a v6 named parameter. [v6 strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

#### sources/0655__knectardev-pine_scripts__momentum-breakout-strategy_v1.1.0_volume-filter.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/momentum-breakout-strategy/archive/momentum-breakout-strategy_v1.1.0_volume-filter.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Evidence: line 17: `strategy("Momentum Breakout v1.1.0", overlay = true, initialCapital = 25000)  // Volume filter implementation`
- TealScript diagnostic: `17:71: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `strategy(..., initialCapital=...)`
- v6 rule: The v6 declaration parameter is `initial_capital` (underscore); `initialCapital` is not a v6 named parameter. [v6 strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

#### sources/0656__knectardev-pine_scripts__momentum-breakout-strategy.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/momentum-breakout-strategy/momentum-breakout-strategy.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Evidence: line 16: `strategy("Momentum Breakout v1.2.0", overlay = true, initialCapital = 25000)  // ============================================================================`
- TealScript diagnostic: `16:71: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `strategy(..., initialCapital=...)`
- v6 rule: The v6 declaration parameter is `initial_capital` (underscore); `initialCapital` is not a v6 named parameter. [v6 strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

#### sources/0740__mihakralj-QuanTAlib__median.pine
- Source: https://github.com/mihakralj/QuanTAlib :: `lib/statistics/median/median.pine` @ `031f1b5fe6ff2c7767549af5c34777f97dba916c`
- Evidence: line 41: `plot(median_value, "Median", color=color.new(color.orange, 0, color=color.yellow, linewidth=2), linewidth=2)`
- TealScript diagnostic: `41:83: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: `color.new()` with extra named `color` and/or `linewidth` arguments
- v6 rule: `color.new()` has only the documented color and transparency parameters; `color=` and `linewidth=` are not parameters of that function. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0948__g-moe-Trading-Indicators__lower-forecast.pine
- Source: https://github.com/g-moe/Trading-Indicators :: `Tradingview/lower-forecast.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Evidence: line 210: `table.cell(table_id = table, column = 0, row = 0, text = "MOM: " + str.tostring(math.round(momentum,1)) +               (momentum > momentum[1] ? " Rising" : " Falling"), bgcolor = color.orange, text_size = size.tiny)         table.cell(table_id = table, column = 1, row = 0, text = "NEAR: " + str.tostring(math.round(nearterm,1)) +`
- TealScript diagnostic: `210:20: unknown-argument: Unknown argument 'table_id' for table.cell()`
- Pine accepts it: **yes**
- Verdict: **real TealScript gap**
- Construct: `table.cell(table_id = table, ...)` named first parameter
- v6 rule: `table.cell()` exposes its first parameter as `table_id`; named arguments may be used for it, so this call is valid v6. [v6 tables](https://www.tradingview.com/pine-script-docs/visuals/tables/)

### unknown-identifier (13 rows)

Counts: real TealScript gap 6; invalid Pine 7; corpus artifact 0.

#### sources/0151__mihakralj-pinescript__sam.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/momentum/sam.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 31: `float ji = (0.0962 * i1 + 0.5769 * nz(i1[2]) - 0.5769 * nz(i1[4]) - 0.0962 * nz(i1[6])) * (0.075 * nz(ji[1]) + 0.54)     float jq = (0.0962 * q1 + 0.5769 * nz(q1[2]) - 0.5769 * nz(q1[4]) - 0.0962 * nz(q1[6])) * (0.075 * nz(jq[1]) + 0.54)`
- TealScript diagnostic: `31:107: unknown-identifier: Unknown identifier: ji`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: undeclared identifier or self-reference during its own initializer
- v6 rule: Pine requires an identifier to be declared before use; a declaration cannot use the variable being initialized, and references with no declaration are invalid. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0489__casoon-pine-scripts__flow_bias.pine
- Source: https://github.com/casoon/pine-scripts :: `archive/indicators/flow_bias/flow_bias.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 160: `rsi = ta.rsi(close, rsiLen)  // CMF`
- TealScript diagnostic: `160:21: unknown-identifier: Unknown identifier: rsiLen`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: undeclared identifier or self-reference during its own initializer
- v6 rule: Pine requires an identifier to be declared before use; a declaration cannot use the variable being initialized, and references with no declaration are invalid. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0495__casoon-pine-scripts__wave_navigator.pine
- Source: https://github.com/casoon/pine-scripts :: `archive/indicators/wave_navigator/wave_navigator.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 1255: `while array.size(pivPrice) > pivotsToKeep         array.shift(pivPrice)         array.shift(pivIndex)`
- TealScript diagnostic: `1255:34: unknown-identifier: Unknown identifier: pivotsToKeep`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: undeclared identifier or self-reference during its own initializer
- v6 rule: Pine requires an identifier to be declared before use; a declaration cannot use the variable being initialized, and references with no declaration are invalid. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0539__casoon-pine-scripts__fisher_transform_advanced.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/fisher_transform_advanced/fisher_transform_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 106: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3  f_kama(series float x, simple int len) =>`
- TealScript diagnostic: `106:20: unknown-identifier: Unknown identifier: e6`
- Pine accepts it: **yes**
- Verdict: **real TealScript gap**
- Construct: local variable referenced after its declaration in a UDF return expression
- v6 rule: A local variable declared earlier in the same function scope is available to later expressions and may be returned; these are not forward references. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0550__casoon-pine-scripts__roc_advanced.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/roc_advanced/roc_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 106: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3  f_kama(series float x, simple int len) =>`
- TealScript diagnostic: `106:20: unknown-identifier: Unknown identifier: e6`
- Pine accepts it: **yes**
- Verdict: **real TealScript gap**
- Construct: local variable referenced after its declaration in a UDF return expression
- v6 rule: A local variable declared earlier in the same function scope is available to later expressions and may be returned; these are not forward references. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0551__casoon-pine-scripts__rsi_advanced.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/rsi_advanced/rsi_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 109: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3  f_kama(series float x, simple int len) =>`
- TealScript diagnostic: `109:20: unknown-identifier: Unknown identifier: e6`
- Pine accepts it: **yes**
- Verdict: **real TealScript gap**
- Construct: local variable referenced after its declaration in a UDF return expression
- v6 rule: A local variable declared earlier in the same function scope is available to later expressions and may be returned; these are not forward references. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0553__casoon-pine-scripts__tsi_advanced.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/tsi_advanced/tsi_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 107: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3  f_kama(series float x, simple int len) =>`
- TealScript diagnostic: `107:20: unknown-identifier: Unknown identifier: e6`
- Pine accepts it: **yes**
- Verdict: **real TealScript gap**
- Construct: local variable referenced after its declaration in a UDF return expression
- v6 rule: A local variable declared earlier in the same function scope is available to later expressions and may be returned; these are not forward references. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0558__casoon-pine-scripts__williams_r_advanced.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/williams_r_advanced/williams_r_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 109: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3  f_kama(series float x, simple int len) =>`
- TealScript diagnostic: `109:20: unknown-identifier: Unknown identifier: e6`
- Pine accepts it: **yes**
- Verdict: **real TealScript gap**
- Construct: local variable referenced after its declaration in a UDF return expression
- v6 rule: A local variable declared earlier in the same function scope is available to later expressions and may be returned; these are not forward references. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0581__casoon-pine-scripts__vein_reversal_zones.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/trend_direction/vein/vein_reversal_zones/vein_reversal_zones.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 311: `float conflScoreLong = (structureLong ? 3.0 : 0.0) + (momentumLong ? 2.0 : 0.0) + (relVol > 1.2 ? 2.0 : 0.0) + (emaLong ? 2.0 : 0.0) + (stLong ? 1.0 : 0.0) float conflScoreShort = (structureShort ? 3.0 : 0.0) + (momentumShort ? 2.0 : 0.0) + (relVol > 1.2 ? 2.0 : 0.0) + (emaShort ? 2.0 : 0.0) + (stShort ? 1.0 : 0.0)`
- TealScript diagnostic: `311:84: unknown-identifier: Unknown identifier: relVol`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: undeclared identifier or self-reference during its own initializer
- v6 rule: Pine requires an identifier to be declared before use; a declaration cannot use the variable being initialized, and references with no declaration are invalid. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0772__milocaetano-quantick__delta_histogram.pine
- Source: https://github.com/milocaetano/quantick :: `crates/app/scripts/delta_histogram.pine` @ `6bd9dd86a50d7d2b67504a6729784ac94fe8e276`
- Evidence: line 3: `plot(delta, title="delta", style=plot.style_histogram, color=color.aqua) plot(ta.sma(delta, 20), title="delta avg", color=color.orange)`
- TealScript diagnostic: `3:6: unknown-identifier: Unknown identifier: delta`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: undeclared identifier or self-reference during its own initializer
- v6 rule: Pine requires an identifier to be declared before use; a declaration cannot use the variable being initialized, and references with no declaration are invalid. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0773__suyons-tradingview-indicators__02-rsi-signal.pine
- Source: https://github.com/suyons/tradingview-indicators :: `relative-strength-index/02-rsi-signal.pine` @ `fe3d061b99afc3dcc2400893e42f8dc3c7c414ad`
- Evidence: line 44: `buy_series = not (buy[1] or buy[2] or buy[3] or buy[4] or buy[5])`
- TealScript diagnostic: `44:19: unknown-identifier: Unknown identifier: buy`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: undeclared identifier or self-reference during its own initializer
- v6 rule: Pine requires an identifier to be declared before use; a declaration cannot use the variable being initialized, and references with no declaration are invalid. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0865__hasnocool-tradingview-pine-scripts__John-F.-Ehlers-Center-Of-Gravity-Balanced-by-DM-.pine
- Source: https://github.com/hasnocool/tradingview-pine-scripts :: `John F. Ehlers Center Of Gravity Balanced by [DM].pine` @ `e031cab2819a7d56fb8bb9d000252f51439986e2`
- Evidence: line 40: `[avg_sig] [out_avg] = request.security(symbol=syminfo.tickerid, timeframe="", expression=fx_centerofgravitydm(),                               gaps=barmerge.gaps_off, lookahead=barmerge.lookahead_on,ignore_invalid_symbol=true)`
- TealScript diagnostic: `40:6: unknown-identifier: Unknown identifier: avg_sig`
- Pine accepts it: **yes**
- Verdict: **real TealScript gap**
- Construct: local variable referenced after its declaration in a UDF return expression
- v6 rule: A local variable declared earlier in the same function scope is available to later expressions and may be returned; these are not forward references. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0952__chauhanvishaal-tv-indicators__Zone_Identifier.pine
- Source: https://github.com/chauhanvishaal/tv-indicators :: `Zone_Identifier.pine` @ `74778b3f18d8562666e1b17e880a420ab5d967c2`
- Evidence: line 260: `displacementStart = na(float)     displacementEnd = na(float)`
- TealScript diagnostic: `260:28: unknown-identifier: Unknown identifier: float`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: undeclared identifier or self-reference during its own initializer
- v6 rule: Pine requires an identifier to be declared before use; a declaration cannot use the variable being initialized, and references with no declaration are invalid. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### duplicate-argument (8 rows)

Counts: real TealScript gap 0; invalid Pine 8; corpus artifact 0.

#### sources/0158__mihakralj-pinescript__change.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/change.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 30: `plot(result, "Change %", color.blue, color=color.yellow, linewidth=2)`
- TealScript diagnostic: `30:38: duplicate-argument: Argument 'color' for plot() was supplied multiple times`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: same named argument supplied positionally and/or more than once
- v6 rule: A function call cannot bind one parameter more than once; duplicate named/positional arguments are rejected by the v6 call rules. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0176__mihakralj-pinescript__log.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/log.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 27: `plot(transformedSource, "Log Transformation", color=color.green, color=color.yellow, linewidth=2)`
- TealScript diagnostic: `27:66: duplicate-argument: Argument 'color' for plot() was supplied multiple times`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: same named argument supplied positionally and/or more than once
- v6 rule: A function call cannot bind one parameter more than once; duplicate named/positional arguments are rejected by the v6 call rules. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0178__mihakralj-pinescript__logtrans.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/logtrans.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 27: `plot(transformedSource, "Log Transformation", color=color.green, color=color.yellow, linewidth=2)`
- TealScript diagnostic: `27:66: duplicate-argument: Argument 'color' for plot() was supplied multiple times`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: same named argument supplied positionally and/or more than once
- v6 rule: A function call cannot bind one parameter more than once; duplicate named/positional arguments are rejected by the v6 call rules. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0254__mihakralj-pinescript__cointegration.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/cointegration.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 125: `plot(coint_stat, "Cointegration ADF Stat", color.yellow, color=color.yellow, linewidth=2)`
- TealScript diagnostic: `125:58: duplicate-argument: Argument 'color' for plot() was supplied multiple times`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: same named argument supplied positionally and/or more than once
- v6 rule: A function call cannot bind one parameter more than once; duplicate named/positional arguments are rejected by the v6 call rules. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0258__mihakralj-pinescript__entropy.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/entropy.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 67: `plot(entropyValue, "Entropy", color=color.blue, color=color.yellow, linewidth=2)`
- TealScript diagnostic: `67:49: duplicate-argument: Argument 'color' for plot() was supplied multiple times`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: same named argument supplied positionally and/or more than once
- v6 rule: A function call cannot bind one parameter more than once; duplicate named/positional arguments are rejected by the v6 call rules. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0725__mihakralj-QuanTAlib__cointegration.pine
- Source: https://github.com/mihakralj/QuanTAlib :: `lib/statistics/cointegration/cointegration.pine` @ `031f1b5fe6ff2c7767549af5c34777f97dba916c`
- Evidence: line 125: `plot(coint_stat, "Cointegration ADF Stat", color.yellow, color=color.yellow, linewidth=2)`
- TealScript diagnostic: `125:58: duplicate-argument: Argument 'color' for plot() was supplied multiple times`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: same named argument supplied positionally and/or more than once
- v6 rule: A function call cannot bind one parameter more than once; duplicate named/positional arguments are rejected by the v6 call rules. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0736__deepentropy-lightweight-charts-indicators__SuperTrend-Relative-Volume-Kernel-Optimized-.pine
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_community/SuperTrend + Relative Volume (Kernel Optimized).pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Evidence: line 211: `table.cell(table, row=0, column=0, text="⚠️ No Volume Data Available for " + syminfo.tickerid, text_color=color.white, bgcolor=color.red) else if(bar_index == last_bar_index and (volumeOnBullishBreak.size() != KDEStep or volumeOnBearishBreak.size() != KDEStep) and ShowErrors)     log.info(str.tostring(volumeOnBearishBreak.size()))`
- TealScript diagnostic: `211:30: duplicate-argument: Argument 'column' for table.cell() was supplied multiple times`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: same named argument supplied positionally and/or more than once
- v6 rule: A function call cannot bind one parameter more than once; duplicate named/positional arguments are rejected by the v6 call rules. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0938__Leci37-tuisku_Web_selling__WklfMTVNaW5fMVdBVnR1aXNrdTFkMWY2MDZk.pine
- Source: https://github.com/Leci37/tuisku_Web_selling :: `d_result/pine_TW_b/WklfMTVNaW5fMVdBVnR1aXNrdTFkMWY2MDZk.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Evidence: line 201: `plot(obLevel2, color=color.red, linewidth=2, style=plot.style_line, title="OB Level 2 (Dashed)", color=color.red) plot(osLevel2, color=color.green, linewidth=2, style=plot.style_line, title="OS Level 2 (Dashed)", color=color.green)`
- TealScript diagnostic: `201:98: duplicate-argument: Argument 'color' for plot() was supplied multiple times`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: same named argument supplied positionally and/or more than once
- v6 rule: A function call cannot bind one parameter more than once; duplicate named/positional arguments are rejected by the v6 call rules. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

### duplicate-symbol (7 rows)

Counts: real TealScript gap 0; invalid Pine 7; corpus artifact 0.

#### sources/0053__mihakralj-pinescript__dmx.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/dynamics/dmx.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 92: `dmx = dmx(i_period)  // Plot`
- TealScript diagnostic: `92:1: duplicate-symbol: Duplicate declaration: dmx`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: function and variable declared with the same identifier in one scope
- v6 rule: Declarations in one Pine scope must have unique identifiers; a function name cannot be redeclared as a variable in that same scope. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0066__mihakralj-pinescript__dirty.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/errors/dirty.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 26: `dirty = dirty(source, interval, gap_size)  // Plot`
- TealScript diagnostic: `26:1: duplicate-symbol: Duplicate declaration: dirty`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: function and variable declared with the same identifier in one scope
- v6 rule: Declarations in one Pine scope must have unique identifiers; a function name cannot be redeclared as a variable in that same scope. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0249__mihakralj-pinescript__psar.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/reversals/psar.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 70: `psar = psar(i_af_start, i_af_increment, i_af_max) psar_above = psar > close ? psar : na psar_below = psar < close ? psar : na`
- TealScript diagnostic: `70:1: duplicate-symbol: Duplicate declaration: psar`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: function and variable declared with the same identifier in one scope
- v6 rule: Declarations in one Pine scope must have unique identifiers; a function name cannot be redeclared as a variable in that same scope. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0371__mihakralj-pinescript__jvolty.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/volatility/jvolty.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 47: `jvolty= jvolty(i_source, i_period)  // Plot`
- TealScript diagnostic: `47:1: duplicate-symbol: Duplicate declaration: jvolty`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: function and variable declared with the same identifier in one scope
- v6 rule: Declarations in one Pine scope must have unique identifiers; a function name cannot be redeclared as a variable in that same scope. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0372__mihakralj-pinescript__jvoltyn.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/volatility/jvoltyn.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 48: `jvoltyn= jvoltyn(i_source, i_period)  // Plot`
- TealScript diagnostic: `48:1: duplicate-symbol: Duplicate declaration: jvoltyn`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: function and variable declared with the same identifier in one scope
- v6 rule: Declarations in one Pine scope must have unique identifiers; a function name cannot be redeclared as a variable in that same scope. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0780__deepentropy-lightweight-charts-indicators__Custom-Pattern-Detection.pine
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_community/Custom Pattern Detection.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Evidence: line 105: `t = time[pivot_lb] b = bar_index[pivot_lb] h = high[pivot_lb]`
- TealScript diagnostic: `105:1: duplicate-symbol: Duplicate declaration: t`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: function and variable declared with the same identifier in one scope
- v6 rule: Declarations in one Pine scope must have unique identifiers; a function name cannot be redeclared as a variable in that same scope. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0840__iamc1oud-Tradingview-Scripts__Smart-Money-Concept-with-Liquidity-Swings.pine
- Source: https://github.com/iamc1oud/Tradingview-Scripts :: `2025-Setup/Smart Money Concept with Liquidity Swings.pine` @ `b6563531a333bcfa8b52e497caed79be511c554d`
- Evidence: line 871: `lineStyle        = input.string('Dotted', 'Line Style + Width', ['Solid', 'Dashed', 'Dotted'], inline='l', group='Appearance') lineWid          = input.int(1, '', inline='l', group='Appearance') boxWid           = input.float(0.7, 'Box Width + Type ', step=0.1, inline='xx', group='Appearance')`
- TealScript diagnostic: `871:1: duplicate-symbol: Duplicate declaration: lineStyle`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: function and variable declared with the same identifier in one scope
- v6 rule: Declarations in one Pine scope must have unique identifiers; a function name cannot be redeclared as a variable in that same scope. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### implicit-numeric-bool (5 rows)

Counts: real TealScript gap 0; invalid Pine 5; corpus artifact 0.

#### sources/0628__knectardev-pine_scripts__rsi-divergence-indicator_v1.3.14.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/indicators/rsi-divergence-indicator/archive/rsi-divergence-indicator_v1.3.14.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Evidence: line 55: `if ta.change(time) or na(pivotHighPrice)   lastPivotHigh := na   lastPivotHighBar := na`
- TealScript diagnostic: `55:4: implicit-numeric-bool: Numeric int expression cannot be used as a boolean; compare it explicitly or wrap it in bool(...)`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: numeric expression used directly as a boolean
- v6 rule: Pine v6 does not implicitly convert int/float values to bool; compare the number explicitly or use a documented boolean expression. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0630__knectardev-pine_scripts__rsi-divergence-indicator_v1.3.17.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/indicators/rsi-divergence-indicator/archive/rsi-divergence-indicator_v1.3.15/archive/rsi-divergence-indicator_v1.3.16/archive/rsi-divergence-indicator_v1.3.17.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Evidence: line 53: `if timeChange or naPivotHighPrice   lastPivotHigh := na   lastPivotHighBar := na`
- TealScript diagnostic: `53:4: implicit-numeric-bool: Numeric int expression cannot be used as a boolean; compare it explicitly or wrap it in bool(...)`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: numeric expression used directly as a boolean
- v6 rule: Pine v6 does not implicitly convert int/float values to bool; compare the number explicitly or use a documented boolean expression. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0631__knectardev-pine_scripts__rsi-divergence-indicator_v1.3.18.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/indicators/rsi-divergence-indicator/archive/rsi-divergence-indicator_v1.3.15/archive/rsi-divergence-indicator_v1.3.16/archive/rsi-divergence-indicator_v1.3.17/archive/rsi-divergence-indicator_v1.3.18.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Evidence: line 53: `if timeChange or naPivotHighPrice     lastPivotHigh := na     lastPivotHighBar := na`
- TealScript diagnostic: `53:4: implicit-numeric-bool: Numeric int expression cannot be used as a boolean; compare it explicitly or wrap it in bool(...)`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: numeric expression used directly as a boolean
- v6 rule: Pine v6 does not implicitly convert int/float values to bool; compare the number explicitly or use a documented boolean expression. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0632__knectardev-pine_scripts__rsi-divergence-indicator_v1.3.19.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/indicators/rsi-divergence-indicator/archive/rsi-divergence-indicator_v1.3.19.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Evidence: line 65: `if timeChange or naPivotHighPrice     lastPivotHigh := na     lastPivotHighBar := na`
- TealScript diagnostic: `65:4: implicit-numeric-bool: Numeric int expression cannot be used as a boolean; compare it explicitly or wrap it in bool(...)`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: numeric expression used directly as a boolean
- v6 rule: Pine v6 does not implicitly convert int/float values to bool; compare the number explicitly or use a documented boolean expression. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0635__knectardev-pine_scripts__rsi-divergence-indicator.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/indicators/rsi-divergence-indicator/rsi-divergence-indicator.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Evidence: line 55: `if ta.change(time) or na(pivotHighPrice)   lastPivotHigh := na   lastPivotHighBar := na`
- TealScript diagnostic: `55:4: implicit-numeric-bool: Numeric int expression cannot be used as a boolean; compare it explicitly or wrap it in bool(...)`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: numeric expression used directly as a boolean
- v6 rule: Pine v6 does not implicitly convert int/float values to bool; compare the number explicitly or use a documented boolean expression. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

### argument-count (4 rows)

Counts: real TealScript gap 4; invalid Pine 0; corpus artifact 0.

#### sources/0753__Opus-Aether-AI-pine-transpiler__scanner_momentum_setup_-_rsi_directional_momentum.pine
- Source: https://github.com/Opus-Aether-AI/pine-transpiler :: `tests/corpus/community/arunkbhaskar/scanner_momentum_setup_-_rsi_directional_momentum.pine` @ `6506237f3a34c8082851e8f8d7da69062f0f4f3b`
- Evidence: line 698: `matrix.add_row(matrix, 0, array.from(symbol, _time, price, pchg, vol_pchg, signal))  // Scanner Function`
- TealScript diagnostic: `698:31: argument-count: matrix.add_row() expects at most 2 arguments`
- Pine accepts it: **yes**
- Verdict: **real TealScript gap**
- Construct: valid namespace call counted as an over-arity method call
- v6 rule: The documented namespace forms accept these arguments: `matrix.add_row(id, row, array)`, `line.get_y1(line)`, and `table.clear(table_id, start_column, start_row, end_column, end_row)`. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0767__TraderOracle-TradingView__Tidal-Wave.pine
- Source: https://github.com/TraderOracle/TradingView :: `Tidal Wave.pine` @ `08b33c19614e00361b6a2fa775f6d0038a205726`
- Evidence: line 63: `if (high > line.get_y1(line) and low < line.get_y1(line))             line.delete(array.get(ll, index))`
- TealScript diagnostic: `63:32: argument-count: line.get_y1() expects at most 0 arguments`
- Pine accepts it: **yes**
- Verdict: **real TealScript gap**
- Construct: valid namespace call counted as an over-arity method call
- v6 rule: The documented namespace forms accept these arguments: `matrix.add_row(id, row, array)`, `line.get_y1(line)`, and `table.clear(table_id, start_column, start_row, end_column, end_row)`. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0805__Opus-Aether-AI-pine-transpiler__scanner_ict_mitigation_block_scanner.pine
- Source: https://github.com/Opus-Aether-AI/pine-transpiler :: `tests/corpus/community/arunkbhaskar/scanner_ict_mitigation_block_scanner.pine` @ `6506237f3a34c8082851e8f8d7da69062f0f4f3b`
- Evidence: line 685: `matrix.add_row(matrix, 0, array.from(symbol, _time, price, _cum_pchg, _cum_vol_pchg, signal))  // Screener function to collect data`
- TealScript diagnostic: `685:31: argument-count: matrix.add_row() expects at most 2 arguments`
- Pine accepts it: **yes**
- Verdict: **real TealScript gap**
- Construct: valid namespace call counted as an over-arity method call
- v6 rule: The documented namespace forms accept these arguments: `matrix.add_row(id, row, array)`, `line.get_y1(line)`, and `table.clear(table_id, start_column, start_row, end_column, end_row)`. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0853__g-moe-Trading-Indicators__hooplah-high-low-table.pine
- Source: https://github.com/g-moe/Trading-Indicators :: `Tradingview/hooplah-high-low-table.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Evidence: line 452: `table.clear(table, 0, 0, 1, 6)      table.cell(table, 0, 0, text = 'TITLE HERE', text_color = table_text, bgcolor = table_head)`
- TealScript diagnostic: `452:33: argument-count: table.clear() expects at most 4 arguments`
- Pine accepts it: **yes**
- Verdict: **real TealScript gap**
- Construct: valid namespace call counted as an over-arity method call
- v6 rule: The documented namespace forms accept these arguments: `matrix.add_row(id, row, array)`, `line.get_y1(line)`, and `table.clear(table_id, start_column, start_row, end_column, end_row)`. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

### array-bounds (4 rows)

Counts: real TealScript gap 4; invalid Pine 0; corpus artifact 0.

#### sources/0497__casoon-pine-scripts__wavetrend_strategy.pine
- Source: https://github.com/casoon/pine-scripts :: `archive/strategies/wavetrend/wavetrend_strategy.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 446: `stochK = _lowerTFValid ? array.last(_kArrLow) : stochK_h stochD = stochD_h  // D is informational only; lower-TF doesn't add precision here`
- TealScript diagnostic: `Array index 0 is out of bounds. Array size is 0`
- Pine accepts it: **yes**
- Verdict: **real TealScript gap**
- Construct: array access on an empty runtime array (`array.last`, `array.get`, or equivalent)
- v6 rule: The array APIs are valid Pine; an empty-array access is a runtime condition and must be reproduced or diagnosed at the execution boundary, not rejected as invalid source. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0529__casoon-pine-scripts__zigzag_core.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/market_structure/zigzag_core/zigzag_core.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 561: `float centerVal = array.get(ltfHighBuf, idx)     bool result = true     for i = idx - pivotDepth to idx + pivotDepth`
- TealScript diagnostic: `Array index 0 is out of bounds. Array size is 0`
- Pine accepts it: **yes**
- Verdict: **real TealScript gap**
- Construct: array access on an empty runtime array (`array.last`, `array.get`, or equivalent)
- v6 rule: The array APIs are valid Pine; an empty-array access is a runtime condition and must be reproduced or diagnosed at the execution boundary, not rejected as invalid source. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0554__casoon-pine-scripts__wavetrend.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/wavetrend/wavetrend.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 578: `stochK = _lowerTFValid ? array.last(_kArrLow) : stochK_h stochD = stochD_h  // D is informational only; lower-TF doesn't add precision here`
- TealScript diagnostic: `Array index 0 is out of bounds. Array size is 0`
- Pine accepts it: **yes**
- Verdict: **real TealScript gap**
- Construct: array access on an empty runtime array (`array.last`, `array.get`, or equivalent)
- v6 rule: The array APIs are valid Pine; an empty-array access is a runtime condition and must be reproduced or diagnosed at the execution boundary, not rejected as invalid source. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

#### sources/0760__supertonka-tradingview-ict-indicator__orderblock_indicator.pine
- Source: https://github.com/supertonka/tradingview-ict-indicator :: `orderblock_indicator.pine` @ `a65385012d39d44e53e0c27ee2f7f02aa2802a34`
- Evidence: line 120: `element = bullish_ob.get(i)              if not element.breaker`
- TealScript diagnostic: `Array index 0 is out of bounds. Array size is 0`
- Pine accepts it: **yes**
- Verdict: **real TealScript gap**
- Construct: array access on an empty runtime array (`array.last`, `array.get`, or equivalent)
- v6 rule: The array APIs are valid Pine; an empty-array access is a runtime condition and must be reproduced or diagnosed at the execution boundary, not rejected as invalid source. [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

### qualifier-mismatch (4 rows)

Counts: real TealScript gap 0; invalid Pine 4; corpus artifact 0.

#### sources/0157__mihakralj-pinescript__binomdist.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/binomdist.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 52: `float lnTerm = lnBinom(n, i) + i * lnP + (n - i) * lnQ             cdf += math.exp(lnTerm)         math.min(cdf, 1.0)`
- TealScript diagnostic: `52:39: qualifier-mismatch: Cannot pass series value to simple parameter 'i' for function lnBinom; use an input/simple value or declare a compatible parameter`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: series argument passed to an inferred/simple UDF parameter
- v6 rule: A simple parameter accepts only simple, input, or const values; a series argument is stronger and is rejected by the v6 qualifier hierarchy. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0166__mihakralj-pinescript__gammadist.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/gammadist.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 44: `float lnPfx = a * math.log(x) - x - lnGamma(a)     math.exp(lnPfx) * sum`
- TealScript diagnostic: `44:49: qualifier-mismatch: Cannot pass series value to simple parameter 'z' for function lnGamma; use an input/simple value or declare a compatible parameter`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: series argument passed to an inferred/simple UDF parameter
- v6 rule: A simple parameter accepts only simple, input, or const values; a series argument is stronger and is rejected by the v6 qualifier hierarchy. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0185__mihakralj-pinescript__poissondist.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/poissondist.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Evidence: line 44: `float lnPfx = a * math.log(x) - x - lnGamma(a)     math.exp(lnPfx) * sum`
- TealScript diagnostic: `44:49: qualifier-mismatch: Cannot pass series value to simple parameter 'z' for function lnGamma; use an input/simple value or declare a compatible parameter`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: series argument passed to an inferred/simple UDF parameter
- v6 rule: A simple parameter accepts only simple, input, or const values; a series argument is stronger and is rejected by the v6 qualifier hierarchy. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

#### sources/0535__casoon-pine-scripts__vwap_cross_visuals.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/mean_reversion/vwap_cross_visuals/vwap_cross_visuals.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Evidence: line 1663: `windowHigh, windowLow, binVolumes, binPrices] = calculateProfile(adaptiveConfig, windowStart, windowLength)      // Detect nodes`
- TealScript diagnostic: `1663:100: qualifier-mismatch: Cannot pass series value to simple parameter 'windowLength' for function calculateProfile; use an input/simple value or declare a compatible parameter`
- Pine accepts it: **no**
- Verdict: **invalid Pine**
- Construct: series argument passed to an inferred/simple UDF parameter
- v6 rule: A simple parameter accepts only simple, input, or const values; a series argument is stronger and is rejected by the v6 qualifier hierarchy. [v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

