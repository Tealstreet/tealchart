# TradingView capture handoff v1

Checkpoint requested by Sam on 2026-10-04. Primary native receipts are available through v8, with v9 partly captured. This file describes the evidence available for the other machine's A/B work and the precise continuation point. Raw CSVs, native logs, diagnostic screenshots and versioned replies are committed alongside the handoffs. No Pine source, frozen manifest, prediction, engine or baseline was repaired or changed by this capture task.

## Available evidence

Counts describe source registrations with native receipts, including explicitly verified reuse. They do not certify every visual, provider, realtime or library-import context. Each response documents its limits.

| Bundle | Primary source coverage | Recorded attempts | Response and evidence entry point |
|---|---:|---:|---|
| Original round | 9/9: eight CSVs and one runtime refusal | See manifest | [Capture README v1](captures/v1/README-v1.md), [manifest](captures/v1/manifest-v1.json) |
| v2 | 52/52: 43 RUNS, seven COMPILE-ERROR, two RUNTIME-ERROR | See outcomes | [Response v3](v2/RESPONSE-v3.md) |
| v3 | 111/111: 51 RUNS, 28 COMPILE-ERROR, 32 RUNTIME-ERROR | 112 | [Response v5](v3/RESPONSE-v5.md) |
| v4 | 75/75 active sources; one frozen source superseded | 103 | [Response v8](v4/captures/v4/RESPONSE-v8.md) |
| v5 | 130/130 | 169 | [Response v9](v5/captures/v5/RESPONSE-v9.md) |
| v6 | 18/18 | 20 | [Response v1](v6/captures/v6/RESPONSE-v1.md) |
| v7 | 215/215: 160 RUNS, 20 RUNTIME-ERROR, 34 COMPILE-ERROR, one COMPILE-ACCEPTED library | 395 | [Response v32](v7/captures/v7/RESPONSE-v32.md) |
| v8 | 33/33: 28 RUNS, two RUNTIME-ERROR, three COMPILE-ERROR | 71 | [Response v5](v8/captures/v8/RESPONSE-v5.md) |
| v9 | 19/95: 12 RUNS, seven COMPILE-ERROR; seven registrations reuse v8 receipts | 28, plus one separate collector receipt | [Response v11](v9/captures/v9/RESPONSE-v11.md) |
| v10 | No captures in this checkpoint | — | [Handoff](v10/HANDOFF-v10.md): 13 sources |
| v11 | No round-specific captures in this checkpoint; three prior v6 reuse candidates need verification | — | [Handoff](v11/HANDOFF-v11.md): 59 sources |
| v12 | No captures in this checkpoint | — | [Handoff](v12/HANDOFF-v12.md): 30 sources |
| v13 | Newly pulled, no captures in this checkpoint | — | [Handoff](v13/HANDOFF-v13.md): 40 sources |

For v3–v9, each round's `captures/vN/outcomes-vN.json` contains per-attempt phase, source hash, chart setup, original download identity, export hash, live cutoff, diagnostics and evidence paths. Source-pinned plans and versioned integrity records live beside those outcomes. Earlier responses remain retained; use the response versions linked above for this checkpoint.

## Recent observations to hand over

V7 includes numeric exports, native visual geometry, replay observations and full diagnostics. Its supplementary records distinguish observed contexts from unavailable ones. The random-stream replay captures use identical timestamps and OHLC across three exports. Label/line retention, table dimensions, clipping and track-price observations retain their native context and screenshots; they are not universal lifecycle or rendering rules. The library compile receipt does not establish an exported call or published-import execution.

V8 includes two controlled marker zoom captures with lossless PNGs, measured pixel bounds and browser/DPR metadata; color-array cases; qualifier and retention cases; percentile missing-current cases; coordinate/table cases; framework/length refusals; and derived-input/CMO cases. Read the versioned context supplements linked from response v5.

The input-derived SMA and EMA sources were admitted unchanged. Their two default receipts remain separate from the parameter receipts. Verified SMA attempt4 uses native `Open: Hours a Day = 6.51` and exports `INPUT_LENGTH = 977.5`; verified EMA attempt3 uses native `Length = 31` and exports `INPUT_LENGTH = 15.5`. Both preserve target/floor/ceil columns, warmup blanks, more than 2048 completed bars and a literal first `BAR_INDEX = 0`. SMA attempt3 is an instrument mismatch: the UI fill requested6.51, but native input1 and exported length150 were observed. It is retained and must not be substituted for the requested parameter capture.

