> Superseded by pine-value-vector-oracle-provenance-v5.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vector Oracle Provenance V4

## Basis

- Source: `packages/tealscript/scripts/run-pine-value-vectors.ts` at current HEAD.
- Input set: the 783 value-checked members from `pine-value-vector-assertion-quality-v4`.
- Rule: engine-derived means a value expectation calls the TealScript execution path (`executeScript`, `executeCompiled`, `tryCompile`, `runCase`, or vector run output).
- Rule: independent-local-oracle means the expectation is a harness-local formula, constant, or expected payload object that does not execute TealScript to obtain the expected value.
- Limit: independent-local-oracle does not mean infallible. It means the expectation is not a frozen snapshot of the engine under test.

## Headline

- Value-checked members classified: 783.
- Independently derived/local oracle: 783/783 (100.00%).
- Engine-derived frozen snapshot: 0/783 (0.00%).

## Engine-Derived Snapshot Members

- none
