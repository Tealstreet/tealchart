# Pine Version Rules Independent Audit V1

Measurement commit: `d7d80fac94`.

Scope: `packages/tealscript/src/pineVersionRules.ts` was checked against
TradingView's published migration guides for v3, v4, v5 and v6 plus release
notes where the migration guide points at feature introduction rather than
conversion behavior. This audit checks the rule table, not scattered call-site
logic.

## Headline

| Outcome | Count | Finding |
| --- | ---: | --- |
| Table rules supported by TradingView docs | 21 | Every rule currently in `PINE_VERSION_RULES` has documentation support for the version edge it encodes. |
| Table rules unsupported by migration/release docs | 0 | No current table rule appears to be TealScript-only authority. |
| Documented version changes missing from the table | 13 | The table is not yet the single home for all version-sensitive behavior. Some missing items may be implemented elsewhere, but they are not centralized. |

## Supported Table Rules

| Rule field | Table edge | Source |
| --- | --- | --- |
| `allowsImplicitNumericToBool` | v3-v5 allow; v6 rejects implicit numeric-to-bool | v6 migration guide, Types / explicit bool casting |
| `allowsBoolNaHelpers` | v3-v5 allow bool `na` helpers; v6 rejects bool `na`, `na(bool)`, `nz(bool)`, `fixnan(bool)` | v6 migration guide, Types / boolean values cannot be `na` |
| `minVisualLineWidth` | v3-v5 allow widths below 1; v6 requires `linewidth >= 1` | v6 migration guide, Minimum linewidth is 1 |
| `dynamicRequestsDefault` | v3-v5 default false; v6 default true | v6 migration guide, Dynamic requests |
| `allowsNonExportedFunctionRequestsWithoutDynamicRequests` | v3-v5 allow wrapped request calls in local blocks without dynamic requests; v6 rejects when `dynamic_requests=false` | v6 migration guide, Dynamic requests |
| `allowsConditionalOperandRequestsWithoutDynamicRequests` | v3-v5 local/wrapped request behavior allowed; v6 rejects local request calls when dynamic requests are disabled | v6 migration guide, Dynamic requests |
| `constIntDivisionCanReturnFractional` | v5 const int division discards fractional remainders; v6 can return fractional values; negative v5/v4 quotient direction remains compile-evidence pending | v6 migration guide, int division |
| `strategyWhenParameterAllowed` | v3-v5 allow/deprecate `when`; v6 removes applicable `strategy.*()` `when` parameters | v6 migration guide, strategy changes |
| `strategyDefaultMarginPercent` | v3-v5 default margin 0; v6 default margin 100 | v6 migration guide, strategy margin change |
| `strategyTrimsOrdersAboveLimit` | v3-v5 error above 9000 trades; v6 trims oldest orders | v6 migration guide, strategy order limit |
| `strategyExitUsesRelativeAndAbsoluteTargets` | v3-v5 absolute `strategy.exit()` targets take precedence; v6 considers relative and absolute targets and uses the one triggered first | v6 migration guide, `strategy.exit()` changes |
| `disallowsLiteralOrUdtFieldHistory` | v3-v5 allow literal/UDT-field history forms; v6 rejects them | v6 migration guide, history-referencing operator |
| `disallowsDuplicateCallArguments` | v3-v5 tolerate duplicate supplied parameters with first-value behavior; v6 rejects duplicate arguments | v6 migration guide, duplicate parameters |
| `disallowsSeriesVisualOffset` | v3-v5 allow series plot offsets with incorrect last-value behavior; v6 rejects series offset | v6 migration guide, no series offset values |
| `disallowsNaUniqueConstants` | v3-v5 allow `na` for unique-type constants; v6 rejects | v6 migration guide, unique parameters cannot be `na` |
| `timeframePeriodIncludesMultiplier` | v3-v5 can return bare units; v6 always includes multiplier | v6 migration guide, timeframes must include a multiplier |
| `allowsNegativeArrayIndices` | v3-v5 reject negative array indices; v6 allows bounded negative indices for listed array operations | v6 migration guide, negative indices in arrays |
| `fixesMutableConstInference` | v3-v5 can erroneously infer mutable variables as `const`; v6 fixes that inference | v6 migration guide, mutable variable constness |
| `supportsLegacyTranspParameter` | v3-v4 support and v5 deprecates/hides `transp`; v6 removes `transp` from listed visual functions | v5 migration guide, deprecated `transp`; v6 migration guide, removed `transp` |
| `usesV6DefaultColors` | v6 changes selected default color constants; prior versions use old values | v6 migration guide, color changes |
| `forLoopEndBoundaryIsDynamic` | v3-v5 evaluate `to_num` before loop; v6 reevaluates the stop condition before each iteration | v6 migration guide, dynamic for loop boundaries |

