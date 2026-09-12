> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v4 Behavior Audit

This report audits the 16 `type-mismatch`, 8 `duplicate-symbol`, 8 `unknown-identifier`, and 8 `global-output-declared-but-not-evaluated` rows. Every pinned raw source matched the harvested bytes (40/40). Verdict `supported` means correct silence for an intentionally hidden output probe.

## Split

| Cause | Count | Supported/correct silence | TealScript gap | Invalid Pine |
| --- | ---: | ---: | ---: | ---: |
| type-mismatch | 16 | 0 | 3 | 13 |
| duplicate-symbol | 8 | 0 | 2 | 6 |
| unknown-identifier | 8 | 0 | 0 | 8 |
| global-output-declared-but-not-evaluated | 8 | 4 | 3 | 1 |
| Total | 40 | 4 | 8 | 28 |

## Evidence

### type-mismatch (16)

- **invalid-pine** `sources/0072__folknor-pine-tools__coll_array_push_float.pine`
  - Row: 0022:https://github.com/folknor/pine-tools:investigations/INV087-collection-mutator-element-type/probes/coll_array_push_float.pine
  - Pinned source: https://github.com/folknor/pine-tools :: investigations/INV087-collection-mutator-element-type/probes/coll_array_push_float.pine @ 47790c0105dd1769a67f9ef109166e7c2135b0cf
  - Location: line 7
  - Construct: array.push into array<int> with float value
  - Source line: `array.push(a, 1.5)`
  - Evidence: Pine arrays are homogeneous; array<int> cannot accept a float element.

- **invalid-pine** `sources/0087__folknor-pine-tools__collection-element-type.pine`
  - Row: 0012:https://github.com/folknor/pine-tools:packages/core/test/fixtures/regression/collection-element-type.pine
  - Pinned source: https://github.com/folknor/pine-tools :: packages/core/test/fixtures/regression/collection-element-type.pine @ 47790c0105dd1769a67f9ef109166e7c2135b0cf
  - Location: line 11
  - Construct: array.push into array<int> with float value
  - Source line: `array.push(ai, 1.5)`
  - Evidence: Pine arrays are homogeneous; array<int> cannot accept a float element.

- **invalid-pine** `sources/0150__folknor-pine-tools__INV123-paramless-control.pine`
  - Row: 0025:https://github.com/folknor/pine-tools:packages/core/test/fixtures/regression/INV123-paramless-control.pine
  - Pinned source: https://github.com/folknor/pine-tools :: packages/core/test/fixtures/regression/INV123-paramless-control.pine @ 2e34e94d81b3ae2c0fe7f8d52819d9dde92ed48c
  - Location: line 7
  - Construct: nz() applied to a bool result
  - Source line: `plot(nz(g()))`
  - Evidence: Pine v6 bool values are not nullable numeric series; nz() does not accept this bool result.

- **tealscript-gap** `sources/0172__regalouisei-collect-tradingview__relative-crypto-dominance-polar-chart-luxalgo.pine`
  - Row: 0022:https://github.com/regalouisei/collect-tradingview:pinescript/editors_picks/relative-crypto-dominance-polar-chart-luxalgo.pine
  - Pinned source: https://github.com/regalouisei/collect-tradingview :: pinescript/editors_picks/relative-crypto-dominance-polar-chart-luxalgo.pine @ 5847fd3b47540ddd107be02b8c658409d35660ae
  - Location: line 146
  - Construct: UDT named ticker shadows the ticker namespace
  - Source line: `        t_ickers.push(ticker.new(tickerID,c_olor,label.new(na, na, color = #00000000, size = parsedSize)))`
  - Evidence: Pine resolves ticker.new() as construction of the user-defined ticker type here; TealScript resolves the builtin ticker.new() and reports a string/UDT mismatch.

