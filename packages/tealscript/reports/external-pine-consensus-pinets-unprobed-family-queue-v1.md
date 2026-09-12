# External Pine Consensus PineTS Unprobed Family Queue v1

Generated: 2026-09-12

Code under test: `dc2fbac78e`

Companion data:
`external-pine-consensus-pinets-unprobed-family-queue-v1.json`.

## Purpose

`external-pine-consensus-pinets-positive-trust-map-v1.md` found an empty
row-level allowlist for PineTS-sole canon: `0 / 1338` rows are proven correct,
`446` are proven wrong, and `892` are unprobed. This report turns the `284`
unprobed families into a build queue.

## Reading Confirmed Or Killed

The initial reading was:

> A family is unprobed because we have no oracle there.

That reading is **mostly wrong**. The unprobed map is not primarily a TealScript
oracle gap. It is a PineTS-trust gap.

All `284` unprobed families already have a TealScript-side value-vector or
grammar oracle in the current suite. They are unprobed because PineTS was not
exercised against that family in the positive trust pass, or because PineTS
could not run the existing oracle shape.

| Reason | Families | Distinct unprobed PineTS-sole rows gated |
| --- | ---: | ---: |
| Existing value-vector oracle; PineTS not run against this member family | 263 | 892 |
| Existing grammar/language oracle; PineTS cannot run current shape | 19 | 0 |
| Existing language oracle partially ran, but at least one subcase cannot run | 2 | 0 |

Sample check:

| Sample | Verdict |
| --- | --- |
| `member:plot`, `member:input`, `member:color.new`, `member:ta.sma`, `member:array.get` | The value-vector suite already has an oracle. The missing piece is a targeted PineTS run against that oracle family. |
| `grammar:imports.explicit-alias`, `grammar:methods.declaration`, `grammar:operators.bitwise` | Grammar snippets already define the syntax question. PineTS cannot currently run or express the snippet, so the family is unprobed rather than wrong. |
| `language.branch-evaluation`, `language.switch` | Existing language vectors cover the behavior, but PineTS cannot run at least one subcase. Split the family or isolate PineTS-compatible subcases before allowlisting. |

## Actionability Split

| Action | Families | Distinct unprobed PineTS-sole rows gated |
| --- | ---: | ---: |
| Close locally with targeted PineTS probes against existing value-vector oracles | 263 | 892 |
| Not a new vector hole; current PineTS cannot exercise the existing oracle | 19 | 0 |
| Split family or isolate PineTS-compatible subcase | 2 | 0 |
| Needs TradingView to know correct behavior | 0 | 0 |

The decisive result is that the actionable work this week is local: targeted
PineTS probes over already-cited value-vector oracles. TradingView evidence is
not needed to know the expected behavior for these `284` families. It may still
be needed elsewhere, but not for this queue.

## Ranked Families

Ranked by the number of unprobed PineTS-sole canon rows in which the family
appears. Counts overlap because a row can touch many families.

