# External Pine Consensus Full Corpus v1

Measured commit: `0a5c87fe05b6542616b6331bab7956a79beb38a0`
Generated: 2026-09-12T04:13:50.521Z

## Headline

Declared v5/v6 rows measured across the committed corpus union: 2428. Canonical value rows under Sam's rule: 1677.
TealScript defect rows by canonical external value: 867, grouped into 27 root-cause buckets below. No auto-fixes were made by this full run.
Voters-differ no-verdict rate: 239/2428 (9.84%) of all rows; 12.47% of rows where a value comparison ran.

| Canon provenance | Rows |
|---|---:|
| external-consensus | 224 |
| pinets-sole | 1338 |
| pine-a-script-sole | 115 |
| none | 751 |

PineTS sole-canon taint warning: `external-pine-consensus-pinets-grammar-precedence-audit-v1.md` at `dc2fbac78e` proves PineTS is unsafe as blanket sole canon for documented history/block/shadowing/drawing-method families. It strikes `52/119` survivor candidates, `446/1338` PineTS-sole canon rows, and `319/716` PineTS-sole differing rows. Use `external-pine-consensus-survivor-triage-v1.md` as the action filter; do not treat PineTS-sole figures as uncontaminated until the positive trust map lands.

## Root Causes

| Rank | Cause | Rows | Corpora | Example rows |
|---:|---|---:|---|---|
| 1 | warmup-na-vs-finite | 237 | v5:129, v6:83, v7:25 | v5 0001 plot[3][0] null != 1<br>v5 0002 plot[3][0] null != 1<br>v5 0003 plot[3][0] null != 1<br>v5 0004 plot[3][0] null != 1<br>v5 0005 plot[3][0] null != 1<br>v5 0006 plot[3][0] null != 1<br>v5 0007 plot[3][0] null != 1<br>v5 0008 plot[2][0] null != 1<br>v5 0009 plot[2][0] null != 1<br>v5 0011 plot[3][0] null != 1 |
| 2 | tealscript-host-request-security-datafeed | 216 | v5:52, v6:136, v7:28 | v5 0145 tealscript failed: tealscript:execute: request.security requires a request datafeed<br>v5 0243 tealscript failed: tealscript:execute: request.security requires a request datafeed<br>v5 0244 tealscript failed: tealscript:execute: request.security requires a request datafeed<br>v5 0245 tealscript failed: tealscript:execute: request.security requires a request datafeed<br>v5 0246 tealscript failed: tealscript:execute: request.security requires a request datafeed<br>v5 0247 tealscript failed: tealscript:execute: request.security requires a request datafeed<br>v5 0248 tealscript failed: tealscript:execute: request.security requires a request datafeed<br>v5 0252 tealscript failed: tealscript:execute: request.security requires a request datafeed<br>v5 0255 tealscript failed: tealscript:execute: request.security requires a request datafeed<br>v5 0256 tealscript failed: tealscript:execute: request.security requires a request datafeed |
| 3 | later-na-vs-finite | 68 | v5:26, v6:39, v7:3 | v5 0044 plot[2][80] 0 != null<br>v5 0094 plot[0][2] null != 101.74095003603577<br>v5 0134 plot[0][126] 96.7464766741 != null<br>v5 0250 plot[0][10] 110.5890140377 != null<br>v5 0405 plot[0][12] 3105 != null<br>v5 0472 plot[7][43] null != 1<br>v5 0504 plot[15][39] 1 != null<br>v5 0518 plot[0][46] 1 != null<br>v5 0541 plot[0][99] 40.622223085 != null<br>v5 0548 plot[1][14] null != 100 |
| 4 | output-call-count-shape-mismatch | 59 | v5:35, v6:14, v7:8, v7-size-recovery:2 | v5 0267 plot count 2 != 1<br>v5 0424 plot count 3 != 4<br>v5 0428 plot count 3 != 4<br>v5 0431 plot count 3 != 4<br>v5 0435 plot count 3 != 4<br>v5 0439 plot count 3 != 4<br>v5 0440 plot count 3 != 4<br>v5 0510 plot count 19 != 22<br>v5 0536 plot count 10 != 22<br>v5 0539 plot count 8 != 18 |
| 5 | warmup-finite-seed-value | 55 | v5:19, v6:20, v7:16 | v5 0037 plot[0][1] 15 != 26.55<br>v5 0088 plot[0][1] 0 != 0.36617124956876623<br>v5 0287 plot[0][1] 102.0194444526 != 101.63972222627874<br>v5 0358 plot[0][1] 1 != 0.5<br>v5 0386 plot[0][0] 0.0625 != 0<br>v5 0387 plot[0][1] 8159.4711958299 != 0<br>v5 0388 plot[0][1] 0.0011777475 != 0<br>v5 0390 plot[0][0] 45.6875 != 0.004464285714285615<br>v5 0391 plot[0][1] 6.807520609199855 != 0<br>v5 0395 plot[0][1] -2.8666916129 != 0 |
| 6 | tealscript-semantic-other-refusal | 33 | v5:4, v6:19, v7:9, v7-size-recovery:1 | v5 0629 tealscript failed: tealscript:semantic: Cannot assign int value to bool variable timeChange<br>v5 0773 tealscript failed: tealscript:semantic: Unknown identifier: buy<br>v5 0952 tealscript failed: tealscript:semantic: box.new top must be a number, got bool<br>v5 0979 tealscript failed: tealscript:semantic: Invalid table.set_position position: position.bad. Use one of the position.* constants such as position.top_right or position.bottom_left.<br>v6 0086 tealscript failed: tealscript:semantic: ta.highest length must be a number, got string<br>v6 0117 tealscript failed: tealscript:semantic: Unknown argument 'alpha' for hline()<br>v6 0163 tealscript failed: tealscript:semantic: str.length source must be a string, got float<br>v6 0223 tealscript failed: tealscript:semantic: Cannot use float value as int array element<br>v6 0332 tealscript failed: tealscript:semantic: Unknown identifier: emaFast<br>v6 0376 tealscript failed: tealscript:semantic: Cannot use udt value as udt array element |
| 7 | finite-value-mismatch | 30 | v5:22, v6:6, v7:2 | v5 0038 plot[0][2] 1.7864532244 != 1.8494658745316896<br>v5 0039 plot[0][2] -0.7421934105 != -1.7991557943699823<br>v5 0040 plot[0][2] 0.976836036 != 0.9614222656168421<br>v5 0050 plot[0][24] 72 != 128<br>v5 0051 plot[0][24] 68 != -68<br>v5 0056 plot[0][28] 1 != 0<br>v5 0120 plot[0][18] 134.9002429387 != 134.89970006791654<br>v5 0262 plot[0][11] 2.3637462480162545 != 2.363739249296344<br>v5 0266 plot[0][3] -1.293986703 != -1.2939677698392722<br>v5 0392 plot[0][17] 92.0158249304 != 0 |
| 8 | tealscript-host-request-security-lower-tf-datafeed | 22 | v5:4, v6:14, v7:4 | v5 0775 tealscript failed: tealscript:execute: request.security_lower_tf requires a request datafeed<br>v5 0859 tealscript failed: tealscript:execute: request.security_lower_tf requires a request datafeed<br>v5 0912 tealscript failed: tealscript:execute: request.security_lower_tf requires a request datafeed<br>v5 0982 tealscript failed: tealscript:execute: request.security_lower_tf requires a request datafeed<br>v6 0055 tealscript failed: tealscript:execute: request.security_lower_tf requires a request datafeed<br>v6 0147 tealscript failed: tealscript:execute: request.security_lower_tf requires a request datafeed<br>v6 0200 tealscript failed: tealscript:execute: request.security_lower_tf requires a request datafeed<br>v6 0203 tealscript failed: tealscript:execute: request.security_lower_tf requires a request datafeed<br>v6 0248 tealscript failed: tealscript:execute: request.security_lower_tf requires a request datafeed<br>v6 0264 tealscript failed: tealscript:execute: request.security_lower_tf requires a request datafeed |
| 9 | tealscript-semantic-float-to-int-assignment-refusal | 21 | v5:17, v6:2, v7:2 | v5 0156 tealscript failed: tealscript:semantic: Cannot assign float value to int variable mm. Pine does not round floats into ints automatically; use int(...) to convert explicitly or declare it as float.<br>v5 0164 tealscript failed: tealscript:semantic: Cannot assign float value to int variable mm. Pine does not round floats into ints automatically; use int(...) to convert explicitly or declare it as float.<br>v5 0171 tealscript failed: tealscript:semantic: Cannot assign float value to int variable halfN. Pine does not round floats into ints automatically; use int(...) to convert explicitly or declare it as float.<br>v5 0280 tealscript failed: tealscript:semantic: Cannot assign float value to int variable trimCount. Pine does not round floats into ints automatically; use int(...) to convert explicitly or declare it as float.<br>v5 0283 tealscript failed: tealscript:semantic: Cannot assign float value to int variable winCount. Pine does not round floats into ints automatically; use int(...) to convert explicitly or declare it as float.<br>v5 0297 tealscript failed: tealscript:semantic: Cannot assign float value to int variable half. Pine does not round floats into ints automatically; use int(...) to convert explicitly or declare it as float.<br>v5 0304 tealscript failed: tealscript:semantic: Cannot assign float value to int variable n2. Pine does not round floats into ints automatically; use int(...) to convert explicitly or declare it as float.<br>v5 0486 tealscript failed: tealscript:semantic: Cannot assign float value to int variable microPivotLen. Pine does not round floats into ints automatically; use int(...) to convert explicitly or declare it as float.<br>v5 0487 tealscript failed: tealscript:semantic: Cannot assign float value to int variable microPivotLen. Pine does not round floats into ints automatically; use int(...) to convert explicitly or declare it as float.<br>v5 0501 tealscript failed: tealscript:semantic: Cannot assign float value to int variable microPivotLen. Pine does not round floats into ints automatically; use int(...) to convert explicitly or declare it as float. |
| 10 | tealscript-host-strategy-trace-context | 17 | v5:1, v6:12, v7:4 | v5 0610 tealscript failed: tealscript:semantic: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it<br>v6 0706 tealscript failed: tealscript:semantic: strategy fill_orders_on_standard_ohlc=true requires host-supplied standard OHLC bars for non-standard charts before TealScript can simulate it<br>v6 0710 tealscript failed: tealscript:semantic: strategy fill_orders_on_standard_ohlc=true requires host-supplied standard OHLC bars for non-standard charts before TealScript can simulate it<br>v6 0712 tealscript failed: tealscript:semantic: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it<br>v6 0745 tealscript failed: tealscript:semantic: strategy fill_orders_on_standard_ohlc=true requires host-supplied standard OHLC bars for non-standard charts before TealScript can simulate it<br>v6 0746 tealscript failed: tealscript:semantic: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it<br>v6 0758 tealscript failed: tealscript:semantic: strategy risk_free_rate=0 requires TradingView Sharpe/Sortino report trace parity before TealScript can simulate it<br>v6 0772 tealscript failed: tealscript:semantic: strategy fill_orders_on_standard_ohlc=true requires host-supplied standard OHLC bars for non-standard charts before TealScript can simulate it<br>v6 0783 tealscript failed: tealscript:semantic: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it<br>v6 0821 tealscript failed: tealscript:semantic: strategy fill_orders_on_standard_ohlc=true requires host-supplied standard OHLC bars for non-standard charts before TealScript can simulate it |
| 11 | tealscript-semantic-color-new-linewidth-arg | 16 | v5:16 | v5 0070 tealscript failed: tealscript:semantic: Unknown argument 'linewidth' for color.new(); linewidth belongs on plot(), hline(), or drawing calls, not inside a color.new(...) color value<br>v5 0087 tealscript failed: tealscript:semantic: Unknown argument 'linewidth' for color.new(); linewidth belongs on plot(), hline(), or drawing calls, not inside a color.new(...) color value<br>v5 0257 tealscript failed: tealscript:semantic: Unknown argument 'linewidth' for color.new(); linewidth belongs on plot(), hline(), or drawing calls, not inside a color.new(...) color value<br>v5 0263 tealscript failed: tealscript:semantic: Unknown argument 'linewidth' for color.new(); linewidth belongs on plot(), hline(), or drawing calls, not inside a color.new(...) color value<br>v5 0264 tealscript failed: tealscript:semantic: Unknown argument 'linewidth' for color.new(); linewidth belongs on plot(), hline(), or drawing calls, not inside a color.new(...) color value<br>v5 0265 tealscript failed: tealscript:semantic: Unknown argument 'linewidth' for color.new(); linewidth belongs on plot(), hline(), or drawing calls, not inside a color.new(...) color value<br>v5 0269 tealscript failed: tealscript:semantic: Unknown argument 'linewidth' for color.new(); linewidth belongs on plot(), hline(), or drawing calls, not inside a color.new(...) color value<br>v5 0270 tealscript failed: tealscript:semantic: Unknown argument 'linewidth' for color.new(); linewidth belongs on plot(), hline(), or drawing calls, not inside a color.new(...) color value<br>v5 0271 tealscript failed: tealscript:semantic: Unknown argument 'linewidth' for color.new(); linewidth belongs on plot(), hline(), or drawing calls, not inside a color.new(...) color value<br>v5 0273 tealscript failed: tealscript:semantic: Unknown argument 'linewidth' for color.new(); linewidth belongs on plot(), hline(), or drawing calls, not inside a color.new(...) color value |
| 12 | tealscript-runtime-other-refusal | 13 | v5:3, v6:5, v7:3, v7-size-recovery:2 | v5 0902 tealscript failed: tealscript:execute: Cannot use pop() if array is empty.<br>v5 0927 tealscript failed: tealscript: Expected "/*", "=", or [ \t] but "a" found.<br>v5 0984 tealscript failed: tealscript:execute: request.security_lower_tf requires a lower timeframe than the chart timeframe: D<br>v6 0168 tealscript failed: tealscript:execute: Matrix power must be a non-negative integer<br>v6 0266 tealscript failed: tealscript:execute: request.security_lower_tf requires a lower timeframe than the chart timeframe: D<br>v6 0556 tealscript failed: tealscript:execute: Supply/Demand timeframe cannot be less than the main chart due to calculation issues. To fix either set
     the timeframe to the same as the chart or greater.<br>v6 0670 tealscript failed: tealscript:execute: Array is too large. Maximum size is 100000<br>v6 0910 tealscript failed: tealscript: Pine Script uses the word operator `or`; JavaScript-style `||` is not valid Pine syntax.<br>v7 0149 tealscript failed: tealscript:execute: Matrix eigenvalues requires a square matrix. Matrix is 2x3<br>v7 0159 tealscript failed: tealscript:execute: Matrix determinant requires a square matrix. Matrix is 4x2 |
