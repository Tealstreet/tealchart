> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Unknown-Argument Audit E147 V1

Measurement commit: `e147d42635fa2ee4f0b005883e5de471de6590f6`, pinned over the fixed v5 corpus. The current rerun contains 24 `unknown-argument` rows.

## Verdict Summary

| Construct | Rows | Verdict |
| --- | ---: | --- |
| v6 `plot(..., linewidth=0)` reported through `color.new()` | 16 | Invalid Pine under declared v6; not a TealScript gap |
| `strategy(initialCapital=...)` | 7 | Invalid Pine; the parameter is `initial_capital` |
| `table.cell(table_id=table, ...)` | 1 | Valid Pine; real TealScript named-argument binding gap |

Rules: v6 plot linewidth must be at least 1; strategy declaration uses the snake-case `initial_capital`; `table.cell()` exposes `table_id` as its first parameter and accepts named binding. [TradingView v6 migration guide](https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/) [TradingView strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/) [TradingView tables](https://www.tradingview.com/pine-script-docs/visuals/tables/)
## linewidth (16)

### sources/0070__mihakralj-pinescript__mae.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/errors/mae.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `43:66: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Evidence: line 43: `plot(error, "MAE", color.new(color.blue, 60, color=color.yellow, linewidth=2), linewidth = 2, style = plot.style_area)`
- Verdict: **invalid Pine**

### sources/0087__mihakralj-pinescript__rsquared.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/errors/rsquared.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `73:64: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Evidence: line 73: `plot(score, "R²", color.new(color.red, 60, color=color.yellow, linewidth=2), linewidth = 2, style = plot.style_area)`
- Verdict: **invalid Pine**

### sources/0257__mihakralj-pinescript__cummean.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/statistics/cummean.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `26:83: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Evidence: line 26: `plot(cummean_value, "CumMean", color=color.new(color.blue, 0, color=color.yellow, linewidth=2), linewidth=2)`
- Verdict: **invalid Pine**

### sources/0263__mihakralj-pinescript__iqr.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/statistics/iqr.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `65:83: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Evidence: line 65: `plot(iqr_value, title="IQR", color=color.new(color.yellow, 0, color=color.yellow, linewidth=2), linewidth=2)`
- Verdict: **invalid Pine**

### sources/0264__mihakralj-pinescript__jb.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/statistics/jb.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `72:92: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Evidence: line 72: `plot(jb_value, "Jarque-Bera Statistic", color=color.new(color.teal, 0, color=color.yellow, linewidth=2), linewidth=2)`
- Verdict: **invalid Pine**

### sources/0265__mihakralj-pinescript__kendall.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/statistics/kendall.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `61:90: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Evidence: line 61: `plot(kendall_value, "Kendall's Tau", color=color.new(color.yellow,0, color=color.yellow, linewidth=2), linewidth=2)`
- Verdict: **invalid Pine**

### sources/0269__mihakralj-pinescript__median.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/statistics/median.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `41:83: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Evidence: line 41: `plot(median_value, "Median", color=color.new(color.orange, 0, color=color.yellow, linewidth=2), linewidth=2)`
- Verdict: **invalid Pine**

### sources/0270__mihakralj-pinescript__mode.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/statistics/mode.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `43:78: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Evidence: line 43: `plot(mode_value, "Mode", color=color.new(color.green, 0, color=color.yellow, linewidth=2), linewidth=2)`
- Verdict: **invalid Pine**

### sources/0271__mihakralj-pinescript__percentile.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/statistics/percentile.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `59:91: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Evidence: line 59: `plot(percentile_value, "Percentile", color=color.new(color.yellow, 0, color=color.yellow, linewidth=2), linewidth=2)`
- Verdict: **invalid Pine**

### sources/0273__mihakralj-pinescript__quantile.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/statistics/quantile.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `54:93: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Evidence: line 54: `plot(quantile_value, title="Quantile", color=color.new(color.yellow, 0, color=color.yellow, linewidth=2), linewidth=2)`
- Verdict: **invalid Pine**

### sources/0275__mihakralj-pinescript__spearman.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/statistics/spearman.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `123:93: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Evidence: line 123: `plot(spearman_value, "Spearman's Rho", color=color.new(color.orange, 0, color=color.yellow, linewidth=2), linewidth=2)`
- Verdict: **invalid Pine**

### sources/0279__mihakralj-pinescript__theil.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/statistics/theil.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `47:89: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Evidence: line 47: `plot(theil_value, "Theil T Index", color=color.new(color.yellow, 0, color=color.yellow, linewidth=2), linewidth=2)`
- Verdict: **invalid Pine**

### sources/0381__mihakralj-pinescript__vr.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/volatility/vr.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `47:80: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Evidence: line 47: `plot(vrValue, title="VR", color=color.new(color.yellow, 0, color=color.yellow, linewidth=2), linewidth=2)`
- Verdict: **invalid Pine**

### sources/0382__mihakralj-pinescript__yzv.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/volatility/yzv.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `44:82: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Evidence: line 44: `plot(yzvValue, title="YZV", color=color.new(color.yellow, 0, color=color.yellow, linewidth=2), linewidth=2)`
- Verdict: **invalid Pine**

### sources/0384__mihakralj-pinescript__adosc.pine
- Repository: https://github.com/mihakralj/pinescript
- Source: `indicators/volume/adosc.pine` @ `c4e91b962be09733d8fc76caa5191e9e586c5cee`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `39:67: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Evidence: line 39: `plot(osc, "ADOSC", color.new(color.yellow, 0, color=color.yellow, linewidth=2), linewidth=2)`
- Verdict: **invalid Pine**

### sources/0740__mihakralj-QuanTAlib__median.pine
- Repository: https://github.com/mihakralj/QuanTAlib
- Source: `lib/statistics/median/median.pine` @ `031f1b5fe6ff2c7767549af5c34777f97dba916c`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `41:83: unknown-argument: Unknown argument 'linewidth' for color.new()`
- Evidence: line 41: `plot(median_value, "Median", color=color.new(color.orange, 0, color=color.yellow, linewidth=2), linewidth=2)`
- Verdict: **invalid Pine**

## initialCapital (7)

### sources/0640__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.0.pine
- Repository: https://github.com/knectardev/pine_scripts
- Source: `scripts/strategies/es-professional-fade-strategy/archive/es-professional-fade-strategy_v2.5.0.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `20:20: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Evidence: line 20: `initialCapital = 50000,`
- Verdict: **invalid Pine**

### sources/0641__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.1.pine
- Repository: https://github.com/knectardev/pine_scripts
- Source: `scripts/strategies/es-professional-fade-strategy/archive/es-professional-fade-strategy_v2.5.1.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `20:20: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Evidence: line 20: `initialCapital = 50000,`
- Verdict: **invalid Pine**

### sources/0642__knectardev-pine_scripts__es-professional-fade-strategy_v2.5.4_exec-gap.pine
- Repository: https://github.com/knectardev/pine_scripts
- Source: `scripts/strategies/es-professional-fade-strategy/archive/es-professional-fade-strategy_v2.5.4_exec-gap.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `20:20: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Evidence: line 20: `initialCapital = 50000,`
- Verdict: **invalid Pine**

### sources/0648__knectardev-pine_scripts__v2.5.6_v2.5.7.pine
- Repository: https://github.com/knectardev/pine_scripts
- Source: `scripts/strategies/es-professional-fade-strategy/es-professional-fade-strategy/v2.5.5/v2.5.6/archive/v2.5.6_v2.5.7.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `18:87: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Evidence: line 18: `"ES Professional Fade v2.5.4 (Execution Gap Modeled)", overlay=true, initialCapital=50000, defaultQtyValue=1, commissionType=strategy.commission.cash_per_contract, commissionValue=2.01)`
- Verdict: **invalid Pine**

### sources/0654__knectardev-pine_scripts__momentum-breakout-strategy_v1.0.0.pine
- Repository: https://github.com/knectardev/pine_scripts
- Source: `scripts/strategies/momentum-breakout-strategy/archive/momentum-breakout-strategy_v1.0.0.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `17:71: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Evidence: line 17: `strategy("Momentum Breakout v1.0.0", overlay = true, initialCapital = 25000)`
- Verdict: **invalid Pine**

### sources/0655__knectardev-pine_scripts__momentum-breakout-strategy_v1.1.0_volume-filter.pine
- Repository: https://github.com/knectardev/pine_scripts
- Source: `scripts/strategies/momentum-breakout-strategy/archive/momentum-breakout-strategy_v1.1.0_volume-filter.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `17:71: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Evidence: line 17: `strategy("Momentum Breakout v1.1.0", overlay = true, initialCapital = 25000)`
- Verdict: **invalid Pine**

### sources/0656__knectardev-pine_scripts__momentum-breakout-strategy.pine
- Repository: https://github.com/knectardev/pine_scripts
- Source: `scripts/strategies/momentum-breakout-strategy/momentum-breakout-strategy.pine` @ `187dc65e72f2c7f460c7162794468bdc1de6e966`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `16:71: unknown-argument: Unknown argument 'initialCapital' for strategy()`
- Evidence: line 16: `strategy("Momentum Breakout v1.2.0", overlay = true, initialCapital = 25000)`
- Verdict: **invalid Pine**

## table (1)

### sources/0948__g-moe-Trading-Indicators__lower-forecast.pine
- Repository: https://github.com/g-moe/Trading-Indicators
- Source: `Tradingview/lower-forecast.pine` @ `d7c3f5e9060fa7e461f4946713cc7a30f154a1e6`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `210:20: unknown-argument: Unknown argument 'table_id' for table.cell()`
- Evidence: line 210: `table.cell(table_id = table, column = 0, row = 0, text = "MOM: " + str.tostring(math.round(momentum,1)) +`
- Verdict: **real TealScript gap**

