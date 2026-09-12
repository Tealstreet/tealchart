> Superseded by pine-value-vectors-coverage-v121.json. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Coverage v4

The harness now compares every emitted plot per case, rather than only the
first plot. It covers `23/74` committed Pine v6 `ta.*` names (`31.1%`) across
26 cases, including two persistent-state cases and a two-output UDF call-site
state case.

```bash
yarn workspace @tealstreet/tealscript pine:value-vectors /tmp/pine-value-vectors-v7.json
```

Measured result: `26/26` compiled matches and `26/26` public-path matches.
The UDF case calls one `ta.sma`-bearing function at lengths 3 and 5 and checks
both complete output series independently. The `var` and `varip` cases check
bar-to-bar accumulator persistence. The two previously confirmed extrema
warm-up defects remain fixed in the current runtime working tree.

The 23-name fraction remains formula coverage, not complete overload coverage.
Context-dependent behavior requiring authoritative traces remains listed in
[coverage v1](./pine-value-vectors-coverage-v1.md).
