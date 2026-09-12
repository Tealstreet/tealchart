# Array Percentile String Argument Behavior v1

Date: 2026-09-12

Scope: read-only follow-up to `external-consensus-doc-audit-v1.md`, focused on the documented behavior for a string `percentage` argument to `array.percentile_linear_interpolation()` and `array.percentile_nearest_rank()`, plus a JavaScript-semantics suspect scan over current expected-reds and already-landed consensus fixes.

## Verdict

`array.percentile_*` with a string `percentage` argument should be a semantic compile-time refusal, not a runtime `na` and not a coerced numeric value.

The consensus-driven `Number(percentage)` behavior was documented-wrong. Reverting it back to TealScript's previous all-`na` runtime result is still not the documented Pine behavior. The correct handoff is a checker/vector change: reject string where the Reference Manual declares the parameter as numeric.

## Documentation Finding

The TradingView v6 Reference Manual entry for both array percentile functions declares this call shape:

```pine
array.percentile_linear_interpolation(id, percentage)
array.percentile_nearest_rank(id, percentage)
```

with `percentage` typed as `series int/float`.

Pine's type-system documentation says the qualified type of a value determines which functions it is compatible with. It also establishes the qualifier hierarchy: a parameter that accepts `series` can accept weaker qualifiers, but of the same compatible type. Literal strings are `const string`; series strings are `series string`. Both are still `string`, not `int` or `float`.

The documented automatic numeric cast is narrow: `int` can be used where `float` is needed. The same page demonstrates compile-time errors for incompatible qualified types, including a function argument whose type does not match a required parameter. It lists explicit cast functions (`int()`, `float()`, `bool()`, `color()`, `string()`, etc.) but does not document implicit `string` to `int` or `string` to `float` conversion.

Therefore:

- Literal string case: `"50"` is `const string`, so it is incompatible with `series int/float`.
- Series string case: a variable or expression with type `series string` is also incompatible with `series int/float`.
- There is no documented special case that treats numeric-looking string literals as numbers.

The documented category is a compile-time type error/semantic refusal. Returning `na` would only be a runtime fallback after an invalid program has already slipped through the checker.

## TealScript Internal Consistency

Current TealScript behavior is inconsistent:

- `array.percentile_nearest_rank(values, "50")`: no semantic diagnostic; runtime emits all `null`/Pine `na`.
- `array.percentile_linear_interpolation(values, "50")`: no semantic diagnostic; runtime emits all `null`/Pine `na`.
- Other string-where-number probes do raise semantic diagnostics today:
  - `ta.highest(close, "3")`: `ta.highest length must be a number, got string`
  - `math.sqrt("4")`: `math.sqrt number must be a number, got string`
  - `color.new(color.blue, "50")`: `color.new transp must be a number, got string`
  - `hline("100")`: `hline price must be a number, got string`

Focused probe used:

```sh
yarn --cwd packages/tealscript tsx -e '...checkProgram(parse(source))...'
```

The broader semantic checker test suite already carries the same rule across many numeric builtin slots: time/timeframe/timestamp numeric arguments, visual numeric parameters, declaration numeric parameters, strategy order/risk numeric parameters, chart point/drawing/table numeric parameters, TA numeric parameters, color constructor channels/transparency, string function indexes/repeats, and math numeric parameters.

The gap is specific to array helper argument checking. `checkArrayCallTypes()` currently validates array mutation element compatibility and `array.concat()` element compatibility, but does not validate numeric helper arguments such as `array.percentile_*` `percentage`.

## Handoff Recommendation

Route this as a semantic diagnostic/vector task, not a runtime value task:

1. Add semantic checking for `array.percentile_linear_interpolation(..., percentage)` and `array.percentile_nearest_rank(..., percentage)`.
2. Reject both literal string and statically known series-string percentages.
3. Shape the vector as a semantic refusal. Do not assert a runtime plot value of `na`.
4. Suggested diagnostic form, matching existing checker style:

```text
array.percentile_nearest_rank percentage must be a number, got string
array.percentile_linear_interpolation percentage must be a number, got string
```

## JavaScript-Semantics Suspect Scan

Current value-vector expected-reds:

- Only `strategy.calc-on-order-fills-values` remains in `EXPECTED_VALUE_VECTOR_FAILURES`.
- It is trace-required strategy re-entry behavior, not a JavaScript primitive-semantics suspect.
- No current expected-red row is explained by string-to-number coercion, truthiness, null-vs-undefined, integer division, float formatting, or numeric promotion.

Recently landed consensus-driven fixes:

| Fix / row | Suspect? | Finding |
|---|---:|---|
| `array.percentile_*("50")` returning `1` | Yes | Confirmed string-to-number JavaScript coercion contamination. Both external JS/TS engines produced the value through ordinary JS arithmetic/coercion paths rather than a Pine type-system check. |
| `ta.highestbars(4)` source-omitted boundary | No JS primitive suspect found | This is a source/default/window-boundary question. It may still be manual-silent, but it is not explained by string coercion, truthiness, `null`/`undefined`, integer division, float formatting, or numeric promotion. |
| `hline` per-bar values in consensus pilot | No JS primitive suspect found | This was output payload completeness: hline plots lacked per-bar values. It is not a JS primitive-semantics row. |
| Deterministic consensus context / syminfo feed fixes | No JS primitive suspect found | These were harness context/instrumentation repairs. |
| Scale enum consensus feed | No JS primitive suspect found | This was enum/context representation for an external runner, not a Pine value rule derived from JavaScript primitive behavior. |
| Family-aware consensus comparison | No JS primitive suspect found | This was comparison bucketing/shape instrumentation, not engine behavior. |

Net: the only already-landed consensus row in this scan that should be treated as JavaScript-semantics contamination is the array percentile string-percentage case.

## Sources

- TradingView Pine Script v6 Reference Manual: https://www.tradingview.com/pine-script-reference/v6/
- TradingView Pine Script type system: https://www.tradingview.com/pine-script-docs/language/type-system/
- Local checker/runtime probes on `tealscript-runtime` at report time.
- Prior source audit in `packages/tealscript/reports/external-consensus-doc-audit-v1.md`.
