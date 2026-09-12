# External Pine Consensus Shape Disagreement Audit v1

Source report: `external-pine-consensus-full-v1.{md,json}` at commit `63e3e1805b`.
Measured engine commit in that report: `d84e433c0463305dcdbf8d5b49838ddbec6642f6`.

This audit is read-only on the consensus harness. It did not modify
`scripts/run-external-pine-consensus-*.ts`.

## Headline

The 228 `voters-differ` / `shape` rows are not 228 per-script value disagreements.
They are all plot-count disagreements between the two external voters. No row in
this shape set is a plot-series-length mismatch, trailing-null mismatch, or
ordering-only mismatch in the committed report.

Static source counting over the exact recorded GitHub commit/path for each row
shows that TealScript's emitted plot count equals the source-level visual output
call count in all 228 rows. PineTS equals that count in 195 rows. Pine-A-Script
equals it in 0 rows.

Verdict: the 228 shape rows are an instrument/output-surface artifact, not a
TealScript defect signal and not useful external consensus rows until the
harness either normalizes each engine to the same output families or excludes
unsupported visual families from the vote.

## Method

- Parsed the committed JSON report from `63e3e1805b`.
- Selected rows with `comparison == "voters-differ"` and
  `differenceClass == "shape"`.
- Fetched all 228 source files from their recorded `sourceRepoUrl`,
  `commitSha`, and `sourceFilePath`.
- Counted comment-stripped source calls to:
  `plot`, `hline`, `fill`, `bgcolor`, `barcolor`, `plotshape`, `plotchar`,
  `plotarrow`, `plotbar`, and `plotcandle`.
- Compared those static counts to the three report title arrays.

The source counter is intentionally simple, but the cross-check is strong here:
TealScript's reported output count matched the static visual-output call count
for 228/228 rows.

## Actual Shape Buckets

| Bucket | Rows | Outlier | Systematic? | Verdict |
|---|---:|---|---|---|
| Plot count differs, Pine-A-Script side empty | 50 | Pine-A-Script | Yes | Instrument: Pine-A-Script emitted no comparable plot payload for visual-only scripts. |
| Plot count differs, all sides non-empty | 178 | Pine-A-Script in all; PineTS also in 27 | Yes | Instrument: Pine-A-Script under-emits visual outputs; PineTS also collapses/omits some visual outputs. |
| Series length differs | 0 | None | N/A | Not present in the committed 228 shape rows. |
| Trailing-null differs | 0 | None | N/A | Not present as a shape row in this report. |
| Ordering-only differs | 0 | None | N/A | Not present as the first shape mismatch; count fails first. |

The harness classifies shape from `comparePlotSets(pineTS, pineAScript)`.
In this report every shape row's `firstDifference` starts with `plot count`.
There are no `plot[n] length ...` shape rows.

## Cause Buckets

| Cause bucket | Rows | Count pattern | Outlier | Verdict |
|---|---:|---|---|---|
| Pine-A-Script visual-output under-capture only | 195 | PineTS count = TealScript count; Pine-A-Script lower | Pine-A-Script | Instrument. Pine-A-Script is not exposing the same visual-output surface as PineTS/TealScript. |
| Pine-A-Script under-capture plus PineTS collapse/omission | 33 | TealScript count = static source count; both external voters lower | Pine-A-Script and PineTS | Instrument. PineTS additionally loses multiplicity or visual outputs, commonly through duplicate/default plot keys. |

There are no rows where the two external engines agree on shape while TealScript
differs. That would have appeared as `tealscript-differs`, not `voters-differ`.

## Pine-A-Script Pattern

Pine-A-Script is present in every shape mismatch.

Static output calls across all 228 shape rows:

| Function | Calls |
|---|---:|
| `plot` | 791 |
| `hline` | 177 |
| `fill` | 154 |
| `bgcolor` | 108 |
| `barcolor` | 32 |
| `plotshape` | 439 |
| `plotchar` | 11 |
| `plotarrow` | 1 |
| `plotbar` | 1 |
| `plotcandle` | 8 |

Pine-A-Script matched `plot + hline` count in 219/228 rows, but matched the
full visual-output call count in 0/228 rows. That lines up with the harness
adapter: it repairs `hline()` into `plot()` and extracts `result.plots`, but it
does not make Pine-A-Script expose `fill`, `bgcolor`, `barcolor`, `plotshape`,
`plotchar`, `plotarrow`, `plotbar`, or `plotcandle` as comparable plot payloads.

The 50 one-side-empty rows are the clearest signal. They are scripts whose
source output is visual-only from Pine-A-Script's point of view: no plain
`plot`/`hline` payload survives into its `result.plots`, while PineTS and/or
TealScript still report visual output.

Examples:

