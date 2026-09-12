# Pine Parser Continuation Sweep v1

Generated: 2026-09-12

Code under test: `abbeda9f9d`

Companion data: `pine-parser-continuation-sweep-v1.json`.

## Purpose

This sweep checks the parser for the shared-rule shape that has paid off in
other lanes: line continuation handled for some syntactic siblings but not
others. The trigger was the earlier switch-arm arrow continuation defect, which
was one instance of a broader "expression spans lines in a context the parser
did not expect" family.

The adjudication source is TealScript's grammar plus the committed Pine v6
manual-index grammar construct inventory, not PineTS. PineTS is not used as
evidence.

## Derived Scope

The sweep derives contexts from:

- `85` committed grammar snippets covering the `74/74` official manual-index
  entries.
- The grammar's continuation mechanisms: `__`, `OperatorSpace`,
  `CommaContinuationSpace`, `LoopHeaderContinuationSpace`,
  `PostfixContinuationSpace`, `InitializerSpace`, and indented block rules.

Covered continuation families:

- Function call argument lists, nested calls, named arguments, and declaration
  argument lists.
- Binary expressions with operators at line end and line start.
- Ternary expressions.
- `if`, `else if`, `while`, `for` range headers, and `for in` iterable headers.
- Switch discriminants, switch arm arrows, and switch arm block consequents.
- Tuple declarations, tuple assignment, equals-on-next-line initializers, and
  comma-chained statements.
- Method chains, receiver method calls, history/index postfixes.
- Array literals, generic collection constructors, UDT constructors, and field
  assignment.
- Function parameter lists, inline function bodies, block function bodies,
  library declarations, doc annotations before functions, and comments inside
  expression continuations.

## Result

| Bucket | Count |
| --- | ---: |
| Sweep cases | 37 |
| Parsed with expected AST shape | 36 |
| Parser-owned failures | 0 |
| Evidence-bound / out-of-scope probes | 1 |

The parse-stage closure holds under this derived continuation sweep. There is
no cluster on indentation depth, operator position, bracket nesting, comma
continuation, or switch-arm handling.

## Evidence-Bound Probe

| Probe | Result | Verdict |
| --- | --- | --- |
| `enum.field-title-continuation` | Parse failure when enum title string is placed on a new line after `=` | Not parser-owned without compiler evidence |

The documented titled enum form is `On = "ON"`, and that same-line form parses.
The failing probe is:

```pine
enum Mode
    On =
        "ON"
```

That is a non-expression declaration-field title, not one of the documented
expression or statement continuation contexts. Do not widen the grammar for this
shape without TradingView compiler evidence.

## Instrument Notes

An initial probe used leading-comma statement chains. Rechecking showed the
grammar's shared chain rule expects the comma at the end of the previous line,
then continuation whitespace. The valid comma-at-line-end forms parse and
produce the expected flattened declarations/statements, so the leading-comma
shape was a probe error, not a parser finding.

No engine behavior or grammar behavior was changed for this report.
