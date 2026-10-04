# TradingView capture handoff v6 — release v2, assembly revision4

Use this release directory and its ONE canonical `bundle-manifest-v4.json`. Sources are byte-for-byte SHA-pinned. Capture bundle round v6 contains declared Pine v5 and v6 scripts; keep each version unchanged.

Counts: 18 Pine sources; 8 numeric captures and 10 compile/runtime outcome captures. Declared Pine versions: 10 v6 and 8 v5. All11 staged Pine sources are accounted for:9 included and2 drawing-default duplicates already shipped in v5.

Default chart: BINANCE:BTCUSDT, 2-minute standard candles, UTC. Use default inputs. Load the same initial history for related numeric probes and reload each script independently. Where requested, start at actual script bar_index0, not CSV row0. Retain the largest requested history (MFI at least600 confirmed bars, longest available preferred).

Before capture run `sha256sum -c SHA256SUMS` from this directory. Do not edit sources, insert casts, rename identifiers, suppress sibling controls, or substitute local engine predictions. Preserve warnings and exact compile/runtime diagnostics, code, line/column, first failing bar and error screenshot. For accepted sources export all plotted columns, timestamps and empty NA cells; compare confirmed historical bars only.

Record chart symbol/timeframe/type/timezone, initial history, input settings, source SHA, attempt timestamp and last confirmed-bar cutoff. Save accepted CSVs under captures/v6/<source-stem>-attempt1.csv and diagnostic text/screenshots under captures/v6/evidence/. Increment attempt numbers without replacing earlier attempts. Save SHA256 for the returned evidence files.

Local gate receipts are included only as readiness provenance. Native outcomes remain UNOBSERVED. The numerical controls and labelled candidate formulas are questions to discriminate, not predicted native acceptance or a new engine policy.

## Request groups

- MFI zero boundary: 1 source(s).
- V5 color-array NA index: 2 source(s).
- Range/text reserved identifiers: 4 source(s).
- Mutable v5 EMA first length: 4 source(s).
- Supertrend standalone/paired factors: 3 source(s).
- Linear percentile interior-hole order: 4 source(s).

## Sources

### mfi-private-zero-boundary-v1.pine

SHA256: `8a3b2eef2595ac0d920ee374df9420fc03e41259ccf515304fb9b8f583322dc4`. Declared Pine v6; numeric; 60 plotted columns; at least600 confirmed bars.

Does native builtin MFI change at tiny source scales? Distinguish source-comparison changes, private zero handling and signed carry; the 1e-10 candidate is not a native rule.

- Export all60 columns at seven scales with raw signed values and empty cells.
- Use the longest available history from script bar_index0; retain the same initial history as prior MFI captures when possible.
- Inspect scaled-sign and unscaled-sign flow controls before attributing a result to a threshold.
- Capture from actual script bar_index0 and preserve the initial missing pattern.

Export columns in this order: `input_time_ms`, `input_bar_index`, `input_close`, `input_volume`, `pow2_minus0_builtin`, `pow2_minus0_pine_reference`, `pow2_minus0_unscaled_sign_reference`, `pow2_minus0_guard_candidate`, `pow2_minus0_upper_restored`, `pow2_minus0_lower_restored`, `pow2_minus0_pine_up_flow_restored`, `pow2_minus0_pine_down_flow_restored`, `pow2_minus20_builtin`, `pow2_minus20_pine_reference`, `pow2_minus20_unscaled_sign_reference`, `pow2_minus20_guard_candidate`, `pow2_minus20_upper_restored`, `pow2_minus20_lower_restored`, `pow2_minus20_pine_up_flow_restored`, `pow2_minus20_pine_down_flow_restored`, `pow2_minus30_builtin`, `pow2_minus30_pine_reference`, `pow2_minus30_unscaled_sign_reference`, `pow2_minus30_guard_candidate`, `pow2_minus30_upper_restored`, `pow2_minus30_lower_restored`, `pow2_minus30_pine_up_flow_restored`, `pow2_minus30_pine_down_flow_restored`, `pow2_minus40_builtin`, `pow2_minus40_pine_reference`, `pow2_minus40_unscaled_sign_reference`, `pow2_minus40_guard_candidate`, `pow2_minus40_upper_restored`, `pow2_minus40_lower_restored`, `pow2_minus40_pine_up_flow_restored`, `pow2_minus40_pine_down_flow_restored`, `pow2_minus45_builtin`, `pow2_minus45_pine_reference`, `pow2_minus45_unscaled_sign_reference`, `pow2_minus45_guard_candidate`, `pow2_minus45_upper_restored`, `pow2_minus45_lower_restored`, `pow2_minus45_pine_up_flow_restored`, `pow2_minus45_pine_down_flow_restored`, `pow2_minus50_builtin`, `pow2_minus50_pine_reference`, `pow2_minus50_unscaled_sign_reference`, `pow2_minus50_guard_candidate`, `pow2_minus50_upper_restored`, `pow2_minus50_lower_restored`, `pow2_minus50_pine_up_flow_restored`, `pow2_minus50_pine_down_flow_restored`, `pow2_minus60_builtin`, `pow2_minus60_pine_reference`, `pow2_minus60_unscaled_sign_reference`, `pow2_minus60_guard_candidate`, `pow2_minus60_upper_restored`, `pow2_minus60_lower_restored`, `pow2_minus60_pine_up_flow_restored`, `pow2_minus60_pine_down_flow_restored`.

