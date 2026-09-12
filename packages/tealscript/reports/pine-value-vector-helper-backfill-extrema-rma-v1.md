# Pine Value Vector Helper Backfill Extrema/RMA Checkpoint v1

Generated: 2026-09-12T06:37:53.272Z
Measured source commit: `9176246f80` with this report script/report dirty in the worktree.

## Purpose

This is the first backfill checkpoint from `pine-value-vector-helper-backfill-priority-v1`. It retires the pure `ta.highest`/`ta.lowest` broad-citation rows first because they are siblings of the corrected `ta.highestbars`/`ta.lowestbars` wrong-oracle family, then analyzes the `ta.rma` dependency chain before any `rma`/`atr`/`rsi` rows are backfilled.

## Inputs

- Priority queue: `pine-value-vector-helper-backfill-priority-v1.json @ 962a27e8b4`.
- Value-vector runner source: `scripts/run-pine-value-vectors.ts`.

## Headline

- Extrema-value rows backfilled: 6.
- Extrema rows with validated red-first proof metadata: 6.
- Discrimination proof failures among backfilled rows: 0.
- `atr` and `rsi` expectations chain through `rma`; `mfi` does not.

## Extrema Rows

Re-derivation reproduced the current expectations. The expected values are the published rolling maximum/minimum over `length` non-`na` source values, not bars-ago offsets. That differs from the corrected `highestbars`/`lowestbars` sign family, so no sign flip applies to these value-returning siblings. The sibling check still paid off: it localized the wrong-oracle bug to the offset-returning members rather than clearing the whole extrema family by assumption.

| Case | Member | Rule/proof citation | Compiled | Public path |
| --- | --- | --- | --- | --- |
| `ta.highest` | `ta.highest` | Published formula: TradingView v6 Reference defines ta.highest(source, length) as the highest source value over length bars, with na values ignored so the calculation uses length non-na source values. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.highest | true | true |
| `ta.lowest` | `ta.lowest` | Published formula: TradingView v6 Reference defines ta.lowest(source, length) as the lowest source value over length bars, with na values ignored so the calculation uses length non-na source values. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.lowest | true | true |
| `hostile.highest.middle-na` | `ta.highest` | Published formula: TradingView v6 Reference defines ta.highest(source, length) as the highest source value over length bars, with na values ignored so the calculation uses length non-na source values. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.highest | true | true |
| `hostile.lowest.middle-na` | `ta.lowest` | Published formula: TradingView v6 Reference defines ta.lowest(source, length) as the lowest source value over length bars, with na values ignored so the calculation uses length non-na source values. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.lowest | true | true |
| `hostile.highest.multi-middle-na` | `ta.highest` | Published formula: TradingView v6 Reference defines ta.highest(source, length) as the highest source value over length bars, with na values ignored so the calculation uses length non-na source values. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.highest | true | true |
| `language.qualifier-helper-chain` | `ta.highest` | Published formula: TradingView v6 Reference defines ta.highest(source, length) as the highest source value over length bars, with na values ignored so the calculation uses length non-na source values. https://www.tradingview.com/pine-script-reference/v6/#fun_ta.highest | true | true |

## RMA Chain

| Helper | Broad rows | Depends on `rma` helper | Rows | Verdict |
| --- | --- | --- | --- | --- |
| `rma` | 8 | no | `hostile.rma.long`, `hostile.rma.long-middle-na`, `hostile.rma.middle-na`, `hostile.rma.multi-middle-na`, `hostile.rma.overlong`, `hostile.rma.synthetic.multi-middle-na`, `ta.rma`, `ta.smma` | Primitive helper for this chain; still broad-citation and not backfilled in this checkpoint. |
| `atr` | 4 | yes | `hostile.atr.middle-na`, `hostile.atr.multi-middle-na`, `hostile.atr.overlong`, `ta.atr` | Chained through local rma helper over true ranges; not independent until rma or direct ATR composition is re-derived. |
| `rsi` | 4 | yes | `hostile.rsi.flat`, `hostile.rsi.multi-middle-na`, `hostile.rsi.signed`, `ta.rsi` | Chained through local rma helper over gain/loss series; not independent until rma or direct RSI composition is re-derived. |
| `mfi` | 1 | no | `ta.mfi` | Standalone money-flow window helper; no rma dependency found in mfi/mfiFromSource. |

## Next Queue Implication

`ta.atr` and `ta.rsi` expectations flow through the local `rma` helper, so those vectors are not independent oracles until either `rma` itself is re-derived from a concrete published Wilder/RMA formula or each consumer is re-derived directly from its published composition. `ta.mfi` does not flow through `rma`; it is a standalone money-flow window helper and can be backfilled separately after the `rma` primitive is settled.
