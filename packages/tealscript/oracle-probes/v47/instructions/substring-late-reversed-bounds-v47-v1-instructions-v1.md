# v47 substring-late-reversed-bounds capture instructions v1

Question: Series bounds valid at INDEX0 then reversed at INDEX1: distinguish runtime refusal, swapped b, empty or other output.
Reference: https://www.tradingview.com/pine-script-reference/v6/#fun_str.substring, functions333. Native phase and values are UNSPECIFIED; candidate flags name alternatives, not expected answers.

Use BINANCE:BTCUSDT, 2-minute standard candles, regular session and Etc/UTC, with at least32 closed bars and no Bar Replay. Paste the exact source unchanged. Run this script independently; do not repair a refusal or combine it with another source.

If RUNS, export public CSV containing time/OHLCV and INDEX, CONTROL_CLOSE, TARGET_NA, TARGET_LENGTH, CANDIDATE_EMPTY, CANDIDATE_AB, CANDIDATE_SWAPPED_B. Save Data Window and Pine Logs screenshots and exact log text TARGET=[...]. Preserve raw numbers and missing cells. All-zero candidate flags require the actual text log; blank numeric output alone does not prove an empty string. Record exported INDEX origin/cutoff rather than using CSV row ordinal. Dynamic-bound scripts require actual INDEX0/1 or the earliest runtime refusal's bar/site; missing first rows stay UNOBSERVED. For time-default scripts retain CSV time, symbol exchange timezone, chart timezone and settings, so the current-time comparator has an exact source context.

If refused, record the full earliest compile/runtime diagnostic, code/site and executing bar if available, plus a screenshot and source SHA. A terminal error masks later outputs; do not infer a post-error result from prior rows. Capture valid-call-controls-v47-v1.pine separately to discriminate source refusal from UI or setup failure. Keep third outcomes and unavailable artifacts explicitly.

Return source-bound artifacts under v47/captures/v47/ as substring-late-reversed-bounds-v47-v1-attempt1.csv, -logs.txt and screenshots; summarize in RESPONSE-v47.md. No native output is inferred from local compilation.
