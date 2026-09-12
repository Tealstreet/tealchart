> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v4 Namespace Resolution Audit v1

The rerun's `unknown-function` diagnostic is not one implementation bucket.
Pine libraries are accessed through an alias namespace, while built-ins remain
available in their built-in namespaces. For a library alias that is also a
built-in namespace, TradingView resolves an exported library member first and
falls back to the built-in member when the library does not export that name.
An absent member in both sets remains an error.

The official v6 documentation defines built-in namespace members and imported
library aliases, but does not spell out the precedence sentence. The primary
evidence here is empirical: all five pinned sources are published TradingView
scripts that use these aliases and successfully use the unexported built-ins.
The observed rule is corroborated by [PyneCore's namespace-resolution
notes](https://pynecore.org/docs/advanced/ast-transformations/); the underlying
v6 surfaces are listed in the [v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)
and [library documentation](https://www.tradingview.com/pine-script-docs/concepts/libraries/).

## Dispatch Split

| Bucket | Rows | Correct diagnosis |
| --- | ---: | --- |
| Alias fallback to built-in | 5 | TealScript must search built-in `ta.*` after the imported `TradingView/ta` alias has no export |
| Direct built-in missing | 1 | `ta.sum` is used without an import and should be resolved as a v6 built-in |
| Imported library export | 3 | `ta.requestVolumeDelta` is an exported `TradingView/ta` library member and needs registry/export support |

## Alias Fallback Rows

| Row | Pinned source | Call | Expected v6 resolution |
| --- | --- | --- | --- |
| `0069` | `regalouisei/collect-tradingview` / `pinescript/editors_picks/asset-rotation-system-investorunknown.pine` @ `5847fd3b47540ddd107be02b8c658409d35660ae` | `ta.rsi(src, len)` after `import TradingView/ta/9` | Built-in `ta.rsi` |
| `0202` | `regalouisei/collect-tradingview` / `pinescript/trend_analysis/strategic-trend-filter.pine` @ `5847fd3b47540ddd107be02b8c658409d35660ae` | `ta.correlation(l, ohlc, len)` after `import TradingView/ta/12` | Built-in `ta.correlation` |
| `0226` | `deepentropy/oakscriptJS` / `docs/official/indicators_community/SuperTrend + Relative Volume (Kernel Optimized).pine` @ `d7bbd272e9ba6e12bb304a4c6d83d67f57afd2a0` | `ta.crossover(close, Pine_Supertrend)` after `import TradingView/ta/9 as ta` | Built-in `ta.crossover` |
| `0324` | `regalouisei/collect-tradingview` / `pinescript/trend_analysis/true-baseline-median-supertrend.pine` @ `5847fd3b47540ddd107be02b8c658409d35660ae` | `ta.tr(true)` after `import TradingView/ta/12` | Built-in `ta.tr()` |
| `0401` | `regalouisei/collect-tradingview` / `pinescript/volatility/true-baseline-median-supertrend.pine` @ `5847fd3b47540ddd107be02b8c658409d35660ae` | `ta.tr(true)` after `import TradingView/ta/12` | Built-in `ta.tr()` |

Minimal reproducer:

```pine
//@version=6
indicator("builtin fallback")
import TradingView/ta/9 as ta
plot(ta.rsi(close, 14))
plot(ta.crossover(close, ta.sma(close, 10)) ? close : na)
```

## Direct Built-in Row

`0084` (`AllienNova/CreditMaster-Pro-app` / `docs/strativion-autonomous-trading-package/implementations/pctt/research/Pivot-Constrained Trendline Trading (PCTT)/RG_Structure_Strategy_v2.pine` @ `cbf46a36313f124ce228b04f5a075ce034737720`) calls `ta.sum(math.abs(_s - _s[1]), _n)` and `ta.sum(cross ? 1 : 0, _n)` without a library import. This is a direct missing builtin surface, not an alias collision.

## Imported Export Rows

`0294`, `0300`, and `0394` import `TradingView/ta/8` and call
`ta.requestVolumeDelta(lowerTimeframe, anchorInput)`. The import now resolves,
but the exported member is not present in TealScript's supplied library
registry. These are library export gaps and must not be fixed by making the
built-in fallback map claim `requestVolumeDelta`.

| Row | Repo / path @ SHA |
| --- | --- |
| `0294` | `alighten-dev/Alighten` / `TradingView/Indicators/AlightenCVDRegressionBiasV0002.pine` @ `eadfefeac6a7da1513b3c39791a05f6599eb8cb0` |
| `0300` | `alighten-dev/Alighten` / `TradingView/Indicators/AlightenOrderflowPressureV0001.pine` @ `eadfefeac6a7da1513b3c39791a05f6599eb8cb0` |
| `0394` | `turnupdigital/riskmanager` / `Trend/CVD_Strategy_Export.pine` @ `479ea44f7bb3e14c9a0c01e7d8a0e3bc4c38e1e5` |
