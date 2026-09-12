> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v10

DEMA was removed from the independent numerator. TradingView documents the
algebraic identity `DEMA = 2 x EMA - EMA(EMA)`, but the public v6 material used
here does not specify the chained call's leading-`na` or initialization rule.
DEMA is therefore trace-required until an authoritative warm-up trace exists.

The defensible formula set covers `35/74` committed Pine v6 `ta.*` names
(`47.3%`) across 39 cases, including SWMA with a complete four-bar window.

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors /tmp/pine-value-vectors-v13.json
```

Measured result: `39/39` compiled matches and `39/39` public-path matches.
The prior v9 DEMA claim is superseded by this report and must not be used as
independent value-parity evidence.
