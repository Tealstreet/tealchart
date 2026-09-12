> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v2

The risk-focused vector set now covers `23/74` names in the committed Pine v6
`ta.*` inventory (`31.1%`) using independent deterministic formulas. It runs
23 call forms over the fixed 12-bar OHLCV series with `1e-9` absolute float
tolerance, comparing both `executeCompiled()` and the public `executeScript()`
wrapper.

Command:

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors /tmp/pine-value-vectors-v5.json
```

Current result: `23/23` compiled matches and `23/23` public-path matches.
The earlier `ta.highest`/`ta.lowest` warm-up mismatches are no longer present
in this working tree: both now return the required two leading `na` values for
length 3. The source change is owned by the runtime agent and is intentionally
not included in this corpus/report commit.

The added risk cases are `ta.barssince`, `ta.valuewhen`, `ta.crossover`,
`ta.pivothigh`, `ta.pivotlow`, `ta.highestbars`, `ta.lowestbars`, `ta.range`,
and `ta.mom`. Their vectors explicitly cover first-event `na`, confirmed pivot
delay, full-window warm-up, extrema offsets, and fixed historical momentum.

The covered fraction is formula coverage, not complete overload coverage. The
remaining `ta.*` names and all context-dependent namespaces stay in the
separate ground-truth-required list in [coverage v1](./pine-value-vectors-coverage-v1.md).
