# External Pine Corpus TA-Length Codegen Fix Prediction 2026-09-11

Date: 2026-09-11

Purpose: record the prediction before re-measuring the corpus after
`6c66058cf4`, which fixed optimized `ta.sma(...)` expression-source ordering
and improved invalid-length diagnostics.

This follows the measured corpus result at `4b915fcb75`:

- 43 formerly-producing rows moved to TA invalid-length refusal.
- 2 previously-silent rows began emitting TA invalid-length refusals.
- Net output movement across v5/v6/v7 was -25.

The post-measurement local reconstruction found 50 current rows with
positive-integer TA diagnostics before the codegen fix, and 33 of those
diagnostics disappeared after the fix. Those 33 were not author-side invalid
lengths; generated optimized SMA expression-source series were being updated
before declarations feeding nested TA calls had executed.

## Prediction Summary

Expected output rebound from `6c66058cf4`: **+18 to +30 rows**, point estimate
**+24 rows** across v5/v6/v7, relative to `4b915fcb75`.

Expected remaining TA invalid-length failures: **10 to 15 rows**, mostly
fractional dynamic lengths and a few literal zero cases.

Expected net result versus the pre-refusal baseline: still negative, but much
smaller than the measured -25. Point estimate: approximately **-1 to -7 output
rows** remain moved after the ordering bug is removed, plus any independent
swallowed-runtime-error movements.

| Corpus | Expected output rebound | Basis |
| --- | ---: | --- |
| v5 | +12 to +18 | Local diagnostics fell from 22 to 6 after the fix; public v4/v5 stochastic/HMA-style scripts were the densest source of ordering false positives. |
| v6 | +6 to +11 | Local diagnostics fell from 21 to 4; representative stochastic dashboard row returned to output. |
| v7 | +0 to +3 | Local diagnostics fell from 7 to 3, but v7's targeted sample is smaller and less stochastic-heavy. |

## Expected Remaining Shapes

Rows that should stay loud failures after `6c66058cf4`:

- Fractional dynamic lengths such as `length / 2` and timeframe ratios. These
  should now fail with concrete values like `got 4.5`, `got 27.5`, or
  `got 0.25`.
- Literal/fixture invalid lengths such as `ta.stoch(..., 0)`,
  `ta.bb(close, 0, 2)`, and `ta.change(close, 0)`, which should report
  `got 0`.
- Two request-expression-profile rows seen in the local reconstruction may
  remain row-trace-worthy if their diagnostics still differ between the primary
  error list and the request replay profile.

Interpretation rule:

- Rows returning to output after `6c66058cf4` are not regressions. They were
  valid scripts exposed by the new refusal because codegen handed the TA helper
  `na` before input-backed declarations were assigned.
- Rows that remain invalid-length refusals should be treated as the intended
  reference-correct behavior from `39757006c2`, unless a row-level trace shows
  the generated length is still our fault.