| Rank | Family | Rows gated | Current oracle examples |
| ---: | --- | ---: | --- |
| 1 | `member:plot` | 765 | `priority.visual-output-metadata-values` |
| 2 | `member:input` | 695 | `priority.input-confirm-display-edge-values` |
| 3 | `member:input.int` | 607 | `priority.input-declaration-qualifier-metadata-values`; `priority.input-confirm-display-edge-values` |
| 4 | `member:true` | 563 | `property.single.true` |
| 5 | `member:na` | 551 | `array.new-default-na-values`; `property.single.na` |
| 6 | `member:false` | 447 | `property.single.false` |
| 7 | `member:color.yellow` | 437 | `property.single.color.yellow` |
| 8 | `member:input.source` | 362 | `priority.input-context-metadata-values` |
| 9 | `member:nz` | 334 | `property.single.nz`; `priority.math-workhorse-expression-values` |
| 10 | `member:color.new` | 326 | `depth.color-new-series-transparency-values`; `priority.color-fractional-transparency-values`; `priority.color-new-nested-transparency-values` |
| 11 | `member:color.red` | 312 | `priority.color-new-conditional-source-values`; `property.single.color.red` |
| 12 | `member:math.max` | 297 | `depth.math-variadic-round-values`; `depth.math-composed-workhorse-values`; `priority.math-workhorse-expression-values` |
| 13 | `member:bool` | 290 | `property.single.bool` |
| 14 | `member:input.float` | 267 | `priority.input-declaration-qualifier-metadata-values`; `priority.input-confirm-display-edge-values` |
| 15 | `member:color.green` | 242 | `priority.color-new-conditional-source-values`; `property.single.color.green` |
| 16 | `member:array.get` | 223 | `array.new-default-na-values`; `depth.array-receiver-mutation-values`; `priority.array-new-get-history-values` |
| 17 | `member:color.gray` | 208 | `property.single.color.gray` |
| 18 | `member:array.new_float` | 204 | `property.single.array.new_float`; `array.new-default-na-values` |
| 19 | `member:math.min` | 202 | `depth.math-variadic-round-values`; `priority.math-workhorse-expression-values` |
| 20 | `member:input.bool` | 191 | `priority.input-declaration-qualifier-metadata-values`; `priority.input-confirm-display-edge-values` |
| 21 | `member:array.set` | 182 | `depth.array-receiver-mutation-values`; `priority.array-set-variable-index-values` |
| 22 | `member:plotshape` | 180 | `depth.plotshape-conditional-metadata-values`; `priority.visual-output-metadata-values` |
| 23 | `member:ta.sma` | 180 | `depth.ta-named-workhorse-values`; `priority.ta-workhorse-history-values` |
| 24 | `member:color.blue` | 177 | `priority.color-fractional-transparency-values`; `property.single.color.blue` |
| 25 | `member:math.abs` | 171 | `depth.math-composed-workhorse-values` |

The full ranked list is in the JSON companion under `rankedFamilies`.

## Greedy Build Order

If the goal is to cover the `892` unprobed PineTS-sole rows quickly, the overlap
is steep. This greedy cover adds families by marginal rows newly covered:

| Step | Family | Marginal rows | Total rows for family | Example oracle |
| ---: | --- | ---: | ---: | --- |
| 1 | `member:plot` | 765 | 765 | `priority.visual-output-metadata-values` |
| 2 | `member:input` | 55 | 695 | `priority.input-confirm-display-edge-values` |
| 3 | `member:true` | 29 | 563 | `property.single.true` |
| 4 | `member:na` | 1 | 551 | `array.new-default-na-values` |
| 5 | `member:color.new` | 1 | 326 | `depth.color-new-series-transparency-values` |
| 6 | `member:array.get` | 2 | 223 | `array.new-default-na-values` |
| 7 | `member:bar_index` | 4 | 169 | `property.single.bar_index` |
| 8 | `member:strategy` | 11 | 162 | `optional.strategy-declaration-high-use-arguments` |
| 9 | `member:fill` | 2 | 119 | `priority.visual-output-metadata-values` |
| 10 | `member:str.tostring` | 21 | 103 | `property.single.str.tostring` |
| 11 | `member:str.format` | 1 | 9 | `property.single.str.format` |

This is a row-coverage order, not necessarily the best engineering order. The
top family, `plot`, appears in most scripts because output is how the corpus is
observed; validating `plot` alone does not validate the whole row. The useful
interpretation is build priority: start with the broad primitives, then rerun
the trust map and let the remaining rows expose narrower behavior.

## Recommended Queue

1. Run targeted PineTS probes for the top `value-vector-member` families using
   the existing value-vector cases and expected values. Start with `plot`,
   `input`, `input.int`, `true`, `na`, `false`, `color.*`, `nz`,
   `color.new`, `math.max`, `array.get`, and the TA workhorses.
2. After each batch, regenerate the positive trust map. Promote a family only
   when PineTS matches the existing documented/hand-derived oracle; strike it if
   PineTS disagrees.
3. Keep the `21` cannot-run families out of the allowlist. They are not
   wrong-value evidence, but they also cannot justify PineTS-sole canon until
   PineTS can run an isolated version or another independent oracle covers the
   row.

No engine behavior or consensus harness behavior was changed for this report.
