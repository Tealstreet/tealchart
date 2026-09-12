# External Pine Consensus PineTS Taint Follow-up v1

Measured at `83fcdeecdb564e1cefe7c7c6b8d289792a558c52`.

Inputs:

- Full consensus run: `reports/external-pine-consensus-full-v1.json`.
- Survivor triage with PineTS contamination filter: `reports/external-pine-consensus-survivor-triage-v1.json`.
- PineTS documented-oracle audit: `reports/external-pine-consensus-pinets-grammar-precedence-audit-v1.json`, from codex-jk7l2w `dc2fbac78e`.
- Deterministic bar/context fixtures: `reports/external-pine-consensus-pilot-bars-v1.json`, `reports/external-pine-consensus-pilot-context-v1.json`.

## PineTS Taint Strike

The PineTS grammar/precedence audit marks PineTS unsafe as blanket sole canon. Applying documented-oracle contamination to the 119 automatic value candidates strikes 52 rows, leaving 67 candidates:

- 119 automatic value candidates before the strike.
- 52 struck as PineTS-contaminated by documented-oracle failures.
- 67 survive after the strike.
- 0 surviving candidates have two-voter `external-consensus` provenance.
- Surviving provenance: 65 `pinets-sole`, 2 `pine-a-script-sole`.

Held sets were rescored against the same contamination families:

- Material finite mismatches: 24 total, 9 struck, 15 remain.
- Warmup/seeding: 55 total, 31 struck, 24 remain.
- Combined held set: 79 total, 40 struck, 39 remain.

The headline taint remains visible on the full run: 446/1338 PineTS-sole canon rows and 319/716 PineTS-sole differing rows are contaminated by families where PineTS failed documented vectors. No sole-voter convention should be adopted until the positive PineTS trust map lands.

Update after codex-jk7l2w's top-ten PineTS family probe at `abbeda9f9d`: the positive trust map found `0` fully allowlisted PineTS-sole rows, and the top-ten probe proved PineTS wrong against documented `plot`, `na`, and `nz` value-vector probes. `reports/external-pine-consensus-pinets-top10-strike-rerank-v1.md` applies that `805`-row strike to the `67` survivor rows from this report: all `65` PineTS-sole survivors are struck, leaving only `2` Pine-A-Script-sole warmup rows and still `0` two-voter external-consensus survivors.

## Null-Deep Follow-up

The original 19 TealScript-null/external-finite rows shrink to 12 after the PineTS contamination strike. Re-executing those 12 against the committed 240-bar fixture shows they are not silent mid-series stops: every row is null until its own first finite bar, then remains finite through bar 239. This kills the history-buffer-exhaustion hypothesis for the untainted remainder.

| Row | First difference | TealScript first finite bar | Nulls after first finite | Shape |
|---|---|---:|---:|---|
| `v5 0250` | plot[0][10] 110.5890140377 != null | 22 | 0 | swing confirmation warmup |
| `v5 0718` | plot[0][15] 133.7801297163 != null | 73 | 0 | FRAMA/window warmup |
| `v5 0751` | plot[0][13] 100 != null | 14 | 0 | RSI/RMA first-valid boundary |
| `v6 0144` | plot[0][13] 100 != null | 14 | 0 | RSI/RMA first-valid boundary |
| `v6 0215` | plot[0][13] 7.14285714 != null | 27 | 0 | ADX/window warmup |
| `v6 0411` | plot[0][13] 100 != null | 14 | 0 | RSI/RMA first-valid boundary |
| `v6 0416` | plot[0][13] 100 != null | 14 | 0 | RSI/RMA first-valid boundary |
| `v6 0533` | plot[0][13] 100 != null | 14 | 0 | RSI/RMA first-valid boundary |
| `v6 0630` | plot[0][70] 135.3758808211 != null | 71 | 0 | Donchian/window warmup |
| `v6 0891` | plot[0][4] 106.5216974434 != null | 5 | 0 | breakout/window warmup |
| `v7 0295` | plot[0][38] 102.2180975053 != null | 39 | 0 | MA/window warmup |
| `v7 0329` | plot[0][47] 3416256000312.276 != null | 53 | 0 | fixture-authored delayed finite |

