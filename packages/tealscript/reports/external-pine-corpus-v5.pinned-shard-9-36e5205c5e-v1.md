> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v5 Pinned Shard 9 v1

Shard `9/10` was measured from git archive commit
`36e5205c5ed05f78ebf52fa30d7e8b4a3330e7e7`, with the separately audited
timeout row excluded.

## Funnel

| Stage | Count | Percent of measured rows |
| --- | ---: | ---: |
| Parse | 96/99 | 96.97% |
| Semantic | 77/99 | 77.78% |
| Compile | 76/99 | 76.77% |
| Execute | 75/99 | 75.76% |
| Visible output | 75/99 | 75.76% |

Validity was 75 supported, 16 TealScript gaps, 7 invalid Pine rows, and 1
unsupported-by-design row. The largest cause was seven strategy
`unsupported-feature` rows, followed by four unknown-argument rows and three
parse unexpected-token rows.

The excluded source is
`sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine`.
It independently exceeded a 30-second bounded subprocess probe and remains a
scale-timeout finding, not an unmeasured supported or gap row.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:pinned \
  --commit 36e5205c5e \
  --input /tmp/pine-corpus-v5 \
  --shard-index 9 --shard-count 10 \
  --exclude-script sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine \
  --output /tmp/pine-corpus-v5-36e5205c5e-shard-9-with-timeout.json
```

Measured in 3.44 seconds. This partial result must not be mixed into a full
headline until all shards use the same commit and manifest.
