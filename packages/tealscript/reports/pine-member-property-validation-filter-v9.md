# Pine Member Property Validation Filter V9

> Superseded by `pine-member-property-validation-filter-v10.md`. Historical measurement only.

## Headline

- Property rules: 993.
- Scalar/proxy/tuple/collection rules eligible for the current validator: 838.
- Payload/shape/side-effect rules outside the current validator: 155.
- Rules on vector-covered members: 946; scalar/proxy/tuple/collection subset: 793.
- Scalar/proxy/tuple/collection rules reachable by passing vector targets: 793.
- Scalar/proxy/tuple/collection rules attributable to single-target passing cases: 117.
- Scalar/proxy/tuple/collection rules present only in multi-target passing cases: 682.
- Scalar/proxy/tuple/collection rules unlocked by output-to-member annotations: 498.
- Scalar/proxy/tuple/collection rules unlocked by constructed single-target cases: 73.
- Scalar/proxy/tuple/collection rules still stranded behind judgment cases: 82.
- Combined known-good validation coverage after shipped studies: 775/993 (78.05%).

## Filter

- Member coverage and property validation are not the same denominator.
- The value-vector member map counts a member when any case exercises it, including constants, inputs, payload fields, strategy state, drawing handles, collections, and scaffold members.
- The current property validator reads plot-series outputs and applies scalar/tuple rules plus enum/string scalar proxy rules when exactly one target member owns the output.
- Multi-target vectors contain most of the unused scalar opportunity, but they do not declare output-to-member ownership; applying all member rules to all outputs would reintroduce the over-strict false-positive failure mode.

## Target Counts

- single-target passing cases: 235
- multi-target passing cases: 131
- zero-target passing cases: 403
- invariant cases skipped as circular validation: 45

## Cost

- Cheap automatic lift: no.
- Constructed single-target sample size: 11 cases.
- Constructed single-target sample unlocked 73 rules.
- Measured authoring time: about 25 minutes including report wiring; roughly 2.3 minutes per case.
- Mechanical cases: constants, bar-index/source variables, and direct collection accessors where the plotted value belongs to exactly one member by construction.
- Judgment avoided: no ambiguous multi-target output was annotated.
- Completion estimate: 82 scalar/proxy/tuple/collection rules still remain stranded after subtracting rules already validated by single-target cases; at the sample rate, finishing all constructible cases is a several-hour task and not an automatic sweep.

## Prior Annotation Pass

- Rules unlocked by mechanical annotations, scalar proxy validation, and collection attribution: 498.
- Measured authoring time: about 20 minutes including validator wiring; roughly 2 minutes per case for the sampled source-order plot cases.
- Mechanical cases: source-order plots that directly call the member or a single accessor.
- Judgment cases: outputs behind guard variables, helper wrappers such as `str.length(...)`, broker-state scaffolding, or plots representing relationships between two members.
- Medium work: annotate the remaining multi-target vectors with output-to-member ownership and validate those scalar/proxy/tuple/collection rules.
- Larger work: add deeper payload-aware validators beyond the bounded drawing/table/plot and collection passes.
- New output-producing vectors per member are not the first move; the larger gap is attribution and payload validation, not absence of member execution.

## Annotated Sample

