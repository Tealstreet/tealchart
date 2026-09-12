> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Rerun CB219 V1

Measurement commit: `cb2190859028ea21057fd5f9e02a5cbf361b0153`, exported by the pinned git-archive runner. The fixed v5 corpus was not re-harvested. The timeout row `sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine` was excluded with the pinned runner's explicit `--exclude-script` option and restored by `merge-pinned`.

## Headline

The run matches the prior e147 and 20af measurements exactly. The merged report has `1000` rows and raw validity of `779 supported / 156 TealScript gap / 55 invalid Pine / 10 unsupported-by-design`. Applying the committed audits retains `777 supported / 99 TealScript gap / 112 invalid Pine / 10 unsupported-by-design / 8 corpus hygiene`, denominator `870`, and audited support `777/870 = 89.31%`.

| Stage | Rows |
| --- | ---: |
| Parse | 979 |
| Semantic | 795 |
| Compile | 793 |
| Execute | 783 |
| Output | 772 |

No engine delta is attributable to this commit; it changes only pinned-runner exclusion support. The exclusion makes the timeout handling reproducible and does not change the measured stage counts.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:pinned \
  --commit cb21908590 \
  --input /tmp/pine-corpus-v5-e147-20260905 \
  --exclude-script sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine \
  --output /tmp/pine-corpus-v5-cb21908590-20260905.json

yarn workspace @tealstreet/tealscript pine:external-corpus:merge-pinned \
  --input /tmp/pine-corpus-v5-cb21908590-20260905.json \
  --timeout-row sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine \
  --output /tmp/pine-corpus-v5-cb21908590-20260905-final.json
```