| 13 | tealscript-semantic-duplicate-declaration | 13 | v5:3, v6:3, v7:7 | v5 0066 tealscript failed: tealscript:semantic: Duplicate declaration: dirty; first declared on line 10. Rename one declaration or remove the duplicate.<br>v5 0249 tealscript failed: tealscript:semantic: Duplicate declaration: psar; first declared on line 12. Rename one declaration or remove the duplicate.<br>v5 0484 tealscript failed: tealscript:semantic: Duplicate declaration: cBull; first declared on line 122. Rename one declaration or remove the duplicate.<br>v6 0061 tealscript failed: tealscript:semantic: Duplicate declaration: sar; first declared on line 12. Rename one declaration or remove the duplicate.<br>v6 0199 tealscript failed: tealscript:semantic: Duplicate declaration: up; first declared on line 9. Rename one declaration or remove the duplicate.<br>v6 0970 tealscript failed: tealscript:semantic: Duplicate declaration: a; first declared on line 5. Rename one declaration or remove the duplicate.<br>v7 0418 tealscript failed: tealscript:semantic: Duplicate declaration: ma; first declared on line 118. Rename one declaration or remove the duplicate.<br>v7 0419 tealscript failed: tealscript:semantic: Duplicate declaration: ma; first declared on line 160. Rename one declaration or remove the duplicate.<br>v7 0420 tealscript failed: tealscript:semantic: Duplicate declaration: ma; first declared on line 160. Rename one declaration or remove the duplicate.<br>v7 0422 tealscript failed: tealscript:semantic: Duplicate declaration: ma; first declared on line 118. Rename one declaration or remove the duplicate. |
| 14 | output-series-length-mismatch | 7 | v5:3, v6:4 | v5 0579 plot[2] length 240 != 224<br>v5 0731 plot[0] length 240 != 238<br>v5 0950 plot[0] length 240 != 239<br>v6 0090 plot[0] length 240 != 238<br>v6 0106 plot[0] length 240 != 238<br>v6 0594 plot[0] length 240 != 239<br>v6 0638 plot[0] length 240 != 238 |
| 15 | tealscript-runtime-matrix-bounds-or-shape-refusal | 7 | v7:7 | v7 0002 tealscript failed: tealscript:execute: Matrix column length 3 does not match row count 1<br>v7 0004 tealscript failed: tealscript:execute: Matrix column length 3 does not match row count 1<br>v7 0153 tealscript failed: tealscript:execute: Matrix row length 2 does not match column count 3<br>v7 0192 tealscript failed: tealscript:execute: Matrix column 1 is out of bounds. column count is 1<br>v7 0193 tealscript failed: tealscript:execute: Matrix column NaN is out of bounds. column count is 1<br>v7 0213 tealscript failed: tealscript:execute: Matrix column 1 is out of bounds. column count is 1<br>v7 0214 tealscript failed: tealscript:execute: Matrix column NaN is out of bounds. column count is 1 |
| 16 | tealscript-semantic-plot-duplicate-color-arg | 7 | v5:7 | v5 0158 tealscript failed: tealscript:semantic: Argument 'color' for plot() was supplied multiple times. Pine parameters can be set only once; remove one of the values.<br>v5 0176 tealscript failed: tealscript:semantic: Argument 'color' for plot() was supplied multiple times. Pine parameters can be set only once; remove one of the values.<br>v5 0178 tealscript failed: tealscript:semantic: Argument 'color' for plot() was supplied multiple times. Pine parameters can be set only once; remove one of the values.<br>v5 0254 tealscript failed: tealscript:semantic: Argument 'color' for plot() was supplied multiple times. Pine parameters can be set only once; remove one of the values.<br>v5 0258 tealscript failed: tealscript:semantic: Argument 'color' for plot() was supplied multiple times. Pine parameters can be set only once; remove one of the values.<br>v5 0725 tealscript failed: tealscript:semantic: Argument 'color' for plot() was supplied multiple times. Pine parameters can be set only once; remove one of the values.<br>v5 0938 tealscript failed: tealscript:semantic: Argument 'color' for plot() was supplied multiple times. Pine parameters can be set only once; remove one of the values. |
| 17 | tealscript-semantic-series-to-simple-parameter-refusal | 7 | v5:6, v6:1 | v5 0157 tealscript failed: tealscript:semantic: Cannot pass series value to simple parameter 'i' for function lnBinom; use an input/simple value or declare a compatible parameter<br>v5 0166 tealscript failed: tealscript:semantic: Cannot pass series value to simple parameter 'z' for function lnGamma; use an input/simple value or declare a compatible parameter<br>v5 0185 tealscript failed: tealscript:semantic: Cannot pass series value to simple parameter 'z' for function lnGamma; use an input/simple value or declare a compatible parameter<br>v5 0289 tealscript failed: tealscript:semantic: Cannot pass series value to simple parameter 'kernel' for function conv; use an input/simple value or declare a compatible parameter<br>v5 0535 tealscript failed: tealscript:semantic: Cannot pass series value to simple parameter 'windowLength' for function calculateProfile; use an input/simple value or declare a compatible parameter<br>v5 0728 tealscript failed: tealscript:semantic: Cannot pass series value to simple parameter 'weights' for function qbad; use an input/simple value or declare a compatible parameter<br>v6 0194 tealscript failed: tealscript:semantic: Cannot pass series value to simple parameter 'len' for function qsfd; use an input/simple value or declare a compatible parameter |
| 18 | tealscript-semantic-v6-int-as-bool-refusal | 7 | v5:5, v6:2 | v5 0628 tealscript failed: tealscript:semantic: Numeric int expression cannot be used as a boolean in Pine v6. This was valid in Pine v3-v5 but is not valid in Pine v6. Compare it explicitly or wrap it in bool(...).<br>v5 0630 tealscript failed: tealscript:semantic: Numeric int expression cannot be used as a boolean in Pine v6. This was valid in Pine v3-v5 but is not valid in Pine v6. Compare it explicitly or wrap it in bool(...).<br>v5 0631 tealscript failed: tealscript:semantic: Numeric int expression cannot be used as a boolean in Pine v6. This was valid in Pine v3-v5 but is not valid in Pine v6. Compare it explicitly or wrap it in bool(...).<br>v5 0632 tealscript failed: tealscript:semantic: Numeric int expression cannot be used as a boolean in Pine v6. This was valid in Pine v3-v5 but is not valid in Pine v6. Compare it explicitly or wrap it in bool(...).<br>v5 0635 tealscript failed: tealscript:semantic: Numeric int expression cannot be used as a boolean in Pine v6. This was valid in Pine v3-v5 but is not valid in Pine v6. Compare it explicitly or wrap it in bool(...).<br>v6 0077 tealscript failed: tealscript:semantic: Numeric int expression cannot be used as a boolean in Pine v6. This was valid in Pine v3-v5 but is not valid in Pine v6. Compare it explicitly or wrap it in bool(...).<br>v6 0938 tealscript failed: tealscript:semantic: Numeric int expression cannot be used as a boolean in Pine v6. This was valid in Pine v3-v5 but is not valid in Pine v6. Compare it explicitly or wrap it in bool(...). |
| 19 | tealscript-runtime-invalid-ta-length-refusal | 6 | v5:4, v6:1, v7:1 | v5 0750 tealscript failed: tealscript:execute: TA length must be a positive integer; got 27.5. TradingView rejects zero, negative, fractional, and na lengths, so guard computed lengths or add one before calling TA functions<br>v5 0809 tealscript failed: tealscript:execute: TA length must be a positive integer; got 0. TradingView rejects zero, negative, fractional, and na lengths, so guard computed lengths or add one before calling TA functions<br>v5 0811 tealscript failed: tealscript:execute: TA length must be a positive integer; got 0. TradingView rejects zero, negative, fractional, and na lengths, so guard computed lengths or add one before calling TA functions<br>v5 0987 tealscript failed: tealscript:execute: TA length must be a positive integer; got 0.010416666666666666. TradingView rejects zero, negative, fractional, and na lengths, so guard computed lengths or add one before calling TA functions<br>v6 0339 tealscript failed: tealscript:execute: TA length must be a positive integer; got 0.010416666666666666. TradingView rejects zero, negative, fractional, and na lengths, so guard computed lengths or add one before calling TA functions<br>v7 0290 tealscript failed: tealscript:execute: TA length must be a positive integer; got 27.5. TradingView rejects zero, negative, fractional, and na lengths, so guard computed lengths or add one before calling TA functions |
| 20 | tealscript-runtime-table-cell-bounds-refusal | 5 | v5:1, v6:4 | v5 0945 tealscript failed: tealscript:execute: Table cell coordinates out of bounds: column 1, row NaN. This table has columns 0-2 and rows 0-25.<br>v6 0317 tealscript failed: tealscript:execute: Table cell coordinates out of bounds: column 2, row 0. This table has columns 0-1 and rows 0-0.<br>v6 0444 tealscript failed: tealscript:execute: Table cell coordinates out of bounds: column 0, row 1. This table has columns 0-1 and rows 0-0.<br>v6 0513 tealscript failed: tealscript:execute: Table cell coordinates out of bounds: column 2, row 0. This table has columns 0-1 and rows 0-0.<br>v6 0681 tealscript failed: tealscript:execute: Table cell coordinates out of bounds: column 0, row 1. This table has columns 0-1 and rows 0-0. |
| 21 | tealscript-semantic-matrix-sum-arity | 5 | v7:4, v7-size-recovery:1 | v7 0155 tealscript failed: tealscript:semantic: matrix.sum() expects at least 2 arguments<br>v7 0202 tealscript failed: tealscript:semantic: matrix.sum() expects at least 2 arguments<br>v7 0203 tealscript failed: tealscript:semantic: matrix.sum() expects at least 2 arguments<br>v7 0207 tealscript failed: tealscript:semantic: matrix.sum() expects at least 2 arguments<br>v7-size-recovery 0044 tealscript failed: tealscript:semantic: matrix.sum() expects at least 2 arguments |
| 22 | tealscript-semantic-strategy-exit-trailing-stop | 5 | v5:1, v6:2, v7:2 | v5 0955 tealscript failed: tealscript:semantic: strategy.exit trailing stop requires trail_offset; add trail_offset when using trail_price or trail_points<br>v6 0721 tealscript failed: tealscript:semantic: strategy.exit trailing stop requires trail_offset; add trail_offset when using trail_price or trail_points<br>v6 0942 tealscript failed: tealscript:semantic: strategy.exit trailing stop requires trail_offset; add trail_offset when using trail_price or trail_points<br>v7 0286 tealscript failed: tealscript:semantic: strategy.exit trailing stop requires trail_offset; add trail_offset when using trail_price or trail_points<br>v7 0287 tealscript failed: tealscript:semantic: strategy.exit trailing stop requires trail_offset; add trail_offset when using trail_price or trail_points |
| 23 | tealscript-semantic-untyped-na-refusal | 3 | v6:2, v7-size-recovery:1 | v6 0305 tealscript failed: tealscript:semantic: Untyped declarations initialized with na are invalid from Pine v4 onward. Add an explicit type, for example float x = na.<br>v6 0419 tealscript failed: tealscript:semantic: Untyped declarations initialized with na are invalid from Pine v4 onward. Add an explicit type, for example float x = na.<br>v7-size-recovery 0045 tealscript failed: tealscript:semantic: Untyped declarations initialized with na are invalid from Pine v4 onward. Add an explicit type, for example float x = na. |
| 24 | tealscript-host-library-import | 2 | v5:1, v6:1 | v5 0784 tealscript failed: tealscript:semantic: Import 'PineCoders/VisibleChart/4' as alias 'VisibleChart' was not supplied by the host library registry; provide Pine library source for PineCoders/VisibleChart version 4, or remove/change the import<br>v6 0213 tealscript failed: tealscript:semantic: Import 'mentalRock19315/Slope_TK/1' as alias 'TK' was not supplied by the host library registry; provide Pine library source for mentalRock19315/Slope_TK version 1, or remove/change the import |
| 25 | tealscript-semantic-alertcondition-series-message | 2 | v6:2 | v6 0242 tealscript failed: tealscript:semantic: Cannot pass series string message to alertcondition(); use a const string<br>v6 0575 tealscript failed: tealscript:semantic: Cannot pass series string message to alertcondition(); use a const string |
| 26 | tealscript-semantic-fill-duplicate-transp-arg | 2 | v6:2 | v6 0384 tealscript failed: tealscript:semantic: Argument 'transp' for fill() was supplied multiple times. Pine parameters can be set only once; remove one of the values.<br>v6 0451 tealscript failed: tealscript:semantic: Argument 'transp' for fill() was supplied multiple times. Pine parameters can be set only once; remove one of the values. |
| 27 | tealscript-semantic-v6-bool-na-refusal | 2 | v6:1, v7:1 | v6 0087 tealscript failed: tealscript:semantic: na x cannot be a boolean because Pine v6 does not allow boolean na values. This was valid in Pine v3-v5 but is not valid in Pine v6. Use bool(na) for an explicitly nullable bool, or test a value with na(...).<br>v7 0195 tealscript failed: tealscript:semantic: na x cannot be a boolean because Pine v6 does not allow boolean na values. This was valid in Pine v3-v5 but is not valid in Pine v6. Use bool(na) for an explicitly nullable bool, or test a value with na(...). |

