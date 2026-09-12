> Superseded by pine-member-property-validation-filter-v6.md. Historical measurement only; use the superseding report for current figures.

# Pine Member Property Validation Filter V3

## Headline

- Property rules: 993.
- Scalar/tuple rules eligible for the current validator: 409.
- Payload/constant/shape/side-effect rules outside the current scalar validator: 584.
- Rules on vector-covered members: 944; scalar/tuple subset: 364.
- Scalar/tuple rules reachable by passing vector targets: 364.
- Scalar/tuple rules attributable to single-target passing cases: 97.
- Scalar/tuple rules present only in multi-target passing cases: 269.
- Scalar/tuple rules unlocked by output-to-member annotations: 213.
- Scalar/tuple rules still stranded behind judgment cases: 56.
- Combined known-good validation coverage after shipped studies: 314/993 (31.62%).

## Filter

- Member coverage and property validation are not the same denominator.
- The value-vector member map counts a member when any case exercises it, including constants, inputs, payload fields, strategy state, drawing handles, collections, and scaffold members.
- The current property validator only reads plot-series outputs and only applies scalar/tuple rules when exactly one target member owns the output.
- Multi-target vectors contain most of the unused scalar opportunity, but they do not declare output-to-member ownership; applying all member rules to all outputs would reintroduce the over-strict false-positive failure mode.

## Target Counts

- single-target passing cases: 230
- multi-target passing cases: 114
- zero-target passing cases: 333
- invariant cases skipped as circular validation: 45

## Cost

- Cheap automatic lift: no.
- Initial measured sample size: 10 multi-target cases.
- Rules unlocked by mechanical annotations: 213.
- Measured authoring time: about 20 minutes including validator wiring; roughly 2 minutes per case for the sampled source-order plot cases.
- Mechanical cases: source-order plots that directly call the member or a single accessor.
- Judgment cases: outputs behind guard variables, helper wrappers such as `str.length(...)`, broker-state scaffolding, or plots representing relationships between two members.
- Medium work: annotate the remaining multi-target vectors with output-to-member ownership and validate those scalar/tuple rules.
- Larger work: add payload-aware validators for collection, enum, string, color, handle and side-effect properties.
- New output-producing vectors per member are not the first move; the larger gap is attribution and payload validation, not absence of member execution.

## Annotated Sample

- `array.statistics`: 7 outputs, 7 scalar/tuple rules
- `array.nth-extrema-values`: 2 outputs, 2 scalar/tuple rules
- `array.search-sort-values`: 7 outputs, 4 scalar/tuple rules
- `array.slice-reverse-join-values`: 4 outputs, 2 scalar/tuple rules
- `array.advanced-search-fill-values`: 9 outputs, 2 scalar/tuple rules
- `array.bool-and-constructor-values`: 5 outputs, 3 scalar/tuple rules
- `array.distribution-values`: 7 outputs, 6 scalar/tuple rules
- `array.unbiased-distribution-values`: 3 outputs, 3 scalar/tuple rules
- `matrix.basic-aggregates`: 9 outputs, 9 scalar/tuple rules
- `matrix.mixed-kron-values`: 4 outputs, 3 scalar/tuple rules
- `matrix.complex-eigen-shape-values`: 3 outputs, 3 scalar/tuple rules
- `matrix.predicate-distribution-values`: 12 outputs, 12 scalar/tuple rules
- `runtime.color-math-array-values`: 9 outputs, 11 scalar/tuple rules
- `runtime.global-context-values`: 10 outputs, 14 scalar/tuple rules
- `runtime.host-constant-identity-values`: 17 outputs, 8 scalar/tuple rules
- `drawing.line-getters`: 5 outputs, 5 scalar/tuple rules
- `drawing.line-mutation-copy-values`: 8 outputs, 4 scalar/tuple rules
- `drawing.line-style-getter-values`: 6 outputs, 6 scalar/tuple rules
- `drawing.box-getters`: 4 outputs, 4 scalar/tuple rules
- `drawing.box-mutation-copy-values`: 8 outputs, 4 scalar/tuple rules
- `drawing.label-getters`: 3 outputs, 2 scalar/tuple rules
- `drawing.label-mutation-copy-values`: 6 outputs, 2 scalar/tuple rules
- `drawing.label-style-metadata-values`: 13 outputs, 8 scalar/tuple rules
- `drawing.linefill-getters`: 2 outputs, 0 scalar/tuple rules
- `drawing.linefill-color-copy-values`: 10 outputs, 6 scalar/tuple rules
- `drawing.box-style-text-values`: 9 outputs, 6 scalar/tuple rules
- `drawing.chart-point-values`: 4 outputs, 0 scalar/tuple rules
- `drawing.chart-point-constructor-values`: 11 outputs, 0 scalar/tuple rules
- `runtime.barstate-historical-flags`: 4 outputs, 4 scalar/tuple rules
- `runtime.input-default-values`: 4 outputs, 4 scalar/tuple rules
- `runtime.input-expanded-default-values`: 12 outputs, 12 scalar/tuple rules
- `runtime.syminfo-values`: 5 outputs, 3 scalar/tuple rules
- `runtime.syminfo-metadata-values`: 12 outputs, 2 scalar/tuple rules
- `runtime.syminfo-provider-metadata-values`: 16 outputs, 11 scalar/tuple rules
- `runtime.chart-context-values`: 13 outputs, 15 scalar/tuple rules
- `runtime.timeframe-values`: 5 outputs, 5 scalar/tuple rules
- `runtime.timeframe-conversion-change-values`: 12 outputs, 11 scalar/tuple rules
- `runtime.calendar-fields`: 6 outputs, 16 scalar/tuple rules
- `runtime.timestamp-and-time-values`: 3 outputs, 4 scalar/tuple rules
- `runtime.session-state-values`: 5 outputs, 5 scalar/tuple rules
- `strategy.aggregate-performance-values`: 10 outputs, 10 scalar/tuple rules
- `strategy.aggregate-percent-contract-values`: 7 outputs, 8 scalar/tuple rules
- `strategy.closedtrades-timing-commission-values`: 5 outputs, 10 scalar/tuple rules
- `strategy.percent-commission-values`: 6 outputs, 8 scalar/tuple rules
- `strategy.trade-runup-drawdown-values`: 9 outputs, 17 scalar/tuple rules
- `request.security-barmerge-modes`: 4 outputs, 1 scalar/tuple rules
- `request.security-lower-tf-lookahead`: 2 outputs, 1 scalar/tuple rules
- `request.currency-rate-points`: 1 outputs, 1 scalar/tuple rules
- `request.corporate-actions-points`: 6 outputs, 3 scalar/tuple rules
- `request.financial-economic-points`: 2 outputs, 2 scalar/tuple rules
- `request.point-gaps-options`: 2 outputs, 2 scalar/tuple rules