- **invalid-pine** `sources/0326__DeolinNaidoo-indic__larper_main.pine`
  - Row: 0001:https://github.com/DeolinNaidoo/indic:larper_main.pine
  - Pinned source: https://github.com/DeolinNaidoo/indic :: larper_main.pine @ 613deb667d353d2063d6858715eb3a71dddcd703
  - Location: line 673
  - Construct: float division assigned to int variable
  - Source line: `int qDurMonth = (monthEnd - monthAnchor) / 4`
  - Evidence: Pine division produces a float; an explicit int() conversion is required for an int declaration.

- **invalid-pine** `sources/0333__regalouisei-collect-tradingview__composite-fear-greed-index.pine`
  - Row: 0008:https://github.com/regalouisei/collect-tradingview:pinescript/oscillators/composite-fear-greed-index.pine
  - Pinned source: https://github.com/regalouisei/collect-tradingview :: pinescript/oscillators/composite-fear-greed-index.pine @ 5847fd3b47540ddd107be02b8c658409d35660ae
  - Location: line 119
  - Construct: fill() positional arguments use a float where the overload expects color/title
  - Source line: `fill(p_idx, p_mid, fgIndex, 50, fgIndex > 50 ? color.new(c_greed, 85) : color.new(c_fear, 85))`
  - Evidence: The call supplies fgIndex and 50 to the legacy fill overload before a single color; this is not the documented gradient overload shape.

- **invalid-pine** `sources/0364__helenananaa-pine-compat-runtime__unsupported_map_put_key_type.pine`
  - Row: 0014:https://github.com/helenananaa/pine-compat-runtime:tests/fixtures/sema/unsupported_map_put_key_type.pine
  - Pinned source: https://github.com/helenananaa/pine-compat-runtime :: tests/fixtures/sema/unsupported_map_put_key_type.pine @ 62192b7f37bdd9be34d5b2af5768e943d7e55a9c
  - Location: line 5
  - Construct: int key passed to map<string, float>
  - Source line: `map.put(values, 1, close)`
  - Evidence: Pine map keys must match the declared key type string.

- **tealscript-gap** `sources/0408__regalouisei-collect-tradingview__stock-screener.pine`
  - Row: 0008:https://github.com/regalouisei/collect-tradingview:pinescript/oscillators/stock-screener.pine
  - Pinned source: https://github.com/regalouisei/collect-tradingview :: pinescript/oscillators/stock-screener.pine @ 5847fd3b47540ddd107be02b8c658409d35660ae
  - Location: line 516
  - Construct: user-defined vwap() shadows the builtin call inside request.security
  - Source line: `[t1VolumeTrend, t1VolumeSpike, t1Volatility, t1Oscillator, t1BigCandle, t1High, t1Low, t1Open, t1Close, t1DailyLevelText, t1vwap1, t1vwap2] = request.security(ticker1, scannerTimeframe, [volumeTrend(), volumeSpike(), volatility(), oscillatorValue(), bigCandle(), high, low, open, close, dailyLevelText(t1DailyClose), vwap(newVWAP1Candle), vwap(newVWAP2Candle)], ignore_invalid_symbol=true)`
  - Evidence: Pine permits the local vwap(bool) helper and resolves its bool argument; TealScript binds the call to a numeric-source builtin signature.

- **invalid-pine** `sources/0470__jerryinyang-Cerebr-Pinescript-Codebase__CTF-Raid-Indicator.pine`
  - Row: 0020:https://github.com/jerryinyang/Cerebr-Pinescript-Codebase:Raids/CTF Raid Indicator.pine
  - Pinned source: https://github.com/jerryinyang/Cerebr-Pinescript-Codebase :: Raids/CTF Raid Indicator.pine @ 402d06746b64d4e42dfae91d2f38e14786c358c9
  - Location: line 284
  - Construct: float ph passed as ta.valuewhen() condition
  - Source line: `count_ph = ta.valuewhen(ph, bar_index, 0)`
  - Evidence: Pine ta.valuewhen() requires a bool condition; a float pivot series is not implicitly truthy in v5/v6.

