# External Pine Corpus Semantic-Stage Census

Measured: 2026-09-11
Code under test: `3e09c03f44ea5bc047de47ba8529a943e4271c2c`
Second-pass classification audit: `c01845dab893f0da5fcc662a8ad054b6a390006e`
Data: v5 `pine-corpus-v5-20260910`, v6 `pine-corpus-v6-20260911`
Full row data: `external-pine-corpus-semantic-stage-census-20260911.json`

## Purpose

This is the semantic equivalent of the parse-stage census: every cached source
from the v5 and v6 external corpora was run through parser acceptance and then
through `checkProgram()`. The measurement records the first semantic error per
source, buckets failures by diagnostic/source shape, and separates confirmed
source invalidity from TealScript evidence boundaries and buckets that still
need TradingView/compiler judgement.

This pass does not compile, execute, or compare output values.

## Method

- Source set: every case-insensitive `.pine`/`.PINE` file in both cache
  directories, 1000 v5 files and 1000 v6 files.
- Parse step: `parse(source, { grammarSource: file })`.
- Semantic step: `checkProgram(ast, { libraries })`.
- Library registry: same policy as `run-external-pine-corpus.ts`; official
  TradingView imports are supplied from `getOfficialTradingViewLibrary()`.
  Third-party imports without source remain host-library dependency failures.
- Version judgement: each row uses the script's declared `//@version`, not the
  corpus label.

## Stage Census

| Corpus | Total | Parse pass | Parse fail | Semantic pass | Semantic fail |
| --- | ---: | ---: | ---: | ---: | ---: |
| v5 | 1000 | 990 | 10 | 898 | 92 |
| v6 | 1000 | 989 | 11 | 869 | 120 |
| Total | 2000 | 1979 | 21 | 1767 | 212 |

After the parenthesized-switch parser fix, the parse-stage owned queue is zero:
the remaining 21 parse failures are the known invalid/source-artifact buckets
from the parse census.

## Semantic Split

| Split | Rows | Meaning |
| --- | ---: | --- |
| Confirmed invalid Pine / source mistake | 120 | Source-level mistakes whose diagnostics point at the invalid construct. This includes the five bool/numeric rows previously suspected to be declared-v5: the cached source bytes all declare `//@version=6`, so v6 rejection is correct. |
| Host dependency or trace/evidence boundary | 74 | Valid Pine shape, but TealScript correctly refuses without a supplied third-party library, provider input, TradingView trace, or synthetic fixture support. |
| Still unclassified after second-pass source audit | 18 | Needs TradingView/compiler evidence before being called invalid or ours. |
| Confirmed TealScript semantic acceptance gaps | 0 | The evidenced semantic acceptance rows from this census now pass. |

The first source-only pass split the 220 semantic failures as 48 invalid,
72 host/trace, 100 unclassified, and 0 confirmed ours. This second-pass audit
worked down 82 of those 100 unclassified rows. The 12 rows routed to ours are
claims of acceptance with evidence; the remaining 18 are deliberately left
unclassified rather than guessed.

Post-fix rerun note: all published LuxAlgo duplicate-name namespace rows and
the official `TradingView/ta/7` `ta.ao(close, 5, 34)` row are gone from the
semantic-failure set. The five bool/numeric rows did not disappear because they
were not declared-v5 scripts: rows `0629` and `0650`-`0653` in the v5 corpus
cache all declare `//@version=6`, so this report reclassifies them as correct
v6 refusals while keeping the declared-v5 compatibility regression test.

The rerun also exposed three current-head barmerge-mode rows that were not in
the original failure set: two published `//@version=4` Everget scripts call
legacy `security(..., true, lookahead=true)`, and the official TradingView
`Request` library computes a `barmerge.gaps_*` value from a `simple bool` before
passing it to `request.security()`. Those three now pass. The loud
runtime-series-computed diagnostic remains in place, and the remaining
`request.security lookahead` row uses `lookahead = condition ?
barmerge.lookahead_on : na`, which is not a validated barmerge-mode selection
and remains unclassified/correct-refusal pending compiler evidence.

