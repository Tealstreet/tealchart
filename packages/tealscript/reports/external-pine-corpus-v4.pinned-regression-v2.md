> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# V4 Pinned Regression Classification V2

The funnel now separates a correct tightening from a TealScript breakage. A
pass-to-fail transition is `tightening-correctness` when its adjudicated row is
`invalid-pine`, `corpus-hygiene`, or `unsupported-by-design`; valid Pine rows
are `breakage`, and rows without a verdict remain `unadjudicated`.

## Adjudicated transitions

At `b69f4de54c`, these three semantic transitions are correct rejections, not
support regressions:

| Row | New diagnostic | Classification |
| --- | --- | --- |
| `0279` | `10:5: type-mismatch: Cannot assign void value to array<float> variable arr` | `invalid-pine` / `tightening-correctness` |
| `0393` | `4:1: type-mismatch: Cannot assign array<float> value to float variable 'y'` | `invalid-pine` / `tightening-correctness` |
| `0468` | `31:32: type-mismatch: str.split source must be a string, got array<string>` | `invalid-pine` / `tightening-correctness` |

The verdicts and reproducible comparison input are committed in
`external-pine-corpus-v4.pinned-verdicts-v1.json` and
`compare-pinned-pine-corpus.ts`.

## Corrected audited headline

The comparable audited denominator remains **558**. The prior audited
headline was **527/558 supported (94.44%)**. The three rows above must not be
counted as support loss, so the corrected headline remains **527/558 (94.44%)**;
the change at `b69f4de54c` is **three tightening-correctness transitions and
zero genuine support regressions**.

Raw pinned stage counts remain unchanged: `d330df7ec2` had semantic `545`,
while `b69f4de54c` had semantic `542`. Those raw counts are not the audited
support headline until each transition has a verdict.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:compare \
  --before /tmp/pine-corpus-v4-rerun/report-20260905-pinned-d330df7ec2.json \
  --after /tmp/pine-corpus-v4-rerun/report-20260905-pinned-b69f4de54c.json \
  --verdicts packages/tealscript/reports/external-pine-corpus-v4.pinned-verdicts-v1.json \
  --output /tmp/pine-corpus-v4-rerun/delta-d330-to-b69-v2.json
```