- **tealscript-gap** `sources/0477__hylal-snd-ufo__snd-ufo-indicator.pine`
  - Row: 0002:https://github.com/hylal/snd-ufo:snd-ufo-indicator.pine
  - Pinned source: https://github.com/hylal/snd-ufo :: snd-ufo-indicator.pine @ 9d649e7164a5be925f5fab20aef81035a74c84a8
  - Location: line 98
  - Construct: array.min() result from array<int> assigned to int state
  - Source line: `    bullLineX1 := array.min(bullLineX1Array)`
  - Evidence: Pine preserves the element type of array<int>; the assignment is valid, but TealScript reports the result as float.

- **invalid-pine** `sources/0481__luillotrading-OliverVelez__oliver_velez_indicator.pine`
  - Row: 0006:https://github.com/luillotrading/OliverVelez:oliver_velez_indicator.pine
  - Pinned source: https://github.com/luillotrading/OliverVelez :: oliver_velez_indicator.pine @ e0695fd702a07d41385e245dcf2409255b046c49
  - Location: line 362
  - Construct: plotshape(style=shape.star)
  - Source line: `plotshape(trifecta_up or trifecta_down, title="Trifecta", style=shape.star, location=location.abovebar, color=color.gold, size=size.small)`
  - Evidence: shape.star is not a documented plotshape style in Pine v5; use a supported shape constant such as shape.diamond or shape.circle.

- **invalid-pine** `sources/0507__nishpa800-indicators__SQUARIFY_46_v2_2026-05-04.pine`
  - Row: 0007:https://github.com/nishpa800/indicators:squarify/versions/SQUARIFY_46_v2_2026-05-04.pine
  - Pinned source: https://github.com/nishpa800/indicators :: squarify/versions/SQUARIFY_46_v2_2026-05-04.pine @ a4303fb0995529f18cb50ff1eac8661ddea15eb1
  - Location: line 965
  - Construct: nz() applied to bool sigBullPBJ
  - Source line: `    bool _pbj4 = nz(sigBullPBJ) or nz(sigBullPBJ[1]) or nz(sigBullPBJ[2]) or nz(sigBullPBJ[3])`
  - Evidence: Pine v6 does not use nz() to coerce bool values; use a bool expression directly.

- **invalid-pine** `sources/0588__TWODS-CAPITAL-Trading-View-Indicators__Auto-Pitchfork.pine`
  - Row: 0013:https://github.com/TWODS-CAPITAL/Trading-View-Indicators:Auto Drawings and Patterns/Auto-Pitchfork.pine
  - Pinned source: https://github.com/TWODS-CAPITAL/Trading-View-Indicators :: Auto Drawings and Patterns/Auto-Pitchfork.pine @ 2439266905ef641014fd41ec533e516f86818be4
  - Location: line 86
  - Construct: int ta.change() result passed as ta.valuewhen() condition
  - Source line: `iPrev2Pvt = ta.valuewhen(ta.change(iPrevPvt), iPrevPvt, 1)`
  - Evidence: Pine ta.valuewhen() requires a bool condition; an int change series is not implicitly truthy.

- **invalid-pine** `sources/0589__Hugs-4-Bugs-Trading-Indicator__TriexDev---SuperBuySellTrend.pine`
  - Row: 0014:https://github.com/Hugs-4-Bugs/Trading-Indicator:TriexDev-SuperBuySellTrend-TradingView-Trend-Indicator/TriexDev - SuperBuySellTrend.pine
  - Pinned source: https://github.com/Hugs-4-Bugs/Trading-Indicator :: TriexDev-SuperBuySellTrend-TradingView-Trend-Indicator/TriexDev - SuperBuySellTrend.pine @ 1c5714041dd9d704d3ff158feade7aacae23b20f
  - Location: line 43
  - Construct: plot(linewidth=0)
  - Source line: `mPlot = plot(ohlc4, title='', style=plot.style_circles, linewidth=0)`
  - Evidence: Pine plot linewidth must be a positive integer.

