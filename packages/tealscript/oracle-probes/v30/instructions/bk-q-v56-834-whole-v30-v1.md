# v56:834 whole-source capture v1

Exact source SHA256: `7dce5ed3826bce8619f5bbdbe799b9801e5b7d280a97199515bc1f9bd0a1735e`. Use the accompanying file unchanged: preserve its version, title, inputs and plots; do not append diagnostic plots or wrap it.

Question: Does this exact indicator run on the recorded chart, and does its drawings/barcolor payload match the source-defined output despite missing generic plot values?

Selection: Drawings or dataset-dependent outputs retained; no whole-source native adjudication.

Chart: BINANCE:BTCUSDT,2-minute,standard candles,regular session,display timezoneEtc/UTC,exchange24x7,default source inputs. Record actual syminfo/mintick and subscription. Q comparison window: 2026-08-31T00:00:00Z through 2026-10-03T05:26:00Z inclusive,23924bars. Prefer the same loaded start/cutoff if available; otherwise record actual dataset first/last time and bar count. Do not fabricate matching history or modify the source to force it. Record realtime/BarReplay state and any unavailable historical cutoff.

Capture protocol:

1. Compile/apply the unchanged source. Attest source SHA and Settings Inputs/Style/Visibility. Record RUNS/COMPILE-ERROR/RUNTIME-ERROR without assuming success.
2. Save the run/error-state screenshot. For an error, transcribe exact native text/code/location and observed Pine bar/time; use null if not supplied. For RUNS, record loaded-history extent and end-of-data. Q observed errors, comparison-only: `[]`. Q drawings retained:102; this is not a native expected count.
3. Export the actual whole-source CSV plus chart OHLCV/time. Preserve raw CSV headers/bytes. If the error or lack of exportable authored plots prevents export, record CSV_UNAVAILABLE with the UI reason; never supply a blank synthetic CSV.
4. For visual rows, save chart/DataWindow screenshots at the cutoff and representative earlier times; record displayed times, zoom, scale, source settings and drawing geometry/text/colors. For Q barcolor rows1145/583 capture painted and unpainted bars with their timestamps. CSV alone cannot settle those facets. Do not toggle defaults for the canonical attempt.
5. Save RESPONSE metadata tying attempt/source/input/context/error/screenshots/CSV SHA256. Native outputs remain UNSPECIFIED until returned evidence. Q uses a synthetic external provider; secondary symbols/timeframes require native context/companion input evidence before attributing a difference.

Q evidence: `/home/sam/cs/docs/tealscript-parity-archive/ledger/full-corpus-runtime-q-pj-v1/bin-07/rows/v56-834/TERMINAL-v1.json` SHA256`0d8f4de229d613a7997dc2ccf776b9dbb5c60667cfaa98e88e41cd58b8c13461`; payload hash`035a8c65ff9a35a0aed1949a50935f5a56fb6d302077bb1a0574754b6685deb8`. Parent audit: Q-OUTCOMES-v1.json and PAYLOAD-FACETS-v1.json. No new engine preflight or runtime claim is supplied.
