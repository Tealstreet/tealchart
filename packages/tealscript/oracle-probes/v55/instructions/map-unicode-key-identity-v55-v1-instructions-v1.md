# V55 map-unicode-key-identity instructions v1

Facet: map.unicode-key-identity-order-v1.

Question: Do U+00E9 and U+0065 U+0301 string keys denote distinct pairs, retaining insertion order after z?

Competing hypotheses (not native predictions): refusal; byte/codepoint-distinct keys; normalization-equivalent keys; unexpected reordered extraction.

Use the exact unchanged UTF-8 source. Verify sha256sum -c SHA256SUMS. Load only this probe with standard BINANCE:BTCUSDT 2-minute candles, Etc/UTC display timezone and at least 32 historical bars. Each calculation constructs a fresh map of at most 3 pairs; calc_bars_count=32 bounds the window. Capture all 32 startup cells, preserving SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME and historical/live cutoff. This round uses no ta.* calls.

Native phase and values are UNSPECIFIED. RUNS, COMPILE-ERROR, RUNTIME-ERROR, OTHER and INCONCLUSIVE are distinct outcomes. If refused, do not repair or normalize the source: save exact diagnostics, first location, reached sample if available, and full-source/settings screenshots. If RUNS, save raw CSV blanks/NA/zero separately, Data Window and settings screenshots, exact source bytes/hash, inputs, symbol/tickerid/modifiers, timeframe/session/chart type, feed/index origin, account/build, closed/live cutoff and source time.

Exact UTF-8 composed/decomposed spellings and z insertion control only. No locale, casefold, all-Unicode normalization or comparator generalization. Guard third-value access with map size so neither hypothesis creates an observer bounds error.

The request's rival vectors in the source-pinned request packet are hypotheses, not acceptance assertions. A failure in a helper/observer must be identified separately from the map operation. Coincident CSV zero does not prove zero sign. Preserve actual returned previous values, masks, sizes and lookup cells; do not coerce a blank to zero.

Columns: size_unicode, get_composed, get_decomposed, decomposed_put_previous, first_key_z, first_value, second_value, third_value, SAMPLE_INDEX, SOURCE_INDEX, SOURCE_TIME.

For Unicode preserve U+00E9 and U+0065 U+0301 without editor normalization. For signed zero retain literal -0.0 in the source and bound the answer to those expressions.

One default attempt, no input changes. Return evidence at v55/captures/v55/RESPONSE-v55.md. No engine/native parity credit follows from local preflight or shipment.