## Split

| Bucket | Rows |
|---|---:|
| tealscript-differs | 867 |
| engine-failed | 512 |
| agree | 808 |
| voters-differ | 239 |
| coercion-suspect | 2 |

| Voters-differ class | Rows |
|---|---:|
| warmup-seed | 121 |
| later-value | 62 |
| shape | 56 |

## Coercion Suspects

Rows whose external agreement could be explained by shared JavaScript/TypeScript coercion are tagged and excluded from TealScript defect groups until the Pine manual or a trace settles the type behavior.

Coercion-suspect rows: 3.
- `v6 0445` array.percentile_* string percentage: documented numeric series int/float argument; external JS/TS voters agree through JavaScript string-to-number coercion; first difference: plot[0][0] 1 != null
- `v7 0031` array.percentile_* string percentage: documented numeric series int/float argument; external JS/TS voters agree through JavaScript string-to-number coercion; first difference: none
- `v7 0062` array.percentile_* string percentage: documented numeric series int/float argument; external JS/TS voters agree through JavaScript string-to-number coercion; first difference: plot[0][0] 1 != null

## Engine Failure Breakdown

Engine failures are counted independently from verdicts. Under Sam's rule, PineTS-only and Pine-A-Script-only rows still carry canonical values; Pine-A-Script failures are now second-voter tax, not a hard coverage ceiling.