In both CMO captures, the observed ready zero-movement window has `Ready = 1`, `Gains = 0`, `Losses = 0`, blank Builtin/Formula cells, both ready NA flags1 and Moving control100. Its execution origin is not certified as Pine index0 because that source does not export the index.

V9's independent v5/v6 full-width-prefix sources return Plot1. Editor evidence preserves four ASCII spaces followed by two U+3000 characters before the comment. The unary-plus string source and all four continuation sources refuse compilation. Both WMA sources run with their original defaults. Seven exact-SHA/context-complete v8 sources reuse original receipts, including repeats and visual supplements; acquisition dates and attempt identities were not relabelled as fresh runs. See the [reuse crosswalk](v9/captures/v9/cross-round-reuse-v1.json).

The two additional full corpus refusals are:

- Volume Radar (`w8-exact-source-compile-corpus-v7-382-v1.pine`): `Undeclared identifier "wActifLvl"`, native line419.
- MJ VWAP (`w8-exact-source-compile-corpus-v7-427-v1.pine`): native line16 rejects maxval/minval/step on generic `input()`. The full exact text and editor screenshot are saved.

Pivot Candles (`w8-exact-source-compile-corpus-v7-434-v1.pine`) runs unchanged at attempt2. All36 native numeric line-plot titles match exported column order, including two blank headers. Its first raw export was rejected by the collector's duplicate-header assertion; this was an instrument failure, not a native compile/runtime error. The original bytes, logs, screenshots and [collector receipt](v9/captures/v9/evidence/w8-exact-source-compile-corpus-v7-434-v1-attempt1-collector-receipt-v1.json) remain preserved. Attempt2 retains columns by position, with literal first/last cell arrays and native plot metadata.

## Continuation point

Pivot Candles' higher-timeframe companion data is **NOT-CAPTURED**. Native default inputs identify BINANCE:BTCUSDT chart interval2 plus60/240/D/W request contexts. Its source-bound chart CSV, native inputs, request/plot metadata and visual geometry are saved, but independently captured requested histories and consumed expression values are absent. The chart CSV also has no raw volume field. Use this receipt as native admission/output evidence; external-host numerical parity remains unsettled. No Volume companion was added or exported before the checkpoint. Chrome was restored to the original Pivot Candles study on BTCUSDT2-minute standard candles, UTC, replay off.

Next untouched v9 source: **`w8-exact-source-compile-corpus-v56-483-v1.pine`**, zero-based plan index12. Entries12–87 are pending; entries88–94 already have verified reuse receipts. The pending list in [response v11](v9/captures/v9/RESPONSE-v11.md) names all76 sources. Finish the Pivot Candles companions, continue v9, then follow v10, v11, v12 and v13 in order. Later bundles contain142 source registrations; reuse candidates and supplemental contexts still need their instructed verification.

The v9 precision probes require matching input/history/time/index before interpreting their comparison columns. `MATCH = 0` is inconclusive. Financial, footprint and other provider cases require actual supported feed/entitlement and companion evidence; chart OHLC alone is insufficient. Preserve duplicate/blank CSV headers positionally. Do not repair a refused frozen source, publish a library, invent an import ID or alter a prediction to obtain a matching output.

## Using these receipts for A/B work

Read each source's frozen instructions and its selected stable attempt. Verify the source and evidence hashes against the versioned integrity record. Reuse references deliberately point to original files in earlier rounds; preserve those original contexts and timestamps.

Keep raw decimal strings, blank cells, original headers and column order. Compare only rows strictly before that attempt's `historical_compare_before_unix_seconds` or original manifest cutoff; live and boundary-crossing attempts remain retained for inspection. Use each CSV's own input data and requested companions rather than a different capture's live tail. Account for plotted offsets before aligning rows.

A native chart index or CSV row number is not a Pine execution index. Index0 is certified only where a literal exported index/control supplies that evidence; otherwise it remains UNKNOWN. Unexposed TradingView build numbers, error-bar times and diagnostic codes remain unknown/null rather than inferred. Browser versions, native asset identifiers, viewport and DPR are recorded where observed.

Compiler/runtime refusals are valid native results, with the exact first failing operation preserved. A refusal cannot establish later operations or inaccessible post-error state. No TealScript A/B run was performed by this capture task. Follow [the original handoff](HANDOFF.md) when processing disagreements and preserve source/prediction provenance.

Prior pushed capture checkpoints include `d0659b613e` (v7 response v32), `b63a8fbd87` (v8 response v5; delivered through merge `9aa49cb16f`) and `4f6202b994` (v9 lexical/WMA and verified reuses). This checkpoint commit adds the corpus evidence, v9 response v11 and this handoff.
