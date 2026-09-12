> Superseded by external-pine-corpus-v4.engine-delta-v4.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v4 Engine Delta v1

The corpus is unchanged: the rerun used the existing `/tmp/pine-corpus-v4`
manifest and pinned source files. No source was re-harvested. The known 125 KB
timeout row was isolated because it exhausts CPU during execution; its corrected
parser probe passed with `Program.body.length === 692`.

## Measurement

| Measure | v4 audited baseline | Fixed-corpus rerun / normalized result | Delta |
| --- | ---: | ---: | ---: |
| Rows | 650 | 650 (649 completed by classifier + 1 isolated execute timeout) | 0 |
| Supported | 512 | 516 | +4 |
| TealScript gap | 53 | 42 | -11 |
| Invalid Pine | 55 | 61 | +6 |
| Unsupported by design | 19 | 20 | +1 |
| Corpus hygiene | 11 | 11 | 0 |
| Corpus input gap | 0 | 0 | 0 |

The normalized result applies the existing parse/behavior audits and the
follow-up audit in `external-pine-corpus-v4.followup-audit-v1.md` to the raw
rerun. The raw classifier summary for the 649 completed rows was
`supported=512`, `tealscript-gap=98`, `invalid-pine=19`,
`unsupported-by-design=20`; those raw buckets intentionally do not include the
previous source-validity audits and are not comparable as a parity headline.

## Funnel Delta

| Achievable stage | v4 audited baseline (565) | Normalized rerun (558) | Delta |
| --- | ---: | ---: | ---: |
| Parse | 563 (99.65%) | 558 (100.00%) | +5 rows / +0.35 pp |
| Semantic | 532 (94.16%) | 535 (95.88%) | +3 rows / +1.72 pp |
| Compile | 532 (94.16%) | 535 (95.88%) | +3 rows / +1.72 pp |
| Execute | 516 (91.33%) | 519 (93.01%) | +3 rows / +1.68 pp |
| Output | 497 (87.96%) | 501 (89.78%) | +4 rows / +1.82 pp |

The parse increase includes the corrected parser-only probe for the timeout
row. Full execution remains unmeasurable for that row because it stays CPU
bound; it is retained as an execute-stage gap rather than counted as a parser
failure.

## Engine Changes Observed

| Row | Before | After | Evidence |
| --- | --- | --- | --- |
| `0137` | output gap | supported | The empty-array slice/history fixture now emits output |
| `0172` | semantic gap | supported | ticker UDT/builtin collision now resolves and executes |
| `0358` | official-import gap | unsupported-by-design | `TradingView/ta/1` resolves; the same source then reaches its user-authored `PineCoders/Time/4` import |
| `0408` | semantic gap | supported | local `vwap(bool)` helper no longer binds to the numeric builtin |
| `0477` | semantic gap | supported | typed array result preserves its integer element type |

Official `TradingView/ta` imports therefore moved out of the unresolved-import
failure class, but three of their scripts still fail on missing exported
functions (`ta.correlation`, `ta.tr`, and `ta.requestVolumeDelta`).
