# V46 rising-clean-v6 capture v1

Run this indicator alone, unchanged, on BINANCE:BTCUSDT 2-minute standard candles, regular session, Etc/UTC, default inputs, no Bar Replay. Native outcomes are UNSPECIFIED. Record account/build/chart context. Retain source bytes and SHA256; do not repair a compiler/runtime refusal.

Export full-precision chart CSV with time/OHLCV and all 14 named plots. Export at least 64 closed bars spanning four PHASE cycles. Exclude live rows from historical adjudication. INDEX is Pine bar_index, not CSV ordinal; PHASE must equal INDEX modulo16. SRC must match the literal sequence below, including blank SRC when SRC_NA=1. If these controls fail, hold the instrument instead of scoring target values. Include initial INDEX=0..15 if accessible; otherwise mark INITIAL-WINDOW-UNAVAILABLE. Later complete cycles still discriminate the rule. Record origin/cutoff/count and retain Data Window screenshots for PHASE3,7,8,11 on a complete clean cycle, or PHASE5..12 on the hole source. Do not assume CSV blanks mean zero.

Literal phase sequence: [2, 4, 3, 8, 7, 9, 6, 10, 10, 11, 12, 13, 12, 11, 10, 9].

RISING_1/2/3 are native target flags. WINDOW_MODEL_N compares current source with the prior N nonmissing samples; ADJACENT_MODEL_N counts strictly increasing adjacent chart-bar transitions, retaining the run when either operand is missing and resetting on finite equality/decrease. They are candidate comparison models, not predicted native answers. Length1 is a control; length2/3 discriminate the models. Report model disagreement rows and any third outcome. For v5, RISING_N_NA distinguishes a missing native bool from the ternary's 0 flag. V6 bool has no missing value. Startup is a separate facet and must not be inferred from an unavailable INDEX0.

For compile refusal retain exact first text/code/line/column and screenshot; runtime refusal also first Pine index. For RUNS retain raw CSV/logs/hash and report source-bound outcomes at v46/captures/v46/RESPONSE-v46.md.
