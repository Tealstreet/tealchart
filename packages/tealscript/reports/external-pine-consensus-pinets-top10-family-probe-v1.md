# External Pine Consensus PineTS Top-Ten Family Probe v1

Generated: 2026-09-12

Code under test: `490df475aa`

Companion data:
`external-pine-consensus-pinets-top10-family-probe-v1.json`.

## Purpose

`external-pine-consensus-pinets-unprobed-family-queue-v1.md` ranked the
unprobed PineTS trust families by how many PineTS-sole canon rows they gate.
This is the requested checkpoint for the top ten row-gating families.

The oracle is the existing value-vector expected output. PineTS was compared to
`expectedOutputs`, not to TealScript output.

## Scope

The raw top-ten member filter expands to `800` value-vector cases because
`plot` appears in almost every vector. This checkpoint uses the queue report's
named current-oracle examples for each top-ten family, with each PineTS run in
an isolated child process and an OS timeout. It is therefore an early
family-oracle checkpoint, not the full `800`-case top-ten closure pass.

That limitation matters: a promoted family here means PineTS matched the named
documented oracle examples for that family. A struck family means PineTS
disagreed with at least one named documented oracle and its gated rows are not
safe PineTS-sole canon.

## Headline

| Result | Families | Distinct PineTS-sole rows affected |
| --- | ---: | ---: |
| Promoted to proven-correct family | 5 | 764 rows touch at least one promoted family |
| Proven wrong family | 3 | 805 rows struck |
| Cannot-run or partial PineTS support | 2 | 695 rows touch at least one cannot-run/partial family |
| Newly fully allowlisted rows | n/a | 0 |
| Still unknown after this checkpoint | n/a | 87 |

The counts overlap because a single corpus row can touch multiple families. The
actionable strike count is the distinct `805` rows touching `plot`, `na`, or
`nz`, each of which failed a documented vector oracle in this checkpoint.

No PineTS-sole row becomes fully allowlisted yet: every row that touches a
promoted family also touches another unprobed, partial, or struck family.

## Family Verdicts

| Family | Rows gated | Verdict | Probe result |
| --- | ---: | --- | --- |
| `member:plot` | 765 | Proven wrong | `priority.visual-output-metadata-values` mismatched: `plot[2][0] null != 1` |
| `member:input` | 695 | Cannot run | `priority.input-confirm-display-edge-values` failed with `ReferenceError: Choice is not defined` |
| `member:input.int` | 607 | Partial PineTS support | `priority.input-declaration-qualifier-metadata-values` matched; `priority.input-confirm-display-edge-values` failed with `ReferenceError: Choice is not defined` |
| `member:true` | 563 | Promoted | `property.single.true` matched |
| `member:na` | 551 | Proven wrong | `array.new-default-na-values` mismatched: `plot[1][0] 0 != 1`; `property.single.na` matched |
| `member:false` | 447 | Promoted | `property.single.false` matched |
| `member:color.yellow` | 437 | Promoted | `property.single.color.yellow` matched |
| `member:input.source` | 362 | Promoted | `priority.input-context-metadata-values` matched |
| `member:nz` | 334 | Proven wrong | `priority.math-workhorse-expression-values` mismatched: `plot[2][0] null != 0`; `property.single.nz` matched |
| `member:color.new` | 326 | Promoted | All four named color-new probes matched |

## Interpretation

This checkpoint changes the trust-map posture sharply:

- `plot`, `na`, and `nz` are not merely unprobed. PineTS is proven wrong against
  existing documented vector oracles for those families.
- `true`, `false`, `color.yellow`, `input.source`, and `color.new` are proven
  correct for the named family probes, but they do not by themselves allowlist
  any PineTS-sole row.
- `input` and `input.int` remain evidence gaps because PineTS cannot run the
  option/choice-shaped input probe. That is not wrong-value evidence.

The top-ten result says the tail is unlikely to rescue the current PineTS-sole
canon pool. A high-exposure family, `plot`, is already wrong, and that alone
contaminates most of the previously unprobed rows.

## Next Step

Route the `805` struck rows out of the candidate defect list. Keep the `87`
remaining unknown rows and the `input`/`input.int` partials in the unprobed
bucket unless a later full-family pass or a PineTS-compatible isolated oracle
settles them.

No engine behavior or consensus harness behavior was changed for this report.
