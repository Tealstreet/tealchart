# Pine Grammar Production Coverage v1

Generated: 2026-09-11T15:00:01.930Z
Measured commit: `ba9d31550a`

## Method

- Grammar: `src/parser/grammar.peggy`
- Inputs: 85 committed grammar snippets and 2506 corpus scripts.
- Trace event: Peggy rule.match counted only after a full successful Program parse.
- Normalization: The traced parser receives the same wrapper-normalized source shape as parse(): BOM removal, line-ending normalization, leading-tab normalization, NBSP normalization outside strings and comments, and 3-space UDF-body indentation normalization.
- Caveat: Peggy traces are parser-internal events. Counting only successful rule.match events avoids failed parse attempts, but productions reached only inside a backtracked successful parse alternative may still be trace-visible. The traced parser is intentionally generated without Peggy cache: true because cache changed behavior on real corpus input during this audit.

## Headline

- Productions reached by snippets or corpus: 184/274.
- Reached by both: 141.
- Reached by grammar snippets only: 0.
- Reached by corpus only: 43.
- Unreached by both: 90.
- Corpus parse successes: 2472; parse failures: 34.
- Verdict: no unreached production is a confirmed Pine-does-not-have over-acceptance defect from source-only evidence. Four productions collapse to two compile-evidence questions: untyped UDT fields and parenthesized lambda expressions.

Classification counts:

| Classification | Productions |
| --- | ---: |
| accepted-syntax-needs-compile-evidence | 4 |
| known-zero-use-construct | 1 |
| reached | 184 |
| untested-support-production | 85 |

## Unreached By Both

