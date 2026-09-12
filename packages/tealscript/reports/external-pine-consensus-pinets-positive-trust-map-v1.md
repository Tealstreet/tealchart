# External Pine Consensus PineTS Positive Trust Map v1

Generated: 2026-09-12

Code under test: `dc2fbac78e`

Companion data:
`external-pine-consensus-pinets-positive-trust-map-v1.json`.

## Purpose

`external-pine-consensus-pinets-grammar-precedence-audit-v1.md` produced the
blacklist: families where PineTS is proven wrong against documented or
hand-derived oracles. This report inverts that audit into a positive trust map.

The question is not "has PineTS avoided a known-bad family?" The question is
"has PineTS demonstrated this family is correct against an independent oracle we
own?" Absence from the blacklist is not evidence of correctness.

## Inputs

- The completed PineTS grammar and precedence audit:
  `external-pine-consensus-pinets-grammar-precedence-audit-v1.json`.
- The full consensus report from `origin/tealscript-corpus`:
  `external-pine-consensus-full-v1.json`.
- The current value-vector suite coverage: `989` cases.
- The committed grammar construct inventory: `85` snippets.

Family scope was derived from the suite and construct inventory rather than
hand-listed: value-vector `language.*` cases, value-vector `officialMembers`,
grammar construct ids, and the explicit precedence probes from the PineTS audit.

## Headline

| Surface | Proven correct | Proven wrong | Unprobed |
| --- | ---: | ---: | ---: |
| Families | 74 | 5 | 284 |
| PineTS-sole canon rows | 0 | 446 | 892 |

Verdict: **PineTS-sole canon is not validated by the current evidence.** The
blacklist struck active harm, but the remaining PineTS-sole rows are mostly
unexamined rather than trusted. Current independent oracles produce an empty
row-level allowlist.

The broader consensus coverage figure is therefore a comparison count, not a
validation count. It says how many rows the harness could compare; it does not
say those rows have been independently validated against documented or
hand-derived Pine behavior.

## Bucket Definitions

- **Proven correct**: PineTS matched a documented or hand-derived oracle for
  this family.
- **Proven wrong**: PineTS produced a value that disagreed with such an oracle.
- **Unprobed**: no usable oracle result exists for this family. This includes
  the `12` language vectors PineTS could not run or express; inability to run is
  not wrong-value evidence.

## Family Map

The `74` proven-correct families are mostly grammar syntax snippets, plus the
explicit precedence probes and the language subsets that PineTS executed and
matched. They prove those isolated behaviors, not whole-script semantic
correctness.

The `5` proven-wrong families are the contaminated families from the previous
audit:

| Family | Verdict |
| --- | --- |
| `language.block-boundary` | Proven wrong |
| `language.drawing-methods` | Proven wrong |
| `language.history` | Proven wrong |
| `language.loops` | Proven wrong |
| `language.scope-shadowing` | Proven wrong |

The `284` unprobed families are mainly member/value behavior families, plus
syntax families PineTS could not run. These should not be treated as canonical
without a second voter, a value vector, a TradingView trace, or another
independent oracle.

The full family list is in the JSON companion under `families`.

## PineTS-Sole Row Map

The full consensus report contains `1,338` PineTS-sole canon rows.

| Row bucket | Count | Meaning |
| --- | ---: | --- |
| Proven correct | 0 | Every detected family for the row is independently validated. |
| Proven wrong | 446 | The row overlaps at least one proven-wrong PineTS family. |
| Unprobed | 892 | The row does not hit a known-wrong family, but still touches at least one unprobed family or lacks enough family evidence to allowlist. |

The `446` proven-wrong rows are strike-list rows, not fix candidates. The `892`
unprobed rows are not clean canon; they are assumptions waiting for evidence.

Full row keys and detected families are in the JSON companion under
`pinetsSoleRows`.

## Allowlist Recommendation

Recommended rule for codex-jlxeb6:

Only adopt a PineTS-sole row as canon when every detected family for that row is
in the `proven-correct` bucket.

Current allowlist size: **0 rows**.

Until more independent oracles are added, PineTS-sole rows should be handled as:

- `446` proven-wrong rows: strike from automatic adoption.
- `892` unprobed rows: require a value vector, TradingView trace, second engine
  voter, or family-specific oracle before adoption.

This does not mean PineTS is wrong on all `892` rows. It means the current
evidence does not prove it is right.

## Notes

No engine behavior or consensus harness behavior was changed for this report.