- **invalid-pine** `sources/0594__mikejuliano2-pine__psy-levels.pine`
  - Row: 0019:https://github.com/mikejuliano2/pine:code/reference/psy-levels.pine
  - Pinned source: https://github.com/mikejuliano2/pine :: code/reference/psy-levels.pine @ 504ac0e1ab71e354bad3ca36a0c4c1442a428d7b
  - Location: line 158
  - Construct: na() applied to a bool comparison result
  - Source line: `    psy_calc_inProgress = not na(time_now_gmt - psy_calc_start >= 0) and not na(time_now_gmt - psy_calc_end <= 0)`
  - Evidence: Pine v6 bool expressions are non-na; this expression should be written as a direct bool condition.

- **invalid-pine** `sources/0628__deepentropy-oakscriptJS__Order-Blocks-with-signals.pine`
  - Row: 0003:https://github.com/deepentropy/oakscriptJS:docs/official/indicators_community/Order Blocks with signals.pine
  - Pinned source: https://github.com/deepentropy/oakscriptJS :: docs/official/indicators_community/Order Blocks with signals.pine @ d7bbd272e9ba6e12bb304a4c6d83d67f57afd2a0
  - Location: line 8
  - Construct: compound division of int state produces float
  - Source line: `sens /= 100`
  - Evidence: Pine does not implicitly narrow the float result of /= into an int variable; use a float state or explicit conversion.

### duplicate-symbol (8)

- **invalid-pine** `sources/0006__LINE12138-TradingView__combined_cci_indicator.pine`
  - Row: 0006:https://github.com/LINE12138/TradingView:combined_cci_indicator.pine
  - Pinned source: https://github.com/LINE12138/TradingView :: combined_cci_indicator.pine @ 92c5be2667b717fe4110676dc56e67bbf4143d0b
  - Location: line 7
  - Construct: variable ma shares a name with the function ma()
  - Source line: `ma = ta.sma(src, length)`
  - Evidence: Pine declarations in one scope cannot reuse the same identifier for a variable and function.

- **invalid-pine** `sources/0105__mushroom-men-Trading-clean-litter__jvolty.pine`
  - Row: 0005:https://github.com/mushroom-men-Trading/clean-litter:Indicators/indicators/premade indicators/volatility/jvolty.pine
  - Pinned source: https://github.com/mushroom-men-Trading/clean-litter :: Indicators/indicators/premade indicators/volatility/jvolty.pine @ 95f5f7d4bcb4e0e95cff86291bf343484842fbe6
  - Location: line 48
  - Construct: variable jvolty shares a name with function jvolty()
  - Source line: `jvolty= jvolty(i_source, i_period)`
  - Evidence: Pine declarations in one scope cannot reuse the same identifier for a variable and function.

- **tealscript-gap** `sources/0129__helenananaa-pine-compat-runtime__unsupported_map_udf_method_return_templates.pine`
  - Row: 0004:https://github.com/helenananaa/pine-compat-runtime:tests/fixtures/sema/unsupported_map_udf_method_return_templates.pine
  - Pinned source: https://github.com/helenananaa/pine-compat-runtime :: tests/fixtures/sema/unsupported_map_udf_method_return_templates.pine @ 35cdebbc3ce3c5a9114a9f5d28eba8cb01566ba7
  - Location: line 7
  - Construct: method badReturn overload collides with global badReturn()
  - Source line: `method badReturn(Anchor self, bool use_string_key) =>`
  - Evidence: Pine methods and functions participate in overload resolution by receiver/parameter types; these distinct signatures are legal together.

- **invalid-pine** `sources/0176__folknor-pine-tools__INV124-redeclared-uniongate-fp.pine`
  - Row: 0001:https://github.com/folknor/pine-tools:packages/core/test/fixtures/regression/INV124-redeclared-uniongate-fp.pine
  - Pinned source: https://github.com/folknor/pine-tools :: packages/core/test/fixtures/regression/INV124-redeclared-uniongate-fp.pine @ 6acad711e221434176e641aa2e04c40afc9ef3f1
  - Location: line 8
  - Construct: second declaration of x in one scope
  - Source line: `bool x = ta.crossover(close, open)`
  - Evidence: Pine rejects a second declaration in the same scope; reassignment uses :=.