| Engine | OK rows | Failed rows |
|---|---:|---:|
| pineTS | 1801 | 627 |
| pine-a-script | 886 | 1542 |
| tealscript | 1619 | 809 |

| Failure combination | Rows |
|---|---:|
| pine-a-script | 826 |
| pine-a-script+pineTS+tealscript | 344 |
| tealscript | 211 |
| pine-a-script+tealscript | 204 |
| pine-a-script+pineTS | 168 |
| pineTS | 65 |
| pineTS+tealscript | 50 |

PineTS+TealScript runnable rows: 1386. Full two-voter+TealScript runnable intersection: 560. Second-voter tax: 826.
Rows whose failures are harness/feed-only by this classifier: 170. Rows with at least one external-engine limitation: 1642.

| Engine | Cause bucket | Failure messages |
|---|---|---:|
| pine-a-script | external parser/transpiler limitation | 894 |
| pine-a-script | external runtime missing builtin/member | 489 |
| pine-a-script | external runtime missing object/property | 90 |
| pine-a-script | external runtime error | 47 |
| pine-a-script | harness OHLC series shape mismatch | 19 |
| pine-a-script | external timeout | 3 |
| pineTS | external parser/transpiler limitation | 277 |
| pineTS | external runtime missing builtin/member | 217 |
| pineTS | external runtime error | 100 |
| pineTS | external runtime collection bound/refusal | 25 |
| pineTS | external timeout | 8 |
| tealscript | host-required request datafeed | 387 |
| tealscript | TealScript semantic/runtime refusal | 273 |
| tealscript | host-required external library import | 89 |
| tealscript | host/trace-required strategy context | 24 |
| tealscript | TealScript parse refusal | 24 |
| tealscript | correct runtime refusal: invalid TA length | 9 |
| tealscript | runtime refusal: max_bars_back/history | 3 |

