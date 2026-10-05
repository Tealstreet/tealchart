# v7:114 whole-source capture v1

Exact source SHA256: `8cce3ee3075dc9216a15657e489c6dbd9c6963bd8836272ba9460567236604d0`. Use the accompanying file unchanged: preserve its version, title, inputs and plots; do not append diagnostic plots or wrap it.

Question: Does this exact indicator run or fail on the recorded chart? Record native error code, verbatim text, source location and actual Pine failure bar if exposed; no predicted result.

Selection: GitHub MarketProfile indicator reaches a loaded500ms loop error at line338; should-run candidate, with load sensitivity and unknown failure bar retained.

Chart: BINANCE:BTCUSDT,2-minute,standard candles,regular session,display timezoneEtc/UTC,exchange24x7,default source inputs. Record actual syminfo/mintick and subscription. Q comparison window: 2026-08-31T00:00:00Z through 2026-10-03T05:26:00Z inclusive,23924bars. Prefer the same loaded start/cutoff if available; otherwise record actual dataset first/last time and bar count. Do not fabricate matching history or modify the source to force it. Record realtime/BarReplay state and any unavailable historical cutoff.

Capture protocol:

1. Compile/apply the unchanged source. Attest source SHA and Settings Inputs/Style/Visibility. Record RUNS/COMPILE-ERROR/RUNTIME-ERROR without assuming success.
2. Save the run/error-state screenshot. For an error, transcribe exact native text/code/location and observed Pine bar/time; use null if not supplied. For RUNS, record loaded-history extent and end-of-data. Q observed errors, comparison-only: `[{"message": "Loop at line 338 exceeds the 500 ms execution time limit", "code": "runtime.error", "codeProvenance": "terminal.errors.code", "barIndex": null, "barProvenance": "UNAVAILABLE", "line": 338}]`. Q drawings retained:501; this is not a native expected count.
3. Export the actual whole-source CSV plus chart OHLCV/time. Preserve raw CSV headers/bytes. If the error or lack of exportable authored plots prevents export, record CSV_UNAVAILABLE with the UI reason; never supply a blank synthetic CSV.
4. For visual rows, save chart/DataWindow screenshots at the cutoff and representative earlier times; record displayed times, zoom, scale, source settings and drawing geometry/text/colors. For Q barcolor rows1145/583 capture painted and unpainted bars with their timestamps. CSV alone cannot settle those facets. Do not toggle defaults for the canonical attempt.
5. Save RESPONSE metadata tying attempt/source/input/context/error/screenshots/CSV SHA256. Native outputs remain UNSPECIFIED until returned evidence. Q uses a synthetic external provider; secondary symbols/timeframes require native context/companion input evidence before attributing a difference.

Q evidence: `/home/sam/cs/docs/tealscript-parity-archive/ledger/full-corpus-runtime-q-pj-v1/bin-07/rows/v7-114/TERMINAL-v1.json` SHA256`ec144f7377f0271804f1de53d78bb400830f25b9a0c3045de0ad8baa4abd2af7`; payload hash`c8a0948a3de5fb33810eec9e1f70a40d9211b64423b3433e7bb870d07f5fcdee`. Parent audit: Q-OUTCOMES-v1.json and PAYLOAD-FACETS-v1.json. No new engine preflight or runtime claim is supplied.

## Capture requirements v3

Attach viewport-context-witness-v30-tk-v1.pine immediately before and after this attempt on the SAME chart with unchanged horizontal range. Export LEFT_VISIBLE_MS and RIGHT_VISIBLE_MS and screenshot both endpoints. Any horizontal-range change creates a new attempt; dataset origin alone does not identify the consumed visible range.
