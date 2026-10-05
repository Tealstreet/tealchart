# v7:115 whole-source capture v1

Exact source SHA256: `d282785464579d4d56b5f87d2ebb0e7d54242a0a02f0e7f5e41a8555d2faddd7`. Use the accompanying file unchanged: preserve its version, title, inputs and plots; do not append diagnostic plots or wrap it.

Question: Does this exact indicator run or fail on the recorded chart? Record native error code, verbatim text, source location and actual Pine failure bar if exposed; no predicted result.

Selection: GitHub Market Profile indicator reaches the100000 array cap at Qbar928. Native may also refuse; capture separates valid size policy from possible engine growth differences.

Chart: BINANCE:BTCUSDT,2-minute,standard candles,regular session,display timezoneEtc/UTC,exchange24x7,default source inputs. Record actual syminfo/mintick and subscription. Q comparison window: 2026-08-31T00:00:00Z through 2026-10-03T05:26:00Z inclusive,23924bars. Prefer the same loaded start/cutoff if available; otherwise record actual dataset first/last time and bar count. Do not fabricate matching history or modify the source to force it. Record realtime/BarReplay state and any unavailable historical cutoff.

Capture protocol:

1. Compile/apply the unchanged source. Attest source SHA and Settings Inputs/Style/Visibility. Record RUNS/COMPILE-ERROR/RUNTIME-ERROR without assuming success.
2. Save the run/error-state screenshot. For an error, transcribe exact native text/code/location and observed Pine bar/time; use null if not supplied. For RUNS, record loaded-history extent and end-of-data. Q observed errors, comparison-only: `[{"message": "Array is too large. Maximum size is 100000", "code": "runtime.error", "codeProvenance": "terminal.errors.raw.runtimeError.code", "barIndex": 928, "barProvenance": "terminal.errors.raw.runtimeError.barIndex", "line": null}]`. Q drawings retained:508; this is not a native expected count.
3. Export the actual whole-source CSV plus chart OHLCV/time. Preserve raw CSV headers/bytes. If the error or lack of exportable authored plots prevents export, record CSV_UNAVAILABLE with the UI reason; never supply a blank synthetic CSV.
4. For visual rows, save chart/DataWindow screenshots at the cutoff and representative earlier times; record displayed times, zoom, scale, source settings and drawing geometry/text/colors. For Q barcolor rows1145/583 capture painted and unpainted bars with their timestamps. CSV alone cannot settle those facets. Do not toggle defaults for the canonical attempt.
5. Save RESPONSE metadata tying attempt/source/input/context/error/screenshots/CSV SHA256. Native outputs remain UNSPECIFIED until returned evidence. Q uses a synthetic external provider; secondary symbols/timeframes require native context/companion input evidence before attributing a difference.

Q evidence: `/home/sam/cs/docs/tealscript-parity-archive/ledger/full-corpus-runtime-q-pj-v1/bin-08/rows/v7-115/TERMINAL-v1.json` SHA256`1d6e6f936b11c2e29302bccdaa1209a05f9342785a6c14b9617295b758acf2de`; payload hash`062fdfc584b31c6366e782ec798f908b09e5441b2c92777c95df3f0af779df36`. Parent audit: Q-OUTCOMES-v1.json and PAYLOAD-FACETS-v1.json. No new engine preflight or runtime claim is supplied.

## Capture requirements v3

Attach viewport-context-witness-v30-tk-v1.pine immediately before and after this attempt on the SAME chart with unchanged horizontal range. Export LEFT_VISIBLE_MS and RIGHT_VISIBLE_MS and screenshot both endpoints. Any horizontal-range change creates a new attempt; dataset origin alone does not identify the consumed visible range.