Additional operator notes: [MFI-PRIVATE-ZERO-BOUNDARY-v1.md](notes/MFI-PRIVATE-ZERO-BOUNDARY-v1.md).


### corpus-color-array-warmup-na-index-v5-v1.pine

SHA256: `941479a5b41f7fc53db81226abc1e45245e8760ec409a0301a03f9aaa3751d6a`. Declared Pine v5; outcome; 1 plotted columns; at least4 confirmed bars.

Does Pine v5 admit and execute array.get on a color array with a warmup missing series-int index? Compare with the matched finite zero-index control.

- Exact compiler diagnostic if refused
- Runtime error/code/bar if admitted then fails
- CSV including OUTCOME if accepted and executes
- Keep both sources independent; a refusal must not suppress the finite control.

Export columns in this order: `OUTCOME`.

Original question packet: [corpus-color-array-na-index-packet-v1.json](notes/corpus-color-array-na-index-packet-v1.json).

### corpus-color-array-finite-index-control-v5-v1.pine

SHA256: `8ffc2d3db73ea904247b79deaffee14af5624bd19d434bcd0b6627d75e6ab35c`. Declared Pine v5; outcome; 1 plotted columns; at least4 confirmed bars.

Does Pine v5 admit and execute array.get on a color array with a warmup missing series-int index? Compare with the matched finite zero-index control.

- Exact compiler diagnostic if refused
- Runtime error/code/bar if admitted then fails
- CSV including OUTCOME if accepted and executes
- Keep both sources independent; a refusal must not suppress the finite control.

Export columns in this order: `OUTCOME`.

Original question packet: [corpus-color-array-na-index-packet-v1.json](notes/corpus-color-array-na-index-packet-v1.json).

### reserved-variable-range-v5-v6-round-v1.pine

SHA256: `daec96e12ae61d5c20747837daa30f3df4a3debdc04e01216d2a869dbdb90029`. Declared Pine v5; outcome; 1 plotted columns; at least3 confirmed bars.

Does declared Pine v5 refuse range as a variable name, or compile and output VALUE=close?

- Paste each unchanged source separately in TradingView. Record exact compile diagnostic/code/location or successful compile and VALUE output. Any chart/timeframe is sufficient for compiler acceptance. If admitted, export at least 3 confirmed bars with close and VALUE. Do not rename the identifier or edit the version.

Export columns in this order: `VALUE`.

Original question packet: [reserved-variable-range-text-v6-round-probe-spec-v1.json](notes/reserved-variable-range-text-v6-round-probe-spec-v1.json).

### reserved-variable-text-v5-v6-round-v1.pine

SHA256: `f9c91862b80a0ba1dd7bffefafd9a0d3b539ae7aab30f0d6854eac8d190d0ced`. Declared Pine v5; outcome; 1 plotted columns; at least3 confirmed bars.

Does declared Pine v5 refuse text as a variable name, or compile and output VALUE=close?

- Paste each unchanged source separately in TradingView. Record exact compile diagnostic/code/location or successful compile and VALUE output. Any chart/timeframe is sufficient for compiler acceptance. If admitted, export at least 3 confirmed bars with close and VALUE. Do not rename the identifier or edit the version.

Export columns in this order: `VALUE`.

Original question packet: [reserved-variable-range-text-v6-round-probe-spec-v1.json](notes/reserved-variable-range-text-v6-round-probe-spec-v1.json).

### reserved-variable-range-v6-v6-round-v1.pine

