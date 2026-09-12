> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v5 Pinned Shard 9 Timeout Audit v1

Shard `9/10` was isolated with bounded subprocess probes at measurement commit
`a0e105f31a`. Nine ten-row subgroups completed; the final subgroup timed out
because of one source, not because all ten rows are slow.

The confirmed blocker is:

`sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine`

It exceeded a 30-second wall-clock limit when run alone. The neighboring rows
`0910`, `0920`, `0940`, `0950`, `0960`, `0970`, `0980`, `0990`, and `1000`
completed individually. The source is therefore a distinct parser/compiler
scale-timeout finding and must not be converted into a shard-wide funnel
classification.

## Reproduction

Run the pinned runner for this source in a bounded subprocess using the
`--only-script` option:

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:pinned \
  --commit a0e105f31a \
  --input /tmp/pine-corpus-v5 \
  --only-script sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine \
  --output /tmp/pine-corpus-v5-a0e105f31a-row-0930.json
```

The outer process must enforce the wall-clock bound because the runner's
per-row work is synchronous and cannot service an in-process timer while this
source is executing.
