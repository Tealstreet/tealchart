# Pine Host Context Default Oracles V1

Measurement commit: `3c2b8825e1`.

This audit writes oracle-side coverage for what a Pine script observes when the
TealScript host supplies no runtime symbol, timeframe, chart, or session
metadata. It separates documented values, documented shape constraints, and
trace/host-required exact values.

## Summary

| Outcome | Count | Fields |
| --- | ---: | --- |
| Documented value or derivation | 2 | `syminfo.mintick = syminfo.minmove / syminfo.pricescale`; `chart.fg_color` is `#0f0f0f` on a light background |
| Documented shape only | 18 | positive/finite symbol numeric metadata, `syminfo.type`/`volumetype` domains, timeframe string/flag coherence, chart color channels/type flags/visible-time ordering, mutually exclusive session states |
| Trace or host-required exact value | 20+ | exact symbol identity/currency/type/session/timezone, exact chart background/type/visible range, exact chart timeframe, exact market/premarket/postmarket state and first/last session bars |

## Vector Results

| Case | Result | Rule |
| --- | --- | --- |
| `host-default.syminfo-shape` | green | Symbol exact values depend on the instrument, but TradingView documents the tick formula, positive instrument metadata, and `type`/`volumetype` domains. |
| `host-default.timeframe-shape` | green | The exact chart timeframe is host context, but `timeframe.period` must be a valid timeframe string with coherent multiplier/unit flags. |
| `host-default.chart-shape` | green | Exact chart background, type, and visible range are host context, but colors must have 0-255 channels, exactly one chart-type flag should classify the chart, and visible times must be ordered timestamps. |
| `host-default.session-shape` | green | Exact session states require exchange/session context, but market/premarket/postmarket should not be simultaneously true and `syminfo.session` should name a session setting. |
| `host-default.chart-fg-color-light-background` | green after runtime fix | TealScript hostless fallback uses white `chart.bg_color`; TradingView documents `chart.fg_color` as `#0f0f0f` for light backgrounds, and the runtime fallback now returns that value. |

## Sources

- TradingView Chart information: `syminfo.*`, `chart.*`, `barstate.*`, and `timeframe.*` chart-context variables. https://www.tradingview.com/pine-script-docs/concepts/chart-information/
- TradingView Timeframes: timeframe string syntax, units, valid multiplier ranges, and timeframe conversion. https://www.tradingview.com/pine-script-docs/concepts/timeframes/
- TradingView Sessions: time-based session strings, default day masks, and session classification behavior. https://www.tradingview.com/pine-script-docs/concepts/sessions/

## Handoff

The runtime-lane fix candidate from this audit,
`host-default.chart-fg-color-light-background`, is closed: the hostless white
background now derives the documented light-background foreground `#0f0f0f`.
Runtime sibling coverage also checks that a host-supplied dark background
without an explicit foreground derives the documented dark-background
foreground `#dbdbdb`, while an explicit host foreground still wins. Do not
convert instrument-dependent symbol/timeframe/session defaults into exact
values without a TradingView trace or a host-supplied fixture.
