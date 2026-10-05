# v56:1167 whole-source capture v1

Exact source SHA256: `a5267b3567803c2756410cee58eaec174cb84f112bb3444c1578f7b4438ba2c8`. Use the accompanying file unchanged: preserve its version, title, inputs and plots; do not append diagnostic plots or wrap it.

Question: Does this exact indicator run or fail on the recorded chart? Record native error code, verbatim text, source location and actual Pine failure bar if exposed; no predicted result.

Selection: Synthetic fixture requests matrix.pow(-1). A negative repetition is plausibly invalid, but the current reference does not explicitly state a nonnegative bound; staged as an uncertain policy discriminator, not a proven defect.

Chart: BINANCE:BTCUSDT,2-minute,standard candles,regular session,display timezoneEtc/UTC,exchange24x7,default source inputs. Record actual syminfo/mintick and subscription. Q comparison window: 2026-08-31T00:00:00Z through 2026-10-03T05:26:00Z inclusive,23924bars. Prefer the same loaded start/cutoff if available; otherwise record actual dataset first/last time and bar count. Do not fabricate matching history or modify the source to force it. Record realtime/BarReplay state and any unavailable historical cutoff.

Capture protocol:

1. Compile/apply the unchanged source. Attest source SHA and Settings Inputs/Style/Visibility. Record RUNS/COMPILE-ERROR/RUNTIME-ERROR without assuming success.
2. Save the run/error-state screenshot. For an error, transcribe exact native text/code/location and observed Pine bar/time; use null if not supplied. For RUNS, record loaded-history extent and end-of-data. Q observed errors, comparison-only: `[{"message": "Matrix power must be a non-negative integer", "code": "runtime.error", "codeProvenance": "terminal.errors.raw.runtimeError.code", "barIndex": 0, "barProvenance": "terminal.errors.raw.runtimeError.barIndex", "line": null}]`. Q drawings retained:0; this is not a native expected count.
3. Export the actual whole-source CSV plus chart OHLCV/time. Preserve raw CSV headers/bytes. If the error or lack of exportable authored plots prevents export, record CSV_UNAVAILABLE with the UI reason; never supply a blank synthetic CSV.
4. For visual rows, save chart/DataWindow screenshots at the cutoff and representative earlier times; record displayed times, zoom, scale, source settings and drawing geometry/text/colors. For Q barcolor rows1145/583 capture painted and unpainted bars with their timestamps. CSV alone cannot settle those facets. Do not toggle defaults for the canonical attempt.
5. Save RESPONSE metadata tying attempt/source/input/context/error/screenshots/CSV SHA256. Native outputs remain UNSPECIFIED until returned evidence. Q uses a synthetic external provider; secondary symbols/timeframes require native context/companion input evidence before attributing a difference.

Q evidence: `/home/sam/cs/docs/tealscript-parity-archive/ledger/full-corpus-runtime-q-pj-v1/bin-09/rows/v56-1167/TERMINAL-v1.json` SHA256`7b594033b3337b0bc86d7086eac4d1a5ad60b4cf17ae565bb0ca050781e1513a`; payload hash`5f0a22d0fd301b169a73c4a77863aff9cec9b4c532fbded35a9038b64311e0fc`. Parent audit: Q-OUTCOMES-v1.json and PAYLOAD-FACETS-v1.json. No new engine preflight or runtime claim is supplied.
