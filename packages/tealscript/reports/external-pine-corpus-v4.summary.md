> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v4 Summary

Generated from 650 newly harvested Pine sources across 243 repositories, excluding repositories already covered by v3. Every report row is source-free and pinned by repository URL, source path, and commit SHA in `external-pine-corpus-v4.report.json`.

The harvester reused `normalizeHarvestedPineSource(...)` from `scripts/refetch-external-pine-corpus.ts`, including the TradingView metadata preamble stripping path that recovered copied-code bodies in v3.

The audited v4 baseline below is preserved for comparison. The latest fixed-corpus rerun and normalized delta are recorded in `external-pine-corpus-v4.engine-delta-v1.md` and `.json`; follow-up semantic bucket verdicts are in `external-pine-corpus-v4.followup-audit-v1.md` and `.json`.

## Corpus Mix

| Dimension | Count |
| --- | ---: |
| Total scripts | 650 |
| Repositories | 243 |
| Pine v6 | 454 |
| Pine v5 | 196 |
| Indicators | 539 |
| Strategies | 106 |
| Libraries | 5 |

## Funnel

| Stage | Count | Percent |
| --- | ---: | ---: |
| Parse | 618 | 95.08% |
| Semantic | 532 | 81.85% |
| Compile | 532 | 81.85% |
| Execute | 517 | 79.54% |
| Output | 497 | 76.46% |

Achievable denominator excludes `invalid-pine`, `corpus-hygiene`, and
`unsupported-by-design` rows: 579 rows.

| Achievable stage | Count | Percent |
| --- | ---: | ---: |
| Parse | 563 | 99.65% |
| Semantic | 532 | 94.16% |
| Compile | 532 | 94.16% |
| Execute | 516 | 91.33% |
| Output | 497 | 87.96% |

## Validity Buckets

| Bucket | Count |
| --- | ---: |
| supported | 512 |
| tealscript-gap | 53 |
| invalid-pine | 55 |
| unsupported-by-design | 19 |
| corpus-hygiene | 11 |
| corpus-input-gap | 0 |

The import headline counts are unchanged from the pre-audit v4 report. The
parse audit reclassified 19 invalid-Pine rows and 11 corpus artifacts, leaving
71 gaps; the behavior audit then reclassified another 18 rows, leaving 53
TealScript gaps. The row-level report already applies the import policy: of
26 unresolved imports, 7 official TradingView standard
library rows remain `tealscript-gap`, while 19 user-authored library rows are
`unsupported-by-design` and are excluded from the actionable denominator.

| Import classification | Rows | Treatment |
| --- | ---: | --- |
| Official TradingView imports | 7 | `tealscript-gap`; implementation queue |
| User-authored imports | 19 | `unsupported-by-design`; excluded by policy |
| Unresolved imports, total | 26 | Diagnostic cause only, not an implementation denominator |

The achievable denominator after the parse and behavior audits is 565 (`650 - 55
invalid-pine
- 11 corpus-hygiene - 19 unsupported-by-design`). There is no import
denominator correction: the official-import portion of the unresolved-import
cause is 7 rows, not 26.

The full unexpected-token audit is in
`external-pine-corpus-v4.parse-audit.md` and `.json`: 1 genuine TealScript
parser gap, 19 invalid-Pine sources, and 11 corpus artifacts. The 125 KB
timeout row is retained as a TealScript execute/scale gap: the corrected
parser-only probe succeeds and returns 692 top-level `body` entries; only the
full classifier still exhausts CPU before producing a result.

The behavior audit is in `external-pine-corpus-v4.behavior-audit.md` and `.json`:
4 correct-silence probes, 8 TealScript gaps, and 28 invalid-Pine sources across
type mismatch, duplicate symbol, unknown identifier, and global output silence.

Official-only import queue:

| Count | Specifier | Pinned rows |
| ---: | --- | --- |
| 3 | `TradingView/ta/12` | `sources/0202`, `sources/0324`, `sources/0401` |
| 3 | `TradingView/ta/8` | `sources/0294`, `sources/0300`, `sources/0394` |
| 1 | `TradingView/ta/1` | `sources/0358` |

## Ranked Causes

| Rank | Stage | Cause | Count | Representative diagnostic |
| ---: | --- | --- | ---: | --- |
| 1 | parse | unexpected-token | 31 | `;` encountered where a Pine statement/expression was expected |
| 2 | semantic | unresolved-import | 26 | host library registry missing a public imported library |
| 3 | semantic | type-mismatch | 16 | float value rejected where an int array element was required |
| 4 | semantic | duplicate-symbol | 8 | duplicate declaration such as `ma` |
| 5 | output | global-output-declared-but-not-evaluated | 8 | visible global outputs declared but no output emitted on synthetic bars |
| 6 | semantic | unknown-identifier | 8 | unresolved local such as `missingArg` |
| 7 | output | source-declares-no-chart-output | 6 | source intentionally has no chart output calls |
| 8 | semantic | argument-count | 5 | argument count mismatch such as `matrix.sum()` |
| 9 | semantic | unknown-argument | 5 | unknown declaration argument such as `explicit_plot_display` |
| 10 | output | conditional-or-data-gated-output-not-triggered | 4 | output gated by conditions not triggered by synthetic bars |
| 11 | semantic | duplicate-argument | 4 | duplicate named argument such as `plot(..., color=..., color=...)` |
| 12 | semantic | implicit-numeric-bool | 3 | numeric expression used directly as a boolean |
| 13 | execute | request-context-limit | 3 | script exceeds Pine's 40 unique `request.*` context limit |
| 14 | semantic | unknown-function | 3 | unresolved function call such as `ta.rsi` on a library alias |
| 15 | execute | array-bounds-runtime-error | 2 | runtime array index outside bounds |
| 16 | semantic | library-export | 2 | exported library function parameter missing required type |
| 17 | semantic | method-receiver-type | 2 | no overload for receiver method such as `box.delete()` |
| 18 | output | synthetic-window-did-not-trigger-output | 2 | extended/synthetic window still does not activate sparse drawings |
| 19 | semantic | unknown-assignment-target | 2 | assignment to an undeclared identifier |
| 20 | execute | classifier-timeout | 1 | one 125 KB v6 indicator times out in the classifier |

## Notes For Dispatch

- The v4 instrument found no compile-only fallback cohort: rows that reached semantic checking also compiled.
- The highest-leverage language/runtime buckets for follow-up are parse `unexpected-token`, unresolved imports, type mismatches, duplicate symbols, unknown identifiers, argument signatures, and method receiver support.
- One row, `sources/0254__davidadff7-blip-CODE23__Aoi_alert_all.pine`, stalled the monolithic classifier and a 25-row shard, then timed out in isolated classification after 45 seconds. Its parser-only probe succeeds (`Program.body.length === 692`); it is classified as `tealscript-gap` with cause `classifier-timeout` because full execution remains CPU-bound.
- `source-declares-no-chart-output`, `request-context-limit`, and several runtime bounds errors are likely correct Pine behavior or source behavior, not first-pass engine fixes.

## Commands

```bash
yarn -s tsx /tmp/harvest-pine-corpus-v4.ts
yarn workspace @tealstreet/tealscript pine:external-corpus --input /tmp/pine-corpus-v4 --output packages/tealscript/reports/external-pine-corpus-v4.report.json
```

The monolithic classifier was stopped after it stayed CPU-bound without a report for more than 25 minutes. The same 650-row manifest was then classified in 25-row shards. Shard 10 was isolated row-by-row; only row 03 timed out.
