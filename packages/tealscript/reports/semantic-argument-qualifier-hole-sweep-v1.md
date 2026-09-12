# Semantic Argument Qualifier Hole Sweep v1

Date: 2026-09-12

**Superseded on 2026-09-12 by
`semantic-ta-qualifier-live-reference-correction-v1.md`.** This report
over-counted the TA simple-parameter cluster by generalizing the documented
`ta.ema()` simple-length example across TA parameters whose live reference
`allowedTypeIDs` accept `series int`. The corrected live-derived table contains
21 v5 simple-only TA pairs and 22 v6+ pairs; the six previously reported TA
refusals are false refusals, not genuine dynamic-length violations. Keep the
input `defval` const finding, but do not use the 73/84 TA denominator below as
current evidence.

Scope: read-only sibling sweep to `semantic-argument-type-hole-sweep-v1.md`, focused on builtin argument qualifier requirements rather than value types.

## Verdict

TealScript does not enforce builtin argument qualifiers as thoroughly as it now enforces builtin argument types.

The derived sweep found 84 builtin parameters with declared qualifier requirements and no direct semantic diagnostic when a stronger, incompatible qualifier is passed at the builtin call site.

The holes cluster into two families:

| Cluster | Parameters | Builtins | Required qualifier | Bad value probed | Result today |
|---|---:|---:|---|---|---|
| TA simple parameters | 73 | 53 | `simple` or weaker | `bar_index` (`series int`) | silently accepted at direct builtin call sites |
| Input default values | 11 | 11 | `const` | same-type `series` values | silently accepted at direct builtin call sites |

The same 84 requirements are enforced when they flow through a user-defined function parameter. That means the qualifier discovery logic exists, but it is wired to UDF parameter inference rather than direct builtin call-site validation.

## Documentation Basis

TradingView's type-system documentation defines the qualifier hierarchy as:

```text
const < input < simple < series
```

It says a value requiring a particular qualifier can accept a weaker qualifier of the same type, but not a stronger one. It gives the specific example that a `simple int` parameter cannot accept a `series int` value, and separately documents that a `const` requirement cannot accept `input`, `simple`, or `series` values.

The same page gives the direct TA example this sweep targets: a `series int lengthInput` passed to `ta.ema(..., length = lengthInput)` causes a compilation error because the `length` parameter requires `simple int` or weaker.

## Derived Scope

The sweep derived qualifier requirements from the semantic checker instead of from a hand-written builtin list:

- `TA_SIMPLE_PARAMETER_NAMES_BY_CALL`: 73 `simple` parameters across 53 TA builtins.
- `INPUT_DEFAULT_TYPE_REQUIREMENTS`: 11 `const` `defval` requirements across 11 `input.*` builtins.
- `alertcondition()` const-string direct checks for `title` and `message`: 2 parameters.
- Request barmerge compile-time checks for `gaps` and `lookahead` where the current signature contains those parameters: 9 parameters.

Total direct builtin qualifier probes:

| Metric | Count |
|---|---:|
| Builtins with declared qualifier requirements | 71 |
| Builtin parameters with declared qualifier requirements | 95 |
| Direct call-site holes | 84 |
| Direct call-site hole builtins | 64 |

Enforced direct-call families:

| Family | Parameters | Finding |
|---|---:|---|
| `alertcondition()` `title`/`message` | 2 | direct `qualifier-mismatch` emitted |
| request barmerge `gaps`/`lookahead` | 9 | direct `qualifier-mismatch` emitted |

## Root Cause Shape

This is not a namespace-wide absence of qualifier logic. It is a split between two enforcement paths:

- `collectCallParameterQualifierRequirements()` records `TA_SIMPLE_PARAMETER_NAMES_BY_CALL` and input `defval` requirements when a UDF parameter is passed into those builtin arguments.
- `checkUserCallableParameterQualifiers()` then rejects incompatible callers, e.g. `f(len) => ta.sma(close, len); f(bar_index)`.
- Direct builtin calls do not run an equivalent qualifier check for those maps, so `ta.sma(close, bar_index)` and `input.float(close)` compile with no semantic diagnostic.

