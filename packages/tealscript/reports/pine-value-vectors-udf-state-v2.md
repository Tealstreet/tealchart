> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors UDF State V2

This revision adds direct hostile controls for `ta.barssince` and
`ta.valuewhen` beside the parameterized-UDF call-site reproductions. The
controls isolate the failure to UDF evaluation rather than the builtin or the
middle-`na` input.

## Result

| Group | Cases | Compiled matches | Public-path matches |
| --- | ---: | ---: | ---: |
| Direct hostile controls | 2 | 2 | 2 |
| Existing value vectors | 71 | 71 | 71 |
| Parameterized UDF call-site cases | 2 | 0 | 0 |
| Total | 75 | 73 | 73 |

Direct `ta.barssince` and `ta.valuewhen` produce the independent oracle
results on the same `HOLE_BARS` series. The two parameterized UDF cases still
return the numeric argument expression instead of the stateful builtin result
on both paths. This confirms a UDF evaluation/binding gap, not a builtin
formula or interpreter/compiled divergence.

## Reproduction

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors \
  /tmp/pine-value-vectors-udf-state-v2.json
```

The run reports `75` cases, `73` compiled matches, `73` public-path matches,
and the two UDF call-site cases as failures.
