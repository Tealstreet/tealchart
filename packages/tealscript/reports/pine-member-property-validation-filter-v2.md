> Superseded by pine-member-property-validation-filter-v6.md. Historical measurement only; use the superseding report for current figures.

# Pine Member Property Validation Filter V2

## Headline

- Property rules: 993.
- Scalar/tuple rules eligible for the current validator: 409.
- Payload/constant/shape/side-effect rules outside the current scalar validator: 584.
- Rules on vector-covered members: 944; scalar/tuple subset: 364.
- Scalar/tuple rules reachable by passing vector targets: 364.
- Scalar/tuple rules attributable to single-target passing cases: 97.
- Scalar/tuple rules present only in multi-target passing cases: 269.
- Scalar/tuple rules unlocked by sampled output-to-member annotations: 113.
- Combined known-good validation coverage after shipped studies: 216/993 (21.75%).

## Filter

- Member coverage and property validation are not the same denominator.
- The value-vector member map counts a member when any case exercises it, including constants, inputs, payload fields, strategy state, drawing handles, collections, and scaffold members.
- The current property validator only reads plot-series outputs and only applies scalar/tuple rules when exactly one target member owns the output.
- Multi-target vectors contain most of the unused scalar opportunity, but they do not declare output-to-member ownership; applying all member rules to all outputs would reintroduce the over-strict false-positive failure mode.

## Target Counts

- single-target passing cases: 230
- multi-target passing cases: 114
- zero-target passing cases: 332
- invariant cases skipped as circular validation: 45

## Cost

- Cheap automatic lift: no.
- Sample size: 10 multi-target cases.
- Rules unlocked by sample: 113.
- Measured authoring time: about 20 minutes including validator wiring; roughly 2 minutes per case for the sampled source-order plot cases.
- Mechanical cases: source-order plots that directly call the member or a single accessor.
- Judgment cases: outputs behind guard variables, helper wrappers such as `str.length(...)`, broker-state scaffolding, or plots representing relationships between two members.
- Medium work: annotate the remaining multi-target vectors with output-to-member ownership and validate those scalar/tuple rules.
- Larger work: add payload-aware validators for collection, enum, string, color, handle and side-effect properties.
- New output-producing vectors per member are not the first move; the larger gap is attribution and payload validation, not absence of member execution.

## Annotated Sample

- `matrix.predicate-distribution-values`: 12 outputs, 12 scalar/tuple rules
- `runtime.global-context-values`: 10 outputs, 14 scalar/tuple rules
- `runtime.input-expanded-default-values`: 12 outputs, 12 scalar/tuple rules
- `runtime.chart-context-values`: 13 outputs, 15 scalar/tuple rules
- `runtime.calendar-fields`: 6 outputs, 16 scalar/tuple rules
- `strategy.aggregate-performance-values`: 10 outputs, 10 scalar/tuple rules
- `strategy.aggregate-percent-contract-values`: 7 outputs, 8 scalar/tuple rules
- `strategy.closedtrades-timing-commission-values`: 5 outputs, 10 scalar/tuple rules
- `strategy.percent-commission-values`: 6 outputs, 8 scalar/tuple rules
- `strategy.trade-runup-drawdown-values`: 9 outputs, 17 scalar/tuple rules