The named v6 current-gap-pool report requested for cross-checking,
`external-pine-corpus-v6.current-gap-pool-a75ebd88d7-v1.md`, was not present in
the fetched parity tree used for this update. No judgement from that report was
imported here.

## Bucket Census

| Bucket | Rows | Corpus split | Current classification |
| --- | ---: | --- | --- |
| Unresolved external library import | 40 | v5 6, v6 34 | Host dependency, not a semantic language gap. |
| Type/value mismatch | 36 | v5 28, v6 8 | Correct refusals plus host/synthetic rows. The five bool/numeric rows that were previously routed as declared-v5 gaps are `//@version=6` in the cached source and remain valid v6 rejections. |
| Unknown argument | 28 | v5 23, v6 5 | Confirmed invalid Pine/source mistakes, including `linewidth` inside `color.new()`, camelCase declaration arguments, and nonexistent arguments such as `hline(alpha=...)` or v6 `strategy.entry(when=...)`. |
| Duplicate declaration | 17 | v5 8, v6 9 | Published TradingView/LuxAlgo method-or-type/value namespace rows now pass. Remaining rows are plain duplicate globals, concatenated/source-artifact shapes, or the still-unclassified function/value collision family. |
| Unknown identifier | 17 | v5 5, v6 12 | 14 invalid, 3 unclassified. Most are missing inputs, typos, JS-style math names, bad tuple syntax, or nonexistent Pine globals such as `day`/`dayofyear`. Three rows remain evidence-boundary cases: forward global references inside functions and a comma-chain/break scoping shape. |
| Synthetic `user/udt` import fixture | 13 | v5 4, v6 9 | Host/test-fixture dependency, not a semantic language gap. |
| `strategy(calc_on_order_fills=true)` | 10 | v5 3, v6 7 | Trace-required evidence boundary; valid Pine shape, deliberately refused until fill-triggered re-entry parity is traced. |
| Version mismatch | 8 | v5 5, v6 3 | Confirmed invalid by declared version. Diagnostics name the valid/removed version range. |
| Duplicate `plot(color=...)` argument | 7 | v5 7 | Confirmed invalid Pine/source mistake. |
| `strategy(fill_orders_on_standard_ohlc=true)` | 6 | v6 6 | Host/evidence boundary; requires standard-OHLC source for non-standard charts. |
| `strategy.exit` trailing stop without `trail_offset` | 3 | v5 1, v6 2 | Confirmed invalid Pine/source mistake. |
| Duplicate `fill(transp=...)` argument | 2 | v6 2 | Confirmed invalid Pine/source mistake. |
| Invalid `array<matrix>` template | 2 | v6 2 | Confirmed invalid/source mistake in synthetic unsupported fixtures; collection template types must include element templates. |
| `lnGamma` qualifier mismatch | 2 | v5 2 | Confirmed invalid Pine/source mistake; series arguments are passed to `simple` parameters. |
| Unknown function | 2 | v6 2 | Confirmed invalid Pine/source mistake. Rows are synthetic `polyline(id)` casting and nonexistent `runtime.log(...)`; Pine has typed casts for primitive/value types and logging APIs are not under `runtime.log`. |
| `strategy(risk_free_rate=...)` | 2 | v6 2 | Trace-required evidence boundary for report metrics. |
| `ta.pivothigh()` argument count | 1 | v6 1 | Confirmed invalid Pine/source mistake; built-in `ta.pivothigh()` requires left/right bar counts or source plus left/right bar counts. |
| `ta.vwma()` argument count | 1 | v6 1 | Confirmed invalid Pine/source mistake; Pine `ta.vwma()` takes source and length, not an explicit volume series. |
| `request.security` lookahead conditional with `na` | 1 | v6 1 | Still unclassified/correct-refusal pending compiler evidence; unlike the fixed official wrapper, one branch is `na` rather than a valid `barmerge.lookahead_*` constant. |
| Duplicate `label.new(size=...)` argument | 1 | v6 1 | Confirmed invalid Pine/source mistake. |
| Duplicate `plotshape(size=...)` argument | 1 | v6 1 | Confirmed invalid Pine/source mistake. |
| Invalid `array<map>` template | 1 | v6 1 | Confirmed invalid/source mistake in a synthetic unsupported fixture; collection template types must include element templates. |
| Exported request expression depends on exported parameters | 1 | v5 1 | Evidence-boundary/library export refusal already covered by checker tests. |
| `lnBinom` qualifier mismatch | 1 | v5 1 | Confirmed invalid Pine/source mistake; a loop-varying series value is passed where the function body requires a `simple` parameter. |
| `qsfd` qualifier mismatch | 1 | v6 1 | Confirmed invalid Pine/source mistake; runtime-varying length is passed where a `simple` parameter is required. |
| `calculateProfile` qualifier mismatch | 1 | v5 1 | Confirmed invalid Pine/source mistake; runtime window length is passed where a `simple` parameter is required. |
| Local `alertcondition()` | 1 | v6 1 | Confirmed invalid Pine/source mistake; `alertcondition()` is global-only. |
| Tuple shape mismatch | 1 | v6 1 | Confirmed invalid Pine/source mistake. |
| `strategy.exit()` without exit price | 1 | v6 1 | Confirmed invalid Pine/source mistake. |
| Assignment to undeclared identifier | 1 | v6 1 | Confirmed invalid Pine/source mistake. `gapRed := true` has no declaration in the declared-v5 source. |