- **invalid-pine** `sources/0214__folknor-pine-tools__INV035-already-defined.pine`
  - Row: 0014:https://github.com/folknor/pine-tools:packages/core/test/fixtures/regression/INV035-already-defined.pine
  - Pinned source: https://github.com/folknor/pine-tools :: packages/core/test/fixtures/regression/INV035-already-defined.pine @ aa826ef3b13bf3821ff82df0adf74fe50feb0030
  - Location: line 13
  - Construct: second declaration x = 20
  - Source line: `x = 20`
  - Evidence: Pine rejects redeclaration in the same scope; a later assignment would use :=.

- **tealscript-gap** `sources/0291__helenananaa-pine-compat-runtime__supported_user_type_array_udf_method_returns.pine`
  - Row: 0016:https://github.com/helenananaa/pine-compat-runtime:tests/fixtures/sema/supported_user_type_array_udf_method_returns.pine
  - Pinned source: https://github.com/helenananaa/pine-compat-runtime :: tests/fixtures/sema/supported_user_type_array_udf_method_returns.pine @ 9c60e67188bea9e9de7bbb52da618bfb029f815b
  - Location: line 99
  - Construct: overloaded method first() for distinct receivers
  - Source line: `method first(Anchor self, array<First> values) => array.size(values) + 700`
  - Evidence: Pine permits method overloads distinguished by receiver type; TealScript treats the overload name as a duplicate.

- **invalid-pine** `sources/0474__CjHare-pinescript-v5-snippets__adx.pine`
  - Row: 0024:https://github.com/CjHare/pinescript-v5-snippets:src/indicator/adx.pine
  - Pinned source: https://github.com/CjHare/pinescript-v5-snippets :: src/indicator/adx.pine @ 9459f54f3841f074a9b00871996af96411a9f8ae
  - Location: line 33
  - Construct: tuple variable adx shares a name with function adx()
  - Source line: `[adx, plusDI, minusDI] = adx(adxSmoothingLengthInput, adxLengthInput)`
  - Evidence: Pine declarations in one scope cannot reuse the same identifier for a variable and function.

- **invalid-pine** `sources/0587__deepentropy-oakscriptJS__Custom-Pattern-Detection.pine`
  - Row: 0012:https://github.com/deepentropy/oakscriptJS:docs/official/indicators_community/Custom Pattern Detection.pine
  - Pinned source: https://github.com/deepentropy/oakscriptJS :: docs/official/indicators_community/Custom Pattern Detection.pine @ d7bbd272e9ba6e12bb304a4c6d83d67f57afd2a0
  - Location: line 105
  - Construct: variable t shares a name with function t()
  - Source line: `t = time[pivot_lb]`
  - Evidence: Pine declarations in one scope cannot reuse the same identifier for a variable and function.

### unknown-identifier (8)

- **invalid-pine** `sources/0088__folknor-pine-tools__INV062-unresolved-call-args.pine`
  - Row: 0013:https://github.com/folknor/pine-tools:packages/core/test/fixtures/regression/INV062-unresolved-call-args.pine
  - Pinned source: https://github.com/folknor/pine-tools :: packages/core/test/fixtures/regression/INV062-unresolved-call-args.pine @ a35bac7ab74087723588464497631ab0a0d10d8c
  - Location: line 12
  - Construct: call uses undeclared missingArg
  - Source line: `plot(double(missingArg))`
  - Evidence: Pine identifiers must be declared before use.

