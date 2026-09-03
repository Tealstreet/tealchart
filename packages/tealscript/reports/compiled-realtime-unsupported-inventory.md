# Retired Compiled Realtime Safety-Gate Inventory

Generated after the compiled-only cutover to preserve the former product-path
`compiledRealtimeFallbacks` set. Source: `product-path-corpus.report.json` from
commit `c3c85702880841ba6bc3f85503e2e7bb809c9269`.

## Summary

- 45 old product-path rows selected compiled but actually ran interpreter on realtime updates before fallback deletion.
- All 45 rows appear in the current direct compiled realtime corpus denominator and report `matched` over 37 events.
- The product-worker safety gate also refused 8 composite scripts and 24 live-update events for the same stateful intrabar classes.
- That gate is now removed: the worker composite, external-corpus, and performance-composite realtime tests prove these rows execute as compiled and match fresh compiled reconstruction.
- This file is retained as the retired-gate inventory, not as an active unsupported list.

## Product-Path Rows

- `v1 sources/0023__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v1 sources/0024__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v1 sources/0025__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state
- `v1 sources/0026__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v1 sources/0027__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v1 sources/0028__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v1 sources/0029__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v1 sources/0030__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v1 sources/0032__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v1 sources/0033__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state
- `v1 sources/0036__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; persistent-collection-mutation
- `v1 sources/0037__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v1 sources/0038__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state
- `v1 sources/0039__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v1 sources/0045__eonfutures__Pinescript-Indicators.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v1 sources/0125__SENEMBERK__Indicators.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v1 sources/0164__traderdiegox__Tradingview-Indicators.pine` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v1 sources/0165__traderdiegox__Tradingview-Indicators.pine` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v1 sources/0198__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v1 sources/0199__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state
- `v1 sources/0201__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v1 sources/0202__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v1 sources/0203__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state
- `v1 sources/0205__ArunKBhaskar__PineScript.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v1 sources/0219__Alorse__pinescript-strategies.pine` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state
- `v2 sources/0006-Ahmed-GoCode-Quant-Edge-Indicators-Quant-Edge-Indicators_Smart_Money_Liquidity_Apex_Trend.pinescript` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v2 sources/0008-Ahmed-GoCode-Quant-Edge-Indicators-Quant-Edge-Indicators_Smart_Money_Liquidity_MSS_CHoCH_BOS.pinescript` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v2 sources/0013-anthonyspeicher-Trading-Scripts-highsLows.pine` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v2 sources/0025-henryoliver-pinescript-indicators-composite-breadth.pine` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v2 sources/0028-henryoliver-pinescript-indicators-hoi.pine` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v2 sources/0029-henryoliver-pinescript-indicators-ma-waves.pine` — compiled-worker-stateless-intrabar-reentry: history-with-intrabar-state; varip-declaration
- `v2 sources/0030-henryoliver-pinescript-indicators-macd-waves.pine` — compiled-worker-stateless-intrabar-reentry: history-with-intrabar-state; varip-declaration
- `v2 sources/0033-henryoliver-pinescript-indicators-pivots.pine` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v2 sources/0034-henryoliver-pinescript-indicators-quote-window.pine` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state
- `v2 sources/0038-henryoliver-pinescript-indicators-swings.pine` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v2 sources/0043-ictmentality-pinescript-indicators-helpers_RealHTFKey.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state
- `v2 sources/0054-ictmentality-pinescript-indicators-other_HTF_Key_Level_HTF_Key_Level_Engine_JAW_SwingHL_FVG_v2_dbgFVG_fixCounter_fixCutoff_emitOnClose.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v2 sources/0055-ictmentality-pinescript-indicators-other_HTF_Key_Level_HTF_Key_Level_Engine_JAW_SwingHL_FVG_v2_dbgFVG_fixCounter_fixCutoff.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v2 sources/0056-ictmentality-pinescript-indicators-other_HTF_Key_Level_HTF_Key_Level_Engine_JAW_SwingHL_FVG_v2_dbgFVG_fixCounter.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v2 sources/0057-ictmentality-pinescript-indicators-other_HTF_Key_Level_HTF_Key_Level_Engine_JAW_SwingHL_FVG_v2_dbgFVG_noDays_keep0-200_compileFix.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v2 sources/0065-ictmentality-pinescript-indicators-other_Swing_Key_Levels_Indicator1.txt` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state
- `v2 sources/0082-Mrshahidali420-ORB-Multi-Model-Indicator-ORB_Multi_Model_Indicator.pine` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v2 sources/0083-Mrshahidali420-ORB-Multi-Model-Indicator-ORB_Pro_Indicator.pine` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v2 sources/0084-Mrshahidali420-ORB-Multi-Model-Indicator-XAU_Pro_Indicator.pine` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `v2 sources/0097-xLUPOx-pinescript-indicators-src_trend_areas_indicator.pine` — compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation

## Worker Composite Rows

- `True Length MTF Confluence Dashboard` — collection-mutation; history-with-intrabar-state; persistent-collection-mutation; persistent-compound-mutation
- `True Length Structure Lifecycle` — collection-mutation; history-with-intrabar-state; persistent-collection-mutation; persistent-compound-mutation
- `True Length Volume Signal Matrix` — collection-mutation; persistent-collection-mutation; persistent-compound-mutation
- `Awkward Collections` — collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `Awkward Interleaved Drawings` — collection-mutation; history-with-intrabar-state; persistent-collection-mutation
- `dense computation composite` — collection-mutation; history-with-intrabar-state; persistent-collection-mutation; persistent-compound-mutation
- `drawing lifecycle composite` — collection-mutation; history-with-intrabar-state; persistent-collection-mutation; persistent-compound-mutation
- `request fanout composite` — collection-mutation; history-with-intrabar-state; persistent-collection-mutation; persistent-compound-mutation
