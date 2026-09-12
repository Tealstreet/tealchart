# External Pine Corpus Version-Rule Batch Rerun V1

Date: 2026-09-12

Previous measurement commit: `37ca779926`.
Current engine measurement commit: `8db55d66ae`.
Current branch tip after docs-only trace sync: `a6b881fa30`.

Machine-readable row reports:

- `external-pine-corpus-v5.daily-rerun-8db55d66ae.json`
- `external-pine-corpus-v6.daily-rerun-8db55d66ae.json`
- `external-pine-corpus-v7.daily-rerun-8db55d66ae.json`

## Gate First

Both fast corpus gates were green before the full rerun:

- Acceptance gate:
  `yarn workspace @tealstreet/tealscript pine:external-corpus:fast-gate`
  returned `12/12` output rows.
- Expected-refusal gate:
  `yarn workspace @tealstreet/tealscript pine:external-corpus:refusal-gate`
  returned `6/6` expected refusals and `0` output rows.

A second gate run after the docs-only trace purchase-order sync was also green:
acceptance `12/12` in `3.78s`, refusal `6/6` in `1.32s`.

## Headline

Against `37ca779926`, the three daily-profile corpora move from `1958/2260`
achievable output rows to `1959/2260`: net `+1`.

Repairs and refusals are separated:

- `+1` row is a repair: declared-v4 legacy bare `pvt` output recovers after the
  resolver shadow-invariant fix at `ebac5ce93f`.
- `0` rows are new correct refusals from the parser version-rule batch.
- `0` rows move from chart foreground colour, host-default disclosure, builtin
  registry invariants, realtime barstate boundary, array `na`, collection sort
  enum, or grammar/enum guard changes in this interval.

The feared netting failure did not happen in this batch: there were no offsetting
new acceptances and new refusals in the corpus row diff. The only output-status,
diagnostic, stage, validity, compiled-error, or swallowed-error change across
v5/v6/v7 is the single v5 `pvt` repair.

## Corpus Movement

| Corpus | Previous | Current | Achievable output | Raw output |
| --- | --- | --- | ---: | ---: |
| v5 | `external-pine-corpus-v5.daily-rerun-37ca779926.json` | `external-pine-corpus-v5.daily-rerun-8db55d66ae.json` | `866/925 -> 867/925` (`+1`) | `866/1000 -> 867/1000` (`+1`) |
| v6 | `external-pine-corpus-v6.daily-rerun-37ca779926.json` | `external-pine-corpus-v6.daily-rerun-8db55d66ae.json` | `787/935 -> 787/935` (`0`) | `787/1000 -> 787/1000` (`0`) |
| v7 | `external-pine-corpus-v7.daily-rerun-37ca779926.json` | `external-pine-corpus-v7.daily-rerun-8db55d66ae.json` | `305/400 -> 305/400` (`0`) | `305/456 -> 305/456` (`0`) |
| Total |  |  | `1958/2260 -> 1959/2260` (`+1`) | `1958/2456 -> 1959/2456` (`+1`) |

## Repair

| Corpus | Row | Previous | Current | Attribution |
| --- | --- | --- | --- | --- |
| v5 | `sources/0478__everget-tradingview-pinescript-indicators__price_volume_trend.pine` | `no-output-compiled`, output silence `global-output-declared-but-not-evaluated` | produced output | `ebac5ce93f` fixed resolver shadow invariants and restored legacy bare TA variable alias handling for declared-v4 scripts. |

This is the row that regressed at `b702388213` in the previous corpus
attribution report. The current rerun confirms the pvt-family resolver repair
recovered the public-script output row.

## Correct Refusals

No new corpus rows dropped from output to a correct refusal in this interval.

The parser version-rule batch fixed the eight red probes from
`pine-version-rule-engine-probe-v1.md`:

- v4 no-op `strategy.exit("x")` accepted.
- v4 `offset()` accepted as history access.
- v4 raw `security(..., lookahead=true)` mapped to lookahead-on.
- v4 bare sessions defaulted to weekdays while v5+ stays all-days.
- v5 legacy global `sma()` rejected with the `ta.sma` migration diagnostic.
- v5 generic `input(..., type=input.integer)` rejected.
- v4 untyped `x = na` rejected.
- v3 bool-to-number arithmetic rejected.

Those changes moved `0` v5/v6/v7 corpus acceptance rows. The row-level diff
found no new output-to-failure transitions and no diagnostic-only/profile-only
movement in v6 or v7. Targeted source scans did find a few relevant declared
version textual hits in the corpus, including v4 `security(...,
lookahead=true)`, v5 global `sma()`, and v4+ untyped `x = na`, but none changed
the daily output funnel at this measurement point.

## Other Landed Changes

The following landed in the measured interval or were already part of the
synced branch and moved `0` corpus acceptance rows in this rerun:

- Chart foreground colour fix.
- Host-default disclosure and oracle reports.
- Builtin registry invariant coverage.
- Realtime `barstate.islastconfirmedhistory` boundary work.
- Resolver guard coverage for both local-over-builtin and legacy-alias halves,
  apart from the `pvt` row repair above.
- `array.new*()` omitted `initial_value` using Pine `na`.
- Collection sort helpers recognizing Pine `order.*` enum values.
- Grammar snippets and enum guard coverage.

These may be value or coverage fixes; this report measures only corpus
acceptance/output movement.

## Harness Note

The first pinned rerun attempt failed before measurement with `spawnSync git
ENOBUFS`. The pinned runner archives `packages/tealscript`, and the package now
contains about `619MB` of reports after the merged value-vector JSONs. The
archive buffer in `run-pinned-external-pine-corpus.ts` was raised from `128MB`
to `1GB` so the runner can still export the measured package tree. This changes
only the measurement harness capacity; it does not change corpus evaluation
logic.

## Method

- Merged `origin/parity/no-output-diagnostics` before measuring.
- Ran both fast corpus gates first; both were green.
- Ran pinned daily-profile corpus reports for v5, v6 and v7 at
  `8db55d66ae` using the committed cache manifests.
- Compared current reports to the previous daily-profile reports at
  `37ca779926` by `localPath`.
- Counted a row-level change only if outcome, first failed stage, first
  diagnostic, validity bucket, output-produced flag, compiled-bar error summary,
  or swallowed-error summary changed.
- Fetched and merged the later `a6b881fa30` docs-only trace purchase-order sync
  after the corpus runs. That sync changed reports and a trace purchase-order
  script, not TealScript engine behavior, so the `8db55d66ae` corpus outputs are
  still the current engine measurement for this acceptance batch.
