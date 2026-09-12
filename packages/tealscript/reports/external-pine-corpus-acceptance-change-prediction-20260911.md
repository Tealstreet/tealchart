> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus Acceptance-Change Prediction 2026-09-11

Date: 2026-09-11

Purpose: record a prediction before the corpus lane re-measures v5, v6, and v7
after the acceptance-changing runtime fixes below. This is intentionally not an
attribution run. The corpus source cache is not present in this worktree, so the
estimates use committed reports, row summaries, and the known behavior changed
by each commit.

Relevant commits:

- `39757006c2`: invalid TA lookback lengths changed from silent normalization to
  loud reference-correct refusal.
- `3cbadb64dd`: `array.slice(from > to)` Pine runtime error stopped being
  swallowed during compiled global initialization.
- `1e52cd8518`: six more Pine-facing runtime error families stopped being
  swallowed at the compiled boundary.

## Prediction Summary

| Change | Output count prediction | Row attribution prediction | Direction |
| --- | ---: | ---: | --- |
| `39757006c2` TA invalid-length refusal | -3 rows | 3 rows | Previously output-producing rows move to runtime refusal / invalid Pine. |
| `3cbadb64dd` `array.slice(from > to)` classifier | 0 rows | 0 rows | No committed corpus report shows a matching row; value-vector-only defect. |
| `1e52cd8518` swallowed Pine runtime error classifier | -7 rows | 9 rows | Seven output-producing rows become explicit runtime errors; two v7 non-output rows become clearer runtime-error attributions. |

Total expected output delta: **-10 rows** across v5/v6/v7, with a plausible range
of **-7 to -14**. A drop inside that range is expected reference-correct
movement, not a regression.

## TA Invalid-Length Refusal

Point prediction: **3 rows total lose output**, all or almost all from v5.
Confidence: medium-low.

Expected by corpus:

| Corpus | Point estimate | Plausible range | Expected movement |
| --- | ---: | ---: | --- |
| v5 | 3 | 2-5 | `produced-output` / production-composite bucket -> runtime invalid-length refusal. |
| v6 | 0 | 0-1 | No expected output delta; committed v6 hits look like fixtures or already-non-output rows. |
| v7 | 0 | 0-1 | Targeted v7 gaps are matrix/parser/request-heavy, not TA-length-heavy. |

Basis:

- The local composite-indicator baseline failure seen before the parity merge
  had the exact shape expected here: a bucket with 0 cases where the baseline
  expected 3.
- Earlier v5 reports contain several `ta.sum(..., length)` rows from statistical
  scripts, but the current committed daily report does not expose the underlying
  source cache here, so the row-level count remains a forecast rather than a
  measurement.
- The intended direction is downward for output counts: scripts that computed
  zero, fractional, non-finite, or negative TA lengths used to produce plausible
  normalized values and now correctly refuse execution.

If this prediction is wrong, the useful finding is which side is wrong:

- More than 5 moved rows means dynamic invalid lengths are more common in public
  scripts than this audit expects.
- Zero moved rows means the composite baseline failure was stale/local only and
  no committed corpus source currently reaches the invalid runtime-length path.

## Swallowed Pine Runtime Errors

Point prediction: **7 rows lose output**, while **9 rows change attribution**.
Confidence: medium.

Expected by corpus:

| Corpus | Output delta | Attribution delta | Evidence from committed reports |
| --- | ---: | ---: | --- |
| v5 | -1 | 1 | `sources/0945__haydarkadioglu-tradingview-indicators__trend_strength.pine` produced output while recording a swallowed `Table cell coordinates out of bounds: column 1, row NaN` error. |
| v6 | -6 | 6 | Four table-coordinate rows and two too-many-plot-output rows produced output while the compiled boundary recorded swallowed Pine errors. |
| v7 | 0 | 2 | The v7 gap-pool summary already reports two `Too many table cells: maximum is 10000` rows in the non-output pool; expect clearer runtime-error attribution, not an output-count drop. |

Expected v6 rows:

- `sources/0317__helenananaa-pine-compat-runtime__table_cell_set_text_color_coordinate_bounds.pine`
- `sources/0444__helenananaa-pine-compat-runtime__table_cell_set_text_coordinate_row_bounds.pine`
- `sources/0513__helenananaa-pine-compat-runtime__table_merge_coordinate_bounds.pine`
- `sources/0681__helenananaa-pine-compat-runtime__table_cell_set_text_size_coordinate_row_bounds.pine`
- `sources/0382__helenananaa-pine-compat-runtime__user_methods.pine`
- `sources/0441__helenananaa-pine-compat-runtime__ticker.pine`

Expected no movement:

- `array.slice(from > to)` appears to be value-vector-only in the committed
  reports, so `3cbadb64dd` should not move corpus output counts by itself.
- The other newly classified families from `1e52cd8518` -- map size limit,
  merged-cell overlap, matrix-vector dimension mismatch, and additional plot or
  table limit shapes -- have no obvious committed corpus-row hits beyond the
  rows named above. If the refreshed run finds them, that is the gap in this
  prediction.

Interpretation rule:

- Output decreases from these commits should be treated as correctness movement:
  the old rows were reporting visible output only because correct Pine runtime
  errors were discarded at a boundary.
- A baseline that still expects those rows in output-producing buckets should be
  updated and attributed to these commits, not used to soften the runtime
  refusal.
