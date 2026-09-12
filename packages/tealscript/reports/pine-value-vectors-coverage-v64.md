> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v64

This run adds flat-bar `ta.sar` and zero-range `ta.supertrend` vectors. The
inputs exercise zero volatility and persistent trend state rather than only
oscillating prices.

## Result

| Path | Cases | Matches | Failures |
| --- | ---: | ---: | --- |
| Compiled | 171 | 163 | the eight previously recorded mismatches |
| Public `executeScript` path | 171 | 163 | the same eight cases |

Both new trend-state cases pass on both paths. No existing failure changed.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-trend-edge-v64.json
```

Measured result: `163/171` compiled matches and `163/171` public-path matches.
The command exits nonzero because the eight listed mismatches remain.