| Row | Counts PineTS/Pine-A-Script/TealScript | Static calls | Reading |
|---|---|---|---|
| `v5 0024` | `1/0/1` | `plotcandle:1` | Pine-A-Script empty on `plotcandle`. |
| `v5 0505` | `2/0/2` | `plotshape:2` | Pine-A-Script empty on `plotshape`. |
| `v5 0731` | `1/0/1` | `bgcolor:1` | Pine-A-Script empty on `bgcolor`. |
| `v6 0096` | `1/0/1` | `barcolor:1` | Pine-A-Script empty on `barcolor`. |

The non-empty Pine-A-Script rows show the same rule with mixed output scripts:
Pine-A-Script usually captures the plain `plot`/repaired `hline` subset and
drops the rest.

Examples:

| Row | Counts PineTS/Pine-A-Script/TealScript | Static calls | Reading |
|---|---|---|---|
| `v5 0479` | `3/1/3` | `plot:1`, `bgcolor:1`, `barcolor:1` | Pine-A-Script captured only the plain plot. |
| `v5 0482` | `16/5/16` | `plot:5`, `fill:2`, `plotshape:9` | Pine-A-Script captured only the plain plots. |
| `v5 0488` | `7/5/7` | `plot:2`, `hline:3`, `plotshape:2` | Pine-A-Script captured plot/hline, not shapes. |
| `v5 0548` | `6/5/6` | `plot:5`, `fill:1` | Pine-A-Script captured plots, not fill. |

Nine rows do not equal exactly `plot + hline` on the Pine-A-Script side. Those
are still adapter/engine-surface issues, not per-script value disagreements:
examples include object-valued plot option/title handling, hline repair edge
cases, and the one synthetic `plotarrow` fixture (`v6 0678`) where Pine-A-Script
reported `arrow_3`.

## PineTS Pattern

PineTS matched the static visual-output count in 195/228 rows. The remaining 33
rows are also systematic rather than per-script: TealScript still equals the
static source count, while PineTS reports fewer outputs.

The shape of the missing outputs points at PineTS output-object keying and
partial visual surface capture:

- Duplicate titles can collapse multiple outputs into one object key. `v5 0468`
  has 24 `plot()` calls, 24 `plotshape()` calls using the same titles, and one
  `hline()`: static total 49, TealScript 49, PineTS 25.
- Multiple untitled/default visual calls collapse under generic titles such as
  `plot`, `#0`, or similar keys. Rows such as `v5 0841` and `v5 0946` have two
  `plotshape()` calls, but PineTS reports one generic `plot`.
- Repeated background/bar coloring calls often collapse or under-report. Rows
  such as `v6 0338` have three `bgcolor()` calls: static total 6, TealScript 6,
  PineTS 4.

Examples:

| Row | Counts PineTS/Pine-A-Script/TealScript | Static calls | Reading |
|---|---|---|---|
| `v5 0468` | `25/24/49` | `plot:24`, `hline:1`, `plotshape:24` | PineTS collapsed or overwrote shape outputs sharing plot titles; Pine-A-Script captured plain plots only. |
| `v5 0743` | `3/2/6` | `plot:2`, `plotshape:4` | PineTS retained one generic shape output; Pine-A-Script captured only plots. |
| `v6 0338` | `4/3/6` | `plot:3`, `bgcolor:3` | PineTS under-reported repeated background outputs; Pine-A-Script captured only plots. |
| `v7 0399` | `25/11/26` | `plot:6`, `hline:5`, `fill:3`, `bgcolor:3`, `barcolor:3`, `plotshape:3`, `plotchar:3` | PineTS nearly full but missing one visual output; Pine-A-Script captured only plot/hline. |

This is not evidence that TealScript has extra outputs. In all 33 rows,
TealScript's count equals the static source output call count.

## Instrument vs Real Divergence

| Question | Answer |
|---|---|
| Are the 228 rows real TealScript defects? | No. They are `voters-differ` rows, and TealScript matches static output-call count in all 228. |
| Are they real external engine divergences? | They are real differences in the output surfaces exposed by the two external engines/adapters, but not useful Pine value divergence. |
| Is the largest class systematic? | Yes. Pine-A-Script under-captures non-plot visual surfaces in every row. |
| Is there a smaller second systematic class? | Yes. PineTS loses visual-output multiplicity in 33 rows, usually from duplicate/default output keys or partial visual capture. |
| Are there per-script shape disagreements left after these rules? | No evidence in this report. The two rules account for all 228 shape rows. |

## Recommendation For Harness Owner

Do not treat these rows as value-oracle disagreements until the shape adapter is
made family-aware.

Reasonable repair directions:

1. Compare only output families each external engine actually exposes for the
   consensus vote, and record dropped families explicitly.
2. Extend the Pine-A-Script adapter to expose the missing visual families if the
   engine has them internally.
3. Preserve output multiplicity for PineTS where possible; if the upstream
   result is already object-key-collapsed, mark duplicate/default-key rows as
   non-comparable rather than as value disagreements.

Until then, the 228 shape rows should be classified as instrument limitations:
`pine-a-script-output-surface-under-capture` for the full set, with a nested
`pinets-output-key-collapse` flag for the 33 rows where PineTS also undercounts.
