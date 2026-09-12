# Pine Value Vector Oracle Source Provenance V6

Measurement commit: `2646080db3` plus runtime visual triage.

## Finding

Value-vector expectations remain independent of the committed reference
snapshot after the property-lens validation expansion and runtime visual triage.

## Enforcement

- `validateValueVectorGate()` fails when any vector case lacks source
  provenance.
- It also fails when TA, strategy, collection, runtime or language cases cite
  too narrowly for the surfaces they exercise.
- Accepted provenance markers are a live `https://www.tradingview.com/`
  citation or an explicit `TealScript local extension:` marker.

## Headline

| Scope | Live-doc-cited | Local extension | Snapshot-cited | Missing citation | Incomplete citation |
| --- | ---: | ---: | ---: | ---: | ---: |
| Passing cases | `979` | `1` | `0` | `0` | `0` |
| All cases | `988` | `1` | `0` | `0` | `0` |
| Expected-red cases | `9` | `0` | `0` | `0` | `0` |

## Completeness Audit

- The v2 source-existence guard proved a citation existed, not that the cited
  page was complete.
- The first pass found `121` reference-only high-risk cases by namespace:
  `ta` `82`, `strategy` `15`, `map` `11`, `array` `6`, `runtime` `6`,
  `matrix` `1`.
- The current value-vector gate has `0` incomplete citation rows.
- `656` rule strings gained citations before v4; `0` expected values, payloads
  or diagnostics changed in this v6 refresh.

## Matrix Sort Correction

The v2 report said `matrix.sort:sort_field` was a snapshot defect. Fuller live
reference checking reversed that: `sort_field` is documented for UDT matrix
sorting. That was a source-completeness miss, not a value-oracle defect. The
existing matrix value vector covers the numeric column/order form, so no
expectation changed.

## Interpretation

- Snapshot corruption still has narrow value-oracle blast radius: `0/980`
  passing cases derive expected values from the committed snapshot.
- Snapshot corruption can still corrupt names, signatures, denominators and
  depth accounting.
- Citation completeness is a guarded property for the value-vector suite, not a
  one-time prose claim.
