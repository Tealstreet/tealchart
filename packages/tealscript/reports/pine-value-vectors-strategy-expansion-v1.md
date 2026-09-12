> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Strategy Expansion V1

Source report: `pine-value-vectors-coverage-v82.md`.

## Summary

- Total value-vector cases: 261.
- Added strategy/order-facing cases: 4.
- Compiled matches: 260/261.
- Public compiled wrapper matches: 260/261.
- Expected failures: 1.
- Unexpected failures: 0.
- Unexpected passes: 0.
- Builtin value coverage: 105/489 documented members, up from 87/489.

## Added Coverage

- Market `strategy.entry()` plus `strategy.close()` position and P&L series.
- Price-based `strategy.exit()` fills over chart OHLC.
- `strategy.closedtrades.*` entry, exit, profit, and size accessors.
- `strategy.opentrades.*` entry, profit, size, and capital-held accessors.

The added fixtures use deterministic OHLCV bars and concrete expected series
derived from Pine's broker emulator timing and strategy accessor rules.