- `array.mutation-accessors`: 1 outputs, 9 scalar/tuple rules
- `array.receiver-result-chain-values`: 4 outputs, 2 scalar/tuple rules
- `array.statistics`: 7 outputs, 7 scalar/tuple rules
- `array.nth-extrema-values`: 2 outputs, 2 scalar/tuple rules
- `array.search-sort-values`: 7 outputs, 6 scalar/tuple rules
- `array.slice-reverse-join-values`: 4 outputs, 4 scalar/tuple rules
- `array.advanced-search-fill-values`: 9 outputs, 5 scalar/tuple rules
- `array.bool-and-constructor-values`: 5 outputs, 9 scalar/tuple rules
- `array.distribution-values`: 7 outputs, 7 scalar/tuple rules
- `array.unbiased-distribution-values`: 3 outputs, 3 scalar/tuple rules
- `matrix.basic-aggregates`: 9 outputs, 9 scalar/tuple rules
- `matrix.fill-sort-values`: 5 outputs, 4 scalar/tuple rules
- `matrix.range-fill-sort-column-values`: 6 outputs, 4 scalar/tuple rules
- `matrix.shape-mutation-values`: 10 outputs, 23 scalar/tuple rules
- `matrix.algebra-values`: 11 outputs, 11 scalar/tuple rules
- `matrix.mixed-kron-values`: 4 outputs, 3 scalar/tuple rules
- `matrix.complex-eigen-shape-values`: 3 outputs, 3 scalar/tuple rules
- `matrix.predicate-distribution-values`: 12 outputs, 12 scalar/tuple rules
- `visual.constant-identity-values`: 23 outputs, 8 scalar/tuple rules
- `visual.shape-position-constant-values`: 17 outputs, 17 scalar/tuple rules
- `runtime.color-math-array-values`: 9 outputs, 12 scalar/tuple rules
- `runtime.global-context-values`: 10 outputs, 14 scalar/tuple rules
- `visual.secondary-constant-metadata-values`: 9 outputs, 4 scalar/tuple rules
- `runtime.host-constant-identity-values`: 17 outputs, 21 scalar/tuple rules
- `drawing.line-getters`: 5 outputs, 5 scalar/tuple rules
- `drawing.line-mutation-copy-values`: 8 outputs, 4 scalar/tuple rules
- `drawing.line-style-getter-values`: 6 outputs, 6 scalar/tuple rules
- `drawing.box-getters`: 4 outputs, 4 scalar/tuple rules
- `drawing.box-mutation-copy-values`: 8 outputs, 4 scalar/tuple rules
- `drawing.label-getters`: 3 outputs, 3 scalar/tuple rules
- `drawing.label-mutation-copy-values`: 6 outputs, 3 scalar/tuple rules
- `drawing.label-style-metadata-values`: 13 outputs, 8 scalar/tuple rules
- `drawing.linefill-getters`: 2 outputs, 0 scalar/tuple rules
- `drawing.linefill-color-copy-values`: 10 outputs, 6 scalar/tuple rules
- `drawing.box-style-text-values`: 9 outputs, 6 scalar/tuple rules
- `drawing.chart-point-values`: 4 outputs, 0 scalar/tuple rules
- `drawing.chart-point-constructor-values`: 11 outputs, 0 scalar/tuple rules
- `drawing.label-style-constant-values`: 21 outputs, 21 scalar/tuple rules
- `runtime.barstate-historical-flags`: 4 outputs, 4 scalar/tuple rules
- `runtime.input-default-values`: 4 outputs, 4 scalar/tuple rules
- `runtime.input-expanded-default-values`: 12 outputs, 17 scalar/tuple rules
- `runtime.currency-constants-values`: 56 outputs, 112 scalar/tuple rules
- `runtime.syminfo-values`: 5 outputs, 6 scalar/tuple rules
- `runtime.syminfo-metadata-values`: 12 outputs, 12 scalar/tuple rules
- `runtime.syminfo-provider-metadata-values`: 16 outputs, 16 scalar/tuple rules
- `runtime.chart-context-values`: 13 outputs, 15 scalar/tuple rules
- `runtime.timeframe-values`: 5 outputs, 7 scalar/tuple rules
- `runtime.timeframe-conversion-change-values`: 12 outputs, 13 scalar/tuple rules
- `runtime.calendar-fields`: 6 outputs, 16 scalar/tuple rules
- `runtime.timestamp-and-time-values`: 3 outputs, 4 scalar/tuple rules
- `runtime.session-state-values`: 5 outputs, 5 scalar/tuple rules
- `strategy.market-slippage-commission-ledger-values`: 11 outputs, 12 scalar/tuple rules
- `strategy.percent-of-equity-quantity-ledger-values`: 7 outputs, 7 scalar/tuple rules
- `strategy.partial-exit-average-price-values`: 4 outputs, 4 scalar/tuple rules
- `strategy.cash-per-order-commission-ledger-values`: 5 outputs, 6 scalar/tuple rules
- `strategy.percent-commission-ledger-values`: 5 outputs, 6 scalar/tuple rules
- `strategy.fixed-quantity-ledger-values`: 5 outputs, 5 scalar/tuple rules
- `strategy.cash-amount-quantity-ledger-values`: 6 outputs, 6 scalar/tuple rules
- `strategy.close-entries-rule-fifo-values`: 6 outputs, 4 scalar/tuple rules
- `strategy.close-entries-rule-any-values`: 6 outputs, 4 scalar/tuple rules
- `strategy.pyramiding-closeout-ledger-values`: 4 outputs, 4 scalar/tuple rules
- `strategy.oca-cancel-pending-order-values`: 2 outputs, 2 scalar/tuple rules
- `strategy.oca-reduce-pending-order-values`: 2 outputs, 2 scalar/tuple rules
- `strategy.oca-none-pending-order-values`: 2 outputs, 2 scalar/tuple rules
- `strategy.process-orders-on-close-fill-timing-values`: 4 outputs, 4 scalar/tuple rules
- `strategy.next-tick-market-fill-timing-values`: 4 outputs, 4 scalar/tuple rules
- `strategy.aggregate-performance-values`: 10 outputs, 10 scalar/tuple rules
- `strategy.aggregate-percent-contract-values`: 7 outputs, 8 scalar/tuple rules
- `strategy.closedtrades-timing-commission-values`: 5 outputs, 10 scalar/tuple rules
- `strategy.percent-commission-values`: 6 outputs, 12 scalar/tuple rules
- `strategy.risk-max-drawdown-cash-values`: 3 outputs, 3 scalar/tuple rules
- `strategy.risk-max-intraday-loss-cash-values`: 3 outputs, 3 scalar/tuple rules
- `strategy.trade-runup-drawdown-values`: 9 outputs, 17 scalar/tuple rules
- `request.security-barmerge-modes`: 4 outputs, 1 scalar/tuple rules
- `request.security-lower-tf-lookahead`: 2 outputs, 1 scalar/tuple rules
- `request.currency-rate-points`: 1 outputs, 1 scalar/tuple rules
- `request.corporate-actions-points`: 6 outputs, 3 scalar/tuple rules
- `request.financial-economic-points`: 2 outputs, 2 scalar/tuple rules
- `request.point-gaps-options`: 2 outputs, 2 scalar/tuple rules

