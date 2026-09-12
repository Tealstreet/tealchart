> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v5 Pinned Merged 5ef013c34f v1

This is the first complete v5 measurement assembled from deterministic shards
of the fixed 1,000-row manifest. Every shard was measured from the same git
archive commit `5ef013c34fd5f193dea7f67c1873ce7f79025520`.

## Headline

| Measure | Count |
| --- | ---: |
| Fixed corpus rows | 1,000 |
| Supported | 779 |
| TealScript gap | 156 |
| Invalid Pine | 55 |
| Unsupported by design | 10 |
| Visible output | 772/1,000 (77.20%) |
| Achievable denominator | 935 |
| Visible output over achievable denominator | 772/935 (82.57%) |

The achievable denominator excludes 55 invalid-Pine rows and 10
unsupported-by-design rows. The separately isolated timeout source is included
as a TealScript-gap row with an explicit execute-stage timeout diagnostic; it
is not silently dropped from the fixed denominator.

## Funnel

| Stage | Count | Percent of 1,000 |
| --- | ---: | ---: |
| Parse | 979 | 97.90% |
| Semantic | 795 | 79.50% |
| Compile | 793 | 79.30% |
| Execute | 783 | 78.30% |
| Visible output | 772 | 77.20% |

The corpus contains 780 indicators, 152 strategies, 62 studies, and 6
libraries. Declared versions are v4: 78, v5: 286, and v6: 636, across 89
repositories.

## Ranked causes

| Stage | Cause | Count |
| --- | --- | ---: |
| Semantic | strategy margin/calc-on-order-fills unsupported trace | 66 |
| Semantic | type mismatch | 26 |
| Semantic | unknown argument | 24 |
| Parse | unexpected token | 20 |
| Semantic | unknown identifier | 14 |
| Semantic | unknown function (`ta.sum`) | 12 |
| Semantic | unresolved import | 10 |
| Semantic | duplicate argument | 7 |
| Semantic | duplicate symbol | 7 |
| Semantic | implicit numeric bool | 5 |
| Semantic | argument count | 4 |
| Execute | array bounds runtime error | 4 |
| Semantic | qualifier mismatch | 4 |
| Semantic | tuple-shape mismatch | 3 |
| Execute | dynamic request restriction | 3 |
| Output | conditional/data-gated silence | 3 |
| Output | no declared chart output | 3 |
| Execute | runtime.error | 3 |

Single-row causes include the isolated timeout, duplicate-parameter compile
failure, generated iterator identifier collision, invalid `na` bool,
library-export dependency, matrix dimension error, request-context limit,
strategy-only output, table/coloring-only output, and empty-array access.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:pinned \
  --commit 5ef013c34f --input /tmp/pine-corpus-v5 \
  --shard-index 0 --shard-count 10 \
  --output /tmp/pine-corpus-v5-5ef013c34f-shard-0.json
```

Run all shard indices `0` through `9`, excluding
`sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine`
from shard 9, then merge the ten reports and add that path with
`--timeout-row`. The merged report used exactly that procedure.
