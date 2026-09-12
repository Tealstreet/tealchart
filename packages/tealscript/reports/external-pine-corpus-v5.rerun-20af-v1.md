> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Rerun 20af V1

Measurement commit: `20af9b7e68b487f6ecbbf2de2f2afa2fc8a4bc01`, exported by the pinned git-archive runner. The fixed v5 corpus was used without re-harvesting. The known deep-expression timeout row was excluded during execution and restored by the merge step.

## Headline

The fresh pinned run is identical to the prior e147 measurement. Raw validity is `779 supported / 156 TealScript gap / 55 invalid Pine / 10 unsupported-by-design`; the merged report contains `1000` rows after restoring the timeout row. Applying the committed audits retains the prior audited headline: `777 supported / 99 TealScript gap / 112 invalid Pine / 10 unsupported-by-design / 8 corpus hygiene`, denominator `870`, support rate `777/870 = 89.31%`.

| Stage | Rows |
| --- | ---: |
| Parse | 979 |
| Semantic | 795 |
| Compile | 793 |
| Execute | 783 |
| Output | 772 |

There is no attributable parity delta: `20af9b7e68` contains report-only changes after the measured engine commit `e147d42635`; all runtime-stage counts and diagnostics are unchanged.

## Reproduction

The run input was a fresh temporary copy of the fixed pinned corpus with the timeout row removed from its manifest. The manifest was restored before merging:

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:pinned \
  --commit 20af9b7e68 \
  --input /tmp/pine-corpus-v5-20af-filtered-20260905 \
  --output /tmp/pine-corpus-v5-20af-filtered-20260905/report-current.json

yarn workspace @tealstreet/tealscript pine:external-corpus:merge-pinned \
  --input /tmp/pine-corpus-v5-20af-filtered-20260905/report-current.json \
  --timeout-row sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine \
  --output /tmp/pine-corpus-v5-20af-filtered-20260905/report-final.json
```
