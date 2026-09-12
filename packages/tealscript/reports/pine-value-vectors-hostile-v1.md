> Superseded by pine-value-vectors-hostile-v2.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Hostile v1

The harness now runs hostile inputs in addition to the clean 12-bar baseline.
The hostile set contains 50 TA cases across 40 distinct `ta.*` names and four
runtime cases.

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors /tmp/pine-value-vectors-hostile-v1.json
```

Measured result: `54/54` compiled matches and `54/54` public-path matches.

## Inputs Exercised

| Dataset | Cases | Risk covered |
| --- | ---: | --- |
| Signed/zero prices | 4 | Negative and zero source values through SMA, RSI, and length-1 paths. |
| Flat prices | 2 | Zero standard deviation and zero range after warm-up. |
| Overlong window | 1 | Length 20 on a 12-bar dataset, producing only `na`. |
| Long recursive history | 2 | 256 bars through EMA/RMA length 20, exposing accumulated seed drift. |
| Interior `na` | 1 | `ta.max` skips a middle missing value, as documented by the v6 type-system remarks. |

The remaining clean cases also run in the same invocation, so the hostile run
contains the complete prior vector set plus these cases. No function broke
under the hostile inputs tested. This is a measured result, not evidence that
all overloads, all `na` policies, or all path-dependent contexts are correct.
The next hostile expansion should add middle-`na` vectors for each builtin
whose Reference Manual remarks explicitly define whether missing source values
are ignored.
