# v56:850 whole-source capture v1

Exact source SHA256: `f8c06ed6ef58a6986b33002d67e08b96ab4b6206232132c32e969a21d2887efd`. Use the accompanying file unchanged: preserve its version, title, inputs and plots; do not append diagnostic plots or wrap it.

Question: Does this exact indicator run or fail on the recorded chart? Record native error code, verbatim text, source location and actual Pine failure bar if exposed; no predicted result.

Selection: GitHub v5 indicator reaches negative array index-1 at Qbar2558; capture distinguishes source error from engine indexing/state differences.

Chart: BINANCE:BTCUSDT,2-minute,standard candles,regular session,display timezoneEtc/UTC,exchange24x7,default source inputs. Record actual syminfo/mintick and subscription. Q comparison window: 2026-08-31T00:00:00Z through 2026-10-03T05:26:00Z inclusive,23924bars. Prefer the same loaded start/cutoff if available; otherwise record actual dataset first/last time and bar count. Do not fabricate matching history or modify the source to force it. Record realtime/BarReplay state and any unavailable historical cutoff.

Capture protocol:

1. Compile/apply the unchanged source. Attest source SHA and Settings Inputs/Style/Visibility. Record RUNS/COMPILE-ERROR/RUNTIME-ERROR without assuming success.
2. Save the run/error-state screenshot. For an error, transcribe exact native text/code/location and observed Pine bar/time; use null if not supplied. For RUNS, record loaded-history extent and end-of-data. Q observed errors, comparison-only: `[{"message": "Array index -1 is negative in this Pine version", "code": "runtime.error", "codeProvenance": "terminal.errors.raw.runtimeError.code", "barIndex": 2558, "barProvenance": "terminal.errors.raw.runtimeError.barIndex", "line": null}]`. Q drawings retained:0; this is not a native expected count.
3. Export the actual whole-source CSV plus chart OHLCV/time. Preserve raw CSV headers/bytes. If the error or lack of exportable authored plots prevents export, record CSV_UNAVAILABLE with the UI reason; never supply a blank synthetic CSV.
4. For visual rows, save chart/DataWindow screenshots at the cutoff and representative earlier times; record displayed times, zoom, scale, source settings and drawing geometry/text/colors. For Q barcolor rows1145/583 capture painted and unpainted bars with their timestamps. CSV alone cannot settle those facets. Do not toggle defaults for the canonical attempt.
5. Save RESPONSE metadata tying attempt/source/input/context/error/screenshots/CSV SHA256. Native outputs remain UNSPECIFIED until returned evidence. Q uses a synthetic external provider; secondary symbols/timeframes require native context/companion input evidence before attributing a difference.

Q evidence: `/home/sam/cs/docs/tealscript-parity-archive/ledger/full-corpus-runtime-q-pj-v1/bin-09/rows/v56-850/TERMINAL-v1.json` SHA256`461f652f9a0b5b1e61a1caecc63ad1feb209505932323d1fb6466892aa72caa8`; payload hash`e8958c3eab2b3c7165ea7065344694f39137ff1593f5ee61a144cc9b94d4b3c6`. Parent audit: Q-OUTCOMES-v1.json and PAYLOAD-FACETS-v1.json. No new engine preflight or runtime claim is supplied.
