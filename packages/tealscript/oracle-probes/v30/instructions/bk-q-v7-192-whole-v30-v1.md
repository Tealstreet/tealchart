# v7:192 whole-source capture v1

Exact source SHA256: `4cc408173d895ab14bfd29176f4ccafc58303eca3cf939e505b8ac816b0086c6`. Use the accompanying file unchanged: preserve its version, title, inputs and plots; do not append diagnostic plots or wrap it.

Question: Does this exact indicator run or fail on the recorded chart? Record native error code, verbatim text, source location and actual Pine failure bar if exposed; no predicted result.

Selection: Synthetic fixture passes explicit int(na) to matrix.remove_col. Explicit-NA versus omitted-index behavior cannot be inferred from finite-index bounds; staged as an uncertain policy discriminator, not a proven defect.

Chart: BINANCE:BTCUSDT,2-minute,standard candles,regular session,display timezoneEtc/UTC,exchange24x7,default source inputs. Record actual syminfo/mintick and subscription. Q comparison window: 2026-08-31T00:00:00Z through 2026-10-03T05:26:00Z inclusive,23924bars. Prefer the same loaded start/cutoff if available; otherwise record actual dataset first/last time and bar count. Do not fabricate matching history or modify the source to force it. Record realtime/BarReplay state and any unavailable historical cutoff.

Capture protocol:

1. Compile/apply the unchanged source. Attest source SHA and Settings Inputs/Style/Visibility. Record RUNS/COMPILE-ERROR/RUNTIME-ERROR without assuming success.
2. Save the run/error-state screenshot. For an error, transcribe exact native text/code/location and observed Pine bar/time; use null if not supplied. For RUNS, record loaded-history extent and end-of-data. Q observed errors, comparison-only: `[{"message": "Matrix column NaN is out of bounds. column count is 1", "code": "runtime.error", "codeProvenance": "terminal.errors.raw.runtimeError.code", "barIndex": 0, "barProvenance": "terminal.errors.raw.runtimeError.barIndex", "line": null}]`. Q drawings retained:0; this is not a native expected count.
3. Export the actual whole-source CSV plus chart OHLCV/time. Preserve raw CSV headers/bytes. If the error or lack of exportable authored plots prevents export, record CSV_UNAVAILABLE with the UI reason; never supply a blank synthetic CSV.
4. For visual rows, save chart/DataWindow screenshots at the cutoff and representative earlier times; record displayed times, zoom, scale, source settings and drawing geometry/text/colors. For Q barcolor rows1145/583 capture painted and unpainted bars with their timestamps. CSV alone cannot settle those facets. Do not toggle defaults for the canonical attempt.
5. Save RESPONSE metadata tying attempt/source/input/context/error/screenshots/CSV SHA256. Native outputs remain UNSPECIFIED until returned evidence. Q uses a synthetic external provider; secondary symbols/timeframes require native context/companion input evidence before attributing a difference.

Q evidence: `/home/sam/cs/docs/tealscript-parity-archive/ledger/full-corpus-runtime-q-pj-v1/bin-09/rows/v7-192/TERMINAL-v1.json` SHA256`fb46130a60b89b750969e6d5daf76e782e0e23b1c3dc4bfce5b63b8ff661c765`; payload hash`443a981767ca0aa3885916ec25e22150ae9fdd5df2c45a5dc808b5965d4a5d7c`. Parent audit: Q-OUTCOMES-v1.json and PAYLOAD-FACETS-v1.json. No new engine preflight or runtime claim is supplied.
