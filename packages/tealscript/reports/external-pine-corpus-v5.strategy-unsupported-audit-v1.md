> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Strategy Unsupported-Feature Audit V1

Measurement commit: `e147d42635fa2ee4f0b005883e5de471de6590f6`, pinned by git archive over the fixed v5 corpus. This audit covers all 66 rows classified with the new `unsupported-feature` semantic diagnostic.

These are **valid strategy declaration parameters**, not invalid Pine. They are genuine TealScript strategy-execution gaps: the checker currently refuses to promise fill-triggered recalculation or margin-call trace behavior without the corresponding execution model. They must not be counted as invalid Pine.

## Cause Summary

| Cause | Rows | Rule/status |
| --- | ---: | --- |
| `strategy calc_on_order_fills=true` | 3 | Valid v6 strategy declaration; execution semantics remain unsupported |
| `strategy margin_long=1000` | 62 | Valid v6 strategy declaration; execution semantics remain unsupported |
| `strategy margin_long=0` | 1 | Valid v6 strategy declaration; execution semantics remain unsupported |

Reference: [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/) documents `calc_on_order_fills` and margin parameters as strategy declaration controls.

## 1. strategy calc_on_order_fills=true (3)

### sources/0496__casoon-pine-scripts__wavetrend_base_strategy.pine
- Repository: https://github.com/casoon/pine-scripts
- Source path: `archive/strategies/wavetrend/wavetrend_base_strategy.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `24:28: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it`
- Exact construct: line 24: `calc_on_order_fills = true,`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0610__casoon-pine-scripts__vein_reversal_labeler_strategy.pine
- Repository: https://github.com/casoon/pine-scripts
- Source path: `strategies/vein_reversal_labeler/vein_reversal_labeler_strategy.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `23:28: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it`
- Exact construct: line 23: `calc_on_order_fills = true,`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0611__casoon-pine-scripts__wavetrend_v4_strategy.pine
- Repository: https://github.com/casoon/pine-scripts
- Source path: `strategies/wavetrend/wavetrend_v4_strategy.pine` @ `c0354de142e352b76a81622b273db032ea32a449`
- Declared Pine version: v6
- Stage: semantic
- Diagnostic: `24:28: unsupported-feature: strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it`
- Exact construct: line 24: `calc_on_order_fills = true,`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

## 2. strategy margin_long=1000 (62)

