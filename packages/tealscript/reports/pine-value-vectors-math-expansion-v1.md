> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# Pine Value Vectors Math Expansion V1

Source report: `pine-value-vectors-coverage-v84.md`.

## Summary

- Added math value vectors: 21.
- Newly value-covered documented math members: 19.
- Local-extension math vectors added: `math.trunc`, `math.clamp`.
- Total independent-oracle cases: 287.
- Compiled/public matches: 286/287.
- Expected failures: `language.collection-history-containers`.
- Unexpected failures: 0.
- Unexpected passes: 0.
- Broader builtin value coverage: 131/489, 26.79%.

## New Documented Members

`math.avg`, `math.round`, `math.floor`, `math.ceil`, `math.log`,
`math.log10`, `math.exp`, `math.sin`, `math.cos`, `math.tan`, `math.asin`,
`math.acos`, `math.atan`, `math.toradians`, `math.todegrees`, `math.sum`,
`math.pi`, `math.e`, and `math.phi`.

## Not Covered In This Batch

- `math.random`: needs seed behaviour checked as a separate deterministic
  contract rather than inferred from JavaScript random implementations.
- `math.round_to_mintick`: depends on host symbol tick metadata and should be
  covered with an explicit runtime `syminfo.mintick` fixture.
