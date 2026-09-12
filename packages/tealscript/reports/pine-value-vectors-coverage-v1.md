> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v1

The fixed synthetic OHLCV vector now exercises 18 distinct `ta.*` call forms
from the 74 names in the committed Pine v6 reference inventory: `18/74`
(`24.3%`) formula-covered. The run uses 12 bars, a `1e-9` absolute tolerance,
and compares both `executeCompiled()` and the public `executeScript()` wrapper
to the independent oracle.

Command:

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors /tmp/pine-value-vectors-v4.json
```

Measured result: `16/18` matches on each path. `ta.ema`, `ta.rsi`,
`ta.barssince`, `ta.valuewhen`, `ta.crossover`, and `ta.pivothigh` match their
oracles. `ta.highest` and `ta.lowest` remain the two confirmed warm-up defects
recorded in [the adjudication report](./pine-value-vectors-adjudication-v1.md):
both return partial-window values where Pine requires two leading `na` bars for
the length-3 vector.

## Formula-Covered Calls

| Family | Covered calls | Independent rule |
| --- | --- | --- |
| Rolling windows | `ta.sma`, `ta.stdev`, `ta.variance`, `ta.highest`, `ta.lowest`, `ta.wma`, `ta.dev`, `ta.vwma` | Fixed lookback windows, population variance, weighted mean, and extrema with Pine warm-up rules. |
| Recursive smoothing | `ta.ema`, `ta.rma`, `ta.atr` | EMA first-value seed, Wilder RMA seed and recurrence, and true range followed by RMA. |
| Event/state | `ta.rsi`, `ta.cum`, `ta.change`, `ta.barssince`, `ta.valuewhen` | Wilder RSI, cumulative sum, one-bar difference, elapsed bars since a condition, and most recent qualifying source value. |
| Comparisons/pivots | `ta.crossover`, `ta.pivothigh` | Strict current crossing with previous-bar confirmation, and confirmed pivot output delayed by `rightbars`. |

The count is call-form coverage, not a claim that every overload or edge case
of those names is covered. The v6 name-surface denominator is the 74-name `ta`
list in `src/compat/pineV6BuiltinReference.ts`.

## Ground Truth Required

The following remain outside independent formula coverage because their result
depends on external context, runtime scheduling, or TradingView policy rather
than a fully specified local formula:

- `request.*` provider values, security context mapping, gaps/lookahead, and
  synthetic ticker modifiers;
- session/timezone/DST and chart/visible-range metadata;
- realtime rollback, bar-state behavior, repainting, and unconfirmed bars;
- drawing/table/line/box/polyline lifecycle, limits, and rendering metadata;
- strategy broker-emulator fills, order timing, equity, and risk state;
- imported-library registry behavior and host-provided input overrides;
- remaining `ta.*` calls whose exact seed, tie-breaking, `na` propagation, or
  path-dependent state is not stated sufficiently in the public v6 reference
  to derive a defensible local oracle.

Those domains need authoritative TradingView traces with identical source,
version, inputs, symbol, timeframe, session, timezone, and bar data. They are
tracked separately from the formula-covered fraction and are not silently
counted as numeric parity.