### sources/0797__Leci37-tuisku_Web_selling__WFJQVVNEVF8zME1pbl8yQlQwdHVpc2t1NWQxMTM1YTI.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/WFJQVVNEVF8zME1pbl8yQlQwdHVpc2t1NWQxMTM1YTI.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:74: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_XRPUSDT_30Min_2BT0_5d1135a2", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0799__Leci37-tuisku_Web_selling__TFlGVF8xSG91cl8xQk9MdHVpc2t1MjA4ZGZjNWI.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/TFlGVF8xSG91cl8xQk9MdHVpc2t1MjA4ZGZjNWI.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_LYFT_1Hour_1BOL_208dfc5b", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0800__Leci37-tuisku_Web_selling__VFdMT181TWluXzFBRFh0dWlza3VmNmQ4YmJhYw.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/VFdMT181TWluXzFBRFh0dWlza3VmNmQ4YmJhYw.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_TWLO_5Min_1ADX_f6d8bbac", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0860__Leci37-tuisku_Web_selling__VFdMT18xRGF5XzJCVjB0dWlza3U5YTlmNTgyYg.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/VFdMT18xRGF5XzJCVjB0dWlza3U5YTlmNTgyYg.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_TWLO_1Day_2BV0_9a9f582b", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0861__Leci37-tuisku_Web_selling__QUJOQl8xSG91cl8xU1FVdHVpc2t1MTY5YzhiNDY.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/QUJOQl8xSG91cl8xU1FVdHVpc2t1MTY5YzhiNDY.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_ABNB_1Hour_1SQU_169c8b46", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0862__Leci37-tuisku_Web_selling__TlZTVF8zME1pbl8xU1FVdHVpc2t1ZjIyMTBiMmY.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/TlZTVF8zME1pbl8xU1FVdHVpc2t1ZjIyMTBiMmY.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_NVST_30Min_1SQU_f2210b2f", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0863__Leci37-tuisku_Web_selling__R1RMQl8zME1pbl8yVFYwdHVpc2t1ZWFiYzljNTg.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/R1RMQl8zME1pbl8yVFYwdHVpc2t1ZWFiYzljNTg.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_GTLB_30Min_2TV0_eabc9c58", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0867__Leci37-tuisku_Web_selling__WklfMUhvdXJfMk1TMHR1aXNrdTNjYTFjMjNj.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/WklfMUhvdXJfMk1TMHR1aXNrdTNjYTFjMjNj.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:69: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_ZI_1Hour_2MS0_3ca1c23c", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0868__Leci37-tuisku_Web_selling__TklPXzFIb3VyXzJCQjB0dWlza3U2NWJkMTgyNw.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/TklPXzFIb3VyXzJCQjB0dWlza3U2NWJkMTgyNw.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_NIO_1Hour_2BB0_65bd1827", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0869__Leci37-tuisku_Web_selling__TUVUQV8xRGF5XzJNVDB0dWlza3U3Yjc0MDMzMg.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/TUVUQV8xRGF5XzJNVDB0dWlza3U3Yjc0MDMzMg.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_META_1Day_2MT0_7b740332", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0870__Leci37-tuisku_Web_selling__QVBQU18xRGF5XzJDTTB0dWlza3UwNDA3ZjE2Mg.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/QVBQU18xRGF5XzJDTTB0dWlza3UwNDA3ZjE2Mg.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_APPS_1Day_2CM0_0407f162", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0871__Leci37-tuisku_Web_selling__UUNPTV8xRGF5XzJDTTB0dWlza3VkYmEwMzFjZQ.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/UUNPTV8xRGF5XzJDTTB0dWlza3VkYmEwMzFjZQ.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_QCOM_1Day_2CM0_dba031ce", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0872__Leci37-tuisku_Web_selling__TklPXzFIb3VyXzJTVDB0dWlza3U0NWJjOTVmMw.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/TklPXzFIb3VyXzJTVDB0dWlza3U0NWJjOTVmMw.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_NIO_1Hour_2ST0_45bc95f3", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0873__Leci37-tuisku_Web_selling__QkFCQV8xSG91cl8yQkMwdHVpc2t1NzJmZDkzM2E.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/QkFCQV8xSG91cl8yQkMwdHVpc2t1NzJmZDkzM2E.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_BABA_1Hour_2BC0_72fd933a", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0874__Leci37-tuisku_Web_selling__RE9DTl8zME1pbl8yQkMwdHVpc2t1MmNkNjUwMjg.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/RE9DTl8zME1pbl8yQkMwdHVpc2t1MmNkNjUwMjg.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_DOCN_30Min_2BC0_2cd65028", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0875__Leci37-tuisku_Web_selling__UUNPTV8xSG91cl8yQ1MwdHVpc2t1NWZiNDJjMGQ.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/UUNPTV8xSG91cl8yQ1MwdHVpc2t1NWZiNDJjMGQ.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_QCOM_1Hour_2CS0_5fb42c0d", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0877__Leci37-tuisku_Web_selling__RE9UVVNEVF8xRGF5XzJDVDB0dWlza3ViZjI3ODRmZQ.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/RE9UVVNEVF8xRGF5XzJDVDB0dWlza3ViZjI3ODRmZQ.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:73: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_DOTUSDT_1Day_2CT0_bf2784fe", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0878__Leci37-tuisku_Web_selling__REJYXzMwTWluXzJCQjB0dWlza3U2N2FiNTFhZg.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/REJYXzMwTWluXzJCQjB0dWlza3U2N2FiNTFhZg.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_DBX_30Min_2BB0_67ab51af", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0879__Leci37-tuisku_Web_selling__QlRDVVNEVF8xSG91cl8yQlQwdHVpc2t1NWQ4ZDMzOTg.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/QlRDVVNEVF8xSG91cl8yQlQwdHVpc2t1NWQ4ZDMzOTg.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:74: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_BTCUSDT_1Hour_2BT0_5d8d3398", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0881__Leci37-tuisku_Web_selling__QUZSTV8zME1pbl8yTU0wdHVpc2t1MWFlYjg0MjE.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/QUZSTV8zME1pbl8yTU0wdHVpc2t1MWFlYjg0MjE.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_AFRM_30Min_2MM0_1aeb8421", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0882__Leci37-tuisku_Web_selling__WklfMURheV8xTTAwdHVpc2t1ZDkyNTRjMDY.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/WklfMURheV8xTTAwdHVpc2t1ZDkyNTRjMDY.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:68: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_ZI_1Day_1M00_d9254c06", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0883__Leci37-tuisku_Web_selling__TFlGVF8xRGF5XzFDMDB0dWlza3VmZWU2N2EyZg.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/TFlGVF8xRGF5XzFDMDB0dWlza3VmZWU2N2EyZg.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_LYFT_1Day_1C00_fee67a2f", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0884__Leci37-tuisku_Web_selling__U09MVVNEVF8xRGF5XzFTMDB0dWlza3VjODcyNGM0ZQ.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/U09MVVNEVF8xRGF5XzFTMDB0dWlza3VjODcyNGM0ZQ.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:73: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_SOLUSDT_1Day_1S00_c8724c4e", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0885__Leci37-tuisku_Web_selling__Q1JXRF8xTWluXzJCTTB0dWlza3VhNWUwZTg2ZQ.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/Q1JXRF8xTWluXzJCTTB0dWlza3VhNWUwZTg2ZQ.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_CRWD_1Min_2BM0_a5e0e86e", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0886__Leci37-tuisku_Web_selling__TlZEQV81TWluXzJCQjB0dWlza3U4MTM1ZDFkMQ.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/TlZEQV81TWluXzJCQjB0dWlza3U4MTM1ZDFkMQ.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_NVDA_5Min_2BB0_8135d1d1", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0887__Leci37-tuisku_Web_selling__RE9DTl8xSG91cl8xVDAwdHVpc2t1ZjQ5ODI1ZTk.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/RE9DTl8xSG91cl8xVDAwdHVpc2t1ZjQ5ODI1ZTk.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_DOCN_1Hour_1T00_f49825e9", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0888__Leci37-tuisku_Web_selling__TURCXzMwTWluXzFJQ0h0dWlza3UxMzcxYTg5Yw.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/TURCXzMwTWluXzFJQ0h0dWlza3UxMzcxYTg5Yw.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_MDB_30Min_1ICH_1371a89c", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0889__Leci37-tuisku_Web_selling__QUFQTF8xRGF5XzFJQ0h0dWlza3UwNmVjZjgwZQ.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/QUFQTF8xRGF5XzFJQ0h0dWlza3UwNmVjZjgwZQ.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_AAPL_1Day_1ICH_06ecf80e", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0890__Leci37-tuisku_Web_selling__TklPXzFIb3VyXzFJQ0h0dWlza3U2ZjJhZDcwMA.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/TklPXzFIb3VyXzFJQ0h0dWlza3U2ZjJhZDcwMA.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_NIO_1Hour_1ICH_6f2ad700", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0891__Leci37-tuisku_Web_selling__UFlQTF8xSG91cl8xSUNIdHVpc2t1NTgxNDI4YTI.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/UFlQTF8xSG91cl8xSUNIdHVpc2t1NTgxNDI4YTI.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_PYPL_1Hour_1ICH_581428a2", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0892__Leci37-tuisku_Web_selling__VU5JVVNEVF8xRGF5XzFTVVB0dWlza3UwNWFkODQyYw.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/VU5JVVNEVF8xRGF5XzFTVVB0dWlza3UwNWFkODQyYw.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:73: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_UNIUSDT_1Day_1SUP_05ad842c", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0893__Leci37-tuisku_Web_selling__QURTS18xRGF5XzFDQU50dWlza3UzOTYzNTAyYg.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/QURTS18xRGF5XzFDQU50dWlza3UzOTYzNTAyYg.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_ADSK_1Day_1CAN_3963502b", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0896__Leci37-tuisku_Web_selling__R1RMQl8zME1pbl8xVUxUdHVpc2t1ZjQzYzdhMDU.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/R1RMQl8zME1pbl8xVUxUdHVpc2t1ZjQzYzdhMDU.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_GTLB_30Min_1ULT_f43c7a05", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0898__Leci37-tuisku_Web_selling__RE9DTl8xSG91cl8xTTAwdHVpc2t1NzI2OWUxOTk.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/RE9DTl8xSG91cl8xTTAwdHVpc2t1NzI2OWUxOTk.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_DOCN_1Hour_1M00_7269e199", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0913__Leci37-tuisku_Web_selling__UkJMWF8zME1pbl8xVUxUdHVpc2t1NmI2YmE0OGI.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/UkJMWF8zME1pbl8xVUxUdHVpc2t1NmI2YmE0OGI.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_RBLX_30Min_1ULT_6b6ba48b", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0914__Leci37-tuisku_Web_selling__Q1JTUl8xSG91cl8xQk9MdHVpc2t1N2Y2N2EwMzc.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/Q1JTUl8xSG91cl8xQk9MdHVpc2t1N2Y2N2EwMzc.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_CRSR_1Hour_1BOL_7f67a037", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0915__Leci37-tuisku_Web_selling__QUJOQl81TWluXzFNQUR0dWlza3ViMDg2N2E1Yg.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/QUJOQl81TWluXzFNQUR0dWlza3ViMDg2N2E1Yg.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_ABNB_5Min_1MAD_b0867a5b", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0917__Leci37-tuisku_Web_selling__Q1JXRF8xNU1pbl8xS09OdHVpc2t1YjRmMDVmZDA.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/Q1JXRF8xNU1pbl8xS09OdHVpc2t1YjRmMDVmZDA.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_CRWD_15Min_1KON_b4f05fd0", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0918__Leci37-tuisku_Web_selling__UUNPTV8xNU1pbl8xSUNIdHVpc2t1MGFlYzM3MzI.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/UUNPTV8xNU1pbl8xSUNIdHVpc2t1MGFlYzM3MzI.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_QCOM_15Min_1ICH_0aec3732", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0937__Leci37-tuisku_Web_selling__VV8xTWluXzJNUzB0dWlza3VhMTUzNWNjZQ.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/VV8xTWluXzJNUzB0dWlza3VhMTUzNWNjZQ.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:67: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_U_1Min_2MS0_a1535cce", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0938__Leci37-tuisku_Web_selling__WklfMTVNaW5fMVdBVnR1aXNrdTFkMWY2MDZk.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/WklfMTVNaW5fMVdBVnR1aXNrdTFkMWY2MDZk.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:69: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_ZI_15Min_1WAV_1d1f606d", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0956__Leci37-tuisku_Web_selling__RVRTWV81TWluXzJNVjB0dWlza3U4YzhjZjVkOQ.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/RVRTWV81TWluXzJNVjB0dWlza3U4YzhjZjVkOQ.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_ETSY_5Min_2MV0_8c8cf5d9", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0957__Leci37-tuisku_Web_selling__R09PR18xRGF5XzJTVjB0dWlza3U0ZmUyMmFhOQ.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/R09PR18xRGF5XzJTVjB0dWlza3U0ZmUyMmFhOQ.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_GOOG_1Day_2SV0_4fe22aa9", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0958__Leci37-tuisku_Web_selling__R1RMQl8xSG91cl8yQlYwdHVpc2t1ODdjYzY4Y2Q.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/R1RMQl8xSG91cl8yQlYwdHVpc2t1ODdjYzY4Y2Q.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_GTLB_1Hour_2BV0_87cc68cd", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0959__Leci37-tuisku_Web_selling__TUVMSV8xSG91cl8yQ1YwdHVpc2t1YjllMzVjMGI.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/TUVMSV8xSG91cl8yQ1YwdHVpc2t1YjllMzVjMGI.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_MELI_1Hour_2CV0_b9e35c0b", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0960__Leci37-tuisku_Web_selling__TlZTVF8zME1pbl8yTVYwdHVpc2t1NGNlNjk1NTg.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/TlZTVF8zME1pbl8yTVYwdHVpc2t1NGNlNjk1NTg.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_NVST_30Min_2MV0_4ce69558", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0961__Leci37-tuisku_Web_selling__RkZJVl8zME1pbl8yQ1YwdHVpc2t1ZGZmODViYjI.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/RkZJVl8zME1pbl8yQ1YwdHVpc2t1ZGZmODViYjI.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_FFIV_30Min_2CV0_dff85bb2", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0962__Leci37-tuisku_Web_selling__U09MVVNEVF8zME1pbl8yVFYwdHVpc2t1OWI5MzEzMjU.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/U09MVVNEVF8zME1pbl8yVFYwdHVpc2t1OWI5MzEzMjU.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:74: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_SOLUSDT_30Min_2TV0_9b931325", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0963__Leci37-tuisku_Web_selling__TUVUQV8xRGF5XzJCQzB0dWlza3VjOTBiZjhhNw.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/TUVUQV8xRGF5XzJCQzB0dWlza3VjOTBiZjhhNw.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_META_1Day_2BC0_c90bf8a7", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0964__Leci37-tuisku_Web_selling__U1BPVF8zME1pbl8yQlQwdHVpc2t1MTI0NDU1ZTA.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/U1BPVF8zME1pbl8yQlQwdHVpc2t1MTI0NDU1ZTA.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_SPOT_30Min_2BT0_124455e0", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0965__Leci37-tuisku_Web_selling__UElOU18xSG91cl8yQ1QwdHVpc2t1ZWVlNjIyNGM.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/UElOU18xSG91cl8yQ1QwdHVpc2t1ZWVlNjIyNGM.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_PINS_1Hour_2CT0_eee6224c", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0966__Leci37-tuisku_Web_selling__RVRIVVNEVF8xSG91cl8yTVMwdHVpc2t1NDg2ODBhYWI.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/RVRIVVNEVF8xSG91cl8yTVMwdHVpc2t1NDg2ODBhYWI.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:74: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_ETHUSDT_1Hour_2MS0_48680aab", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0967__Leci37-tuisku_Web_selling__RVRIVVNEVF8xNU1pbl8yQkIwdHVpc2t1NWIwNDQwOTU.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/RVRIVVNEVF8xNU1pbl8yQkIwdHVpc2t1NWIwNDQwOTU.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:74: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_ETHUSDT_15Min_2BB0_5b044095", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0968__Leci37-tuisku_Web_selling__Q1JXRF8xRGF5XzFGSUJ0dWlza3VlOWZkMDEwMQ.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/Q1JXRF8xRGF5XzFGSUJ0dWlza3VlOWZkMDEwMQ.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_CRWD_1Day_1FIB_e9fd0101", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0969__Leci37-tuisku_Web_selling__WFJQVVNEVF8xRGF5XzFCMDB0dWlza3U3YWM4ZWEzZA.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/WFJQVVNEVF8xRGF5XzFCMDB0dWlza3U3YWM4ZWEzZA.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:73: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_XRPUSDT_1Day_1B00_7ac8ea3d", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0970__Leci37-tuisku_Web_selling__VVBTVF8xSG91cl8xRklCdHVpc2t1NDRmNjk4ZDM.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/VVBTVF8xSG91cl8xRklCdHVpc2t1NDRmNjk4ZDM.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_UPST_1Hour_1FIB_44f698d3", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0971__Leci37-tuisku_Web_selling__QVZBWFVTRFRfMUhvdXJfMVQwMHR1aXNrdWI4OTJjYTBi.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/QVZBWFVTRFRfMUhvdXJfMVQwMHR1aXNrdWI4OTJjYTBi.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:75: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_AVAXUSDT_1Hour_1T00_b892ca0b", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0972__Leci37-tuisku_Web_selling__WklfMURheV8xTUFEdHVpc2t1M2ZmMDkzNmU.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/WklfMURheV8xTUFEdHVpc2t1M2ZmMDkzNmU.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:68: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_ZI_1Day_1MAD_3ff0936e", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0973__Leci37-tuisku_Web_selling__QU1aTl8xSG91cl8xU1VQdHVpc2t1NDRjYTFiZWU.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/QU1aTl8xSG91cl8xU1VQdHVpc2t1NDRjYTFiZWU.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_AMZN_1Hour_1SUP_44ca1bee", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0974__Leci37-tuisku_Web_selling__RkZJVl8xSG91cl8xU1VQdHVpc2t1NWUxZmM5YWI.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/RkZJVl8xSG91cl8xU1VQdHVpc2t1NWUxZmM5YWI.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_FFIV_1Hour_1SUP_5e1fc9ab", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0975__Leci37-tuisku_Web_selling__TFlGVF8xSG91cl8xQURYdHVpc2t1ZmYzYzU3Yjk.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/TFlGVF8xSG91cl8xQURYdHVpc2t1ZmYzYzU3Yjk.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:71: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_LYFT_1Hour_1ADX_ff3c57b9", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