Refined wrapper probe:

| Scope | Requirements probed | Missing diagnostics |
|---|---:|---:|
| UDF-inferred TA simple + input const requirements | 84 | 0 |
| Direct builtin calls for the same requirements | 84 | 84 |

The likely fix should be one direct builtin qualifier-enforcement path over the same declared requirement maps, not 84 member fixes.

## Follow-up

Implemented after blast-radius measurement:

- TA `simple` direct-call enforcement is scoped to declared Pine v5+ sources.
  The v4 manual uses the older "form" vocabulary and this sweep did not find a
  supporting v4 statement for applying the 73 TA-simple requirements there.
- `input.* defval` direct-call `const` enforcement is also wired through the
  shared builtin qualifier checker. The direct gap was real, but the corpus
  blast radius was zero.
- The measured acceptance delta is attributable: six currently accepted corpus
  rows, all genuine TA series-length violations, are expected to become semantic
  refusals. That drop is a correctness win, not an output regression.

Instrumentation note: the input corpus candidates initially included ordinary
`int()`, `float()`, and `bool()` casts because the classifier reused the legacy
input alias map in a call-name context. Suspecting that instrument prevented a
false corpus blast-radius number. This is the same failure shape as the earlier
consensus plot-count ceiling, missing syminfo context, output-family
under-capture, and JavaScript string-coercion artifacts: surprising uniform
movement is an instrument suspect before it is a finding.

## Example Reds

Direct calls accepted today:

```pine
//@version=6
indicator("direct simple hole")
plot(ta.sma(close, bar_index))
```

```pine
//@version=6
indicator("direct const hole")
value = input.float(close)
plot(value)
```

Same requirements enforced through UDF inference:

```pine
//@version=6
indicator("udf simple enforced")
f(len) => ta.sma(close, len)
plot(f(bar_index))
```

Diagnostic:

```text
Cannot pass series value to simple parameter 'len' for function f; use an input/simple value or declare a compatible parameter
```

```pine
//@version=6
indicator("udf const enforced")
f(x) => input.float(x)
plot(f(close))
```

Diagnostic:

```text
Cannot pass series value to const parameter 'x' for function f; use an input/simple value or declare a compatible parameter
```

## Return-Qualifier Sweep Notes

The separate return-qualifier axis is partially guarded by existing semantic type invariants and checker tests:

- expression results inherit the strongest qualifier in the calculation;
- `input.*()` returns `input` except `input.source()`, which returns `series`;
- TA result families that always return `series` are represented that way;
- `timestamp()` has existing overload/argument qualifier coverage in `checker.test.ts`.

This report did not classify return-qualifier inference as an argument-refusal hole unless the builtin parameter declared a qualifier requirement and accepted a stronger argument. That keeps the count tied to enforcement, not general type inference.

## Verification

Commands/probes run:

- Direct spot probes:
  - `ta.sma(close, bar_index)`: no diagnostics.
  - `input.float(close)`: no diagnostics.
  - `plot(close, title=str.tostring(close))`: no diagnostics; not counted in the derived hole total because no direct checker declaration currently lists visual title parameters as `const`.
- UDF propagation spot probes:
  - `f(len) => ta.sma(close, len); f(bar_index)`: `qualifier-mismatch`.
  - `f(x) => input.float(x); f(close)`: `qualifier-mismatch`.
- Derived direct-call sweep:
  - 95 builtin qualifier probes.
  - 84 missing direct diagnostics.
  - 11 direct checks already enforced.
- Derived wrapper sweep:
  - 84 TA/input qualifier probes.
  - 0 missing UDF-inferred diagnostics.

## Sources

- TradingView Pine Script type system: https://www.tradingview.com/pine-script-docs/language/type-system/
- TealScript semantic checker declarations in `packages/tealscript/src/semantic/checker.ts`.