SHA256: `1f3e9d5451d0c31b24f352bff58e168cc497c9f4fbf6e5a9206635615bac08be`. Declared Pine v6; outcome; 1 plotted columns; at least3 confirmed bars.

Does declared Pine v6 refuse range as a variable name, or compile and output VALUE=close?

- Paste each unchanged source separately in TradingView. Record exact compile diagnostic/code/location or successful compile and VALUE output. Any chart/timeframe is sufficient for compiler acceptance. If admitted, export at least 3 confirmed bars with close and VALUE. Do not rename the identifier or edit the version.

Export columns in this order: `VALUE`.

Original question packet: [reserved-variable-range-text-v6-round-probe-spec-v1.json](notes/reserved-variable-range-text-v6-round-probe-spec-v1.json).

### reserved-variable-text-v6-v6-round-v1.pine

SHA256: `b540e38eaface58dc7c47cf807e0cc2f0df695d12d79c2e794ae033f2bb148ab`. Declared Pine v6; outcome; 1 plotted columns; at least3 confirmed bars.

Does declared Pine v6 refuse text as a variable name, or compile and output VALUE=close?

- Paste each unchanged source separately in TradingView. Record exact compile diagnostic/code/location or successful compile and VALUE output. Any chart/timeframe is sufficient for compiler acceptance. If admitted, export at least 3 confirmed bars with close and VALUE. Do not rename the identifier or edit the version.

Export columns in this order: `VALUE`.

Original question packet: [reserved-variable-range-text-v6-round-probe-spec-v1.json](notes/reserved-variable-range-text-v6-round-probe-spec-v1.json).

### mutable-ema-first-one-v5-v1.pine

SHA256: `27209eafee7707329b362132295164ebe07a0cfc572983071725c941eff22596`. Declared Pine v5; outcome; 3 plotted columns; at least128 confirmed bars.

Does native refuse a changing v5 EMA length, retain the first constructor length, or evaluate another way? Compare first lengths1/2, separate written UDF calls and fixed input3 without assuming the mechanism.

- Paste unchanged sources separately. Record exact compile/runtime diagnostics and phase/location, or export all plots plus native OHLC/time. Keep native lengths and startup rows; do not inject seeded values or treat engine-generated fixed controls as native truth. Length-one prior first-source seeding did not establish constructor freezing. Length-two and two written UDF calls distinguish freeze from fresh per-argument construction. Input-three is the separately valid fixed-length control.

Export columns in this order: `MUTABLE_ONE`, `FIXED_ONE`, `LIVE_LENGTH`.

Original question packet: [mutable-ema-first-length-probe-spec-v1.json](notes/mutable-ema-first-length-probe-spec-v1.json).

### mutable-ema-first-two-v5-v1.pine

SHA256: `2b6a798408522b6c15d993786017bf90f8572ae1e9c77c76b0e4151809f5dddc`. Declared Pine v5; outcome; 3 plotted columns; at least128 confirmed bars.

Does native refuse a changing v5 EMA length, retain the first constructor length, or evaluate another way? Compare first lengths1/2, separate written UDF calls and fixed input3 without assuming the mechanism.

- Paste unchanged sources separately. Record exact compile/runtime diagnostics and phase/location, or export all plots plus native OHLC/time. Keep native lengths and startup rows; do not inject seeded values or treat engine-generated fixed controls as native truth. Length-one prior first-source seeding did not establish constructor freezing. Length-two and two written UDF calls distinguish freeze from fresh per-argument construction. Input-three is the separately valid fixed-length control.

Export columns in this order: `MUTABLE_TWO`, `FIXED_TWO`, `LIVE_LENGTH`.

Original question packet: [mutable-ema-first-length-probe-spec-v1.json](notes/mutable-ema-first-length-probe-spec-v1.json).

### mutable-ema-udf-two-calls-v5-v1.pine

SHA256: `0d9151129271433f9e29bc1e02762a4f6948fe0f9d20423e207b5248992615fc`. Declared Pine v5; outcome; 4 plotted columns; at least128 confirmed bars.

Does native refuse a changing v5 EMA length, retain the first constructor length, or evaluate another way? Compare first lengths1/2, separate written UDF calls and fixed input3 without assuming the mechanism.

- Paste unchanged sources separately. Record exact compile/runtime diagnostics and phase/location, or export all plots plus native OHLC/time. Keep native lengths and startup rows; do not inject seeded values or treat engine-generated fixed controls as native truth. Length-one prior first-source seeding did not establish constructor freezing. Length-two and two written UDF calls distinguish freeze from fresh per-argument construction. Input-three is the separately valid fixed-length control.

