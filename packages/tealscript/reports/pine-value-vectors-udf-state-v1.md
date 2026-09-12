> Superseded by pine-value-vectors-udf-state-v2.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors UDF State V1

This reproducer targets per-call-site state for stateful `ta.*` builtins in a
parameterized UDF. It uses the hostile synthetic series with a middle `na`
hole and calls the same UDF at two sites with different thresholds.

## Result

| Case | Compiled | Public `executeScript` | Expected |
| --- | --- | --- | --- |
| `udf.barssince.call-sites-hostile` | failed | failed | `ta.barssince(close > 0)` and `ta.barssince(close > 12)` series |
| `udf.valuewhen.call-sites-hostile` | failed | failed | `ta.valuewhen(close > 0, close, 0)` and `ta.valuewhen(close > 12, close, 0)` series |

Both paths agree with each other but return the UDF argument expression's
numeric values rather than the stateful builtin result. For example, the
first `barssince` output is `[-1, -3, -1, 1, -2, na, ...]`, while the
independent oracle is `[na, na, na, 0, 1, 2, ...]`. The second threshold call
has the same incorrect expression-shaped output. This is not an interpreter/
compiled divergence; it is a UDF stateful-builtin evaluation gap.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-udf-state-v1.json
```

Measured result: `73` cases, `71` compiled matches, `71` public-path matches;
the two failing cases are the UDF call-site reproductions above.
