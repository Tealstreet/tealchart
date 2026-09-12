> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v5 Pinned Shard 8 v1

Shard `8/10` was measured from git archive commit
`d4747c989fb613c72c759e05c2e9611a2f16ea4c` over the fixed v5 manifest.

## Funnel

| Stage | Count | Percent of shard |
| --- | ---: | ---: |
| Parse | 97/100 | 97% |
| Semantic | 80/100 | 80% |
| Compile | 80/100 | 80% |
| Execute | 78/100 | 78% |
| Visible output | 76/100 | 76% |

Validity was 78 supported, 18 TealScript gaps, and 4 invalid Pine rows. The
largest cause was six strategy margin-call `unsupported-feature` rows. Other
recurring causes were unexpected tokens (3), unknown `ta.sum` (3), and type
mismatches, unknown arguments, and unknown identifiers (2 each).

One execution row hit the documented 40-context request limit; one other row
hit an empty-array runtime error. Both are preserved as distinct diagnostics.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:pinned \
  --commit d4747c989f \
  --input /tmp/pine-corpus-v5 \
  --shard-index 8 --shard-count 10 \
  --output /tmp/pine-corpus-v5-d4747c989f-shard-8.json
```

Measured in 4.08 seconds. This partial result must not be mixed into a full
headline until every shard uses the same commit and manifest.
