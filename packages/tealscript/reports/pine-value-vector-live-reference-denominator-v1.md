Superseded by pine-value-vector-live-reference-denominator-v2.md. Historical measurement only.

# Pine Value Vector Live Reference Denominator V1

Measurement commit: `c130bcde33`.

## Finding

The quoted value-vector member coverage was measured against the committed reference snapshot, not the fuller live TradingView v6 callable reference. The snapshot figure remains an artifact metric; the live-reference-corrected figure is lower and is the honest answer to how much Pine member surface is covered.

## Headline

| Denominator | Covered | Total | Coverage | Meaning |
| --- | ---: | ---: | ---: | --- |
| Committed snapshot | `813` | `861` | `94.43%` | Coverage against the checked-in artifact used by existing member maps. |
| Snapshot plus live-reference callable correction | `813` | `886` | `91.76%` | Current honest coverage against the committed snapshot plus live-documented callable names absent from it. |

## Denominator Impact

- Live-reference integrity reported `345` live-documents/snapshot-lacks rows: `297` callable-member rows plus `48` parameter rows.
- Those rows collapse to `28` raw live-only callable names.
- Generic constructor syntax normalization makes `3` of them already represented by existing snapshot names: `array.new`, `map.new`, `matrix.new`.
- Net denominator expansion is therefore `25` names, all currently uncovered by value vectors.

## New Uncovered Live Names By Namespace

| Namespace | Names |
| --- | ---: |
| footprint | `9` |
| (global) | `1` |
| math | `1` |
| request | `3` |
| runtime | `1` |
| strategy | `2` |
| volume_row | `8` |

## New Uncovered Live Names

- `footprint.buy_volume`
- `footprint.delta`
- `footprint.get_row_by_price`
- `footprint.poc`
- `footprint.rows`
- `footprint.sell_volume`
- `footprint.total_volume`
- `footprint.vah`
- `footprint.val`
- `library`
- `math.random`
- `request.footprint`
- `request.quandl`
- `request.seed`
- `runtime.error`
- `strategy.risk.max_cons_loss_days`
- `strategy.risk.max_intraday_filled_orders`
- `volume_row.buy_volume`
- `volume_row.delta`
- `volume_row.down_price`
- `volume_row.has_buy_imbalance`
- `volume_row.has_sell_imbalance`
- `volume_row.sell_volume`
- `volume_row.total_volume`
- `volume_row.up_price`

## Interpretation

Use `813/886` (`91.76%`) when answering "how much of Pine do we cover". Use `813/861` only when explicitly discussing the committed snapshot artifact.

Limit: the live-reference integrity report is callable-focused. Constants and declarations still come from the committed snapshot until a full live-reference denominator migration replaces it.
