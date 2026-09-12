> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Drawing Expansion V1

Source report: `pine-value-vectors-coverage-v87.md`.

## Summary

- Added drawing/object value vectors: 5.
- Newly value-covered documented drawing/object members: 20.
- Total independent-oracle cases: 309.
- Compiled/public matches: 307/309.
- Expected failures: `language.collection-history-containers`, `drawing.chart-point-values`.
- Unexpected failures: 0.
- Unexpected passes: 0.
- Broader builtin value coverage: 209/489, 42.74%.

## Covered Members

- `line.*`: `line.new`, `line.get_x1`, `line.get_x2`, `line.get_y1`,
  `line.get_y2`, `line.get_price`.
- `box.*`: `box.new`, `box.get_left`, `box.get_right`, `box.get_top`,
  `box.get_bottom`.
- `label.*`: `label.new`, `label.get_x`, `label.get_y`, `label.get_text`.
- `linefill.*`: `linefill.new`, `linefill.get_line1`, `linefill.get_line2`.
- `chart.point.*`: `chart.point.from_index`, `chart.point.copy`.

## New Expected Defect

`drawing.chart-point-values` confirms that `chart.point.from_index()` exposes
the expected `index` and `price` fields, but `point.copy()` returns a copied
point whose fields read as `na`. TradingView documents `chart.point.copy()` as
creating a new point copied from the source point.