| Production | Classification | Reason |
| --- | --- | --- |
| `UntypedTypeFieldDeclaration` | accepted-syntax-needs-compile-evidence | Unreached production does not map to a measured zero-use negative or a purely internal support helper. It needs compile evidence before it is trusted as accepted Pine syntax. |
| `FunctionDeepNestedAssignmentStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionVeryDeepNestedAssignmentStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionUltraDeepNestedAssignmentStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionMegaDeepNestedAssignmentStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionSuperDeepNestedAssignmentStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionHyperDeepNestedAssignmentStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionExtremeDeepNestedAssignmentStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionNestedBlock` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionNestedStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionNestedSwitchExpressionStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionNestedIfStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionNestedElseClause` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionNestedForStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionNestedWhileStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionDeepNestedBlock` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionDeepNestedStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionDeepNestedSwitchExpressionStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionDeepNestedSwitchExpression` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionDeepNestedSwitchCase` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionDeepNestedIfStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionDeepNestedElseClause` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionDeepNestedForStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionDeepNestedWhileStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionDeepNestedVariableDeclaration` | untested-support-production | Depth-specific UDF variable-declaration support production. Typed and untyped UDF declarations are reached at nearby depths, but this exact generated depth tier is not reached by the current snippets or corpus pass. |
| `TypedFunctionDeepNestedVariableDeclaration` | untested-support-production | Depth-specific UDF variable-declaration support production. Typed and untyped UDF declarations are reached at nearby depths, but this exact generated depth tier is not reached by the current snippets or corpus pass. |
| `UntypedFunctionDeepNestedVariableDeclaration` | untested-support-production | Depth-specific UDF variable-declaration support production. Typed and untyped UDF declarations are reached at nearby depths, but this exact generated depth tier is not reached by the current snippets or corpus pass. |
| `FunctionVeryDeepNestedBlock` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionVeryDeepNestedStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionVeryDeepNestedSwitchExpressionStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionVeryDeepNestedSwitchExpression` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionVeryDeepNestedSwitchCase` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionVeryDeepNestedForStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionVeryDeepNestedWhileStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionVeryDeepNestedVariableDeclaration` | untested-support-production | Depth-specific UDF variable-declaration support production. Typed and untyped UDF declarations are reached at nearby depths, but this exact generated depth tier is not reached by the current snippets or corpus pass. |
| `TypedFunctionVeryDeepNestedVariableDeclaration` | untested-support-production | Depth-specific UDF variable-declaration support production. Typed and untyped UDF declarations are reached at nearby depths, but this exact generated depth tier is not reached by the current snippets or corpus pass. |
| `UntypedFunctionVeryDeepNestedVariableDeclaration` | untested-support-production | Depth-specific UDF variable-declaration support production. Typed and untyped UDF declarations are reached at nearby depths, but this exact generated depth tier is not reached by the current snippets or corpus pass. |
| `FunctionVeryDeepNestedIfStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionVeryDeepNestedElseClause` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionUltraDeepNestedBlock` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionUltraDeepNestedStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionUltraDeepNestedForStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionUltraDeepNestedWhileStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionUltraDeepNestedIfStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionUltraDeepNestedElseClause` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionMegaDeepNestedBlock` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionMegaDeepNestedStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionMegaDeepNestedForStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionMegaDeepNestedWhileStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionMegaDeepNestedIfStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionMegaDeepNestedElseClause` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionSuperDeepNestedBlock` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionSuperDeepNestedStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionSuperDeepNestedSwitchExpressionStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionSuperDeepNestedSwitchExpression` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionSuperDeepNestedSwitchCase` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionSuperDeepNestedForStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionSuperDeepNestedWhileStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionSuperDeepNestedIfStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionSuperDeepNestedElseClause` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionHyperDeepNestedBlock` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionHyperDeepNestedStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionHyperDeepNestedForStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionHyperDeepNestedWhileStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionHyperDeepNestedIfStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionHyperDeepNestedElseClause` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionExtremeDeepNestedBlock` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionExtremeDeepNestedStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionExtremeDeepNestedForStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionExtremeDeepNestedWhileStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionExtremeDeepNestedIfStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionExtremeDeepNestedElseClause` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionMaxDeepNestedBlock` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionMaxDeepNestedStatement` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionVeryDeepNestedIndent` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionUltraDeepNestedIndent` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionMegaDeepNestedIndent` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionSuperDeepNestedIndent` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionHyperDeepNestedIndent` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionExtremeDeepNestedIndent` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `FunctionMaxDeepNestedIndent` | untested-support-production | Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass. |
| `LambdaLookahead` | accepted-syntax-needs-compile-evidence | Recognizes parenthesized arrow-function syntax before parsing a lambda. Earlier corpus judgement found JavaScript-style callback syntax invalid, so this accepted grammar surface needs direct TradingView compile evidence. |
| `LambdaExpression` | accepted-syntax-needs-compile-evidence | Builds an expression node for `(params) => expr`. TealScript currently parses and checks this syntax, but no corpus/script/manual evidence in this pass proves TradingView accepts lambda expressions. |
| `LambdaParams` | accepted-syntax-needs-compile-evidence | Supports parameters for `(params) => expr` lambda syntax; this is the same unproven accepted grammar surface as LambdaExpression. |
| `TripleDoubleStringChar` | known-zero-use-construct | Supports triple-quoted string literal content. The construct-depth report measures formatting.triple-quoted-string at 0 of 2,506 scripts and no grammar snippet now targets it. |
| `IdentifierPart` | untested-support-production | Identifier helper production. Identifier parsing is reached through higher-level rules, but this helper is not trace-reached by the accepted snippets/corpus pass. |
| `LoopHeaderContinuationSpace` | untested-support-production | Whitespace, comment, or continuation helper production. Its absence from rule.match coverage does not by itself indicate a Pine syntax surface. |
| `IfConditionSpace` | untested-support-production | Whitespace, comment, or continuation helper production. Its absence from rule.match coverage does not by itself indicate a Pine syntax surface. |
| `CommaContinuationSpace` | untested-support-production | Whitespace, comment, or continuation helper production. Its absence from rule.match coverage does not by itself indicate a Pine syntax surface. |
| `BeforeBitwiseXorOperator` | untested-support-production | Whitespace, comment, or continuation helper production. Its absence from rule.match coverage does not by itself indicate a Pine syntax surface. |

## Corpus-Only Productions

These productions are absent from the 85 committed grammar snippets but are exercised by real corpus scripts.

| Production | Corpus scripts | Sample hits |
| --- | ---: | --- |
| `FunctionChainedStatement` | 179 | v5:sources/0018__mihakralj-pinescript__stbands.pine, v5:sources/0019__mihakralj-pinescript__ubands.pine, v5:sources/0020__mihakralj-pinescript__uchannel.pine, v5:sources/0021__mihakralj-pinescript__vwapbands.pine, v5:sources/0022__mihakralj-pinescript__vwapsd.pine |
| `FunctionAssignmentStatement` | 10 | v6:sources/0357__webcrack4-pine-script-combine__V5_14-16-21-27-34-35-36.pine, v6:sources/0382__helenananaa-pine-compat-runtime__user_methods.pine, v6:sources/0421__alboogycOdR-dev-projects__apx3.2.gem.pine, v6:sources/0489__turnupdigital-riskmanager__SimpleMarketMetrics.pine, v6:sources/0490__regalouisei-collect-tradingview__mxwll-price-action-suite-mxwll.pine |
| `FunctionNestedAssignmentStatement` | 19 | v5:sources/0777__hasnocool-tradingview-pine-scripts__Ranged-Volume-DCA-Strategy---R3c0nTrader.pine, v5:sources/0828__deepentropy-lightweight-charts-indicators__Support-Resistance-Classification-VR-LuxAlgo-.pine, v5:sources/0838__SenkuSupreme-TradingView-MT4-MT5-Indicators-Strategies-Collection__VP-MAPS-OB-S-R-GGSHOT-HH-BY-LEO.pine, v5:sources/0910__deepentropy-oakscriptJS__Support-Resistance-Classification-VR-LuxAlgo-.pine, v5:sources/0985__deepentropy-lightweight-charts-indicators__FVG-Instantaneous-Mitigation-Signals-LuxAlgo-.pine |
| `IndentedLocalFunctionDeclaration` | 1 | v6:sources/0658__majixai-majixai.github.io__pine_ml_indicator.pine |
| `FunctionSwitchExpressionStatement` | 218 | v5:sources/0483__casoon-pine-scripts__adaptive_supertrend.pine, v5:sources/0492__casoon-pine-scripts__relative_leg_efficiency_panel_chart.pine, v5:sources/0493__casoon-pine-scripts__rj_wave.pine, v5:sources/0496__casoon-pine-scripts__wavetrend_base_strategy.pine, v5:sources/0498__casoon-pine-scripts__wavetrend_v3_strategy.pine |
| `FunctionSwitchExpression` | 261 | v5:sources/0483__casoon-pine-scripts__adaptive_supertrend.pine, v5:sources/0492__casoon-pine-scripts__relative_leg_efficiency_panel_chart.pine, v5:sources/0493__casoon-pine-scripts__rj_wave.pine, v5:sources/0495__casoon-pine-scripts__wave_navigator.pine, v5:sources/0496__casoon-pine-scripts__wavetrend_base_strategy.pine |
| `FunctionCollectionForExpression` | 1 | v6:sources/0382__helenananaa-pine-compat-runtime__user_methods.pine |
| `FunctionNumericForExpression` | 2 | v6:sources/0310__quant5-lab-runner__test_for_simple.pine, v6:sources/0382__helenananaa-pine-compat-runtime__user_methods.pine |
| `FunctionWhileExpression` | 1 | v6:sources/0382__helenananaa-pine-compat-runtime__user_methods.pine |
| `FunctionSwitchCase` | 261 | v5:sources/0483__casoon-pine-scripts__adaptive_supertrend.pine, v5:sources/0492__casoon-pine-scripts__relative_leg_efficiency_panel_chart.pine, v5:sources/0493__casoon-pine-scripts__rj_wave.pine, v5:sources/0495__casoon-pine-scripts__wave_navigator.pine, v5:sources/0496__casoon-pine-scripts__wavetrend_base_strategy.pine |
| `FunctionForStatement` | 494 | v5:sources/0008__mihakralj-pinescript__decaychannel.pine, v5:sources/0015__mihakralj-pinescript__regchannel.pine, v5:sources/0016__mihakralj-pinescript__sdchannel.pine, v5:sources/0030__mihakralj-pinescript__ccor.pine, v5:sources/0032__mihakralj-pinescript__cg.pine |
| `FunctionWhileStatement` | 94 | v5:sources/0007__mihakralj-pinescript__dchannel.pine, v5:sources/0009__mihakralj-pinescript__fcb.pine, v5:sources/0013__mihakralj-pinescript__mmchannel.pine, v5:sources/0014__mihakralj-pinescript__pchannel.pine, v5:sources/0165__mihakralj-pinescript__fft.pine |
| `TypedFunctionVariableDeclaration` | 1107 | v5:sources/0001__mihakralj-pinescript__aberr.pine, v5:sources/0002__mihakralj-pinescript__accbands.pine, v5:sources/0003__mihakralj-pinescript__apchannel.pine, v5:sources/0004__mihakralj-pinescript__apz.pine, v5:sources/0005__mihakralj-pinescript__atrbands.pine |
| `FunctionNestedSwitchExpression` | 51 | v5:sources/0493__casoon-pine-scripts__rj_wave.pine, v5:sources/0528__casoon-pine-scripts__wyckoff_schematics.pine, v5:sources/0603__casoon-pine-scripts__RTAMonitoring.pine, v5:sources/0604__casoon-pine-scripts__RTAStrategy.pine, v5:sources/0828__deepentropy-lightweight-charts-indicators__Support-Resistance-Classification-VR-LuxAlgo-.pine |
| `FunctionNestedSwitchCase` | 51 | v5:sources/0493__casoon-pine-scripts__rj_wave.pine, v5:sources/0528__casoon-pine-scripts__wyckoff_schematics.pine, v5:sources/0603__casoon-pine-scripts__RTAMonitoring.pine, v5:sources/0604__casoon-pine-scripts__RTAStrategy.pine, v5:sources/0828__deepentropy-lightweight-charts-indicators__Support-Resistance-Classification-VR-LuxAlgo-.pine |
| `FunctionNestedVariableDeclaration` | 846 | v5:sources/0004__mihakralj-pinescript__apz.pine, v5:sources/0005__mihakralj-pinescript__atrbands.pine, v5:sources/0008__mihakralj-pinescript__decaychannel.pine, v5:sources/0009__mihakralj-pinescript__fcb.pine, v5:sources/0010__mihakralj-pinescript__jbands.pine |
| `TypedFunctionNestedVariableDeclaration` | 557 | v5:sources/0004__mihakralj-pinescript__apz.pine, v5:sources/0005__mihakralj-pinescript__atrbands.pine, v5:sources/0008__mihakralj-pinescript__decaychannel.pine, v5:sources/0009__mihakralj-pinescript__fcb.pine, v5:sources/0010__mihakralj-pinescript__jbands.pine |
| `UntypedFunctionNestedVariableDeclaration` | 491 | v5:sources/0018__mihakralj-pinescript__stbands.pine, v5:sources/0021__mihakralj-pinescript__vwapbands.pine, v5:sources/0066__mihakralj-pinescript__dirty.pine, v5:sources/0073__mihakralj-pinescript__mase.pine, v5:sources/0134__mihakralj-pinescript__mlp.pine |
| `FunctionArbitraryInlineIfStatement` | 20 | v5:sources/0547__casoon-pine-scripts__oscillator_topology.pine, v5:sources/0564__casoon-pine-scripts__money_flow_delta_profile.pine, v5:sources/0777__hasnocool-tradingview-pine-scripts__Ranged-Volume-DCA-Strategy---R3c0nTrader.pine, v5:sources/0838__SenkuSupreme-TradingView-MT4-MT5-Indicators-Strategies-Collection__VP-MAPS-OB-S-R-GGSHOT-HH-BY-LEO.pine, v6:sources/0183__gorx1-TradingView__mean_price.pine |
| `FunctionArbitraryNestedIfStatement` | 829 | v5:sources/0008__mihakralj-pinescript__decaychannel.pine, v5:sources/0009__mihakralj-pinescript__fcb.pine, v5:sources/0010__mihakralj-pinescript__jbands.pine, v5:sources/0012__mihakralj-pinescript__maenv.pine, v5:sources/0014__mihakralj-pinescript__pchannel.pine |
| `FunctionArbitraryNestedElseClause` | 491 | v5:sources/0008__mihakralj-pinescript__decaychannel.pine, v5:sources/0009__mihakralj-pinescript__fcb.pine, v5:sources/0014__mihakralj-pinescript__pchannel.pine, v5:sources/0021__mihakralj-pinescript__vwapbands.pine, v5:sources/0034__mihakralj-pinescript__eacp.pine |
| `FunctionArbitraryNestedForStatement` | 407 | v5:sources/0012__mihakralj-pinescript__maenv.pine, v5:sources/0019__mihakralj-pinescript__ubands.pine, v5:sources/0034__mihakralj-pinescript__eacp.pine, v5:sources/0058__mihakralj-pinescript__pfe.pine, v5:sources/0064__mihakralj-pinescript__vhf.pine |
| `FunctionArbitraryNestedWhileStatement` | 50 | v5:sources/0219__mihakralj-pinescript__kdj.pine, v5:sources/0495__casoon-pine-scripts__wave_navigator.pine, v5:sources/0502__casoon-pine-scripts__auto_trendlines.pine, v5:sources/0510__casoon-pine-scripts__market_motion_dna_v1.pine, v5:sources/0530__casoon-pine-scripts__zigzag_fibo_pullback_map.pine |
| `FunctionArbitraryNestedSwitchExpressionStatement` | 37 | v5:sources/0493__casoon-pine-scripts__rj_wave.pine, v5:sources/0535__casoon-pine-scripts__vwap_cross_visuals.pine, v5:sources/0537__casoon-pine-scripts__elder_ray_pressure_engine.pine, v5:sources/0569__casoon-pine-scripts__chandelier_flip_radar.pine, v5:sources/0603__casoon-pine-scripts__RTAMonitoring.pine |
| `FunctionArbitraryNestedSwitchExpression` | 37 | v5:sources/0493__casoon-pine-scripts__rj_wave.pine, v5:sources/0535__casoon-pine-scripts__vwap_cross_visuals.pine, v5:sources/0537__casoon-pine-scripts__elder_ray_pressure_engine.pine, v5:sources/0569__casoon-pine-scripts__chandelier_flip_radar.pine, v5:sources/0603__casoon-pine-scripts__RTAMonitoring.pine |
| `FunctionArbitraryNestedSwitchCase` | 37 | v5:sources/0493__casoon-pine-scripts__rj_wave.pine, v5:sources/0535__casoon-pine-scripts__vwap_cross_visuals.pine, v5:sources/0537__casoon-pine-scripts__elder_ray_pressure_engine.pine, v5:sources/0569__casoon-pine-scripts__chandelier_flip_radar.pine, v5:sources/0603__casoon-pine-scripts__RTAMonitoring.pine |
| `FunctionArbitraryIndent` | 703 | v5:sources/0008__mihakralj-pinescript__decaychannel.pine, v5:sources/0009__mihakralj-pinescript__fcb.pine, v5:sources/0010__mihakralj-pinescript__jbands.pine, v5:sources/0012__mihakralj-pinescript__maenv.pine, v5:sources/0014__mihakralj-pinescript__pchannel.pine |
| `FunctionNestedIndent` | 261 | v5:sources/0483__casoon-pine-scripts__adaptive_supertrend.pine, v5:sources/0492__casoon-pine-scripts__relative_leg_efficiency_panel_chart.pine, v5:sources/0493__casoon-pine-scripts__rj_wave.pine, v5:sources/0495__casoon-pine-scripts__wave_navigator.pine, v5:sources/0496__casoon-pine-scripts__wavetrend_base_strategy.pine |
| `FunctionDeepNestedIndent` | 51 | v5:sources/0493__casoon-pine-scripts__rj_wave.pine, v5:sources/0528__casoon-pine-scripts__wyckoff_schematics.pine, v5:sources/0603__casoon-pine-scripts__RTAMonitoring.pine, v5:sources/0604__casoon-pine-scripts__RTAStrategy.pine, v5:sources/0828__deepentropy-lightweight-charts-indicators__Support-Resistance-Classification-VR-LuxAlgo-.pine |
| `SingleLineBody` | 1 | v6:sources/0560__shevateshubham-tradingbot__smc_connector.pine |
| `CollectionForExpression` | 16 | v5:sources/0819__helenananaa-pine-compat-runtime__dynamic_history_series_max_bars_back_for_in_result_miss.pine, v6:sources/0171__helenananaa-pine-compat-runtime__unsupported_for_in_ta_pivot_point_levels_result_negative_history.pine, v6:sources/0261__helenananaa-pine-compat-runtime__user_type_history.pine, v6:sources/0522__helenananaa-pine-compat-runtime__unsupported_for_in_expression_reassignment_result.pine, v7:sources/0005__helenananaa-pine-compat-runtime__unsupported_for_in_array_abs_result_negative_history.pine |
| `NumericForExpression` | 1 | v6:sources/0261__helenananaa-pine-compat-runtime__user_type_history.pine |
| `WhileExpression` | 3 | v5:sources/0838__SenkuSupreme-TradingView-MT4-MT5-Indicators-Strategies-Collection__VP-MAPS-OB-S-R-GGSHOT-HH-BY-LEO.pine, v6:sources/0261__helenananaa-pine-compat-runtime__user_type_history.pine, v6:sources/0378__helenananaa-pine-compat-runtime__unsupported_dynamic_history_while_result.pine |
| `InlineLoopControlStatement` | 5 | v6:sources/0423__regalouisei-collect-tradingview__monte-carlo-polyline-traceback-kioseff-trading.pine, v6:sources/0486__alboogycOdR-dev-projects__institutional_crt_frameworkv8.pine, v7:sources/0243__ainell-owi-LePine__Siege-_structure-_engine_v6.pine, v7:sources/0441__alboogycOdR-dev-projects__institutional_crt_frameworkv9.pine, v7:sources/0442__alboogycOdR-dev-projects__institutional_crt_frameworkv8.1.pine |
| `ColorLiteral` | 645 | v5:sources/0410__everget-tradingview-pinescript-indicators__mean_absolute_deviation_bands.pine, v5:sources/0411__everget-tradingview-pinescript-indicators__moving_average_channel.pine, v5:sources/0412__everget-tradingview-pinescript-indicators__vortex_bands.pine, v5:sources/0413__everget-tradingview-pinescript-indicators__range_candles.pine, v5:sources/0414__everget-tradingview-pinescript-indicators__weekdays_gaps.pine |
| `SingleStringChar` | 473 | v5:sources/0421__everget-tradingview-pinescript-indicators__corrected_moving_average.pine, v5:sources/0424__everget-tradingview-pinescript-indicators__fibonacci_weighted_moving_average.pine, v5:sources/0428__everget-tradingview-pinescript-indicators__henderson_weighted_moving_average.pine, v5:sources/0431__everget-tradingview-pinescript-indicators__inverse_distance_weighted_moving_average.pine, v5:sources/0435__everget-tradingview-pinescript-indicators__quick_moving_average.pine |
| `EscapeSequence` | 416 | v5:sources/0421__everget-tradingview-pinescript-indicators__corrected_moving_average.pine, v5:sources/0424__everget-tradingview-pinescript-indicators__fibonacci_weighted_moving_average.pine, v5:sources/0428__everget-tradingview-pinescript-indicators__henderson_weighted_moving_average.pine, v5:sources/0431__everget-tradingview-pinescript-indicators__inverse_distance_weighted_moving_average.pine, v5:sources/0435__everget-tradingview-pinescript-indicators__quick_moving_average.pine |
| `Comment` | 95 | v5:sources/0495__casoon-pine-scripts__wave_navigator.pine, v5:sources/0659__SammyEnigma-pine-scripts__BBW-RSI-60-Strategy.pine, v5:sources/0670__SammyEnigma-pine-scripts__greeffer-bb-strategy-4.pine, v5:sources/0703__dcaoyuan-vibetrader__macd.pine, v5:sources/0760__supertonka-tradingview-ict-indicator__orderblock_indicator.pine |
| `SingleLineComment` | 95 | v5:sources/0495__casoon-pine-scripts__wave_navigator.pine, v5:sources/0659__SammyEnigma-pine-scripts__BBW-RSI-60-Strategy.pine, v5:sources/0670__SammyEnigma-pine-scripts__greeffer-bb-strategy-4.pine, v5:sources/0703__dcaoyuan-vibetrader__macd.pine, v5:sources/0760__supertonka-tradingview-ict-indicator__orderblock_indicator.pine |
| `MultiLineComment` | 15 | v5:sources/0622__knectardev-pine_scripts__macd-histogram-divergence.pine, v5:sources/0623__knectardev-pine_scripts__range-scalper_v1.0.0.pine, v5:sources/0624__knectardev-pine_scripts__range-scalper_v1.0.2_dynamic-thresh.pine, v5:sources/0625__knectardev-pine_scripts__range-scalper.pine, v5:sources/0633__knectardev-pine_scripts__rsi-divergence-indicator_v1.3.2.pine |
| `BlankLine` | 2 | v6:sources/0410__AubakirovArman-SaltanatbotV2__4-fundamentals-graphing.pine, v6:sources/0488__Kiyoraka-TradingView-Script__magic_candle_advanced_features_v5.pine |
| `BeforeShiftOperator` | 1 | v5:sources/0165__mihakralj-pinescript__fft.pine |
| `SingleElementArrayStatementAhead` | 5 | v5:sources/0865__hasnocool-tradingview-pine-scripts__John-F.-Ehlers-Center-Of-Gravity-Balanced-by-DM-.pine, v5:sources/0866__SenkuSupreme-TradingView-MT4-MT5-Indicators-Strategies-Collection__ALGOX-v13.pine, v6:sources/0368__SenkuSupreme-TradingView-MT4-MT5-Indicators-Strategies-Collection__OS-ALGO-V22--SuperTrend-.pine, v7:sources/0357__regalouisei-collect-tradingview__rsi-divergence-screener-pineify.pine, v7:sources/0358__regalouisei-collect-tradingview__multiple-symbol-trend-screener-pineify.pine |

## Snippet-Only Productions

These productions are covered by snippets but did not appear in the successful corpus parses.

| Production | Snippets | Sample snippet IDs |
| --- | ---: | --- |

## Corpus Parse Failures

| Corpus | Local path |
| --- | --- |
| v5 | `sources/0796__Leci37-tuisku_Web_selling__R09PRyAtIDFEYXkgLSAyU1YwIC0gNGZlMjJhYTk.pine` |
| v5 | `sources/0798__Leci37-tuisku_Web_selling__RERPRyAtIDMwTWluIC0gMlRWMCAtIGFiYzFhN2Rj.pine` |
| v5 | `sources/0880__Leci37-tuisku_Web_selling__VFJYVVNEVCAtIDFEYXkgLSAxTUFEIC0gZGI4ODk1Zjk.pine` |
| v5 | `sources/0894__Leci37-tuisku_Web_selling__TUVUQSAtIDFEYXkgLSAyQ1YwIC0gOGRmN2I1MTc.pine` |
| v5 | `sources/0895__Leci37-tuisku_Web_selling__Q1JXRCAtIDFEYXkgLSAyVFYwIC0gNjk2ZDY4OTc.pine` |
| v5 | `sources/0897__Leci37-tuisku_Web_selling__R1RMQiAtIDFIb3VyIC0gMVNRVSAtIDA2OWQwNjZh.pine` |
| v5 | `sources/0916__Leci37-tuisku_Web_selling__RE9UVVNEVCAtIDFIb3VyIC0gMlRWMCAtIDU0YjQ3ODk4.pine` |
| v5 | `sources/0927__ferranbt-pinecone__not_a_library.pine` |
| v5 | `sources/0936__Leci37-tuisku_Web_selling__TklPIC0gMURheSAtIDJNTTAgLSA1MDVlZGYxZg.pine` |
| v6 | `sources/0188__trsdn-meta-strategy__ai-rsi.pine` |
| v6 | `sources/0189__trsdn-meta-strategy__ai-macd.pine` |
| v6 | `sources/0461__deepentropy-lightweight-charts-indicators__Realtime-Footprint.pine` |
| v6 | `sources/0496__alboogycOdR-dev-projects__v0.7.0-0801DST_ALERTS-V0.7.0.pine` |
| v6 | `sources/0562__deepentropy-oakscriptJS__Realtime-Footprint.pine` |
| v6 | `sources/0845__raybird-pine-trading-strategies__TnSovereignScalpingProV6.pine` |
| v6 | `sources/0883__raybird-pine-trading-strategies__TnSovereignGapFillOpeningRangeV6.pine` |
| v6 | `sources/0910__raybird-pine-trading-strategies__TnSovereignReversalEngineV6.pine` |
| v6 | `sources/0912__raybird-pine-trading-strategies__TnSovereignHFTEngineV6.pine` |
| v7 | `sources/0024__Matt2005git-PineScriptV5__syntaxCheck.pine` |
| v7 | `sources/0025__tradesdontlie-pine-script-v6-extension__syntaxCheck.pine` |
| v7 | `sources/0026__kaigouthro-Pine-Script-VS-Code__syntaxCheck.pine` |
| v7 | `sources/0033__tibicrypto-chibao__bot-screener-okk-mod.pine` |
| v7 | `sources/0078__btcjon-pine__TTB_SnD_MTF.pine` |
| v7 | `sources/0079__btcjon-pine__TTB_MTF_SnD.pine` |
| v7 | `sources/0080__btcjon-pine__TTB_MTF_SnD_strat.pine` |
| v7 | `sources/0123__regalouisei-collect-tradingview__scatter-plot.pine` |
| v7 | `sources/0181__regalouisei-collect-tradingview__intrabar-analyzer-kioseff-trading.pine` |
| v7 | `sources/0229__raybird-pine-trading-strategies__of_imbalance_matrix_map_v6.pine` |
| v7 | `sources/0231__raybird-pine-trading-strategies__multi_agent_of_ensemble_v6.pine` |
| v7 | `sources/0233__raybird-pine-trading-strategies__footprint_liquidity_sweep_v6.pine` |
| v7 | `sources/0234__raybird-pine-trading-strategies__footprint_entropy_sovereign_v6.pine` |
| v7 | `sources/0253__regalouisei-collect-tradingview__everything-bitcoin-kioseff-trading.pine` |
| v7 | `sources/0340__MoDarK-MK-PineScript-Skill__strategy_template.pine` |
| v7 | `sources/0344__samkomo-nashipai__strategy_template.pine` |

