# Pine Value Vector Oracle Source Provenance V2

Superseded by `pine-value-vector-oracle-source-provenance-v3.md`. Historical measurement only.

Measurement commit: `1ad5f9effe`.

## Finding

The committed reference snapshot is not an oracle source for any passing
value-vector expectation. It affects member-name validation, signatures and
coverage denominators, not expected values.

## Enforcement

- `validateValueVectorGate()` fails when any vector case lacks source
  provenance.
- Accepted provenance markers are a live `https://www.tradingview.com/`
  citation or an explicit `TealScript local extension:` marker.
- A future vector added without a source citation is a gate failure.

## Headline

| Scope | Live-doc-cited | Local extension | Snapshot-cited | Missing citation |
| --- | ---: | ---: | ---: | ---: |
| Passing cases | `904` | `1` | `0` | `0` |
| All cases | `909` | `1` | `0` | `0` |
| Expected-red cases | `5` | `0` | `0` | `0` |

## Interpretation

- Snapshot corruption has narrow value-oracle blast radius: `0/905` passing
  cases derive expected values from the committed snapshot.
- Snapshot corruption can still corrupt names, signatures, denominators and
  depth accounting. The `matrix.sort:sort_field` defect was that class.
- The earlier `201` local-formula/no-citation cases are now cited through
  deterministic source rules by construct group: TA/reference formulas,
  TradingView/ta published-library formulas, math, strings, arrays and language
  semantics.
