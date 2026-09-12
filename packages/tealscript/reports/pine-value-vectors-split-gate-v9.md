> Superseded by pine-value-vectors-split-gate-v10.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Split Gate V9

Source report: `pine-value-vectors-coverage-v87.md`.

## Gate Shape

- Passing cases protected by the green gate: 307.
- Expected engine defects tracked by id: 2.
- Unexpected failures: 0.
- Unexpected passes: 0.

## Expected Defects

| Case id | Cause |
| --- | --- |
| `language.collection-history-containers` | Collection history reads return the current mutable handle instead of the prior collection instance. |
| `drawing.chart-point-values` | `chart.point.copy()` returns copied point fields as `na` instead of preserving source point fields. |

The package value-vector gate fails on any unexpected failure, any expected
failure that starts passing, duplicate case ids, or an expected-failure id that
no longer exists in the case list.