## Confirmed Invalid Examples

These rows are useful diagnostic-quality seeds, not acceptance work:

- `color.new(..., linewidth=2)`: the diagnostic explains that `linewidth`
  belongs on `plot()`, `hline()`, or drawing calls.
- `initialCapital=...`: the diagnostic explains Pine declaration options use
  snake_case and suggests `initial_capital`.
- Duplicate arguments: the diagnostic names the parameter and tells the user to
  remove one value.
- Pine v6 numeric-to-bool and bool-`na` rows: diagnostics now say the construct
  was valid in v3-v5 and is not valid in v6. The five declared-v5 rows that
  still fail on this shape are classified as TealScript acceptance gaps, not
  invalid Pine.

## Confirmed Acceptance Gaps

The originally routed acceptance gaps now have this status:

1. Published TradingView/LuxAlgo duplicate-name rows now pass. The fixed
   construct is method-or-type names sharing identifiers with value names.
2. The official-library call row importing `TradingView/ta/7` and calling
   `ta.ao(close, 5, 34)` now passes by resolving the imported export before the
   builtin zero-argument fallback.
3. The five bool/numeric rows were rechecked against the raw cached source and
   all declare `//@version=6`; they remain correct v6 refusals, not semantic
   acceptance gaps. Declared-v5 compatibility remains covered by regression
   tests because Pine v3-v5 allowed that behavior.

The current semantic-owned acceptance queue from this census is empty. That is
not a claim that all remaining semantic failures are invalid Pine; it means the
rows with acceptance evidence have either been fixed or deliberately left in
the unclassified evidence bucket rather than guessed.

## Remaining Unclassified Queue

Eighteen rows remain deliberately unclassified:

1. Fifteen duplicate-declaration rows involving UDF/result, function/value, or
   type/factory name reuse without enough published-source or compiler evidence
   to say whether Pine accepts the collision.
2. Three unknown-identifier rows: two forward global references inside
   functions and one comma-chained assignment followed by `break` where the
   first failure could be a checker scoping issue or invalid Pine.

This report does not turn uncertainty into work. A row moved to ours above has
evidence that TradingView accepts the shape; a row still listed here needs more
evidence before any checker behavior should change.
