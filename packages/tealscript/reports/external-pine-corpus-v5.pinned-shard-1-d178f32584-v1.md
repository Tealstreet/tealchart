> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v5 Pinned Shard 1 v1

This is shard `1/10` of the fixed v5 corpus, measured from a git archive at
commit `d178f325842b1f7f5445b0874f1caef9896c0a6e`. It is evidence for the
sharded runner, not a full-corpus headline.

## Funnel

| Stage | Count | Percent of shard |
| --- | ---: | ---: |
| Parse | 98/100 | 98% |
| Semantic | 82/100 | 82% |
| Compile | 82/100 | 82% |
| Execute | 80/100 | 80% |
| Visible output | 79/100 | 79% |

The shard contains 80 indicators, 12 strategies, 7 studies, and 1 library;
versions are v4: 9, v5: 28, and v6: 63, across 25 repositories.

## Validity split

| Bucket | Count |
| --- | ---: |
| Supported | 80 |
| TealScript gap | 16 |
| Invalid Pine | 3 |
| Unsupported by design | 1 |

The largest measured cause is six semantic `unsupported-feature` rows for
strategy margin-call trace parity. Other causes include type mismatch,
unexpected token, unknown argument, unknown identifier, and one each for
empty-array `pop()`, duplicate symbol, implicit numeric bool, runtime error,
unknown function, and unresolved user-library import.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:pinned \
  --commit d178f32584 \
  --input /tmp/pine-corpus-v5 \
  --shard-index 1 --shard-count 10 \
  --output /tmp/pine-corpus-v5-d178f32584-shard-1.json
```

Measured in 4.33 seconds. The full v5 result must merge ten reports measured
from this same commit and manifest; this shard must not be compared directly
with a full-corpus report.
