> Superseded by external-pine-corpus-v4.engine-delta-v4.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v4 Engine Delta v2

This rerun used the unchanged pinned v4 source set after the namespace and
official-library commits on the shared branch. It did not re-harvest. The
known timeout row was again isolated because it exhausts CPU during execution;
its parser probe remains valid with `Program.body.length === 692`.

## Delta

| Measure | Previous normalized result | Post-fix rerun | Delta |
| --- | ---: | ---: | ---: |
| Rows | 650 | 650 (649 completed + 1 execute timeout) | 0 |
| Supported | 516 | 516 | 0 |
| TealScript gap | 42 | 42 | 0 |
| Invalid Pine | 61 | 61 | 0 |
| Unsupported by design | 20 | 20 | 0 |
| Corpus hygiene | 11 | 11 | 0 |
| Achievable denominator | 558 | 558 | 0 |

| Achievable stage | Previous | Post-fix rerun | Delta |
| --- | ---: | ---: | ---: |
| Parse | 558 (100.00%) | 558 (100.00%) | 0 |
| Semantic | 535 (95.88%) | 535 (95.88%) | 0 |
| Compile | 535 (95.88%) | 535 (95.88%) | 0 |
| Execute | 519 (93.01%) | 519 (93.01%) | 0 |
| Output | 501 (89.78%) | 501 (89.78%) | 0 |

## Remaining Library Diagnostics

The rerun still reports 20 unresolved imports, all user-authored or otherwise
outside the supplied official catalogue. The five alias-collision rows still
report `Unknown library function` for builtin `ta.rsi`, `ta.correlation`,
`ta.crossover`, and `ta.tr`; these remain name-resolution-order gaps rather
than missing library exports. Rows `0294`, `0300`, and `0394` still report
unknown `ta.requestVolumeDelta` after the import itself resolves, so the
official export registry/runtime path remains unproven by this corpus run.

The raw rerun summary was: parse 618, semantic 535, compile 535, execute 520,
output 501; validity `supported=512`, `tealscript-gap=98`,
`invalid-pine=19`, `unsupported-by-design=20`. Those raw validity buckets do
not apply the committed parse, behavior, and follow-up audits; the normalized
headline above does.

Command:

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus \
  --input /tmp/pine-corpus-v4-rerun-no-timeout \
  --output /tmp/pine-corpus-v4-rerun/report-20260905-after-resolution.json
```
