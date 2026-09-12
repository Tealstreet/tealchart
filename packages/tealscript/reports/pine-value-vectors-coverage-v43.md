> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v43

The independent value-vector suite contains `110` cases covering `68/74`
distinct committed Pine v6 `ta.*` names (`91.9%`). This revision adds a
256-bar Supertrend tuple vector using the documented ATR bands, carried upper
and lower bands, and direction-switch recurrence.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 110 | 104 | `ta.alma`, `ta.nvi`, `ta.pvi`, `ta.supertrend`, two parameterized-UDF state cases |
| Public `executeScript` path | 110 | 104 | `ta.alma`, `ta.nvi`, `ta.pvi`, `ta.supertrend`, two parameterized-UDF state cases |

The Supertrend mismatch is identical on both paths. The engine selects the
opposite initial band and changes direction at different bars from the
documented recurrence; later line values can coincide after a state switch.
This is recorded as a confirmed runtime mismatch, not an oracle adjustment.
Reference: [TradingView Supertrend calculation](https://www.tradingview.com/support/solutions/43000634738-supertrend/).

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-supertrend-v2-20260905.json
```

Measured result: `104/110` compiled matches and `104/110` public-path matches.
