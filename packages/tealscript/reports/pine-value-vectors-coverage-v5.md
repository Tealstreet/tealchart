> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v5

The vector set now contains 27 cases and covers `23/74` committed Pine v6
`ta.*` names (`31.1%`). It includes independent checks for two block-bodied
UDF call sites, each with its own local `var` accumulator, using different
source series.

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors /tmp/pine-value-vectors-v8.json
```

Measured result: `27/27` compiled matches and `27/27` public-path matches.
Every case compares all emitted plots, including both outputs from each
multi-call-site UDF case. This verifies persistence across bars and separation
between call sites for both a stateful TA UDF and a block-bodied `var` UDF.

The denominator remains formula coverage of the 74-name `ta.*` inventory; it
does not claim coverage of untested overloads or context-dependent namespaces.
Those trace-required domains remain listed separately in coverage v1.
