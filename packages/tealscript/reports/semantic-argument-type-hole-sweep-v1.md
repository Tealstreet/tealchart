# Semantic Argument Type Hole Sweep v1

Date: 2026-09-12

Scope: implement the documented `array.percentile_*` string-percentage refusal, then derive a semantic argument-type sweep from TealScript's typed builtin parameter declarations rather than from a hand-written builtin list.

## Verdict

The only confirmed type-diagnostic hole in this sweep was the `array.percentile_linear_interpolation()` and `array.percentile_nearest_rank()` `percentage` parameter.

Before the fix, both helpers had declared signatures with a numeric `percentage` in the Pine reference but accepted a string argument through semantic checking and reached runtime as Pine `na`. That was inconsistent with both Pine's documented type system and TealScript's existing checks for sibling cases such as `ta.highest(close, "3")`, `math.sqrt("4")`, `color.new(color.blue, "50")`, and `hline("100")`.

After the fix, the derived sweep found zero remaining builtins with declared typed argument constraints that lack an enforced semantic argument-type diagnostic.

## Implemented Refusal

New diagnostics:

```text
array.percentile_nearest_rank percentage must be a number, got string
array.percentile_linear_interpolation percentage must be a number, got string
```

The checker now routes the array percentile `percentage` parameter through the same `checkBuiltinArgumentKind(..., 'number')` helper used by TA, math, color, visual, request, table, drawing and other typed builtin parameters.

The value-vector suite now carries `semantic.array-percentile-string-percentage-rejection` as a documented semantic refusal. Its citation is the TradingView v6 Reference Manual plus Pine type-system documentation, not external consensus.

## Derived Sweep

Derivation:

- Walked every `*_PARAMETER_NAMES_BY_CALL` typed parameter map in `packages/tealscript/src/semantic/checker.ts`.
- Included the input-family typed declarations that are not shaped as call-by-parameter maps:
  - `INPUT_DEFAULT_TYPE_REQUIREMENTS`
  - `INPUT_OPTIONS_ELEMENT_REQUIREMENTS`
- For each declared typed parameter, generated an incompatible-literal call and required the semantic diagnostics to include the expected type-mismatch message.
- Accounted for versioned signature shape rather than treating version refusals as type holes:
  - legacy `transp` parameters were probed under Pine v4, where TealScript accepts them for compatibility;
  - `iff()` was probed under Pine v4, because Pine v5+ removal diagnostics correctly fire before argument-type diagnostics;
  - `request.currency_rate(..., to)` was probed positionally because `to` is a parser keyword edge when used as a named argument.

Sweep size after the percentile fix:

| Metric | Count |
|---|---:|
| Typed declaration maps walked | 28 |
| Builtins with typed argument constraints | 231 |
| Typed parameter probes | 556 |
| Remaining missing type diagnostics | 0 |

## Cluster Finding

The pre-fix holes clustered tightly:

| Cluster | Builtins | Parameter | Expected type | Shape |
|---|---:|---|---|---|
| Array percentile helpers | 2 | `percentage` | `series int/float` | array statistic helper numeric parameter missing from semantic type-check maps |

No additional namespace, arity, parameter-position, or type-family cluster was found. The root cause was not a broad failure in `checkBuiltinArgumentKind`; it was one helper family absent from the typed argument declaration maps.

## Sweep Summary By Declaration Map

All rows below passed after the array percentile fix.

| Declaration map | Probes |
|---|---:|
| `TA_NUMERIC_PARAMETER_NAMES_BY_CALL` | 142 |
| `VISUAL_NUMERIC_PARAMETER_NAMES_BY_CALL` | 47 |
| `TABLE_NUMERIC_PARAMETER_NAMES_BY_CALL` | 42 |
| `DRAWING_NUMERIC_PARAMETER_NAMES_BY_CALL` | 41 |
| `MATH_NUMERIC_PARAMETER_NAMES_BY_CALL` | 31 |
| `STRING_FUNCTION_STRING_PARAMETER_NAMES_BY_CALL` | 31 |
| `DRAWING_COLOR_PARAMETER_NAMES_BY_CALL` | 26 |
| `REQUEST_STRING_PARAMETER_NAMES_BY_CALL` | 25 |
| `VISUAL_BOOL_PARAMETER_NAMES_BY_CALL` | 20 |
| `VISUAL_COLOR_PARAMETER_NAMES_BY_CALL` | 17 |
| `VISUAL_STRING_PARAMETER_NAMES_BY_CALL` | 13 |
| `COLOR_FUNCTION_NUMERIC_PARAMETER_NAMES_BY_CALL` | 12 |
| `TIME_STRING_PARAMETER_NAMES_BY_CALL` | 11 |
| `TIME_NUMERIC_PARAMETER_NAMES_BY_CALL` | 11 |
| `INPUT_DEFAULT_TYPE_REQUIREMENTS` | 11 |
| `TA_BOOL_PARAMETER_NAMES_BY_CALL` | 10 |
| `DRAWING_STRING_PARAMETER_NAMES_BY_CALL` | 10 |
| `ALERT_STRING_PARAMETER_NAMES_BY_CALL` | 8 |
| `COLOR_FUNCTION_COLOR_PARAMETER_NAMES_BY_CALL` | 8 |
| `CHART_POINT_NUMERIC_PARAMETER_NAMES_BY_CALL` | 8 |
| `STRATEGY_ENUM_STRING_PARAMETER_NAMES_BY_CALL` | 7 |
| `DRAWING_BOOL_PARAMETER_NAMES_BY_CALL` | 7 |
| `STRING_FUNCTION_NUMERIC_PARAMETER_NAMES_BY_CALL` | 5 |
| `INPUT_OPTIONS_ELEMENT_REQUIREMENTS` | 5 |
| `GLOBAL_NON_BOOL_PARAMETER_NAMES_BY_CALL` | 4 |
| `ARRAY_NUMERIC_PARAMETER_NAMES_BY_CALL` | 2 |
| `ALERT_BOOL_PARAMETER_NAMES_BY_CALL` | 1 |
| `GLOBAL_BOOL_PARAMETER_NAMES_BY_CALL` | 1 |

## Verification

- Red-first semantic probe before the fix:
  - `array.percentile_nearest_rank(values, "50")`: no diagnostics.
  - `array.percentile_linear_interpolation(values, "50")`: no diagnostics.
  - sibling numeric builtins already produced type diagnostics.
- `yarn --cwd packages/tealscript vitest run src/semantic/checker.test.ts`: 415 passed.
- `yarn --cwd packages/tealscript tsx scripts/run-pine-value-vectors.ts`: 990 cases, 989 matches, only expected failure `strategy.calc-on-order-fills-values`.
- Derived typed-argument sweep: 556/556 probes emitted the expected semantic type diagnostic after version-shape corrections.

## Sources

- TradingView Pine Script v6 Reference Manual: https://www.tradingview.com/pine-script-reference/v6/
- TradingView Pine Script type system: https://www.tradingview.com/pine-script-docs/language/type-system/
- Prior documentation audit: `packages/tealscript/reports/array-percentile-string-argument-behavior-v1.md`