## Constructed Single-Target Sample

- `property.single.alert.freq_all`: 1 output, 1 scalar/tuple/collection rules
- `property.single.alert.freq_once_per_bar`: 1 output, 1 scalar/tuple/collection rules
- `property.single.alert.freq_once_per_bar_close`: 1 output, 1 scalar/tuple/collection rules
- `property.single.barmerge.gaps_off`: 1 output, 1 scalar/tuple/collection rules
- `property.single.barmerge.gaps_on`: 1 output, 1 scalar/tuple/collection rules
- `property.single.barmerge.lookahead_off`: 1 output, 1 scalar/tuple/collection rules
- `property.single.barmerge.lookahead_on`: 1 output, 1 scalar/tuple/collection rules
- `property.single.bar_index`: 1 output, 2 scalar/tuple/collection rules
- `property.single.array.first`: 1 output, 1 scalar/tuple/collection rules
- `property.single.array.last`: 1 output, 1 scalar/tuple/collection rules
- `property.single.array.from`: 1 output, 1 scalar/tuple/collection rules
- `property.single.array.new_bool`: 1 output, 1 scalar/tuple/collection rules
- `property.single.array.new_float`: 1 output, 1 scalar/tuple/collection rules
- `property.single.array.new_int`: 1 output, 1 scalar/tuple/collection rules
- `property.single.bool`: 1 output, 1 scalar/tuple/collection rules
- `property.single.false`: 1 output, 2 scalar/tuple/collection rules
- `property.single.true`: 1 output, 2 scalar/tuple/collection rules
- `property.single.map.clear`: 1 output, 1 scalar/tuple/collection rules
- `property.single.map.contains`: 1 output, 1 scalar/tuple/collection rules
- `property.single.map.copy`: 1 output, 1 scalar/tuple/collection rules
- `property.single.map.get`: 1 output, 1 scalar/tuple/collection rules
- `property.single.map.keys`: 1 output, 1 scalar/tuple/collection rules
- `property.single.map.new`: 1 output, 1 scalar/tuple/collection rules
- `property.single.map.put`: 1 output, 1 scalar/tuple/collection rules
- `property.single.map.put_all`: 1 output, 1 scalar/tuple/collection rules
- `property.single.map.remove`: 1 output, 1 scalar/tuple/collection rules
- `property.single.map.size`: 1 output, 1 scalar/tuple/collection rules
- `property.single.map.values`: 1 output, 1 scalar/tuple/collection rules
- `property.single.matrix.new`: 1 output, 1 scalar/tuple/collection rules
- `property.single.dividends.gross`: 1 output, 1 scalar/tuple/collection rules
- `property.single.dividends.net`: 1 output, 1 scalar/tuple/collection rules
- `property.single.earnings.actual`: 1 output, 1 scalar/tuple/collection rules
- `property.single.earnings.standardized`: 1 output, 1 scalar/tuple/collection rules
- `property.single.extend.both`: 1 output, 1 scalar/tuple/collection rules
- `property.single.extend.left`: 1 output, 1 scalar/tuple/collection rules
- `property.single.extend.none`: 1 output, 1 scalar/tuple/collection rules
- `property.single.extend.right`: 1 output, 1 scalar/tuple/collection rules
- `property.single.font.family_default`: 1 output, 1 scalar/tuple/collection rules
- `property.single.font.family_monospace`: 1 output, 1 scalar/tuple/collection rules
- `property.single.format.inherit`: 1 output, 1 scalar/tuple/collection rules
- `property.single.format.price`: 1 output, 1 scalar/tuple/collection rules
- `property.single.location.abovebar`: 1 output, 1 scalar/tuple/collection rules
- `property.single.location.belowbar`: 1 output, 1 scalar/tuple/collection rules
- `property.single.order.ascending`: 1 output, 1 scalar/tuple/collection rules
- `property.single.position.bottom_left`: 1 output, 1 scalar/tuple/collection rules
- `property.single.position.middle_center`: 1 output, 1 scalar/tuple/collection rules
- `property.single.position.top_right`: 1 output, 1 scalar/tuple/collection rules
- `property.single.scale.left`: 1 output, 1 scalar/tuple/collection rules
- `property.single.session.extended`: 1 output, 1 scalar/tuple/collection rules
- `property.single.shape.triangleup`: 1 output, 1 scalar/tuple/collection rules
- `property.single.size.auto`: 1 output, 1 scalar/tuple/collection rules
- `property.single.size.huge`: 1 output, 1 scalar/tuple/collection rules
- `property.single.size.large`: 1 output, 1 scalar/tuple/collection rules
- `property.single.size.normal`: 1 output, 1 scalar/tuple/collection rules
- `property.single.size.small`: 1 output, 1 scalar/tuple/collection rules
- `property.single.size.tiny`: 1 output, 1 scalar/tuple/collection rules
- `property.single.splits.denominator`: 1 output, 1 scalar/tuple/collection rules
- `property.single.splits.numerator`: 1 output, 1 scalar/tuple/collection rules
- `property.single.text.align_bottom`: 1 output, 1 scalar/tuple/collection rules
- `property.single.text.align_left`: 1 output, 1 scalar/tuple/collection rules
- `property.single.text.align_right`: 1 output, 1 scalar/tuple/collection rules
- `property.single.text.align_top`: 1 output, 1 scalar/tuple/collection rules
- `property.single.text.format_bold`: 1 output, 1 scalar/tuple/collection rules
- `property.single.text.wrap_auto`: 1 output, 1 scalar/tuple/collection rules
- `property.single.text.wrap_none`: 1 output, 1 scalar/tuple/collection rules
- `property.single.xloc.bar_index`: 1 output, 1 scalar/tuple/collection rules
- `property.single.xloc.bar_time`: 1 output, 1 scalar/tuple/collection rules
- `property.single.yloc.abovebar`: 1 output, 1 scalar/tuple/collection rules
- `property.single.yloc.belowbar`: 1 output, 1 scalar/tuple/collection rules
- `property.single.yloc.price`: 1 output, 1 scalar/tuple/collection rules
