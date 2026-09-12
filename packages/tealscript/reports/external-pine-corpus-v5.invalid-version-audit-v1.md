> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Invalid-Version Audit V1

The v5 report contains 85 unique rows currently classified invalid after the row-audit overlay. The earlier “149 invalid” number was not a unique set: it double-counted rows already invalid in the raw report. This audit rechecks those 85 rows against each row's declared Pine version.

Result: **10 rows were wrongly excluded** because v4/v5 permits the construct; they return to the achievable denominator as TealScript-gap rows. The remaining 75 remain invalid under their declared version.

| Bucket | Rows |
| --- | ---: |
| unique invalid rows before version audit | 85 |
| return to denominator (valid declared-version Pine) | 10 |
| invalid under declared version | 75 |
| corrected supported | 832 |
| corrected TealScript gap | 83 |
| corrected invalid Pine | 75 |
| unsupported-by-design | 10 |
| achievable denominator | 915 |
| support rate | 832/915 = 90.93% |

Each row below retains its repository, path, source SHA, declared version, exact runner diagnostic, and the applicable migration rule.

## sources/0053__mihakralj-pinescript__dmx.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/dynamics/dmx.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `92:1: duplicate-symbol: Duplicate declaration: dmx`
- Construct: same-scope duplicate declaration
- v6 rule: v6 requires unique identifiers within a declaration scope. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0066__mihakralj-pinescript__dirty.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/errors/dirty.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `26:1: duplicate-symbol: Duplicate declaration: dirty`
- Construct: same-scope duplicate declaration
- v6 rule: v6 requires unique identifiers within a declaration scope. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0070__mihakralj-pinescript__mae.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/errors/mae.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `43:66: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Construct: plot linewidth=0
- v6 rule: v6 requires plot linewidth >= 1; this row declares v6. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0087__mihakralj-pinescript__rsquared.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/errors/rsquared.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `73:64: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Construct: plot linewidth=0
- v6 rule: v6 requires plot linewidth >= 1; this row declares v6. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0151__mihakralj-pinescript__sam.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/momentum/sam.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `31:107: unknown-identifier: Unknown identifier: ji`
- Construct: invalid argument/type construct recorded by the runner
- v6 rule: The exact diagnostic identifies a construct rejected by the declared version; no v4/v5 migration exception applies. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0156__mihakralj-pinescript__betadist.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/betadist.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `56:13: type-mismatch: Cannot assign float value to int variable 'mm'`
- Construct: incompatible typed assignment
- v6 rule: The declared version does not permit this narrowing or boolean-na assignment. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0157__mihakralj-pinescript__binomdist.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/binomdist.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `52:39: qualifier-mismatch: Cannot pass series value to simple parameter 'i' for function lnBinom; use an input/simple value or declare a compatible parameter`
- Construct: series value passed to simple parameter
- v6 rule: The simple qualifier accepts only simple, input, or const values. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0158__mihakralj-pinescript__change.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/change.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `30:38: duplicate-argument: Argument 'color' for plot() was supplied multiple times`
- Construct: duplicate positional/named argument
- v6 rule: v6 rejects binding one function parameter more than once. [TradingView v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

## sources/0164__mihakralj-pinescript__fdist.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/fdist.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `56:13: type-mismatch: Cannot assign float value to int variable 'mm'`
- Construct: incompatible typed assignment
- v6 rule: The declared version does not permit this narrowing or boolean-na assignment. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0166__mihakralj-pinescript__gammadist.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/gammadist.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `44:49: qualifier-mismatch: Cannot pass series value to simple parameter 'z' for function lnGamma; use an input/simple value or declare a compatible parameter`
- Construct: series value passed to simple parameter
- v6 rule: The simple qualifier accepts only simple, input, or const values. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0171__mihakralj-pinescript__ifft.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/ifft.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `19:5: type-mismatch: Cannot assign float value to int variable 'halfN'`
- Construct: incompatible typed assignment
- v6 rule: The declared version does not permit this narrowing or boolean-na assignment. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0176__mihakralj-pinescript__log.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/log.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `27:66: duplicate-argument: Argument 'color' for plot() was supplied multiple times`
- Construct: duplicate positional/named argument
- v6 rule: v6 rejects binding one function parameter more than once. [TradingView v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

## sources/0178__mihakralj-pinescript__logtrans.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/logtrans.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `27:66: duplicate-argument: Argument 'color' for plot() was supplied multiple times`
- Construct: duplicate positional/named argument
- v6 rule: v6 rejects binding one function parameter more than once. [TradingView v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

## sources/0185__mihakralj-pinescript__poissondist.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/numerics/poissondist.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `44:49: qualifier-mismatch: Cannot pass series value to simple parameter 'z' for function lnGamma; use an input/simple value or declare a compatible parameter`
- Construct: series value passed to simple parameter
- v6 rule: The simple qualifier accepts only simple, input, or const values. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0249__mihakralj-pinescript__psar.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/reversals/psar.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `70:1: duplicate-symbol: Duplicate declaration: psar`
- Construct: same-scope duplicate declaration
- v6 rule: v6 requires unique identifiers within a declaration scope. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0254__mihakralj-pinescript__cointegration.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/cointegration.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `125:58: duplicate-argument: Argument 'color' for plot() was supplied multiple times`
- Construct: duplicate positional/named argument
- v6 rule: v6 rejects binding one function parameter more than once. [TradingView v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

## sources/0257__mihakralj-pinescript__cummean.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/cummean.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `26:83: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Construct: plot linewidth=0
- v6 rule: v6 requires plot linewidth >= 1; this row declares v6. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0258__mihakralj-pinescript__entropy.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/entropy.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `67:49: duplicate-argument: Argument 'color' for plot() was supplied multiple times`
- Construct: duplicate positional/named argument
- v6 rule: v6 rejects binding one function parameter more than once. [TradingView v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

## sources/0263__mihakralj-pinescript__iqr.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/iqr.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `65:83: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Construct: plot linewidth=0
- v6 rule: v6 requires plot linewidth >= 1; this row declares v6. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0264__mihakralj-pinescript__jb.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/jb.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `72:92: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Construct: plot linewidth=0
- v6 rule: v6 requires plot linewidth >= 1; this row declares v6. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0265__mihakralj-pinescript__kendall.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/kendall.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `61:90: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Construct: plot linewidth=0
- v6 rule: v6 requires plot linewidth >= 1; this row declares v6. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0269__mihakralj-pinescript__median.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/median.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `41:83: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Construct: plot linewidth=0
- v6 rule: v6 requires plot linewidth >= 1; this row declares v6. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0270__mihakralj-pinescript__mode.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/mode.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `43:78: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Construct: plot linewidth=0
- v6 rule: v6 requires plot linewidth >= 1; this row declares v6. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0271__mihakralj-pinescript__percentile.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/percentile.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `59:91: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Construct: plot linewidth=0
- v6 rule: v6 requires plot linewidth >= 1; this row declares v6. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0273__mihakralj-pinescript__quantile.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/quantile.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `54:93: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Construct: plot linewidth=0
- v6 rule: v6 requires plot linewidth >= 1; this row declares v6. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0275__mihakralj-pinescript__spearman.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/spearman.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `123:93: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Construct: plot linewidth=0
- v6 rule: v6 requires plot linewidth >= 1; this row declares v6. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0279__mihakralj-pinescript__theil.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/theil.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `47:89: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Construct: plot linewidth=0
- v6 rule: v6 requires plot linewidth >= 1; this row declares v6. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0280__mihakralj-pinescript__trim.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/trim.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `22:9: type-mismatch: Cannot assign float value to int variable trimCount`
- Construct: incompatible typed assignment
- v6 rule: The declared version does not permit this narrowing or boolean-na assignment. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0283__mihakralj-pinescript__wins.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/statistics/wins.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `20:9: type-mismatch: Cannot assign float value to int variable winCount`
- Construct: incompatible typed assignment
- v6 rule: The declared version does not permit this narrowing or boolean-na assignment. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0297__mihakralj-pinescript__hend.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/trends_FIR/hend.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `39:9: type-mismatch: Cannot assign float value to int variable 'half'`
- Construct: incompatible typed assignment
- v6 rule: The declared version does not permit this narrowing or boolean-na assignment. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0304__mihakralj-pinescript__nyqma.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/trends_FIR/nyqma.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `21:5: type-mismatch: Cannot assign float value to int variable 'n2'`
- Construct: incompatible typed assignment
- v6 rule: The declared version does not permit this narrowing or boolean-na assignment. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0371__mihakralj-pinescript__jvolty.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/volatility/jvolty.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `47:1: duplicate-symbol: Duplicate declaration: jvolty`
- Construct: same-scope duplicate declaration
- v6 rule: v6 requires unique identifiers within a declaration scope. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0372__mihakralj-pinescript__jvoltyn.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/volatility/jvoltyn.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `48:1: duplicate-symbol: Duplicate declaration: jvoltyn`
- Construct: same-scope duplicate declaration
- v6 rule: v6 requires unique identifiers within a declaration scope. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0381__mihakralj-pinescript__vr.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/volatility/vr.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `47:80: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Construct: plot linewidth=0
- v6 rule: v6 requires plot linewidth >= 1; this row declares v6. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0382__mihakralj-pinescript__yzv.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/volatility/yzv.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `44:82: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Construct: plot linewidth=0
- v6 rule: v6 requires plot linewidth >= 1; this row declares v6. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0384__mihakralj-pinescript__adosc.pine
- Source: https://github.com/mihakralj/pinescript :: `indicators/volume/adosc.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `39:67: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Construct: plot linewidth=0
- v6 rule: v6 requires plot linewidth >= 1; this row declares v6. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0467__everget-tradingview-pinescript-indicators__roi_return_on_investment.pine
- Source: https://github.com/everget/tradingview-pinescript-indicators :: `statistics/roi_return_on_investment.pine` @ `60c93d3711d222b8f2db96160defe568429348e0`
- Declared Pine version: v4
- Prior verdict: invalid Pine
- Corrected verdict: **valid declared-version Pine; return to TealScript-gap**
- Exact diagnostic: `41:66: type-mismatch: plot linewidth must be a positive integer`
- Construct: plot linewidth=0
- v4 rule: v4 permits plot linewidth 0 [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0469__everget-tradingview-pinescript-indicators__us_treasury_yields.pine
- Source: https://github.com/everget/tradingview-pinescript-indicators :: `statistics/us_treasury_yields.pine` @ `60c93d3711d222b8f2db96160defe568429348e0`
- Declared Pine version: v4
- Prior verdict: invalid Pine
- Corrected verdict: **valid declared-version Pine; return to TealScript-gap**
- Exact diagnostic: `93:57: type-mismatch: plot linewidth must be a positive integer`
- Construct: plot linewidth=0
- v4 rule: v4 permits plot linewidth 0 [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0470__everget-tradingview-pinescript-indicators__ytd_year_to_date_percent_return.pine
- Source: https://github.com/everget/tradingview-pinescript-indicators :: `statistics/ytd_year_to_date_percent_return.pine` @ `60c93d3711d222b8f2db96160defe568429348e0`
- Declared Pine version: v4
- Prior verdict: invalid Pine
- Corrected verdict: **valid declared-version Pine; return to TealScript-gap**
- Exact diagnostic: `27:66: type-mismatch: plot linewidth must be a positive integer`
- Construct: plot linewidth=0
- v4 rule: v4 permits plot linewidth 0 [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0486__casoon-pine-scripts__directional_probability_engine_v2.pine
- Source: https://github.com/casoon/pine-scripts :: `archive/indicators/directional_probability_engine/directional_probability_engine_v2.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `269:5: type-mismatch: Cannot assign float value to int variable microPivotLen`
- Construct: incompatible typed assignment
- v6 rule: The declared version does not permit this narrowing or boolean-na assignment. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0487__casoon-pine-scripts__directional_probability_engine_v3.pine
- Source: https://github.com/casoon/pine-scripts :: `archive/indicators/directional_probability_engine/directional_probability_engine_v3.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `343:5: type-mismatch: Cannot assign float value to int variable microPivotLen`
- Construct: incompatible typed assignment
- v6 rule: The declared version does not permit this narrowing or boolean-na assignment. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0489__casoon-pine-scripts__flow_bias.pine
- Source: https://github.com/casoon/pine-scripts :: `archive/indicators/flow_bias/flow_bias.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `160:21: unknown-identifier: Unknown identifier: rsiLen`
- Construct: invalid argument/type construct recorded by the runner
- v6 rule: The exact diagnostic identifies a construct rejected by the declared version; no v4/v5 migration exception applies. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0495__casoon-pine-scripts__wave_navigator.pine
- Source: https://github.com/casoon/pine-scripts :: `archive/indicators/wave_navigator/wave_navigator.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `1255:34: unknown-identifier: Unknown identifier: pivotsToKeep`
- Construct: invalid argument/type construct recorded by the runner
- v6 rule: The exact diagnostic identifies a construct rejected by the declared version; no v4/v5 migration exception applies. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0501__casoon-pine-scripts__trade_permission_engine_v1.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/composite/trade_permission_engine/trade_permission_engine_v1.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `311:5: type-mismatch: Cannot assign float value to int variable microPivotLen`
- Construct: incompatible typed assignment
- v6 rule: The declared version does not permit this narrowing or boolean-na assignment. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0514__casoon-pine-scripts__market_tradability_engine.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/market_structure/market_tradability_engine/market_tradability_engine.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `548:1: type-mismatch: Cannot assign float value to int variable 'shortWindow'`
- Construct: incompatible typed assignment
- v6 rule: The declared version does not permit this narrowing or boolean-na assignment. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0515__casoon-pine-scripts__market_tradability_engine_v2.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/market_structure/market_tradability_engine/market_tradability_engine_v2.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `885:1: type-mismatch: Cannot assign float value to int variable 'shortWindow'`
- Construct: incompatible typed assignment
- v6 rule: The declared version does not permit this narrowing or boolean-na assignment. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0535__casoon-pine-scripts__vwap_cross_visuals.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/mean_reversion/vwap_cross_visuals/vwap_cross_visuals.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `1663:100: qualifier-mismatch: Cannot pass series value to simple parameter 'windowLength' for function calculateProfile; use an input/simple value or declare a compatible parameter`
- Construct: series value passed to simple parameter
- v6 rule: The simple qualifier accepts only simple, input, or const values. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0545__casoon-pine-scripts__mtf_wavetrend_opportunity_hunter.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/momentum/mtf_wavetrend_opportunity_hunter/mtf_wavetrend_opportunity_hunter.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `1107:5: type-mismatch: Cannot assign float value to int variable 'cx'`
- Construct: incompatible typed assignment
- v6 rule: The declared version does not permit this narrowing or boolean-na assignment. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0566__casoon-pine-scripts__relative_leg_efficiency.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/relative_strength/relative_leg_efficiency/relative_leg_efficiency.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `255:9: type-mismatch: Cannot assign float value to int variable 'mid'`
- Construct: incompatible typed assignment
- v6 rule: The declared version does not permit this narrowing or boolean-na assignment. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0581__casoon-pine-scripts__vein_reversal_zones.pine
- Source: https://github.com/casoon/pine-scripts :: `indicators/trend_direction/vein/vein_reversal_zones/vein_reversal_zones.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `311:84: unknown-identifier: Unknown identifier: relVol`
- Construct: invalid argument/type construct recorded by the runner
- v6 rule: The exact diagnostic identifies a construct rejected by the declared version; no v4/v5 migration exception applies. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0601__casoon-pine-scripts__RTAAdvanced.pine
- Source: https://github.com/casoon/pine-scripts :: `libraries/RTAAdvanced.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `371:5: type-mismatch: Cannot assign float value to int variable 'numSwings'`
- Construct: incompatible typed assignment
- v6 rule: The declared version does not permit this narrowing or boolean-na assignment. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0618__knectardev-pine_scripts__acrypto-weigthed-strategy-v149_v1.0.0.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/indicators/acrypto-weigthed-strategy-v149/archive/acrypto-weigthed-strategy-v149_v1.0.0.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **valid declared-version Pine; return to TealScript-gap**
- Exact diagnostic: `254:18: type-mismatch: ta.barssince condition must be a boolean, got int`
- Construct: numeric ta.change(strategy.closedtrades) as ta.barssince condition
- v5 rule: v5 implicitly casts numeric values to bool [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0628__knectardev-pine_scripts__rsi-divergence-indicator_v1.3.14.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/indicators/rsi-divergence-indicator/archive/rsi-divergence-indicator_v1.3.14.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `55:4: implicit-numeric-bool: Numeric int expression cannot be used as a boolean; compare it explicitly or wrap it in bool(...)`
- Construct: invalid argument/type construct recorded by the runner
- v6 rule: The exact diagnostic identifies a construct rejected by the declared version; no v4/v5 migration exception applies. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0629__knectardev-pine_scripts__rsi-divergence-indicator_v1.3.15.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/indicators/rsi-divergence-indicator/archive/rsi-divergence-indicator_v1.3.15.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `46:1: type-mismatch: Cannot assign int value to bool variable 'timeChange'`
- Construct: invalid argument/type construct recorded by the runner
- v6 rule: The exact diagnostic identifies a construct rejected by the declared version; no v4/v5 migration exception applies. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0630__knectardev-pine_scripts__rsi-divergence-indicator_v1.3.17.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/indicators/rsi-divergence-indicator/archive/rsi-divergence-indicator_v1.3.15/archive/rsi-divergence-indicator_v1.3.16/archive/rsi-divergence-indicator_v1.3.17.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `53:4: implicit-numeric-bool: Numeric int expression cannot be used as a boolean; compare it explicitly or wrap it in bool(...)`
- Construct: invalid argument/type construct recorded by the runner
- v6 rule: The exact diagnostic identifies a construct rejected by the declared version; no v4/v5 migration exception applies. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0631__knectardev-pine_scripts__rsi-divergence-indicator_v1.3.18.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/indicators/rsi-divergence-indicator/archive/rsi-divergence-indicator_v1.3.15/archive/rsi-divergence-indicator_v1.3.16/archive/rsi-divergence-indicator_v1.3.17/archive/rsi-divergence-indicator_v1.3.18.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `53:4: implicit-numeric-bool: Numeric int expression cannot be used as a boolean; compare it explicitly or wrap it in bool(...)`
- Construct: invalid argument/type construct recorded by the runner
- v6 rule: The exact diagnostic identifies a construct rejected by the declared version; no v4/v5 migration exception applies. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0632__knectardev-pine_scripts__rsi-divergence-indicator_v1.3.19.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/indicators/rsi-divergence-indicator/archive/rsi-divergence-indicator_v1.3.19.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `65:4: implicit-numeric-bool: Numeric int expression cannot be used as a boolean; compare it explicitly or wrap it in bool(...)`
- Construct: invalid argument/type construct recorded by the runner
- v6 rule: The exact diagnostic identifies a construct rejected by the declared version; no v4/v5 migration exception applies. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0635__knectardev-pine_scripts__rsi-divergence-indicator.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/indicators/rsi-divergence-indicator/rsi-divergence-indicator.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `55:4: implicit-numeric-bool: Numeric int expression cannot be used as a boolean; compare it explicitly or wrap it in bool(...)`
- Construct: invalid argument/type construct recorded by the runner
- v6 rule: The exact diagnostic identifies a construct rejected by the declared version; no v4/v5 migration exception applies. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0640__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.0.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/archive/es-professional-fade-strategy_v2.5.0.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `20:20: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Construct: strategy() named argument initialCapital
- v5 rule: v6 uses initial_capital; camelCase initialCapital is not a declaration parameter. [TradingView v6 strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

## sources/0641__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.1.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/archive/es-professional-fade-strategy_v2.5.1.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `20:20: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Construct: strategy() named argument initialCapital
- v5 rule: v6 uses initial_capital; camelCase initialCapital is not a declaration parameter. [TradingView v6 strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

## sources/0642__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.4_exec-gap.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/archive/es-professional-fade-strategy_v2.5.4_exec-gap.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `20:20: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Construct: strategy() named argument initialCapital
- v5 rule: v6 uses initial_capital; camelCase initialCapital is not a declaration parameter. [TradingView v6 strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

## sources/0648__knectardev-pine_scripts__v2.5.6_v2.5.7.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `18:87: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Construct: strategy() named argument initialCapital
- v6 rule: v6 uses initial_capital; camelCase initialCapital is not a declaration parameter. [TradingView v6 strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

## sources/0650__knectardev-pine_scripts__v2.5.6_v2.5.9.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7/archive/v2.5.6_v2.5.8/archive/v2.5.6_v2.5.9.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **valid declared-version Pine; return to TealScript-gap**
- Exact diagnostic: `115:1: type-mismatch: Cannot assign float value to bool variable 'gapPoints'`
- Construct: float/na ternary assigned to bool
- v6 rule: v5 implicitly casts numeric values to bool and permits boolean na [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0654__knectardev-pine_scripts__momentum-breakout-strategy_v1.0.0.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/momentum-breakout-strategy/archive/momentum-breakout-strategy_v1.0.0.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `17:71: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Construct: strategy() named argument initialCapital
- v5 rule: v6 uses initial_capital; camelCase initialCapital is not a declaration parameter. [TradingView v6 strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

## sources/0655__knectardev-pine_scripts__momentum-breakout-strategy_v1.1.0_volume-filter.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/momentum-breakout-strategy/archive/momentum-breakout-strategy_v1.1.0_volume-filter.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `17:71: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Construct: strategy() named argument initialCapital
- v5 rule: v6 uses initial_capital; camelCase initialCapital is not a declaration parameter. [TradingView v6 strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

## sources/0656__knectardev-pine_scripts__momentum-breakout-strategy.pine
- Source: https://github.com/knectardev/pine_scripts :: `scripts/strategies/momentum-breakout-strategy/momentum-breakout-strategy.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `16:71: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Construct: strategy() named argument initialCapital
- v5 rule: v6 uses initial_capital; camelCase initialCapital is not a declaration parameter. [TradingView v6 strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

## sources/0673__SammyEnigma-pine-scripts__pivot-popints.pine
- Source: https://github.com/SammyEnigma/pine-scripts :: `pivot-popints.pine` @ `26dbe7fc88cb7960a48a46c54e5d2f609293614e`
- Declared Pine version: v4
- Prior verdict: invalid Pine
- Corrected verdict: **valid declared-version Pine; return to TealScript-gap**
- Exact diagnostic: `45:36: type-mismatch: nz replacement cannot be a boolean`
- Construct: boolean nz() or boolean na state
- v4 rule: v4 permits boolean nz()/na state [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0692__oguzhandilber-PineScripts__Pmax.pine
- Source: https://github.com/oguzhandilber/PineScripts :: `Pmax.pine` @ `7762f0d1c333a09d8369f29d33fa0ebb1828a8f3`
- Declared Pine version: v4
- Prior verdict: invalid Pine
- Corrected verdict: **valid declared-version Pine; return to TealScript-gap**
- Exact diagnostic: `100:67: type-mismatch: plot linewidth must be a positive integer`
- Construct: plot linewidth=0
- v4 rule: v4 permits plot linewidth 0 [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0725__mihakralj-QuanTAlib__cointegration.pine
- Source: https://github.com/mihakralj/QuanTAlib :: `lib/statistics/cointegration/cointegration.pine` @ `031f1b5fe6ff2c7767549af5c34777f97dba916c`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `125:58: duplicate-argument: Argument 'color' for plot() was supplied multiple times`
- Construct: duplicate positional/named argument
- v6 rule: v6 rejects binding one function parameter more than once. [TradingView v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

## sources/0733__mihakralj-QuanTAlib__trim.pine
- Source: https://github.com/mihakralj/QuanTAlib :: `lib/statistics/trim/trim.pine` @ `467a8c1cefd5155f13af228581c042a3991256b6`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `24:9: type-mismatch: Cannot assign float value to int variable trimCount`
- Construct: incompatible typed assignment
- v6 rule: The declared version does not permit this narrowing or boolean-na assignment. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0736__deepentropy-lightweight-charts-indicators__SuperTrend-Relative-Volume-Kernel-Optimized-.pine
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_community/SuperTrend + Relative Volume (Kernel Optimized).pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `211:30: duplicate-argument: Argument 'column' for table.cell() was supplied multiple times`
- Construct: duplicate positional/named argument
- v6 rule: v6 rejects binding one function parameter more than once. [TradingView v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

## sources/0740__mihakralj-QuanTAlib__median.pine
- Source: https://github.com/mihakralj/QuanTAlib :: `lib/statistics/median/median.pine` @ `031f1b5fe6ff2c7767549af5c34777f97dba916c`
- Declared Pine version: v6
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `41:83: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Construct: plot linewidth=0
- v6 rule: v6 requires plot linewidth >= 1; this row declares v6. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0762__MinorLeopard-Indicator__Indicator-FalseRemovals-.pine
- Source: https://github.com/MinorLeopard/Indicator :: `Indicator(FalseRemovals).pine` @ `f6a7dddf0a09b2b932d0ab897f90b0df9b5cf0b7`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **valid declared-version Pine; return to TealScript-gap**
- Exact diagnostic: `298:34: type-mismatch: ta.valuewhen condition must be a boolean, got float`
- Construct: numeric ta.change(basis) as ta.valuewhen condition
- v5 rule: v5 implicitly casts numeric values to bool [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0772__milocaetano-quantick__delta_histogram.pine
- Source: https://github.com/milocaetano/quantick :: `crates/app/scripts/delta_histogram.pine` @ `6bd9dd86a50d7d2b67504a6729784ac94fe8e276`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `3:6: unknown-identifier: Unknown identifier: delta`
- Construct: invalid argument/type construct recorded by the runner
- v5 rule: The exact diagnostic identifies a construct rejected by the declared version; no v4/v5 migration exception applies. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0773__suyons-tradingview-indicators__02-rsi-signal.pine
- Source: https://github.com/suyons/tradingview-indicators :: `relative-strength-index/02-rsi-signal.pine` @ `fe3d061b99afc3dcc2400893e42f8dc3c7c414ad`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `44:19: unknown-identifier: Unknown identifier: buy`
- Construct: invalid argument/type construct recorded by the runner
- v5 rule: The exact diagnostic identifies a construct rejected by the declared version; no v4/v5 migration exception applies. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0780__deepentropy-lightweight-charts-indicators__Custom-Pattern-Detection.pine
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_community/Custom Pattern Detection.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `105:1: duplicate-symbol: Duplicate declaration: t`
- Construct: same-scope duplicate declaration
- v5 rule: v6 requires unique identifiers within a declaration scope. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0783__deepentropy-lightweight-charts-indicators__Order-Blocks-with-signals.pine
- Source: https://github.com/deepentropy/lightweight-charts-indicators :: `docs/official/indicators_community/Order Blocks with signals.pine` @ `7765e3a9b4ac847fe756abdf28f1dc14f7b8fad5`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `8:1: type-mismatch: Cannot assign float value to int variable sens`
- Construct: incompatible typed assignment
- v5 rule: The declared version does not permit this narrowing or boolean-na assignment. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0802__YooooungLee-clever-meme__.pine
- Source: https://github.com/YooooungLee/clever-meme :: `Quant-code/strategy/艾略特波浪理论.pine` @ `b7499d764e5086f9707cb56abfc734d7e0be0537`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **valid declared-version Pine; return to TealScript-gap**
- Exact diagnostic: `211:64: type-mismatch: Cannot assign na value to bool field fibL._break_`
- Construct: na assigned to a bool UDT field
- v5 rule: v5 permits boolean na fields [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0840__iamc1oud-Tradingview-Scripts__Smart-Money-Concept-with-Liquidity-Swings.pine
- Source: https://github.com/iamc1oud/Tradingview-Scripts :: `2025-Setup/Smart Money Concept with Liquidity Swings.pine` @ `b6563531a333bcfa8b52e497caed79be511c554d`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `871:1: duplicate-symbol: Duplicate declaration: lineStyle`
- Construct: same-scope duplicate declaration
- v5 rule: v6 requires unique identifiers within a declaration scope. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

## sources/0921__kankinku-AutoResearchFinance_v2__cand-b061508a.pine
- Source: https://github.com/kankinku/AutoResearchFinance_v2 :: `strategies/candidates/cand-b061508a.pine` @ `6da1522b63b1983e3362de697d5372673b03d4b4`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **valid declared-version Pine; return to TealScript-gap**
- Exact diagnostic: `219:49: type-mismatch: nz replacement cannot be a boolean`
- Construct: boolean nz() or boolean na state
- v5 rule: v5 permits boolean nz()/na state [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0938__Leci37-tuisku_Web_selling__WklfMTVNaW5fMVdBVnR1aXNrdTFkMWY2MDZk.pine
- Source: https://github.com/Leci37/tuisku_Web_selling :: `d_result/pine_TW_b/WklfMTVNaW5fMVdBVnR1aXNrdTFkMWY2MDZk.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `201:98: duplicate-argument: Argument 'color' for plot() was supplied multiple times`
- Construct: duplicate positional/named argument
- v5 rule: v6 rejects binding one function parameter more than once. [TradingView v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)

## sources/0952__chauhanvishaal-tv-indicators__Zone_Identifier.pine
- Source: https://github.com/chauhanvishaal/tv-indicators :: `Zone_Identifier.pine` @ `74778b3f18d8562666e1b17e880a420ab5d967c2`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `260:28: unknown-identifier: Unknown identifier: float`
- Construct: invalid argument/type construct recorded by the runner
- v5 rule: The exact diagnostic identifies a construct rejected by the declared version; no v4/v5 migration exception applies. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0955__hasnocool-tradingview-pine-scripts__BankNifty-5min-Supertrend-Based-Strategy.pine
- Source: https://github.com/hasnocool/tradingview-pine-scripts :: `BankNifty 5min Supertrend Based Strategy.pine` @ `e031cab2819a7d56fb8bb9d000252f51439986e2`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `55:102: type-mismatch: strategy.exit trailing stop requires trail_offset`
- Construct: invalid argument/type construct recorded by the runner
- v5 rule: The exact diagnostic identifies a construct rejected by the declared version; no v4/v5 migration exception applies. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0979__helenananaa-pine-compat-runtime__unsupported_table_set_position_values.pine
- Source: https://github.com/helenananaa/pine-compat-runtime :: `tests/fixtures/sema/unsupported_table_set_position_values.pine` @ `ad3ff56c67eb6a6dc8279746b5e43898be56716f`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `4:24: type-mismatch: Invalid table.set_position position: position.bad`
- Construct: invalid argument/type construct recorded by the runner
- v5 rule: The exact diagnostic identifies a construct rejected by the declared version; no v4/v5 migration exception applies. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/)

## sources/0997__grantj-re3-LingoLog__HashFunction.pine
- Source: https://github.com/grantj-re3/LingoLog :: `pine_script/Ideas/HashFunction.pine` @ `af5dd3a961a1123e7ff1bca4848107f5e5c34547`
- Declared Pine version: v5
- Prior verdict: invalid Pine
- Corrected verdict: **invalid Pine**
- Exact diagnostic: `16:9: type-mismatch: Cannot assign float value to int variable _iValue`
- Construct: incompatible typed assignment
- v5 rule: The declared version does not permit this narrowing or boolean-na assignment. [TradingView v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)

