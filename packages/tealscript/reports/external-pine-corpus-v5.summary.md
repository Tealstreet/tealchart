> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus V5 Summary

V5 contains 1,000 fixed source rows harvested from 89 repositories. Every row
is pinned by repository URL, source path, and source commit SHA in
`external-pine-corpus-v5.report.json` and `external-pine-corpus-v5.manifest.json`.
The harvester reuses the v4 TradingView metadata-preamble normalizer and
deduplicates exact repository/path pairs already present in v3 or v4.

The measurement was run from a git archive of TealScript commit
`1bd0cf4926b508a143fa3b57f585b191215b17a7` using the pinned runner. The corpus
was classified in bounded shards and merged with duplicate-row rejection. One
row exceeded the 45-second isolated execution limit and is retained as an
explicit execute timeout, so the report still has 1,000 rows.

## Corpus Mix

| Dimension | Count |
| --- | ---: |
| Total scripts | 1,000 |
| Repositories | 89 |
| Pine v4 | 78 |
| Pine v5 | 286 |
| Pine v6 | 636 |
| Indicators | 780 |
| Strategies | 152 |
| Libraries | 6 |

## Funnel

| Stage | Count | Percent |
| --- | ---: | ---: |
| Parse | 973 | 97.30% |
| Semantic | 847 | 84.70% |
| Compile | 845 | 84.50% |
| Execute | 836 | 83.60% |
| Output | 825 | 82.50% |

Raw validity buckets:

| Bucket | Count |
| --- | ---: |
| supported | 832 |
| tealscript-gap | 94 |
| invalid-pine | 64 |
| unsupported-by-design | 10 |

The audited denominator is `926` (`1,000 - 64 invalid-pine - 10
unsupported-by-design`). On this raw first-pass classification, `832/926` rows
are supported: **89.85%**. This is not directly comparable to v4’s audited
`527/558` until v5 receives the same parse, behavior, and correctness audits.
The lower percentage is the intended signal from a broader corpus, not an
engine change attributed by this run.

The achievable-stage funnel is:

| Stage | Count | Percent of 926 |
| --- | ---: | ---: |
| Parse | 899 | 97.08% |
| Semantic | 847 | 91.47% |
| Compile | 845 | 91.25% |
| Execute | 836 | 90.28% |
| Output | 825 | 89.09% |

## Ranked Causes

| Rank | Stage | Cause | Count | Representative diagnostic |
| ---: | --- | --- | ---: | --- |
| 1 | semantic | type-mismatch | 33 | `Cannot assign float value to int variable 'mm'` |
| 2 | parse | unexpected-token | 26 | `"<" found` while parsing a declaration/expression |
| 3 | semantic | unknown-argument | 24 | `Unknown argument 'linewidth' for color.new()` |
| 4 | semantic | unknown-identifier | 13 | `Unknown identifier: ji` |
| 5 | semantic | unknown-function | 12 | `Unknown function: ta.sum` |
| 6 | semantic | unresolved-import | 11 | missing host library `WavesUnchained/RTAFramework/1` |
| 7 | semantic | duplicate-argument | 8 | duplicate `color` argument to `plot()` |
| 8 | semantic | duplicate-symbol | 7 | duplicate declaration `dmx` |
| 9 | semantic | implicit-numeric-bool | 5 | numeric expression used as a boolean |
| 10 | semantic | argument-count | 4 | `matrix.add_row()` accepts at most 2 arguments |
| 11 | execute | array-bounds-runtime-error | 4 | array index 0 out of bounds for empty array |
| 12 | semantic | qualifier-mismatch | 4 | series passed to simple parameter `i` |
| 13 | output | conditional-or-data-gated-output-not-triggered | 3 | visible output did not trigger on synthetic bars |
| 14 | output | source-declares-no-chart-output | 3 | no plot, drawing, alert, or strategy order call |
| 15 | semantic | tuple-shape-mismatch | 3 | tuple declaration arm returned a scalar |
| 16 | execute | runtime.error | 2 | lower-timeframe request on chart timeframe 60 |
| 17 | output | synthetic-window-did-not-trigger-output | 2 | extended probe still produced no plot output |
| 18 | execute | empty-array-pop | 1 | `Cannot use pop() if array is empty.` |
| 19 | compile | duplicate-parameter | 1 | duplicate parameter name in compiled context |
| 20 | compile | generated-iterator-collision | 1 | generated `_iter` already declared |
| 21 | execute | classifier-timeout | 1 | isolated execution exceeded 45 seconds |
| 22 | output | global-output-declared-but-not-evaluated | 1 | global output calls emitted no payload |
| 23 | semantic | invalid-na-bool | 1 | `na` used as a boolean |
| 24 | semantic | library-export | 1 | exported request expression depends on exported parameters |
| 25 | execute | matrix-shape-runtime-error | 1 | matrix dimensions are undefined by execution time |
| 26 | execute | request-context-limit | 1 | more than 40 unique request contexts |
| 27 | output | strategy-only-ledger-output | 1 | strategy activity exists outside chart-output counts |
| 28 | output | table-or-coloring-only-output | 1 | only table/background-color output was declared |

The complete row-level stage data and source provenance are in the JSON report;
this summary intentionally does not turn causes into TealScript gaps before
the committed v4 audits are applied.

## Reproduction

Harvest (with public repositories cloned locally and passed as `--seed`):

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:harvest-v5 \
  --output /tmp/pine-corpus-v5 --target 1000 \
  --seed <repo-url>=<local-repository-path>
```

Pinned classification uses the archived commit and bounded shard commands:

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:pinned \
  --commit 1bd0cf4926 \
  --input /tmp/pine-corpus-v5 \
  --output /tmp/pine-corpus-v5/report-shard.json \
  --only-script <local-path>

yarn workspace @tealstreet/tealscript pine:external-corpus:merge-pinned \
  --input /tmp/pine-v5-shards-1bd0cf4926-full/report-0000.json \
  --input /tmp/pine-v5-shards-1bd0cf4926-full/report-single-0037.json \
  --timeout-row sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine \
  --output /tmp/pine-corpus-v5/report-pinned-1bd0cf4926.json
```