- **invalid-pine** `sources/0149__folknor-pine-tools__INV037-if-branch-scope.pine`
  - Row: 0024:https://github.com/folknor/pine-tools:packages/core/test/fixtures/regression/INV037-if-branch-scope.pine
  - Pinned source: https://github.com/folknor/pine-tools :: packages/core/test/fixtures/regression/INV037-if-branch-scope.pine @ a35bac7ab74087723588464497631ab0a0d10d8c
  - Location: line 17
  - Construct: branchOnly is referenced outside its if branch
  - Source line: `bad1 = branchOnly`
  - Evidence: Pine local-scope variables are unavailable outside the block where they are declared.

- **invalid-pine** `sources/0336__nishpa800-indicators__VOB_v11_MULTIPLES_HWcoincidence_2026-06-04.pine`
  - Row: 0011:https://github.com/nishpa800/indicators:vob/versions/VOB_v11_MULTIPLES_HWcoincidence_2026-06-04.pine
  - Pinned source: https://github.com/nishpa800/indicators :: vob/versions/VOB_v11_MULTIPLES_HWcoincidence_2026-06-04.pine @ 0e08c6e02c2623dff7e0c7f002f887a81fd625fb
  - Location: line 1056
  - Construct: enabled is used after its function declaration was commented out
  - Source line: `    if enabled and lvl_arr.size() > 0`
  - Evidence: The source has no declaration for enabled in this scope; a commented-out function signature does not declare parameters.

- **invalid-pine** `sources/0341__kwinkzap-bot-Mine__Combined-Strike-Selector-Intrinsic-Levels.pine`
  - Row: 0016:https://github.com/kwinkzap-bot/Mine:Mine/Pine script/Combined Strike Selector & Intrinsic Levels.pine
  - Pinned source: https://github.com/kwinkzap-bot/Mine :: Mine/Pine script/Combined Strike Selector & Intrinsic Levels.pine @ 46940112eaaafa99a21994f822ce2fd6e1c2f285
  - Location: line 135
  - Construct: ce_l and pe_l are referenced but only ce_l1..ce_l5/pe_l1..pe_l5 exist
  - Source line: `    entryLabel = label.new(bar_index, signalType == "CE" ? ce_l : pe_l, txt, style=label.style_label_up, color=signalType == "CE" ? color.green : color.red, textcolor=color.white)`
  - Evidence: Pine does not resolve undeclared identifiers by prefix or inferred numbering.

- **invalid-pine** `sources/0483__Flopchamp-Custom-TradingView-Pine-Script-v5---Multi-Timeframe-Signal-Indicator---Strategy-Tester__MTF_Signal_Indicator.pine`
  - Row: 0008:https://github.com/Flopchamp/Custom-TradingView-Pine-Script-v5---Multi-Timeframe-Signal-Indicator---Strategy-Tester:MTF_Signal_Indicator.pine
  - Pinned source: https://github.com/Flopchamp/Custom-TradingView-Pine-Script-v5---Multi-Timeframe-Signal-Indicator---Strategy-Tester :: MTF_Signal_Indicator.pine @ f34c3bb7c39f8c1813b761edea9bbca26bacdb42
  - Location: line 71
  - Construct: isNewDay[1] is referenced in its own initializer
  - Source line: `isNewDay = ta.change(dayofweek) != 0 or (hour == 9 and minute == 30 and not isNewDay[1])`
  - Evidence: Pine variables are available only after declaration; self-reference in the initializer is not a valid forward reference.

- **invalid-pine** `sources/0485__tarifamin-tempo-indicator__ICT_Master_Indicator.pine`
  - Row: 0010:https://github.com/tarifamin/tempo-indicator:ICT_Master_Indicator.pine
  - Pinned source: https://github.com/tarifamin/tempo-indicator :: ICT_Master_Indicator.pine @ 5b58c907866aa917160f0e895419ee8bdf9de28d
  - Location: line 196
  - Construct: na(string) uses the type keyword as a value
  - Source line: `    pair_ticker = na(string)`
  - Evidence: Pine typed na initialization is string pair_ticker = na, not na(string).