## Missing Documented Version Changes

These are documented by TradingView but not represented in
`PINE_VERSION_RULES`. Some are already handled by parser/checker/runtime code;
the audit finding is that they are not centralized in the table, so future
version adjudication still requires call-site archaeology.

| Missing rule | Version edge | Source | Risk |
| --- | --- | --- | --- |
| Lazy `and` / `or` evaluation | v6 changed boolean operators to lazy evaluation | v6 migration guide, top-level change list | Runtime values can differ for guard expressions with side effects or errors; no table rule names the version edge. |
| v5 mandatory named constants for unique parameters | v4 permitted raw equivalent values for constants such as `lookahead=true` or numeric plot styles; v5 requires named constants | v5 migration guide, Some function parameters now require built-in arguments | Older scripts can be judged too strictly or modern scripts too loosely if this remains scattered. |
| v5 default session days | v4 default session days were weekdays; v5 default became all days | v5 migration guide, default session days for `time()` / `time_close()` / `input.session()` | Time/session behavior differs by declared version but the table has no `defaultSessionDays`. |
| v5 `strategy.exit()` must do something | v4 tolerated no-op exits; v5 requires an effectful parameter | v5 migration guide, `strategy.exit()` now must do something | Strategy scripts can be accepted or rejected under the wrong version rule. |
| v5 `iff()` removal | v4 `iff()` converts to `?:`; v5 table lists `iff()` as replaced | v5 migration guide, removed functions and variables | Current checker rejects v5/v6, but the rule is not in `pineVersionRules.ts`. |
| v5 `offset()` removal | v4 `offset()` converts to `[]`; v5 table lists it as replaced | v5 migration guide, removed functions and variables | History/operator migration behavior is not table-owned. |
| v5 split input type constants into `input.*()` functions | v4 `input.integer`, `input.bool`, etc. convert to typed input functions; v5 common error says remove `input.*` constants from old generic calls | v5 migration guide, split input into several functions and common errors | Legacy generic-input compatibility is not controlled by a version rule. |
| v5 declaration parameter rename `resolution` -> `timeframe` | v4 `study(..., resolution, resolution_gaps)` renamed to v5 `indicator(..., timeframe, timeframe_gaps)` | v5 migration guide, renamed functions and parameters | The checker has legacy hints, but no version rule says where each spelling is valid. |
| v5 namespace migration for built-ins | v4 globals such as `sma`, `rsi`, `highest`, math functions and constants moved under namespaces | v5 migration guide, renamed functions and parameters | Alias/fallback compatibility is broad and version-sensitive but not table-owned. |
| v4 explicit type required for `na` declarations | v3 allowed unknown-type `na` initializers; v4 requires explicit type/context | v4 migration guide, explicit variable type declaration | Typed-`na` acceptance is not centrally versioned. |
| v4 built-in renames including `n` -> `bar_index` | v3 built-ins/constants moved or renamed in v4 | v4 migration guide, renaming built-ins/constants | Local-over-builtin resolution work has touched `n`; version edge is not table-owned. |
| v3 `security()` lookahead default changed | v2 default lookahead-on; v3 default lookahead-off with parameter added | v3 migration guide, default security behavior | Relevant if TealScript treats v2-or-earlier scripts as v3-compatible; the table collapses `version <= 3` to v3. |
| v3 self/forward references and bool-to-number removal | v2 self/forward references removed; bool-to-number arithmetic forbidden in v3 while numeric-to-bool remains | v3 migration guide, self/forward references and bool arithmetic | The table has numeric-to-bool but no bool-to-number or self/forward-reference rule. |

## Notes

- The v6 row in `PINE_VERSION_RULES` tracks the v6 migration guide closely:
  the guide lists the same major compatibility changes around booleans,
  requests, const int division, strategy behavior, history, duplicate
  arguments, unique constants, timeframes, arrays, colors, `transp` and for-loop
  boundaries.
- The weak point is earlier-version coverage. The table currently encodes the
  v5-to-v6 changes well, but v3-to-v4 and v4-to-v5 migration rules are only
  partially represented.
- This audit did not change `src`; any decision to add the 13 missing entries to
  `pineVersionRules.ts` belongs to the implementation lanes.