## Shape No-Verdicts

Shape handling is output-family aware. Pine-A-Script visual-family under-capture was removed from the vote in 308 rows; those rows use PineTS as the canonical voter when PineTS exposes the full static output-call surface.
Remaining shape no-verdicts: 56. PineTS emitted more outputs than Pine-A-Script in 0/56 shape rows; Pine-A-Script emitted more in 0. PineTS capture/key-collapse artifacts were marked non-comparable in 56 rows.

| Output family present in shape rows | Rows |
|---|---:|
| plot | 48 |
| plotshape | 45 |
| bgcolor | 34 |
| alertcondition | 19 |
| fill | 15 |
| hline | 14 |
| barcolor | 8 |
| plotchar | 3 |
| plotcandle | 2 |
| plotarrow | 1 |
| plotbar | 1 |

| Missing plot-count delta | Rows |
|---:|---:|

| Top non-plot output-family combination | Rows |
|---|---:|
| plotshape:2,bgcolor:2 | 13 |
| plotshape:2 | 4 |
| plotshape:2,alertcondition:2 | 3 |
| bgcolor:2 | 2 |
| hline:2,bgcolor:2 | 2 |
| bgcolor:1,barcolor:1,fill:1 | 1 |
| bgcolor:3 | 1 |
| hline:1,bgcolor:2,alertcondition:2 | 1 |
| hline:1,plotshape:1,plotchar:1,plotarrow:1,plotbar:1,plotcandle:1,bgcolor:1,barcolor:1,fill:1 | 1 |
| hline:1,plotshape:2,bgcolor:2,alertcondition:2 | 1 |
| hline:1,plotshape:24 | 1 |
| hline:1,plotshape:5,bgcolor:2,alertcondition:5 | 1 |

