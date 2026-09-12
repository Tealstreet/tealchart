> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Rerun E147 V1

Measurement commit: `e147d42635fa2ee4f0b005883e5de471de6590f6`, exported by the pinned git-archive runner. Input is the fixed v5 corpus, with the known deep-expression timeout row removed during execution and restored by `merge-pinned` as an explicit execute-stage timeout. No sources were re-harvested.

## Headline

| Measure | Previous audited (`1bd0cf4926`) | E147 raw | E147 with committed audits | Delta, audited |
| --- | ---: | ---: | ---: | ---: |
| Supported | 832 | 779 | 777 | -55 |
| TealScript gap | 83 | 156 | 138 | +55 |
| Invalid Pine | 75 | 55 | 75 | 0 |
| Unsupported by design | 10 | 10 | 10 | 0 |
| Comparable denominator | 915 | 935 raw-eligible | 915 | 0 |
| Support rate | 90.93% | 83.32% raw-eligible | 84.92% | -6.01 pp |

The audited E147 result is a mechanical application of the committed row and version audits, not a fresh adjudication of every new failure class. The current head introduced `unsupported-feature` diagnostics for valid strategy execution parameters: `calc_on_order_fills=true` (3 rows), `margin_long=1000` (62 rows), and `margin_long=0` (1 row). All 66 remain genuine strategy-execution gaps; they are not invalid Pine. The subsequent E147 type-mismatch audit reclassified 25 rows as invalid Pine and left one valid TealScript gap. The unknown-identifier audit then reclassified 7 more rows as invalid Pine and left 7 valid scope/UDF gaps. The parse audit reclassified 5 malformed rows as invalid Pine, 8 truncated rows as corpus hygiene, and retained 7 valid grammar gaps. The resulting current audited headline is **777 supported / 99 TealScript gap / 112 invalid Pine / 10 unsupported-by-design / 8 corpus hygiene**, denominator **870**, support **777/870 = 89.31%**. The apparent change from the earlier `832/915` baseline is measured, but not yet an attributable engine regression.

## Funnel

| Stage | Rows | Percent |
| --- | ---: | ---: |
| Parse | 979 | 97.9% |
| Semantic | 795 | 79.5% |
| Compile | 793 | 79.3% |
| Execute | 783 | 78.3% |
| Output | 772 | 77.2% |

## Causes

The rerun has **29 distinct first-failure causes**, of which **11 are single-row causes**. The largest causes are:

| Stage | Cause | Rows |
| --- | --- | ---: |
| Semantic | `unsupported-feature`: strategy `margin_long=1000` | 62 |
| Semantic | `unsupported-feature`: strategy `calc_on_order_fills=true` | 3 |
| Semantic | `unsupported-feature`: strategy `margin_long=0` | 1 |
| Semantic | `type-mismatch` | 26 |
| Semantic | `unknown-argument` | 24 |
| Parse | `unexpected-token` | 20 |
| Semantic | `unknown-identifier` | 14 |
| Semantic | `unknown-function` | 12 |
| Semantic | `unresolved-import` | 10 |
| Semantic | `duplicate-argument` | 7 |
| Semantic | `duplicate-symbol` | 7 |
| Semantic | `implicit-numeric-bool` | 5 |

The remaining causes are `argument-count` 4, `array-bounds-runtime-error` 4, `qualifier-mismatch` 4, `conditional-or-data-gated-output-not-triggered` 3, `runtime.error` 3, `source-declares-no-chart-output` 3, `tuple-shape-mismatch` 3, `synthetic-window-did-not-trigger-output` 2, and 11 one-row causes: empty-array pop, duplicate compiled parameter, generated iterator collision, timeout, global output not evaluated, invalid bool/na, library export, matrix shape, request context limit, strategy-only ledger output, and table/coloring-only output.

## Reproduction

The completed run was produced with:

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:pinned \
  --commit e147d42635fa2ee4f0b005883e5de471de6590f6 \
  --input /tmp/pine-corpus-v5-e147-20260905 \
  --output /tmp/pine-corpus-v5-e147-20260905/report-999.json

yarn workspace @tealstreet/tealscript pine:external-corpus:merge-pinned \
  --input /tmp/pine-corpus-v5-e147-20260905/report-999.json \
  --timeout-row sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine \
  --output /tmp/pine-corpus-v5-e147-20260905/report-final.json
```
