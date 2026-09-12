> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Unknown-Identifier Audit E147 V1

Measurement commit: `e147d42635fa2ee4f0b005883e5de471de6590f6`, pinned over the fixed v5 corpus. This audit covers all 14 current `unknown-identifier` rows.

## Verdict Summary

| Verdict | Rows |
| --- | ---: |
| Valid Pine; real TealScript scope/UDF gap | 7 |
| Invalid Pine under declared version | 7 |

Pine permits UDF parameters and locals declared before their use, including locals produced by an `if` expression. An identifier used without a declaration, or used in its own initializer, is invalid. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## invalid self-reference or undeclared identifier (4)

### sources/0151__mihakralj-pinescript__sam.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/momentum/sam.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `31:107: unknown-identifier: Unknown identifier: ji`
- Evidence: line 31: `float ji = (0.0962 * i1 + 0.5769 * nz(i1[2]) - 0.5769 * nz(i1[4]) - 0.0962 * nz(i1[6])) * (0.075 * nz(ji[1]) + 0.54)`
- Verdict: **invalid Pine**
- Version-appropriate rule: The identifier has no valid prior declaration, or is referenced from its own initializer; the declared version rejects it.

### sources/0772__milocaetano-quantick__delta_histogram.pine
- Repository: https://github.com/milocaetano/quantick
- Source: `crates/app/scripts/delta_histogram.pine` @ `6bd9dd86a50d7d2b67504a6729784ac94fe8e276`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `3:6: unknown-identifier: Unknown identifier: delta`
- Evidence: line 3: `plot(delta, title="delta", style=plot.style_histogram, color=color.aqua)`
- Verdict: **invalid Pine**
- Version-appropriate rule: The identifier has no valid prior declaration, or is referenced from its own initializer; the declared version rejects it.

### sources/0773__suyons-tradingview-indicators__02-rsi-signal.pine
- Repository: https://github.com/suyons/tradingview-indicators
- Source: `relative-strength-index/02-rsi-signal.pine` @ `fe3d061b99afc3dcc2400893e42f8dc3c7c414ad`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `44:19: unknown-identifier: Unknown identifier: buy`
- Evidence: line 44: `buy_series = not (buy[1] or buy[2] or buy[3] or buy[4] or buy[5])`
- Verdict: **invalid Pine**
- Version-appropriate rule: The identifier has no valid prior declaration, or is referenced from its own initializer; the declared version rejects it.

### sources/0952__chauhanvishaal-tv-indicators__Zone_Identifier.pine
- Repository: https://github.com/chauhanvishaal/tv-indicators
- Source: `Zone_Identifier.pine` @ `74778b3f18d8562666e1b17e880a420ab5d967c2`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `260:28: unknown-identifier: Unknown identifier: float`
- Evidence: line 260: `displacementStart = na(float)`
- Verdict: **invalid Pine**
- Version-appropriate rule: The identifier has no valid prior declaration, or is referenced from its own initializer; the declared version rejects it.

## UDF series parameter binding (1)

### sources/0197__mihakralj-pinescript__apo.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/oscillators/apo.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `20:15: unknown-identifier: Unknown identifier: source`
- Evidence: line 20: `if not na(source)`
- Verdict: **real TealScript gap**
- Version-appropriate rule: A function may declare a `series float` parameter and use it in its body.

## undeclared identifier in source (3)

### sources/0489__casoon-pine-scripts__flow_bias.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `archive/indicators/flow_bias/flow_bias.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `160:21: unknown-identifier: Unknown identifier: rsiLen`
- Evidence: line 160: `rsi = ta.rsi(close, rsiLen)`
- Verdict: **invalid Pine**
- Version-appropriate rule: The identifier has no valid prior declaration, or is referenced from its own initializer; the declared version rejects it.

### sources/0495__casoon-pine-scripts__wave_navigator.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `archive/indicators/wave_navigator/wave_navigator.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `1255:34: unknown-identifier: Unknown identifier: pivotsToKeep`
- Evidence: line 1255: `while array.size(pivPrice) > pivotsToKeep`
- Verdict: **invalid Pine**
- Version-appropriate rule: The identifier has no valid prior declaration, or is referenced from its own initializer; the declared version rejects it.

### sources/0581__casoon-pine-scripts__vein_reversal_zones.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `indicators/trend_direction/vein/vein_reversal_zones/vein_reversal_zones.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `311:84: unknown-identifier: Unknown identifier: relVol`
- Evidence: line 311: `float conflScoreLong = (structureLong ? 3.0 : 0.0) + (momentumLong ? 2.0 : 0.0) + (relVol > 1.2 ? 2.0 : 0.0) + (emaLong ? 2.0 : 0.0) + (stLong ? 1.0 : 0.0)`
- Verdict: **invalid Pine**
- Version-appropriate rule: The identifier has no valid prior declaration, or is referenced from its own initializer; the declared version rejects it.

## UDF local declared before use (5)

### sources/0539__casoon-pine-scripts__fisher_transform_advanced.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `indicators/momentum/fisher_transform_advanced/fisher_transform_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `106:20: unknown-identifier: Unknown identifier: e6`
- Evidence: line 106: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3`
- Verdict: **real TealScript gap**
- Version-appropriate rule: A local declared earlier in a UDF is available to later return expressions.

### sources/0550__casoon-pine-scripts__roc_advanced.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `indicators/momentum/roc_advanced/roc_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `106:20: unknown-identifier: Unknown identifier: e6`
- Evidence: line 106: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3`
- Verdict: **real TealScript gap**
- Version-appropriate rule: A local declared earlier in a UDF is available to later return expressions.

### sources/0551__casoon-pine-scripts__rsi_advanced.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `indicators/momentum/rsi_advanced/rsi_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `109:20: unknown-identifier: Unknown identifier: e6`
- Evidence: line 109: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3`
- Verdict: **real TealScript gap**
- Version-appropriate rule: A local declared earlier in a UDF is available to later return expressions.

### sources/0553__casoon-pine-scripts__tsi_advanced.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `indicators/momentum/tsi_advanced/tsi_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `107:20: unknown-identifier: Unknown identifier: e6`
- Evidence: line 107: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3`
- Verdict: **real TealScript gap**
- Version-appropriate rule: A local declared earlier in a UDF is available to later return expressions.

### sources/0558__casoon-pine-scripts__williams_r_advanced.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `indicators/momentum/williams_r_advanced/williams_r_advanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `109:20: unknown-identifier: Unknown identifier: e6`
- Evidence: line 109: `-(b * b * b) * e6 + (3.0 * b * b + 3.0 * b * b * b) * e5 + (-6.0 * b * b - 3.0 * b - 3.0 * b * b * b) * e4 + (1.0 + 3.0 * b + b * b * b + 3.0 * b * b) * e3`
- Verdict: **real TealScript gap**
- Version-appropriate rule: A local declared earlier in a UDF is available to later return expressions.

## if-expression local scope (1)

### sources/0564__casoon-pine-scripts__money_flow_delta_profile.pine
- Repository: https://github.com/casoon/pine-scripts
- Source: `indicators/money_flow/money_flow_delta_profile/money_flow_delta_profile.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `246:61: unknown-identifier: Unknown identifier: vPOR`
- Evidence: line 246: `flow = rpSRC == "Money Flow" ? v_ * vPOR * mfPrice * wt : v_ * vPOR * wt`
- Verdict: **real TealScript gap**
- Version-appropriate rule: A value bound by an `if` expression is available to later statements in its enclosing scope.

