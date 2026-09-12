# External Pine Consensus PineTS Grammar And Precedence Audit v1

Generated: 2026-09-12

Code under test: `5e247d592f`

PineTS under test: npm `pinets@0.9.33`, installed in `/tmp/pinets-audit-1789188575`.

Companion row list:
`external-pine-consensus-pinets-grammar-precedence-audit-v1.json`.

## Purpose

Sam's consensus rule currently treats PineTS as canon where it is the only
external engine that ran. This audit tests the premise that PineTS interprets
documented grammar and operator behavior correctly before other lanes adopt
PineTS-sole conventions into TealScript.

Inputs:

- `84` committed `language.*` value-vector cases from
  `scripts/run-pine-value-vectors.ts`.
- `85` committed grammar snippets from
  `src/compat/pineV6GrammarReference.ts`.
- Explicit precedence probes for the documented precedence family, including
  `a == b > c`.
- Consensus full and cross-check reports from `origin/tealscript-corpus`.

The oracle is the documented expectation already encoded in the value-vector
case, not TealScript's runtime result.

## Headline

| Surface | Right | Wrong | Cannot run / express |
| --- | ---: | ---: | ---: |
| `language.*` value vectors | 55 | 17 | 12 |
| Grammar snippets | 68 | n/a | 17 |
| Explicit precedence probes | 2 | 0 | 0 |

Verdict: **PineTS is unsafe as a blanket sole canon.** It is safe only after
named exception families are excluded or independently traced. The explicit
operator precedence probes passed, so this audit did not find a broad
precedence/associativity bug. The risk is instead concentrated in history,
block-valued expression, local-shadowing, drawing-method, and unsupported
syntax families.

## Wrong Documented Behaviors

Ranked by row exposure in the consensus data:

| Family | Wrong vectors | 119 survivor overlap | PineTS-sole canon overlap | PineTS-sole differing overlap | Verdict |
| --- | ---: | ---: | ---: | ---: | --- |
| Drawing receiver/value methods | 1 | 19 | 355 | 253 | Contaminated. Do not adopt PineTS-sole drawing method values without trace/vector evidence. |
| Builtin-name shadowing | 4 | 30 | 57 | 41 | Contaminated. PineTS produces `na` where documented local values should shadow builtins. |
| History on expression/function/method results | 8 | 1 | 70 | 58 | Contaminated. PineTS loses documented history values for non-root result expressions. |
| Block-valued loop expression | 1 | 2 | 9 | 3 | Contaminated. PineTS does not match documented loop expression result semantics. |
| Switch arm with nested `if` value | 1 | 0 | 9 | 7 | Contaminated. This is the same class as the earlier switch-tail value defect. |

The `119` survivor overlap is conservative source-pattern matching, not a final
defect classification. It is a strike list: these rows should not be fixed on
PineTS-sole evidence alone.

Full row keys are in the JSON companion under:

- `contamination.survivors`
- `contamination.pinetsSoleCanon`
- `contamination.pinetsSoleDiffering`

Union counts:

- `52 / 119` surviving value candidates overlap at least one PineTS-wrong family.
- `446 / 1338` PineTS-sole canonical rows overlap at least one PineTS-wrong family.
- `319 / 716` PineTS-sole rows where TealScript differs overlap at least one PineTS-wrong family.

## Wrong Vector Details

PineTS produced a value that disagreed with the documented expectation for these
cases:

- `language.expression-history`: `plot[0][1] null != 0`
- `language.global-history-offset-boundaries`: `plot[2][1] null != 11`
- `language.function-result-history`: `plot[0][1] null != 1`
- `language.function-result-history-call-sites`: `plot[0][1] null != 1`
- `language.nested-expression-history-offset2`: `plot[0][2] null != 0`
- `language.method-result-history`: `plot[0][1] null != 0`
- `language.for-loop-return-expression`: `plot[0][2] null != 0`
- `language.root-if-local-shadows-builtin-history`: `plot[0][1] null != 10`
- `language.nested-if-local-shadows-builtin-history`: `plot[0][1] null != 20`
- `language.if-branch-local-shadows-builtin-current`: `plot[0][0] null != 0`
- `language.conditional-local-shadows-builtin-current`: `plot[0][3] null != 42`
- `language.block-local-var-shadows-builtin-current`: `plot[0][3] null != 2`
- `language.ternary-expression-history`: `plot[0][1] null != 0`
- `language.array-method-result-history`: `plot[0][1] null != 0`
- `language.block-boundary-unary-return-values`: `plot[0][1] null != 1`
- `language.block-boundary-switch-nested-if-values`: `plot[0][3] null != 7`
- `language.drawing-receiver-method-named-values`: `plot[0][11] null != 3`

## Cannot Run Or Express

These are not wrong-value evidence because PineTS did not produce a usable
result, but they show where PineTS cannot serve as canon at all:

- UDT/history cases: `language.udt-history-field-read`,
  `language.udt-method-result-field-history`,
  `language.udf-returned-udt-field-history`.
- Arrow continuation and bitwise syntax:
  `language.switch-arm-arrow-continuation-values`,
  `language.bitwise-operator-values`.
- Lazy branch/error cases:
  `language.or-short-circuit-skips-error`,
  `language.and-short-circuit-skips-error`,
  `language.if-branch-skips-error`,
  `language.switch-branch-skips-error`.
- Import/library and collection history:
  `language.library-local-state-call-sites`,
  `language.collection-history-containers`,
  `language.collection-history-offset-boundaries`.

Grammar snippet acceptance produced the same shape: PineTS cannot run imports,
exported library declarations, bitwise operators, method declarations/overloads,
some doc-annotation/export snippets, and method-chain continuation.

## Precedence Result

The explicit precedence probes passed:

- `a == b > c` evaluated as `a == (b > c)`.
- A chained `or`, `and`, equality, relational, additive and multiplicative
  expression evaluated with the documented grouping.

No precedence rows are contaminated by this audit.

## Impact On Consensus

The current PineTS-sole rule should not be used as an unfiltered canon source.
Rows in the contaminated families should be struck from automatic defect
adoption until they have independent value-vector or TradingView trace evidence.

This does not invalidate every PineTS-sole row. It does invalidate the blanket
premise that PineTS being the only engine to run makes its value canonical.
PineTS is useful as a voter; it is not safe as sole canon for the named families.

## Compile-Evidence Routing

The evidence-bound parser/semantic questions remain routed and were not guessed:

- `v7 0253` is already covered by Q2C in
  `pine-compile-evidence-request-v1.md`.
- The duplicate function/value namespace rows are already covered by Q1A/Q1B in
  `pine-compile-evidence-request-v1.md`.

No engine behavior change is made by this report.