Export columns in this order: `MUTABLE_UDF_TWO`, `FIXED_UDF_FOUR`, `FIXED_TWO`, `FIXED_FOUR`.

Original question packet: [mutable-ema-first-length-probe-spec-v1.json](notes/mutable-ema-first-length-probe-spec-v1.json).

### fixed-ema-input-three-v5-control-v1.pine

SHA256: `9034640287d9543e1d3ad5833a9646666eac2f69e6878a218ed2ff8ff56bdfa6`. Declared Pine v5; outcome; 2 plotted columns; at least128 confirmed bars.

Does native refuse a changing v5 EMA length, retain the first constructor length, or evaluate another way? Compare first lengths1/2, separate written UDF calls and fixed input3 without assuming the mechanism.

- Paste unchanged sources separately. Record exact compile/runtime diagnostics and phase/location, or export all plots plus native OHLC/time. Keep native lengths and startup rows; do not inject seeded values or treat engine-generated fixed controls as native truth. Length-one prior first-source seeding did not establish constructor freezing. Length-two and two written UDF calls distinguish freeze from fresh per-argument construction. Input-three is the separately valid fixed-length control.

Export columns in this order: `FIXED_INPUT_THREE`, `FIXED_LITERAL_THREE`.

Original question packet: [mutable-ema-first-length-probe-spec-v1.json](notes/mutable-ema-first-length-probe-spec-v1.json).

### supertrend-factor-alone-first3-v2.pine

SHA256: `6c68c0b2c5d5aed235f7102b1fffe0525cea2da6410f270e4cc331fcbd63e3ca`. Declared Pine v6; numeric; 10 plotted columns; at least256 confirmed bars.

Compare alternating series factor alone (2 first and 3 first) versus identical dynamic call paired with fixed factor2. Distinguish first-value retention from call sharing.

- Same symbol, timeframe, chart history and export for all three scripts
- Historical dataset starts at plotted bar_index0; export at least256 historical rows
- Reload each script before capture; preserve exact source and CSV SHA256
- Plot factor and OHLCV inputs alongside line/direction; do not infer factor retention from paired call alone
- Capture from actual script bar_index0 and preserve the initial missing pattern.

Export columns in this order: `input_time_ms`, `input_bar_index`, `input_open`, `input_high`, `input_low`, `input_close`, `input_volume`, `input_factor`, `dynamic_line`, `dynamic_direction`.

Original question packet: [supertrend-discriminator-packet-v1.json](notes/supertrend-discriminator-packet-v1.json).

### supertrend-factor-alone-v2.pine

SHA256: `9744da2fd144dbaab123dec19935a38b703014c28e9f4100f0a90c6dbf53311c`. Declared Pine v6; numeric; 10 plotted columns; at least256 confirmed bars.

Compare alternating series factor alone (2 first and 3 first) versus identical dynamic call paired with fixed factor2. Distinguish first-value retention from call sharing.

- Same symbol, timeframe, chart history and export for all three scripts
- Historical dataset starts at plotted bar_index0; export at least256 historical rows
- Reload each script before capture; preserve exact source and CSV SHA256
- Plot factor and OHLCV inputs alongside line/direction; do not infer factor retention from paired call alone
- Capture from actual script bar_index0 and preserve the initial missing pattern.

Export columns in this order: `input_time_ms`, `input_bar_index`, `input_open`, `input_high`, `input_low`, `input_close`, `input_volume`, `input_factor`, `dynamic_line`, `dynamic_direction`.

Original question packet: [supertrend-discriminator-packet-v1.json](notes/supertrend-discriminator-packet-v1.json).

### supertrend-factor-paired-fixed2-v2.pine

SHA256: `73556b702f0b324d1d9ffee4387d1564a66ed61b1482b18a1983aa67406c9bab`. Declared Pine v6; numeric; 12 plotted columns; at least256 confirmed bars.

Compare alternating series factor alone (2 first and 3 first) versus identical dynamic call paired with fixed factor2. Distinguish first-value retention from call sharing.

- Same symbol, timeframe, chart history and export for all three scripts
- Historical dataset starts at plotted bar_index0; export at least256 historical rows
- Reload each script before capture; preserve exact source and CSV SHA256
- Plot factor and OHLCV inputs alongside line/direction; do not infer factor retention from paired call alone
- Capture from actual script bar_index0 and preserve the initial missing pattern.

