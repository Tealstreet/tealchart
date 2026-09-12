> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v5 Pinned Shard 4 v1

Shard `4/10` was measured from git archive commit
`ffc673f25c9f071e26e9712853de5e987b04176c` over the fixed v5 manifest.

## Funnel

| Stage | Count | Percent of shard |
| --- | ---: | ---: |
| Parse | 98/100 | 98% |
| Semantic | 79/100 | 79% |
| Compile | 79/100 | 79% |
| Execute | 79/100 | 79% |
| Visible output | 79/100 | 79% |

Validity was 79 supported, 14 TealScript gaps, and 7 invalid Pine rows.

## Runtime finding

`sources/0945__haydarkadioglu-tradingview-indicators__trend_strength.pine`
produces `Table cell coordinates out of bounds: column 1, row NaN` beginning at
bar 0. The compiled runner recorded 160 compiled-bar errors and 160 swallowed
errors for this row. This is a concrete table-coordinate/runtime dispatch item,
not a corpus-input classification.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:pinned \
  --commit ffc673f25c \
  --input /tmp/pine-corpus-v5 \
  --shard-index 4 --shard-count 10 \
  --output /tmp/pine-corpus-v5-ffc673f25c-shard-4.json
```

Measured in 3.89 seconds. Do not mix this partial result into a full-corpus
headline until all shards use this same commit and manifest.
