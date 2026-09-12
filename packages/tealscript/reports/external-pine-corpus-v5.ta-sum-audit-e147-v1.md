> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 ta.sum Audit E147 V1

Measurement commit: `e147d42635fa2ee4f0b005883e5de471de6590f6`, pinned over the fixed v5 corpus. All 11 current `ta.sum` failures are the same real TealScript gap.

## Verdict

`ta.sum(source, length)` is a documented v6 built-in returning the rolling sum of a numeric series. These rows are valid Pine and must remain in the achievable denominator. Implement the builtin in both execution paths, preserving series history and `na` handling. Reference: [TradingView v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/).

### sources/0089__mihakralj-pinescript__theilu.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/errors/theilu.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `21:24: unknown-function: Unknown function: ta.sum`
- Exact construct: line 21: `float sumSqError = ta.sum(sqError, length)`
- Verdict: **real TealScript gap**
- Required behavior: rolling sum over the requested length, with the documented v6 `ta.sum(source, length)` signature.

### sources/0091__mihakralj-pinescript__wmape.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/errors/wmape.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `19:25: unknown-function: Unknown function: ta.sum`
- Exact construct: line 19: `float sumAbsError = ta.sum(absError, length)`
- Verdict: **real TealScript gap**
- Required behavior: rolling sum over the requested length, with the documented v6 `ta.sum(source, length)` signature.

### sources/0092__mihakralj-pinescript__wrmse.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/errors/wrmse.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `21:30: unknown-function: Unknown function: ta.sum`
- Exact construct: line 21: `float sumWeightedError = ta.sum(weightedSqError, length)`
- Verdict: **real TealScript gap**
- Required behavior: rolling sum over the requested length, with the documented v6 `ta.sum(source, length)` signature.

### sources/0484__casoon-pine-scripts__candle_pressure_response_jma.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `archive/indicators/candle_pressure_response_jma/candle_pressure_response_jma.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `166:9: unknown-function: Unknown function: ta.sum`
- Exact construct: line 166: `path  = ta.sum(math.abs(close - close[1]), mEff)`
- Verdict: **real TealScript gap**
- Required behavior: rolling sum over the requested length, with the documented v6 `ta.sum(source, length)` signature.

### sources/0588__casoon-pine-scripts__market_memory_decay_oscillator.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `indicators/trend_strength/market_memory_decay_oscillator/market_memory_decay_oscillator.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `100:8: unknown-function: Unknown function: ta.sum`
- Exact construct: line 100: `path = ta.sum(math.abs(src - src[1]), memoryLen)`
- Verdict: **real TealScript gap**
- Required behavior: rolling sum over the requested length, with the documented v6 `ta.sum(source, length)` signature.

### sources/0639__knectardev-pine_scripts__es-professional-fade-strategy.pine
- Repository: https://github.com/knectardev/pine_scripts
- Source: `scripts/strategies/es-professional-fade-strategy.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `196:22: unknown-function: Unknown function: ta.sum`
- Exact construct: line 196: `bool tickExtremeUp = ta.sum(tickValue > tickFilterInput ? 1 : 0, tickLookbackInput) >= tickVetoCountInput`
- Verdict: **real TealScript gap**
- Required behavior: rolling sum over the requested length, with the documented v6 `ta.sum(source, length)` signature.

### sources/0643__knectardev-pine_scripts__es-professional-fade-strategy-v2.5.7-FIXED.pine
- Repository: https://github.com/knectardev/pine_scripts
- Source: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy-v2.5.7-FIXED.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `135:22: unknown-function: Unknown function: ta.sum`
- Exact construct: line 135: `bool tickExtremeUp = ta.sum(tickValue > tickFilterInput ? 1 : 0, tickLookbackInput) >= tickVetoCountInput`
- Verdict: **real TealScript gap**
- Required behavior: rolling sum over the requested length, with the documented v6 `ta.sum(source, length)` signature.

### sources/0644__knectardev-pine_scripts__es-professional-fade-strategy.pine
- Repository: https://github.com/knectardev/pine_scripts
- Source: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `120:22: unknown-function: Unknown function: ta.sum`
- Exact construct: line 120: `bool tickExtremeUp = ta.sum(tickValue > tickFilterInput ? 1 : 0, tickLookbackInput) >= tickVetoCountInput`
- Verdict: **real TealScript gap**
- Required behavior: rolling sum over the requested length, with the documented v6 `ta.sum(source, length)` signature.

### sources/0645__knectardev-pine_scripts__v2.5.5.pine
- Repository: https://github.com/knectardev/pine_scripts
- Source: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `135:22: unknown-function: Unknown function: ta.sum`
- Exact construct: line 135: `bool tickExtremeUp = ta.sum(tickValue > tickFilterInput ? 1 : 0, tickLookbackInput) >= tickVetoCountInput`
- Verdict: **real TealScript gap**
- Required behavior: rolling sum over the requested length, with the documented v6 `ta.sum(source, length)` signature.

### sources/0646__knectardev-pine_scripts__v2.5.6.pine
- Repository: https://github.com/knectardev/pine_scripts
- Source: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `129:22: unknown-function: Unknown function: ta.sum`
- Exact construct: line 129: `bool tickExtremeUp = ta.sum(tickValue > tickFilterInput ? 1 : 0, tickLookbackInput) >= tickVetoCountInput`
- Verdict: **real TealScript gap**
- Required behavior: rolling sum over the requested length, with the documented v6 `ta.sum(source, length)` signature.

### sources/0649__knectardev-pine_scripts__v2.5.6_v2.5.8.pine
- Repository: https://github.com/knectardev/pine_scripts
- Source: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `129:22: unknown-function: Unknown function: ta.sum`
- Exact construct: line 129: `bool tickExtremeUp = ta.sum(tickValue > tickFilterInput ? 1 : 0, tickLookbackInput) >= tickVetoCountInput`
- Verdict: **real TealScript gap**
- Required behavior: rolling sum over the requested length, with the documented v6 `ta.sum(source, length)` signature.