Export columns in this order: `input_time_ms`, `input_bar_index`, `input_open`, `input_high`, `input_low`, `input_close`, `input_volume`, `input_factor`, `dynamic_line`, `dynamic_direction`, `fixed2_line`, `fixed2_direction`.

Original question packet: [supertrend-discriminator-packet-v1.json](notes/supertrend-discriminator-packet-v1.json).

### linear-hole-order-ascending-len4-v1.pine

SHA256: `65dccfe743c0613071fc21f5ff4a6188d992942304aa16ca38e800d6ad59c4af`. Declared Pine v6; numeric; 7 plotted columns; at least256 confirmed bars.

Does each standalone source emit finite or missing through current holes and their physical-window recovery? At the first finite bar after both holes age out, does the output immediately return to the mathematically sorted finite window? Do lengths4 and14 show the same source-order behavior on increasing versus decreasing deterministic inputs? Preserve the exact numeric vectors; no model or expected native verdict has been supplied.

- Standard chart BINANCE:BTCUSDT 2 minutes UTC
- Reload every standalone script before capture; export all7plots from input_bar_index0 with at least256 confirmed historical rows
- Keep blank NA cells, original CSV headers, timestamps, source/CSV hashes and setup evidence; exclude final live bar from historical comparisons
- Capture from actual script bar_index0 and preserve the initial missing pattern.

Export columns in this order: `input_time_ms`, `input_bar_index`, `input_phase`, `input_clean`, `input_source`, `input_missing`, `linear_hole_p75`.

Additional operator notes: [LINEAR-HOLE-ORDER-v1.md](notes/LINEAR-HOLE-ORDER-v1.md).

Original question packet: [linear-hole-order-packet-v1.json](notes/linear-hole-order-packet-v1.json).

### linear-hole-order-descending-len4-v1.pine

SHA256: `488176ac17bd8a566d22fa7c5ac86b8846ae0d627dc3737c7faa7dd063d14829`. Declared Pine v6; numeric; 7 plotted columns; at least256 confirmed bars.

Does each standalone source emit finite or missing through current holes and their physical-window recovery? At the first finite bar after both holes age out, does the output immediately return to the mathematically sorted finite window? Do lengths4 and14 show the same source-order behavior on increasing versus decreasing deterministic inputs? Preserve the exact numeric vectors; no model or expected native verdict has been supplied.

- Standard chart BINANCE:BTCUSDT 2 minutes UTC
- Reload every standalone script before capture; export all7plots from input_bar_index0 with at least256 confirmed historical rows
- Keep blank NA cells, original CSV headers, timestamps, source/CSV hashes and setup evidence; exclude final live bar from historical comparisons
- Capture from actual script bar_index0 and preserve the initial missing pattern.

Export columns in this order: `input_time_ms`, `input_bar_index`, `input_phase`, `input_clean`, `input_source`, `input_missing`, `linear_hole_p75`.

Additional operator notes: [LINEAR-HOLE-ORDER-v1.md](notes/LINEAR-HOLE-ORDER-v1.md).

Original question packet: [linear-hole-order-packet-v1.json](notes/linear-hole-order-packet-v1.json).

### linear-hole-order-ascending-len14-v1.pine

SHA256: `2e8a66aab073ca55b2d80037dd838cfb20de34377d6d0bfc0e03ee8a7ab0fc54`. Declared Pine v6; numeric; 7 plotted columns; at least256 confirmed bars.

Does each standalone source emit finite or missing through current holes and their physical-window recovery? At the first finite bar after both holes age out, does the output immediately return to the mathematically sorted finite window? Do lengths4 and14 show the same source-order behavior on increasing versus decreasing deterministic inputs? Preserve the exact numeric vectors; no model or expected native verdict has been supplied.

- Standard chart BINANCE:BTCUSDT 2 minutes UTC
- Reload every standalone script before capture; export all7plots from input_bar_index0 with at least256 confirmed historical rows
- Keep blank NA cells, original CSV headers, timestamps, source/CSV hashes and setup evidence; exclude final live bar from historical comparisons
- Capture from actual script bar_index0 and preserve the initial missing pattern.

Export columns in this order: `input_time_ms`, `input_bar_index`, `input_phase`, `input_clean`, `input_source`, `input_missing`, `linear_hole_p75`.

Additional operator notes: [LINEAR-HOLE-ORDER-v1.md](notes/LINEAR-HOLE-ORDER-v1.md).

