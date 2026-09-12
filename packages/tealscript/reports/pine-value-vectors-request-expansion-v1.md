> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Request Expansion V1

Source report: `pine-value-vectors-coverage-v83.md`.

## Summary

- Added request/host-data value vectors: 5.
- Newly value-covered request members: 7.
- Total independent-oracle cases: 266.
- Compiled/public matches: 265/266.
- Expected failures: `language.collection-history-containers`.
- Unexpected failures: 0.
- Unexpected passes: 0.
- Broader builtin value coverage: 112/489, 22.90%.

## New Cases

| Case | Members covered | Rule |
| --- | --- | --- |
| `request.security-barmerge-modes` | `request.security` | HTF requested data merges according to `barmerge.gaps_*` and `barmerge.lookahead_*`. |
| `request.security-lower-tf-lookahead` | `request.security` | LTF requested data selects first or last intrabar according to lookahead. |
| `request.currency-rate-points` | `request.currency_rate` | Currency rates use the latest available point for the requested pair. |
| `request.corporate-actions-points` | `request.dividends`, `request.earnings`, `request.splits` | Corporate-action event fields merge onto chart bars, with `gaps_on` emitting only event bars. |
| `request.financial-economic-points` | `request.financial`, `request.economic` | Financial and economic series use the latest reported point value. |

These are independent-oracle vectors over deterministic request datafeed
fixtures, not compiled-vs-public parity checks.
