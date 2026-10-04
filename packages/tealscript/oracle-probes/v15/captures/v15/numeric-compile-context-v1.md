# TradingView v15 numeric and compile context v1

All 37 frozen sources have primary receipts: 30 RUNS and 7 COMPILE-ERROR, 55 retained attempts. Exact source identity and every original CSV positional cell are preserved. No engine runs or baseline changes.

The 19 admitted quota streams each have more than 20,000 historical rows, begin with VISIBLE_COUNT=1 / OLDEST_INDEX=0, and expose at least two count drops. [Every measured count-drop event](drawing-collection-events-v1.json) retains raw before/after CSV cells, headers, source/CSV hashes and excluded live cutoff. CSV ordinals are receipt locations, not claimed Pine indices. OLDEST_INDEX is an actual coordinate getter for labels/lines/boxes and a source creation-array lookup for polylines.

| Family | Quota | First pre-drop count | First retained count | First oldest survivor | Measured drops |
|---|---|---|---|---|---|
| label | 1 | 6 | 1 | 6 | 3339 |
| label | 5 | 10 | 5 | 6 | 3338 |
| label | 10 | 15 | 10 | 6 | 3337 |
| label | 50 | 55 | 50 | 6 | 3331 |
| label | 500 | 505 | 500 | 6 | 3256 |
| line | 1 | 6 | 1 | 6 | 3339 |
| line | 5 | 10 | 5 | 6 | 3338 |
| line | 10 | 15 | 10 | 6 | 3337 |
| line | 50 | 55 | 50 | 6 | 3331 |
| line | 500 | 505 | 500 | 6 | 3256 |
| box | 1 | 6 | 1 | 6 | 3339 |
| box | 5 | 10 | 5 | 6 | 3338 |
| box | 10 | 15 | 10 | 6 | 3338 |
| box | 50 | 55 | 50 | 6 | 3331 |
| box | 500 | 505 | 500 | 6 | 3256 |
| polyline | 1 | 6 | 1 | 6 | 3339 |
| polyline | 5 | 10 | 5 | 6 | 3339 |
| polyline | 10 | 15 | 10 | 6 | 3338 |
| polyline | 50 | 55 | 50 | 6 | 3331 |

These observations are bounded to the frozen creation streams and quotas; no general GC cadence or quota formula is inferred. Polyline quota500 compile-refuses with CE10041 at line2: parameter range 1..100.

The fractional-price probe first historical values are FIRST_PASS_SIZE=11, OVERLAP_PASS_SIZE=11, NEAR_INDEX=0, NEAR_EQUAL=1, AFTER_CLEAR_SIZE=1, SHIFT_VALUE=17, AFTER_SHIFT_SIZE=0; delta1e-12 index/equal=0/1, delta1e-9=-1/0, exact-boundary1e-10=0/1. Search and equality are separate outputs; no universal tolerance policy is asserted.

[Foreground samples](foreground-samples-v1.json) retain all 17 exact background-setting attempts, native settings screenshots, source channels, logs, native theme classes, CSV hashes and cutoffs. All historical channel rows within each export are identical. Stable receipts cover all nine requested colors. Observed grayscale149 yields foreground219/219/219, grayscale150 yields15/15/15, transparency0 in both. White attempt2 crossed a boundary; stable repeat attempt10 is retained. Original solid background15/15/15 is restored in attempt17. No global formula or other-theme inference.

Curve attempt1 has curve-viewport-32 and curve-viewport-16 native witnesses with actual red curved Bezier control points, blue straight vertices, native primitives/index map, scale transforms and PNGs; curve-native-anchors retains actual host timestamps and native x for the anchor neighborhood. Native renderer/index IDs are not relabeled Pine IDs/indices. These are exposed pre-raster path coordinates, not interception of canvas drawing calls or proof of a universal spline kernel.

The minimal continuation source refuses with CE10156 line6 column54. All five whole corpus sources also refuse at an end-of-line continuation diagnostic: 835 line169 column82; 1349 line84 column29; 1463 line43 column10; 1642 line28 column77; 1643 line118 column67. The native legacy errors expose no diagnostic code, which remains UNKNOWN. Complete frozen files were compiled independently without repairs, joined lines, version changes or extracted substitutes. Each first diagnostic, editor marker, native status, source SHA, original error screenshot and ordered log receipt is preserved.
