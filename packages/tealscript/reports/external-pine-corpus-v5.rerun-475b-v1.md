> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Rerun 475B V1

Measurement commit: `475b202d57ccbcee76103e9a03d125fe84e06d2a`, exported by the
pinned git-archive runner. The fixed v5 corpus was not re-harvested. The known
deep-expression row was excluded from execution and restored by `merge-pinned`
as the explicit timeout row.

## Headline

| Measure | Previous audited (`e147d42635`) | Current pinned head (`475b202d57`) | Delta |
| --- | ---: | ---: | ---: |
| Supported | 777 | 777 | 0 |
| TealScript gap | 99 | 99 | 0 |
| Invalid Pine | 112 | 112 | 0 |
| Corpus hygiene | 8 | 8 | 0 |
| Unsupported by design | 10 | 10 | 0 |
| Achievable denominator | 870 | 870 | 0 |
| Audited support rate | 777/870 = 89.31% | 777/870 = 89.31% | 0.00 pp |

The raw current-head funnel is parse `979/1000`, semantic `795/1000`, compile
`793/1000`, execute `783/1000`, and output `772/1000`. Raw validity is
`779 supported / 156 TealScript gap / 55 invalid Pine / 10 unsupported by
design`. Applying the committed version-sensitive parse, behavior, and
follow-up audits produces the comparable audited headline above.

The normalized row outcomes are identical to the prior `e147d42635` report;
the only measurement change is the pinned implementation commit. This is a
measured zero delta, not an inferred one. Shard-local row IDs are excluded from
that comparison because each shard numbers its selected rows from one.

## Ranked raw causes

| Stage | Cause | Rows |
| --- | --- | ---: |
| Semantic | `unsupported-feature` strategy parameters | 66 |
| Semantic | `type-mismatch` | 26 |
| Semantic | `unknown-argument` | 24 |
| Parse | `unexpected-token` | 20 |
| Semantic | `unknown-identifier` | 14 |
| Semantic | `unknown-function` | 12 |
| Semantic | `unresolved-import` | 10 |
| Semantic | `duplicate-argument` | 7 |
| Semantic | `duplicate-symbol` | 7 |
| Semantic | `implicit-numeric-bool` | 5 |
| Semantic | `argument-count` | 4 |
| Execute | `array-bounds-runtime-error` | 4 |
| Semantic | `qualifier-mismatch` | 4 |

The remaining causes are the same long-tail rows recorded by the preceding
v5 rerun and dispatch reports. The complete row data is in the temporary merged
JSON report below; source provenance remains in the committed v5 manifest.

## Reproduction

The 999 non-timeout rows were measured from the archive in ten deterministic
shards. Shards 0-8 completed as direct shard runs. Shard 9 was split into five
deterministic 20-row `--only-script` groups because an unsharded invocation can
run indefinitely under corpus-scale CPU pressure. Each command used:

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:pinned \
  --commit 475b202d57ccbcee76103e9a03d125fe84e06d2a \
  --input /tmp/pine-corpus-v5-e147-20260905 \
  --exclude-script sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine \
  --shard-index N --shard-count 10 \
  --output /tmp/pine-corpus-v5-e147-20260905/report-475b202d57-shard-N.json
```

The shard-9 groups were merged with the same `merge-pinned` command shape,
then the timeout row was restored:

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:merge-pinned \
  --input /tmp/pine-corpus-v5-e147-20260905/report-475b202d57-shard-0.json \
  --input /tmp/pine-corpus-v5-e147-20260905/report-475b202d57-shard-1.json \
  --input /tmp/pine-corpus-v5-e147-20260905/report-475b202d57-shard-2.json \
  --input /tmp/pine-corpus-v5-e147-20260905/report-475b202d57-shard-3.json \
  --input /tmp/pine-corpus-v5-e147-20260905/report-475b202d57-shard-4.json \
  --input /tmp/pine-corpus-v5-e147-20260905/report-475b202d57-shard-5.json \
  --input /tmp/pine-corpus-v5-e147-20260905/report-475b202d57-shard-6.json \
  --input /tmp/pine-corpus-v5-e147-20260905/report-475b202d57-shard-7.json \
  --input /tmp/pine-corpus-v5-e147-20260905/report-475b202d57-shard-8.json \
  --input /tmp/pine-corpus-v5-e147-20260905/probe-shard9-group-0.json \
  --input /tmp/pine-corpus-v5-e147-20260905/probe-shard9-group-1.json \
  --input /tmp/pine-corpus-v5-e147-20260905/probe-shard9-group-2.json \
  --input /tmp/pine-corpus-v5-e147-20260905/probe-shard9-group-3.json \
  --input /tmp/pine-corpus-v5-e147-20260905/probe-shard9-group-4.json \
  --timeout-row sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine \
  --output /tmp/pine-corpus-v5-e147-20260905/report-475b202d57-final.json
```

