> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v5 Pinned Shard 7 v1

Shard `7/10` was measured from git archive commit
`00b8620e60edfd31c9630d0bf523f5fda9148724` over the fixed v5 manifest.

## Funnel

| Stage | Count | Percent of shard |
| --- | ---: | ---: |
| Parse | 97/100 | 97% |
| Semantic | 78/100 | 78% |
| Compile | 78/100 | 78% |
| Execute | 77/100 | 77% |
| Visible output | 77/100 | 77% |

Validity was 77 supported, 17 TealScript gaps, 4 invalid Pine rows, and 2
unsupported-by-design rows. The largest cause was 8 semantic strategy
`unsupported-feature` rows for margin-call trace parity, followed by duplicate
plot arguments (3), parse unexpected-token rows (3), and strategy/import or
unknown-function gaps.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:pinned \
  --commit 00b8620e60 \
  --input /tmp/pine-corpus-v5 \
  --shard-index 7 --shard-count 10 \
  --output /tmp/pine-corpus-v5-00b8620e60-shard-7.json
```

Measured in 4.15 seconds. This partial result must not be mixed into a full
headline until every shard uses the same commit and manifest.
