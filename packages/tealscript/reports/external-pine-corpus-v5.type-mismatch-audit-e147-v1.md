> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Type-Mismatch Audit E147 V1

Measurement commit: `e147d42635fa2ee4f0b005883e5de471de6590f6`, pinned over the fixed v5 corpus. This audit covers all 26 current `type-mismatch` rows.

## Verdict Summary

| Verdict | Rows |
| --- | ---: |
| Invalid Pine under declared version | 25 |
| Valid Pine; TealScript gap | 1 |

The version-sensitive rules are applied to each source declaration: v6 always produces fractional results for non-even integer division and rejects numeric-to-bool and boolean-na assignments; v5 preserves fractional division for input/simple/series operands but permits boolean-na. `strategy.exit` trailing stops require `trail_offset`, and table positions require documented `position.*` enum members. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/) [TradingView operators](https://www.tradingview.com/pine-script-docs/language/operators/) [TradingView strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

## fractional division assigned to int (18)

### sources/0156__mihakralj-pinescript__betadist.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/numerics/betadist.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `56:13: type-mismatch: Cannot assign float value to int variable 'mm'`
- Evidence: line 56: `int mm = m / 2`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version rejects this narrowing: the division expression is float-valued for the operands used; wrap the result in int() or use an integer-preserving operation.

### sources/0164__mihakralj-pinescript__fdist.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/numerics/fdist.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `56:13: type-mismatch: Cannot assign float value to int variable 'mm'`
- Evidence: line 56: `int mm = m / 2`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version rejects this narrowing: the division expression is float-valued for the operands used; wrap the result in int() or use an integer-preserving operation.

### sources/0171__mihakralj-pinescript__ifft.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/numerics/ifft.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `19:5: type-mismatch: Cannot assign float value to int variable 'halfN'`
- Evidence: line 19: `int halfN = N / 2`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version rejects this narrowing: the division expression is float-valued for the operands used; wrap the result in int() or use an integer-preserving operation.

### sources/0280__mihakralj-pinescript__trim.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/statistics/trim.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `22:9: type-mismatch: Cannot assign float value to int variable trimCount`
- Evidence: line 22: `trimCount := (period - 1) / 2`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version rejects this narrowing: the division expression is float-valued for the operands used; wrap the result in int() or use an integer-preserving operation.

### sources/0283__mihakralj-pinescript__wins.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/statistics/wins.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `20:9: type-mismatch: Cannot assign float value to int variable winCount`
- Evidence: line 20: `winCount := (period - 1) / 2`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version rejects this narrowing: the division expression is float-valued for the operands used; wrap the result in int() or use an integer-preserving operation.

### sources/0297__mihakralj-pinescript__hend.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/trends_FIR/hend.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `39:9: type-mismatch: Cannot assign float value to int variable 'half'`
- Evidence: line 39: `int half = (period - 1) / 2`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version rejects this narrowing: the division expression is float-valued for the operands used; wrap the result in int() or use an integer-preserving operation.

### sources/0304__mihakralj-pinescript__nyqma.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/trends_FIR/nyqma.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `21:5: type-mismatch: Cannot assign float value to int variable 'n2'`
- Evidence: line 21: `int n2 = math.min(math.max(nyquist_period, 1), period / 2)`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version rejects this narrowing: the division expression is float-valued for the operands used; wrap the result in int() or use an integer-preserving operation.

### sources/0486__casoon-pine-scripts__directional_probability_engine_v2.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `archive/indicators/directional_probability_engine/directional_probability_engine_v2.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `269:5: type-mismatch: Cannot assign float value to int variable microPivotLen`
- Evidence: line 269: `microPivotLen := math.max(2, pivotLen / 3)`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version rejects this narrowing: the division expression is float-valued for the operands used; wrap the result in int() or use an integer-preserving operation.

### sources/0487__casoon-pine-scripts__directional_probability_engine_v3.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `archive/indicators/directional_probability_engine/directional_probability_engine_v3.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `343:5: type-mismatch: Cannot assign float value to int variable microPivotLen`
- Evidence: line 343: `microPivotLen := math.max(2, pivotLen / 3)`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version rejects this narrowing: the division expression is float-valued for the operands used; wrap the result in int() or use an integer-preserving operation.

### sources/0501__casoon-pine-scripts__trade_permission_engine_v1.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `indicators/composite/trade_permission_engine/trade_permission_engine_v1.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `311:5: type-mismatch: Cannot assign float value to int variable microPivotLen`
- Evidence: line 311: `microPivotLen := math.max(2, pivotLen / 3)`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version rejects this narrowing: the division expression is float-valued for the operands used; wrap the result in int() or use an integer-preserving operation.

### sources/0514__casoon-pine-scripts__market_tradability_engine.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `indicators/market_structure/market_tradability_engine/market_tradability_engine.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `548:1: type-mismatch: Cannot assign float value to int variable 'shortWindow'`
- Evidence: line 548: `int shortWindow = math.max(3, qualityLength / 4)`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version rejects this narrowing: the division expression is float-valued for the operands used; wrap the result in int() or use an integer-preserving operation.

### sources/0515__casoon-pine-scripts__market_tradability_engine_v2.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `indicators/market_structure/market_tradability_engine/market_tradability_engine_v2.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `885:1: type-mismatch: Cannot assign float value to int variable 'shortWindow'`
- Evidence: line 885: `int shortWindow = math.max(3, qualityLength / 4)`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version rejects this narrowing: the division expression is float-valued for the operands used; wrap the result in int() or use an integer-preserving operation.

### sources/0545__casoon-pine-scripts__mtf_wavetrend_opportunity_hunter.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `indicators/momentum/mtf_wavetrend_opportunity_hunter/mtf_wavetrend_opportunity_hunter.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `1107:5: type-mismatch: Cannot assign float value to int variable 'cx'`
- Evidence: line 1107: `int cx = xL + rotW / 2`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version rejects this narrowing: the division expression is float-valued for the operands used; wrap the result in int() or use an integer-preserving operation.

### sources/0566__casoon-pine-scripts__relative_leg_efficiency.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `indicators/relative_strength/relative_leg_efficiency/relative_leg_efficiency.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `255:9: type-mismatch: Cannot assign float value to int variable 'mid'`
- Evidence: line 255: `int mid = count / 2`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version rejects this narrowing: the division expression is float-valued for the operands used; wrap the result in int() or use an integer-preserving operation.

### sources/0601__casoon-pine-scripts__RTAAdvanced.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `libraries/RTAAdvanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `371:5: type-mismatch: Cannot assign float value to int variable 'numSwings'`
- Evidence: line 371: `int numSwings = array.size(swings) / 2`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version rejects this narrowing: the division expression is float-valued for the operands used; wrap the result in int() or use an integer-preserving operation.

### sources/0733__mihakralj-QuanTAlib__trim.pine
- Repository: https://github.com/mihakralj/QuanTAlib
- Source: `lib/statistics/trim/trim.pine` @ `467a8c1cefd5155f13af228581c042a3991256b6`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `24:9: type-mismatch: Cannot assign float value to int variable trimCount`
- Evidence: line 24: `trimCount := (period - 1) / 2`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version rejects this narrowing: the division expression is float-valued for the operands used; wrap the result in int() or use an integer-preserving operation.

### sources/0783__deepentropy-lightweight-charts-indicators__Order-Blocks-with-signals.pine
- Repository: https://github.com/deepentropy/lightweight-charts-indicators
- Source: `docs/official/indicators_community/Order Blocks with signals.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:1: type-mismatch: Cannot assign float value to int variable sens`
- Evidence: line 8: `sens /= 100`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version rejects this narrowing: the division expression is float-valued for the operands used; wrap the result in int() or use an integer-preserving operation.

### sources/0997__grantj-re3-LingoLog__HashFunction.pine
- Repository: https://github.com/grantj-re3/LingoLog
- Source: `pine_script/Ideas/HashFunction.pine` @ `af5dd3a961a1123e7ff1bca4848107f5e5c34547`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `16:9: type-mismatch: Cannot assign float value to int variable _iValue`
- Evidence: line 16: `_iValue /= 64`
- Verdict: **invalid Pine**
- Version-appropriate rule: The declared version rejects this narrowing: the division expression is float-valued for the operands used; wrap the result in int() or use an integer-preserving operation.

## numeric value assigned to bool under v6 (5)

### sources/0629__knectardev-pine_scripts__rsi-divergence-indicator_v1.3.15.pine
- Repository: https://github.com/knectardev/pine_scripts
- Source: `scripts/indicators/rsi-divergence-indicator/archive/rsi-divergence-indicator_v1.3.15.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `46:1: type-mismatch: Cannot assign int value to bool variable 'timeChange'`
- Evidence: line 46: `bool timeChange = ta.change(time)`
- Verdict: **invalid Pine**
- Version-appropriate rule: v6 removed implicit numeric-to-bool conversion; use an explicit comparison or bool().

### sources/0650__knectardev-pine_scripts__v2.5.6_v2.5.9.pine
- Repository: https://github.com/knectardev/pine_scripts
- Source: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8/archive/v2.5.6_v2.5.9.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `115:1: type-mismatch: Cannot assign float value to bool variable 'gapPoints'`
- Evidence: line 115: `bool gapPoints = not na(rthOpenCurrent) and not na(rthClosePrev) ?`
- Verdict: **invalid Pine**
- Version-appropriate rule: v6 removed implicit numeric-to-bool conversion; use an explicit comparison or bool().

### sources/0651__knectardev-pine_scripts__v2.5.6_v2.5.10.pine
- Repository: https://github.com/knectardev/pine_scripts
- Source: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8/archive/v2.5.6_v2.5.9/archive/v2.5.6_v2.5.10.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `115:9: type-mismatch: Cannot assign float value to bool variable 'gapPoints'`
- Evidence: line 115: `bool gapPoints = not na(rthOpenCurrent) and not na(rthClosePrev) ?`
- Verdict: **invalid Pine**
- Version-appropriate rule: v6 removed implicit numeric-to-bool conversion; use an explicit comparison or bool().

### sources/0652__knectardev-pine_scripts__v2.5.6_v2.5.11.pine
- Repository: https://github.com/knectardev/pine_scripts
- Source: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8/archive/v2.5.6_v2.5.9/archive/v2.5.6_v2.5.10/archive/v2.5.6_v2.5.11.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `116:9: type-mismatch: Cannot assign float value to bool variable 'gapPoints'`
- Evidence: line 116: `bool gapPoints = not na(rthOpenCurrent) and not na(rthClosePrev) ?`
- Verdict: **invalid Pine**
- Version-appropriate rule: v6 removed implicit numeric-to-bool conversion; use an explicit comparison or bool().

### sources/0653__knectardev-pine_scripts__v2.5.6_v2.5.12.pine
- Repository: https://github.com/knectardev/pine_scripts
- Source: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8/archive/v2.5.6_v2.5.9/archive/v2.5.6_v2.5.10/archive/v2.5.6_v2.5.11/archive/v2.5.6_v2.5.12.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `117:9: type-mismatch: Cannot assign float value to bool variable 'gapPoints'`
- Evidence: line 117: `bool gapPoints = not na(rthOpenCurrent) and not na(rthClosePrev) ?`
- Verdict: **invalid Pine**
- Version-appropriate rule: v6 removed implicit numeric-to-bool conversion; use an explicit comparison or bool().

## v5 boolean na UDT field (1)

### sources/0802__YooooungLee-clever-meme__.pine
- Repository: https://github.com/YooooungLee/clever-meme
- Source: `Quant-code/strategy/艾略特波浪理论.pine` @ `b7499d764e5086f9707cb56abfc734d7e0be0537`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `211:64: type-mismatch: Cannot assign na value to bool field fibL._break_`
- Evidence: line 211: `,                         _break_   =   na`
- Verdict: **real TealScript gap**
- Version-appropriate rule: v5 permits boolean na values, including assignment to a boolean UDT field; this row is a real TealScript gap.

## strategy.exit trailing stop missing trail_offset (1)

### sources/0955__hasnocool-tradingview-pine-scripts__BankNifty-5min-Supertrend-Based-Strategy.pine
- Repository: https://github.com/hasnocool/tradingview-pine-scripts
- Source: `BankNifty 5min Supertrend Based Strategy.pine` @ `e031cab2819a7d56fb8bb9d000252f51439986e2`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `55:102: type-mismatch: strategy.exit trailing stop requires trail_offset`
- Evidence: line 55: `strategy.exit("My Long Exit Id", "My Long Entry Id", stop=(entryPrice1 - stopLoss1),trail_points=onePercent )`
- Verdict: **invalid Pine**
- Version-appropriate rule: A trailing stop requires trail_offset plus an activation parameter such as trail_points or trail_price.

## invalid table position enum (1)

### sources/0979__helenananaa-pine-compat-runtime__unsupported_table_set_position_values.pine
- Repository: https://github.com/helenananaa/pine-compat-runtime
- Source: `tests/fixtures/sema/unsupported_table_set_position_values.pine` @ `ad3ff56c67eb6a6dc8279746b5e43898be56716f`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `4:24: type-mismatch: Invalid table.set_position position: position.bad`
- Evidence: line 4: `table.set_position(id, "position.bad")`
- Verdict: **invalid Pine**
- Version-appropriate rule: The position argument accepts documented position.* enum values, not position.bad.

