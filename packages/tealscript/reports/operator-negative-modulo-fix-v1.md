# TealScript Negative Modulo Fix v1

Date: 2026-09-12

Owner: TealScript runtime parity lane.

## Verdict

Landed the Priority 1 operator-semantics fix: declared Pine v5 and v6 `%` now
uses Pine floor-quotient modulo instead of JavaScript truncated remainder.

This is a wrong-value fix, not an acceptance/refusal change. The v4 operators
page consulted for the audit names `%` as remainder but does not state the
negative-operand floor-quotient formula, so v4 was left unchanged pending
version-specific evidence.

## Manual Evidence

TradingView v6 Operators states that `%` calculates modulo by rounding down the
quotient and illustrates it as `a - b * math.floor(nz(a / b))`.

Source: https://www.tradingview.com/pine-script-docs/language/operators/

TradingView v5 Operators states the same floor-quotient rule and formula.

Source: https://www.tradingview.com/pine-script-docs/v5/language/operators/

## Red-First Vector

Added `language.negative-modulo-floor-quotient`.

The vector is discriminating by construction:

```pine
//@version=6
indicator("negative modulo")
plot(-5 % 3)
plot(5 % -3)
plot(-5 % -3)
plot(5 % 3)
```

Expected values from Pine's formula are `1`, `-1`, `-2`, and `2`. JavaScript
`%` produces `-2`, `2`, `-2`, and `2`, so the first two plots fail under the
old model while the positive-only control would pass under both models.

Red-first run before the fix:

```text
cases: 993
compiledMatches/publicPathMatches: 991
unexpectedFailures: language.negative-modulo-floor-quotient
expectedFailures: strategy.calc-on-order-fills-values
```

After the fix:

```text
cases: 993
compiledMatches/publicPathMatches: 992
unexpectedFailures: none
expectedFailures: strategy.calc-on-order-fills-values
```

## Corpus Blast Radius

Measured from committed produced-output rows in:

- `external-pine-corpus-v5.report.json`
- `external-pine-corpus-v6.daily-rerun-8db55d66ae.json`
- `external-pine-corpus-v7.daily-rerun-8db55d66ae.json`
- `external-pine-corpus-v7-size-recovery.daily-rerun-3c2c00ac84.json`

Sources were refetched from the row GitHub coordinates into `/tmp`, cached by
source hash, parsed with the TealScript parser, and classified by AST. The
sign classifier treated unary negatives, subtraction, known signed TA/math
calls, and variables assigned from those forms as negative-capable; unknown
series signs stayed in a separate bucket rather than being counted as proven
affected.

Results for declared v5/v6 produced-output rows:

| Bucket | Rows |
| --- | ---: |
| Measured produced-output rows | 1,872 |
| Rows containing a `%` token | 709 |
| Parsed rows with `%`/`%=` operator sites | 243 |
| Rows with at least one syntactically negative-capable operand | 165 |
| Rows with modulo but only unknown operand signs | 78 |
| Rows with only positive-literal modulo | 0 |

By declared version:

| Version | Modulo rows | Negative-capable | Unknown sign only |
| --- | ---: | ---: | ---: |
| v5 | 36 | 8 | 28 |
| v6 | 207 | 157 | 50 |

Interpretation: 165 currently accepted scripts have a statically visible path
where TealScript could emit the wrong modulo value under live documented v5/v6
rules. The additional 78 rows are not proven safe; their operand sign depends
on runtime data or code the static sign pass did not classify.

## Implementation

The compiled emitter now lowers binary `%` to `_mod(left, right)` for declared
v5/v6 scripts. Compound `%=` uses the same helper through the shared assignment
emission path, covering local variables, persistent variables, root series
variables, UDT fields, and collection indexes. Other compound operators keep
their previous lowering.

`_mod(a, b)` returns Pine `na` for unavailable operands and otherwise computes
`a - b * Math.floor(a / b)`.

Focused runtime coverage asserts:

- v5 and v6 expression values for `-5 % 3`, `5 % -3`, `-5 % -3`, and `5 % 3`.
- v6 `%=` through a regular local, `var`, UDT field, and array index.

## Gate Status

Focused compiled runtime test:

```text
yarn workspace @tealstreet/tealscript vitest run src/runtime/codegen/compile.test.ts
1 file, 42 tests passed
```

Value-vector gate:

```text
yarn workspace @tealstreet/tealscript pine:value-vectors
cases: 993
compiledMatches/publicPathMatches: 992
unexpectedFailures: none
expectedFailures: strategy.calc-on-order-fills-values
```

Corpus fast gate:

```text
yarn workspace @tealstreet/tealscript pine:external-corpus:fast-gate
rows: 12
outputRows: 12
achievableOutputRows: 12
```

Corpus refusal gate:

```text
yarn workspace @tealstreet/tealscript pine:external-corpus:refusal-gate
rows: 6
expectedRefusals: 6
outputRows: 0
```

Checker suite:

```text
yarn workspace @tealstreet/tealscript vitest run src/semantic/checker.test.ts
1 file, 419 tests passed
```

Package lint:

```text
yarn workspace @tealstreet/tealscript lint
0 errors, existing warnings only
```

Package typecheck:

```text
time yarn workspace @tealstreet/tealscript typecheck
passed in 1:20.95
```