Original question packet: [linear-hole-order-packet-v1.json](notes/linear-hole-order-packet-v1.json).

### linear-hole-order-descending-len14-v1.pine

SHA256: `c64cc95797229e7cbf395f9869e2b834ee2173e2ed35d000963cad3d8ae4a493`. Declared Pine v6; numeric; 7 plotted columns; at least256 confirmed bars.

Does each standalone source emit finite or missing through current holes and their physical-window recovery? At the first finite bar after both holes age out, does the output immediately return to the mathematically sorted finite window? Do lengths4 and14 show the same source-order behavior on increasing versus decreasing deterministic inputs? Preserve the exact numeric vectors; no model or expected native verdict has been supplied.

- Standard chart BINANCE:BTCUSDT 2 minutes UTC
- Reload every standalone script before capture; export all7plots from input_bar_index0 with at least256 confirmed historical rows
- Keep blank NA cells, original CSV headers, timestamps, source/CSV hashes and setup evidence; exclude final live bar from historical comparisons
- Capture from actual script bar_index0 and preserve the initial missing pattern.

Export columns in this order: `input_time_ms`, `input_bar_index`, `input_phase`, `input_clean`, `input_source`, `input_missing`, `linear_hole_p75`.

Additional operator notes: [LINEAR-HOLE-ORDER-v1.md](notes/LINEAR-HOLE-ORDER-v1.md).

Original question packet: [linear-hole-order-packet-v1.json](notes/linear-hole-order-packet-v1.json).


## Future-limit requests already in v5

Both first-local and first-last probes are already present unchanged in v5-release-v2. They are excluded from this release under the request to include them only if missing from v5. Their hashes and original manifest are recorded in the canonical manifest.

- drawing-future-index-first-local-v1.pine: `3a4c0743e976160a9b6e352feea6522a5d33a5d44ff72f88dc4e531626e20825`.
- drawing-future-index-first-last-v1.pine: `c63b8704de16e05496a105a47039335eafb836e9ce63dd4d2bc09563c664dde3`.

## Verification

Assembled and source/registration hashes verified while holding `/home/sam/.cache/fleet-tmp/v3-bundle.lock` with flock. All 18 source hashes match; all nine staged v6 sources are covered. Original staging and shipped release directories were unchanged. No engine runs, installs or commits were performed.

## Sources already shipped in v5 — release v2 exclusions

The following byte-identical sources are in v5-release-v2 and on master. They are excluded from v6-release-v2; use the existing v5 bundle for these captures. Shipment does not imply a native outcome.

- `collection11-symmetric-eigenvectors-integer-pinv-v1.pine`: `e8a6fe4efd7b7adf7528ab218e63375b60fae5d094a5c47e9dcc836240bbb20f`; [v5 source](../v5-release-v2/collection11-symmetric-eigenvectors-integer-pinv-v1.pine).
- `percentile-rank-readout-v1.pine`: `ad748e178a99fa681eae9f00304d19bb793bdf09ab6dd4bb971a5ddfe78f15ad`; [v5 source](../v5-release-v2/percentile-rank-readout-v1.pine).

## Assembly revision4 shipped-probe exclusions

The drawing-default-blue v5/v6 v3 sources are byte-identical to v5-release-v2 drawing-default-blue-v5-v2.pine and drawing-default-blue-v6-v2.pine. Retain those v5 requests; do not capture duplicate v6 entries. SHA-registered provenance is in notes/drawing-default-blue-packet-v3.json.

BE’s native-float-magnitude-output-v1.pine SHA256 `3fabe6f76e9461c1ad1ec7d7cba3029c07be9f3e34b10cb8e840c8a87be5d5df` is byte-identical to the source already shipped in v4 on master. Per explicit overseer ruling, it is excluded from v6 because Sam runs v4 first. Its four CSV channels and first8bar Pine Logs request remain the v4 capture request. Handoff provenance is in notes/V6-PROBE-HANDOFF-v1.json. Native output/publication/internal-NA policy remains UNOBSERVED; no magnitude threshold is inferred.

The earlier requested collection11-symmetric-eigenvectors-integer-pinv-v1.pine and percentile-rank-readout-v1.pine remain excluded as already shipped in v5. Future-limit timing controls are likewise retained in v5.

Freeze cut: 2026-10-04T01:04:52.845803+00:00. Counts remain18sources (8numeric/10outcome), with ONE canonical manifest. Prior assembly receipts are retained outside this release in v6-release-v2-receipts. Frozen v4/v5 source bytes were not changed.
