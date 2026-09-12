# Operator Negative Modulo v7 Scope Fix v1

Date: 2026-09-12

## Verdict

The negative-modulo fix was version-scoped with an allowlist:

```ts
ctx.pineVersion === 5 || ctx.pineVersion === 6
```

That leaked on forward-declared v7 scripts, which TealScript otherwise accepts
by applying the v6 rule set. A v7 script therefore used JavaScript truncated
remainder for `%` while v5/v6 used Pine floor-quotient modulo.

The fix changes the modulo lowering to v5+, leaving v4 unchanged because the
v4 operators page inspected during the operator audit did not state the
negative-operand formula.

The v5 comparison helper remains exact-match v5; it was not changed.

## Guard

Added `language.negative-modulo-v7-forward-clamps-to-v6`, a discriminating value
vector:

```pine
//@version=7
indicator("negative modulo v7")
plot(-5 % 3)
plot(5 % -3)
plot(-5 % -3)
plot(5 % 3)
```

The vector fails under JavaScript `%` because the first two plots are `-2` and
`2` instead of Pine's `1` and `-1`.

Focused red before fix:

```text
yarn vitest run packages/tealscript/src/runtime/codegen/compile.test.ts -t 'uses Pine floor-quotient modulo for v5 and newer negative operands'
```

failed on the v7 iteration with JavaScript remainder values.

## Sources

- TradingView operators manual:
  https://www.tradingview.com/pine-script-docs/language/operators/