### sources/0976__Leci37-tuisku_Web_selling__QVNBTl81TWluXzFNMDB0dWlza3UzYThkMmFkMw.pine
- Repository: https://github.com/Leci37/tuisku_Web_selling
- Source path: `d_result/pine_TW_b/QVNBTl81TWluXzFNMDB0dWlza3UzYThkMmFkMw.pine` @ `b5b8edf74680334ab3a79348992c810ffd76579e`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `8:70: unsupported-feature: strategy margin_long=1000 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 8: `strategy("Tuisku_ASAN_5Min_1M00_3a8d2ad3", overlay=true, margin_long=1000, margin_short=1000, pyramiding=1)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

## 3. strategy margin_long=0 (1)

### sources/0865__hasnocool-tradingview-pine-scripts__John-F.-Ehlers-Center-Of-Gravity-Balanced-by-DM-.pine
- Repository: https://github.com/hasnocool/tradingview-pine-scripts
- Source path: `John F. Ehlers Center Of Gravity Balanced by [DM].pine` @ `e031cab2819a7d56fb8bb9d000252f51439986e2`
- Declared Pine version: v5
- Stage: semantic
- Diagnostic: `14:49: unsupported-feature: strategy margin_long=0 requires TradingView margin-call trace parity before TealScript can simulate it`
- Exact construct: line 14: `process_orders_on_close=true, margin_long=0, margin_short=0)`
- Verdict: valid Pine; TealScript strategy execution gap
- Rule: v6 permits the declaration parameter; matching fill/margin execution traces require strategy runtime support. [TradingView strategy concepts](https://www.tradingview.com/pine-script-docs/concepts/strategies/)