## HLine Payload Completeness

Before the hline fix, accepted rows with visible hline calls registered plot metadata with `values: []`; acceptance counted those plots by metadata presence. Current rerun over the same accepted hline-bearing rows checks value payload completeness, not external consensus.

| Corpus | Accepted output rows | Accepted rows with hline | hline calls in accepted rows |
|---|---:|---:|---:|
| v5 | 867 | 216 | 526 |
| v6 | 787 | 94 | 222 |
| v7 | 305 | 24 | 59 |
| v7-size-recovery | 27 | 2 | 4 |

Current hline payload audit: 336 rows audited, 35 execution failures, 730/730 visible hline plots complete, 0 incomplete.
The 35 rows that fail before the current hline payload check already failed before the hline value fix; they are not an hline regression. Detached pre-fix check 75f4f9708e^: 35/35 already failed.
Hline-only accepted rows before the fix: 1.
- `v7 0049` sources/0049__helenananaa-pine-compat-runtime__unsupported_array_numeric_float_const_input_return_qualifier.pine

## Undocumented Seed Rows

Undocumented seed rows are counted/named and closed per Sam rule; no trace register or follow-up.
Pilot undocumented seed rows: `v5 0123`, `v5 0151`, `v5 0222`, `v5 0310`, `v5 0314`, `v6 0201`.
Full-run warmup/seed no-verdict rows: 121. They are named in the JSON report and not investigated further.

