> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v5 Rerun 014ff37f39 v1

## Basis

- Measurement commit: `014ff37f39d2e23b3ef33cd86f48a2048832b978`.
- Corpus: `packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910`.
- Runner: `yarn workspace @tealstreet/tealscript pine:external-corpus:pinned`.
- Standard bars: `createStandardCorpusBars()` from `packages/tealscript/scripts/run-external-pine-corpus.ts`.
- The known deep-expression timeout row is excluded from the main run and merged back with the package merge helper, preserving the fixed denominator while avoiding one pathological row blocking the measurement.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:pinned \
  --commit 014ff37f39 \
  --input /Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910 \
  --output /Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910/runs-014ff37f39/report-014ff37f39-daily-non-timeout.json \
  --exclude-script sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine

yarn workspace @tealstreet/tealscript pine:external-corpus:merge-pinned \
  --input /Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910/runs-014ff37f39/report-014ff37f39-daily-non-timeout.json \
  --timeout-row sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine \
  --output /Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910/runs-014ff37f39/report-014ff37f39-daily.json
```

## Headline

- Current daily profile: `854/1000` raw output, `854/926` achievable output (`92.22%`).
- Previous daily baseline cited for this pass: `840/931` achievable output.
- Net support movement: `+19` support gains, `0` support losses.
- Denominator movement: `-5` achievable rows from invalid/corpus-hygiene reclassification.
- Still-gap stage movement: `2` rows changed failure stage without becoming supported.

## Support Gains

| Row | Prior cause | Current outcome |
| --- | --- | --- |
| `sources/0010__kdkiss-technical-analysis-pinescript__jbands.pine` | tuple-shape | supported |
| `sources/0121__GustavoAMederos-TradingView__rmed.pine` | array.sort arity | supported |
| `sources/0197__tradearcher-charting-script-framework__apo.pine` | unknown identifier `source` | supported |
| `sources/0352__QuantAlgo-TradingView__yzvama.pine` | array.sort arity | supported |
| `sources/0539__fisher_transform_advanced.pine` | unknown `e6` | supported |
| `sources/0550__roc_advanced.pine` | unknown `e6` | supported |
| `sources/0551__rsi_advanced.pine` | unknown `e6` | supported |
| `sources/0553__tsi_advanced.pine` | unknown `e6` | supported |
| `sources/0558__williams_r_advanced.pine` | unknown `e6` | supported |
| `sources/0598__time_to_react_volatility_time.pine` | `math.tanh` | supported |
| `sources/0736__SuperTrend_Relative_Volume_Volatility.pine` | duplicate argument | supported |
| `sources/0753__scanner_momentum_setup.pine` | `matrix.add_row` arity | supported |
| `sources/0767__Tidal-Wave.pine` | `line.get_y1` arity | supported |
| `sources/0805__scanner_ict_mitigation_block_scanner.pine` | `matrix.add_row` arity | supported |
| `sources/0853__hooplah-high-low-table.pine` | `table.clear` arity | supported |
| `sources/0865__John_F_Ehlers_Advanced.pine` | unknown `avg_sig` | supported |
| `sources/0948__lower-forecast.pine` | `table.cell(table_id=...)` | supported |
| `sources/0978__unsupported_array_sort_box.pine` | array.sort arity | supported |
| `sources/0999__xact-internals.pine` | tuple-shape | supported |

## Bucket Changes

- `6` former gaps now classify outside the achievable denominator after later failures became visible: `0263`, `0269`, `0271`, `0273`, `0566`, `0740`.
- `2` still-gap rows changed stage: `0502` moved from parse to data-gated output on daily bars; `0866` moved from tuple-shape to unresolved official `TradingView/ta/4`.
- No support loss was observed on the daily fixture.

## Current Top Failure Causes

| Cause | Rows |
| --- | ---: |
| `semantic:type-mismatch` | 26 |
| `semantic:unknown-argument` | 23 |
| `parse:unexpected-token` | 19 |
| `semantic:unresolved-import` | 11 |
| `output:conditional-or-data-gated-output-not-triggered` | 8 |
| `semantic:duplicate-symbol` | 8 |
| `semantic:unknown-identifier` | 8 |
| `semantic:duplicate-argument` | 7 |
| `execute:array-bounds-runtime-error` | 6 |
| `semantic:implicit-numeric-bool` | 5 |
| `semantic:qualifier-mismatch` | 4 |
| `execute:runtime.error` | 3 |

## Context-Stress Before Profile Fix

- Context-stress profile at the same commit before profile adjustment: `852/926` achievable output.
- Movement against the previous context profile: `+20` support gains, `3` support losses, `6` denominator reclassifications, and `1` still-gap stage change.
- The three losses were fixture-profile misses: `0511` last-bar scenario gate, `0759` final-lookback FVG/IFVG gate, and `0769` the `0845-0846` session gate.
- The stress profile is being adjusted separately so those rows do not fail merely because the synthetic final window misses ordinary market shapes.