- **invalid-pine** `sources/0490__DMJ3691836-SNAP-HTF_LTF-Indicator__SNAP_HTF_LTF_Indicator.pine`
  - Row: 0015:https://github.com/DMJ3691836/SNAP-HTF_LTF-Indicator-:SNAP_HTF_LTF_Indicator.pine
  - Pinned source: https://github.com/DMJ3691836/SNAP-HTF_LTF-Indicator- :: SNAP_HTF_LTF_Indicator.pine @ 83dd82413a2ee1a3c9f1658cf4ad0d50a014ef5c
  - Location: line 50
  - Construct: weekly_wick_high and weekly_body_close are undeclared
  - Source line: `    weekly_inefficiency_high = weekly_wick_high`
  - Evidence: Pine requires every identifier to have a declaration or builtin definition before use.

- **invalid-pine** `sources/0526__zhuzp98-QuantTestFrame__Z_template_strategy.pine`
  - Row: 0001:https://github.com/zhuzp98/QuantTestFrame:PineScript/Z_template_strategy.pine
  - Pinned source: https://github.com/zhuzp98/QuantTestFrame :: PineScript/Z_template_strategy.pine @ 1ce362d84524f26118808e983691142780f3a978
  - Location: line 76
  - Construct: enterLong is used without a declaration
  - Source line: `if enterLong`
  - Evidence: Pine requires every identifier to have a declaration or builtin definition before use.

### global-output-declared-but-not-evaluated (8)

- **supported** `sources/0085__easyspace-ai-pine-rs__debug_loop_i_values.pine`
  - Row: 0010:https://github.com/easyspace-ai/pine-rs:tests/scripts/series/debug_loop_i_values.pine
  - Pinned source: https://github.com/easyspace-ai/pine-rs :: tests/scripts/series/debug_loop_i_values.pine @ 82a1323a9c05a35d6e60aa0dd90a7c49f237a446
  - Location: line 18
  - Construct: plot(..., display=display.none)
  - Source line: `plot(x1, title="x1", color=color.red, display=display.none)`
  - Evidence: The plots are intentionally hidden; no visible chart output is expected.

- **tealscript-gap** `sources/0128__helenananaa-pine-compat-runtime__user_type_non_scalar_typed_na_history.pine`
  - Row: 0003:https://github.com/helenananaa/pine-compat-runtime:tests/fixtures/runtime/user_type_non_scalar_typed_na_history.pine
  - Pinned source: https://github.com/helenananaa/pine-compat-runtime :: tests/fixtures/runtime/user_type_non_scalar_typed_na_history.pine @ 0e4f409acbab5dad943d622b1c2d68324a5daf46
  - Location: line 51
  - Construct: UDT method receiver loses Marker type at receiver.retain()
  - Source line: `receiver_choice = marker.retain()`
  - Evidence: Pine preserves the Marker receiver through the nested method call; the compiled path errors before evaluating the global plots.

- **tealscript-gap** `sources/0137__helenananaa-pine-compat-runtime__supported_for_in_empty_array_slice_result_negative_body_history.pine`
  - Row: 0012:https://github.com/helenananaa/pine-compat-runtime:tests/fixtures/sema/supported_for_in_empty_array_slice_result_negative_body_history.pine
  - Pinned source: https://github.com/helenananaa/pine-compat-runtime :: tests/fixtures/sema/supported_for_in_empty_array_slice_result_negative_body_history.pine @ 0e4f409acbab5dad943d622b1c2d68324a5daf46
  - Location: line 4
  - Construct: empty array.slice(source, 1, 1)
  - Source line: `values = array.slice(source, 1, 1)`
  - Evidence: Pine permits an empty slice; the empty for-expression yields na and close[na] remains a valid na series. TealScript throws an index-order error before plot().

