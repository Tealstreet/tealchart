> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Runtime Metadata Expansion V1

Source report: `pine-value-vectors-coverage-v88.md`.

## Summary

- Added runtime metadata value vectors: 5.
- Newly value-covered documented members: 18.
- Total independent-oracle cases: 314.
- Compiled/public matches: 312/314.
- Expected failures: `language.collection-history-containers`, `drawing.chart-point-values`.
- Unexpected failures: 0.
- Unexpected passes: 0.
- Broader builtin value coverage: 227/489, 46.42%.

## Covered Members

- `barstate.*`: `barstate.isfirst`, `barstate.islast`,
  `barstate.isconfirmed`, `barstate.isrealtime`.
- `input.*`: `input.int`, `input.float`, `input.bool`, `input.source`.
- `syminfo.*`: `syminfo.mintick`, `syminfo.pricescale`,
  `syminfo.ticker`, `syminfo.currency`, `syminfo.basecurrency`.
- `timeframe.*`: `timeframe.period`, `timeframe.multiplier`,
  `timeframe.isminutes`, `timeframe.isintraday`, `timeframe.in_seconds`.
- `ticker.*`: `ticker.standard`, `ticker.modify`.

## Deliberate Gap

Realtime `varip` replacement semantics is still outside this historical vector
runner. TradingView documents `varip` as escaping rollback on realtime updates,
so the correct test needs a realtime value oracle over repeated same-time
updates, not a reconstructed historical window.