Conclusion: after the PineTS taint strike, the "deep null" set is better described as first-valid/warmup boundary disagreement, not buffer exhaustion or partial-series truncation. The max_bars_back/history-buffer exhaustion hypothesis is explicitly disconfirmed for this set: the first finite/first null bars align with warmup boundaries, and the rows do not share a mid-series truncation shape. It remains sole-voter evidence and should stay held until the PineTS positive trust map says these families are safe, or documentation/hand-derived vectors adjudicate the first-valid boundary.

## Sign Flip Follow-up

`v5 0051` was unstruck by the PineTS taint audit and has now been resolved as a documented TealScript sign-convention defect. The script is `indicators/dynamics/aroonosc.pine` and computes:

```pine
highest_pos = ta.highestbars(high, period)
lowest_pos = ta.lowestbars(low, period)
aroon_up = 100 * (period + highest_pos) / period
aroon_down = 100 * (period + lowest_pos) / period
oscillator = aroon_up - aroon_down
```

At bar 24 before the fix, PineTS reported `68` and TealScript reported `-68`. Reproducing the expression on the committed bars showed TealScript returned positive bars-ago offsets for `ta.highestbars/ta.lowestbars`, yielding `-68`.

Independent source evidence points the other way: `packages/tealscript/src/officialTradingViewLibrarySources.ts` implements the official `aroon()` helper as:

```pine
float aroonDown = 100 * (ta.lowestbars(low,   length) + length) / length
float aroonUp   = 100 * (ta.highestbars(high, length) + length) / length
```

That formula only has the expected Aroon range if `ta.highestbars/ta.lowestbars` return negative-or-zero offsets. PineCoders' FAQ independently documents the same negative-offset convention. This is documented provenance, not `external-consensus`: PineTS pointed at the row, but the documentary sources settle it.

Contradiction resolution:

- Direct value-vector cases for `ta.highestbars` and `ta.lowestbars` already existed, but their expected values were formula-derived from TealScript's local helper and encoded the wrong positive sign.
- The `tradingview-ta.aroon.v7` vector also existed and passed only because both the local expected-value helper and `src/officialTradingViewLibraries.ts` compensated with `len - offset`.
- The committed official TradingView library source in `src/officialTradingViewLibrarySources.ts` uses `offset + length`; the TealScript wrapper now matches that source.
- The source row declares `//@version=6`. Evidence checked across the available version axis found the same negative convention in PineCoders' v4-era FAQ, current v6 reference/source material, and the v5/v6 corpus formula. No contrary v3-v6 evidence was found.

Fix landed in the runtime extrema-bars classes, the official-library `aroon()` wrapper, and the documented value-vector helpers/cases. The single-row repro now emits `68` at bar 24 for `v5 0051` on the committed consensus bars. Current vector report confirms `ta.highestbars`, `ta.lowestbars`, hostile plateau/middle-na variants, and `tradingview-ta.aroon.v7` all match under negative offsets with complete source citations. The follow-up vector gate is back to the expected shape: `988/989` passing with only `strategy.calc-on-order-fills-values` expected-red.

Related instrument note: a commit-boundary check showed `visual.plot-hline-fill-metadata-values` and `visual.constant-identity-values` first went red at `75f4f9708e`, the hline payload fix. That was not a runtime regression; those two vectors still expected old zero-length hline payloads (`[]`). Updating their expected hline outputs to per-bar constants restores the vector gate.

## Precision Rows

The five precision/accumulation-order rows are closed as not-defects for this audit:

- `v5 0120`
- `v5 0262`
- `v5 0266`
- `v6 0028`
- `v6 0237`

All five are small absolute/relative differences consistent with floating accumulation order under a 1e-6 comparison threshold. The earlier hypothesis that PineTS truncates all values to 10 decimal places is rejected: the stored examples include canonical external values with up to 16 decimal places.
