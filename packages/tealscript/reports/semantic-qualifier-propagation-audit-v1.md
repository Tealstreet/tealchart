# Semantic Qualifier Propagation Audit v1

Date: 2026-09-12

**Scope correction on 2026-09-12:** the later live-reference audit
`semantic-ta-qualifier-live-reference-correction-v1.md` found that the prior
TA simple-parameter table was over-broad. Read TA enforcement counts below as
historical. The corrected table contains 21 v5 simple-only TA pairs and 22 v6+
pairs, while common length parameters such as `ta.sma:length` and
`ta.highest:length` accept `series int`. The propagation conclusion still
stands for the audited scalar qualifier machinery; the earlier six-row refusal
delta does not.

## Verdict

No scalar qualifier propagation defect was found.

The newly enforced builtin qualifier checks from
`semantic-argument-qualifier-enforcement-v1.md` were not being fed by an
over-promoting scalar inferencer on the audited surfaces. The later
live-reference correction narrowed the TA simple-only table, but the
propagation result still holds for the audited machinery: TA simple-only slots
accepted a valid derived `simple int` expression, and ordinary simple
expressions were not treated as `series`.

Counts:

- Scalar/value propagation rules audited: 8 derived rule families.
- Wrong or unenforced scalar propagation rules found: 0.
- Over-promotion failures affecting the then-current TA-simple enforcement
  table: 0 of 73 historical parameter slots. The current table is narrower;
  see `semantic-ta-qualifier-live-reference-correction-v1.md`.
- Const over-promotion failures affecting typed `input.* defval` enforcement:
  0 of 11 constructors.
- Clustering: none for scalar/value propagation, because no scalar failures
  were found.

## Documentation Basis

TradingView's type-system documentation defines the qualifier hierarchy as:

```text
const < input < simple < series
```

It also specifies that expression results inherit the strongest qualifier in
the calculation; weaker qualifiers may flow into stronger-accepting parameters,
but stronger qualifiers cannot flow into weaker-accepting parameters. Literals
and expressions using only const values remain const. Combining a simple value
with a const value produces simple. Any expression that depends on a series
value is series. Reference and special types, including arrays, maps, matrices,
drawing handles and UDTs, automatically inherit series.

The user-defined-function documentation specifies the same propagation at call
sites: untyped parameters inherit the qualified types of their arguments, and a
UDF call returns the strongest qualifier used in its returned calculation.

## Derived Scope

The scope was derived from the semantic checker and invariant checker dispatch
paths rather than from a hand-written list of examples:

- literal and constant-folded expressions;
- unary, arithmetic, comparison and logical expressions;
- input, simple and series identifier expressions;
- ternaries, `if` expression values, loop expression values and switch arms;
- tuple destructuring;
- history/index expressions;
- UDF parameter inference and return inference;
- builtin return-qualifier families: `input`, `math`, `str`, `color`, `ta`,
  `request`, `time`, `timeframe`, `ticker`, `syminfo`, collections, drawing
  constructors, chart points, UDT constructors and imported functions.

The audit also compared those paths with
`src/semantic/semanticTypeInvariants.ts`, which independently re-derives a
large subset of the same qualifier rules for invariant checks.

## Probes

### General Propagation Matrix

An inline semantic-checker probe asserted inferred symbol qualifiers across
seven scripts and 59 symbol expectations:

- literals and constant-folded int, float, bool and string expressions remain
  `const`;
- `input + const` remains `input`;
- `simple + const` and `simple + input` remain `simple`;
- any arithmetic or comparison involving `close`/`open` promotes to `series`;
- ternary, `if`, and `switch` expression values merge to the strongest
  qualifier from their control expressions and arms;
- tuple destructuring preserves each element's independent qualifier;
- `math.max`, `math.avg`, `math.round_to_mintick`, `color.*`, `str.*`,
  `ta.*`, `request.*`, `time`, `timeframe.*`, and `timestamp` return the
  documented qualifier family;
- UDF calls with const, input, simple and series arguments return the strongest
  qualifier used in the function body;
- history reads promote to `series`;
- `array.from`, `matrix.new`, `map.new`, `chart.point.now`, and `line.new`
  return `series` reference values.

Result:

```json
{
  "cases": 7,
  "assertions": 59,
  "failures": []
}
```

### TA Simple Over-Promotion Sweep

The high-risk direction was over-promotion: a valid simple expression becoming
series and tripping the just-landed direct builtin enforcement. A generated
probe walked the then-current `TA_SIMPLE_PARAMETER_NAMES_BY_CALL`, built a
named call for each of the 73 historical parameter slots, and passed:

```pine
simpleLen = int(timeframe.in_seconds("1") / 20)
```

into the target slot.

Result:

```json
{
  "entries": 53,
  "probes": 73,
  "failures": 0,
  "sampleFailures": []
}
```

This covered the full denominator enforced by commit `2d9aa7168e`. That
denominator was later corrected from live `allowedTypeIDs`; do not use it as
the current TA simple-only scope.

### Input Defval Const Over-Promotion Sweep

A direct probe passed constant-folded defaults to all 11 typed input
constructors covered by `INPUT_DEFAULT_TYPE_REQUIREMENTS`:

- `input.bool`
- `input.color`
- `input.float`
- `input.int`
- `input.price`
- `input.session`
- `input.string`
- `input.symbol`
- `input.text_area`
- `input.time`
- `input.timeframe`

Result:

```json
{
  "cases": 11,
  "failures": []
}
```

### Reference-Type Edge

Ordinary Pine reference constructors are correctly inferred as `series`:
`array.from`, `matrix.new`, `map.new`, drawing constructors, chart points, and
UDT constructors all go through series-returning paths.

One scoped edge is worth recording separately: TealScript's `ArrayExpression`
node also represents Pine tuple syntax for destructuring. In a standalone
single-variable assignment using bracket syntax, that node inherits from its
elements rather than being treated as a Pine reference constructor. This was
not counted as a scalar propagation defect because Pine arrays are constructed
with `array.from`/`array.new*`, and the ordinary Pine reference construction
paths are already series. If TealScript intends standalone bracket values to be
first-class array references, that extension needs a separate decision and
test, not a retrofit into the scalar qualifier audit.

## Cluster Answer

No scalar propagation holes clustered on a construct, qualifier level, builtin
family, merge shape, or UDF path. The only noted edge is the single
bracket-expression/reference ambiguity described above, which is outside the
Pine scalar/value propagation surface that feeds builtin qualifier enforcement.

## Impact on the Previous Enforcement

The TA-simple enforcement landed in `2d9aa7168e` refused six accepted corpus
scripts. This audit did not find an over-promotion bug, but the later
live-reference correction found those six refusals were invalid because the
affected TA parameters accept `series int`:

- TA simple-only slots accept an expression TealScript correctly infers as
  `simple int`;
- mixed input/simple expressions stay simple, not series;
- branch and UDF returns with no series dependency stay at their strongest
  non-series qualifier;
- series promotion occurs only when a series operand, control expression,
  history reference, TA/request/time result, or reference value participates.

The qualifier system is therefore closed end-to-end for the documented
scalar/value propagation shapes audited here: type/qualifier inference supplies
the expected qualifiers, and the direct builtin argument checks enforce the
documented requirements against those qualifiers.

## Sources

- TradingView current type system:
  https://www.tradingview.com/pine-script-docs/language/type-system/
- TradingView current user-defined functions:
  https://www.tradingview.com/pine-script-docs/language/user-defined-functions/