- **tealscript-gap** `sources/0279__easyspace-ai-pine-rs__array_core.pine`
  - Row: 0004:https://github.com/easyspace-ai/pine-rs:tests/scripts/stdlib/array/array_core.pine
  - Pinned source: https://github.com/easyspace-ai/pine-rs :: tests/scripts/stdlib/array/array_core.pine @ 940ca37b8bc4f9861e34226c9abdc19c06b55831
  - Location: line 10
  - Construct: array.push() followed by array.first()/min()/max()
  - Source line: `    arr := array.push(arr, close)`
  - Evidence: Pine has a populated array on bars 0-4 and the guarded array access is valid; TealScript instead throws an internal undefined.length error.

- **supported** `sources/0351__bsemaay-tech-mtc-command-center__producer_supertrend_v1.pine`
  - Row: 0001:https://github.com/bsemaay-tech/mtc-command-center:MTC_COMMAND_CENTER/01_MTC_PROJECT/parity_oracles/feature_adapters/pinets/producer_supertrend_v1.pine
  - Pinned source: https://github.com/bsemaay-tech/mtc-command-center :: MTC_COMMAND_CENTER/01_MTC_PROJECT/parity_oracles/feature_adapters/pinets/producer_supertrend_v1.pine @ d65b5a1dc947d0011408aff2cff1cdf9c785b359
  - Location: line 74
  - Construct: plot(..., display=display.none)
  - Source line: `plot(st_line, title="FEATURE__producer_supertrend_v1__indicator__supertrend_line", display=display.none)`
  - Evidence: The plots are intentionally hidden feature-adapter outputs; no visible chart output is expected.

- **supported** `sources/0429__easyspace-ai-pine-rs__debug_loop_without_close.pine`
  - Row: 0004:https://github.com/easyspace-ai/pine-rs:tests/scripts/series/debug_loop_without_close.pine
  - Pinned source: https://github.com/easyspace-ai/pine-rs :: tests/scripts/series/debug_loop_without_close.pine @ 82a1323a9c05a35d6e60aa0dd90a7c49f237a446
  - Location: line 13
  - Construct: plot(..., display=display.none)
  - Source line: `plot(floatCount1, title="floatCount1", color=color.red, display=display.none)`
  - Evidence: The plots are intentionally hidden; no visible chart output is expected.

- **invalid-pine** `sources/0432__helenananaa-pine-compat-runtime__unsupported_matrix_add_row.pine`
  - Row: 0007:https://github.com/helenananaa/pine-compat-runtime:tests/fixtures/sema/unsupported_matrix_add_row.pine
  - Pinned source: https://github.com/helenananaa/pine-compat-runtime :: tests/fixtures/sema/unsupported_matrix_add_row.pine @ 16f6492487a82e3098750056b53ae8eb7cd58159
  - Location: line 5
  - Construct: matrix.add_row() receives scalar close instead of an array row
  - Source line: `matrix.add_row(values, 1, close)`
  - Evidence: Pine matrix.add_row() requires an array containing the new row values.

- **supported** `sources/0593__nathanssantos-marketmind__vwap-ema-cross.pine`
  - Row: 0018:https://github.com/nathanssantos/marketmind:apps/backend/strategies/builtin/vwap-ema-cross.pine
  - Pinned source: https://github.com/nathanssantos/marketmind :: apps/backend/strategies/builtin/vwap-ema-cross.pine @ 61a72e9c98fdffb39cb712c6f53c97569a3f6722
  - Location: line 48
  - Construct: plot(..., display=display.none)
  - Source line: `plot(sig, 'signal', display=display.none)`
  - Evidence: The plots are intentionally hidden diagnostics; no visible chart output is expected.

## Output-Silence Finding

Five rows are correct silence because every plot uses `display=display.none`. Two rows are genuine TealScript runtime gaps hidden behind output classification: the UDT receiver in `0128`, and empty `array.slice()` handling in `0137`. `0279` is also a runtime gap: its visible-output probe is suppressed only because compiled execution throws `undefined.length` after a valid guarded array setup. `0432` is invalid Pine because `matrix.add_row()` receives scalar `close` instead of an array row.