## Engine Failures

Rows where at least one of PineTS, Pine-A-Script, or TealScript failed before a value comparison: 512.

| Count | Failure prefix |
|---:|---|
| 362 | tealscript:execute: request.security requires a request datafeed |
| 106 | pine-a-script: log is not defined |
| 65 | pine-a-script:unknown: Unexpected token "to" at line 7, column 23 while parsing expression |
| 48 | pine-a-script:unknown: this.parseTernary is not a function |
| 44 | pine-a-script: timeframe.in_seconds is not a function |
| 33 | pine-a-script: risk is not defined |
| 32 | pine-a-script: Unexpected token ';' |
| 25 | pineTS: request.footprint is not a function |
| 25 | tealscript:execute: request.security_lower_tf requires a request datafeed |
| 24 | pine-a-script: hour is not defined |
| 18 | pine-a-script: high.slice is not a function |
| 18 | pine-a-script: year is not defined |
| 18 | pine-a-script:unknown: Unexpected token "to" at line 7, column 20 while parsing expression |
| 17 | pine-a-script: timeframe.change is not a function |
| 17 | pineTS: Cannot read properties of undefined (reading '0') |
| 16 | pineTS: i.size is not a function |
| 16 | pineTS: Invalid timeframe |
| 16 | tealscript:semantic: Unknown argument 'linewidth' for color.new(); linewidth belongs on plot(), hline(), or drawing calls, not inside a color.new(...) color val |
| 15 | pine-a-script: Unexpected reserved word |
| 14 | pine-a-script: lib is not defined |

## Inputs

Bars: `packages/tealscript/reports/external-pine-consensus-pilot-bars-v1.json`, 240 bars, sha256 `f2700a823e6c10c2fb51410a72f2e08b7b2170ae8c8efa409ec2246b2c0a24e7`.
Context: `packages/tealscript/reports/external-pine-consensus-pilot-context-v1.json`, symbol `CONSENSUS:TEST`, timeframe `D`, sha256 `df40674a4e47310ed0c01e11cd96f8c59351c437a0b8832d9198fc756e4c49e4`.
PineTS: https://github.com/LuxAlgo/PineTS local head `1fdcf4ab5f8994046f1a95eb741d0fec00e34328`.
Pine-A-Script: https://github.com/MeridianAlgo/Pine-A-Script local head `6f9e99cd0a0bc895ac661cbfbe2c9ae1fa0df2c9`.
Provenance: `external-consensus` means both voters agreed, `pinets-sole` means only PineTS supplied the canonical value, and `pine-a-script-sole` means only Pine-A-Script supplied it. Manual adjudication remains `documented` or `hand-derived` only in the pilot report, not blurred into external provenance.

## Machine Data

Full rows and all failure details are in `external-pine-consensus-full-v1.json`.
