# Pine Parser Continuation Sweep v2

Generated: 2026-09-12

Code under test: parser continuation fix in this commit, with recovery measured
against runtime commit `fd298c52db`.

Companion data: `pine-parser-continuation-sweep-v2.json`.

## Purpose

This extends `pine-parser-continuation-sweep-v1.md` after the runtime lane found
three external-corpus output losses whose semantic symptom was
`invalid-operator-operands`, but whose root cause was parser continuation
fallout. It now also sweeps every expression operator continuation derived from
`grammar.peggy`, plus the statement assignment operators as an explicit
out-of-scope bucket.

The missing shape was narrower than "operator-led continuation": a continuation
line beginning with `+` or `-` after a previous operand that was already a
complete conditional expression. The previous sweep covered operators at line
end/start, but not the completed-conditional operand boundary where the parser's
block-unary guard could win.

## Result

| Bucket | Count |
| --- | ---: |
| Original sweep cases | 37 |
| Added completed-conditional expression operator cases | 20 |
| Total sweep cases | 57 |
| Parsed with expected AST shape after fix | 56 |
| Parser-owned failures after fix | 0 |
| Evidence-bound / out-of-scope probes | 1 |

The fixed root cause was `isBlockIndentedOperator()` treating any `=` on the
candidate line as assignment evidence. Completed conditional operands with
`<=`/`>=` therefore made the next leading `+`/`-` parse as a fresh unary
expression statement instead of a binary continuation. The guard now scans for
top-level assignment operators (`=`, `:=`, `+=`, etc.) and ignores comparison
operators inside conditional expressions.

Completed-operand sweep result: `0` operators are misclassified after the fix.
The pre-fix failure clustered on one property: only additive `+` and `-` are
both unary and binary and route through `isBlockIndentedOperator()`, and the
triggering completed operand was a conditional expression whose comparison token
contained `=` (`<=` / `>=`). Direct siblings were checked:

| Grammar-derived group | Operators | Completed-operand result |
| --- | --- | --- |
| Logical | `or`, `and` | ok |
| Equality | `==`, `!=` | ok |
| Relational | `<=`, `>=`, `<`, `>` | ok |
| Bitwise | `|`, `^`, `&` | ok |
| Shift | `<<`, `>>` | ok |
| Additive | `+`, `-` | ok; only group guarded by `isBlockIndentedOperator()` |
| Multiplicative | `*`, `/`, `%` | ok |
| Ternary | `?`, `:` | ok |
| Assignment statement operators | `:=`, `+=`, `-=`, `*=`, `/=`, `%=` | not expression continuations; parsed by `AssignmentOperator` after a left-hand target |

The same completed-operand operator sweep parses under declared Pine v3, v4, v5
and v6. The continuation grammar is not version-dispatched.

## Corpus Recovery

Measured by running a three-row manifest corpus at runtime commit
`fd298c52db` with only the parser patch applied.

| Row | Declared version | Pre-fix symptom | Post-fix result |
| --- | ---: | --- | --- |
| `0497` | 6 | semantic `invalid-operator-operands` from escaped unary `+` string continuations | produced output |
| `0554` | 6 | semantic `invalid-operator-operands` from escaped unary `+` string continuations | produced output |
| `0924` | 5 | semantic `invalid-operator-operands` from escaped unary `+` conditional continuations | produced output |

Recovery count: `3/3`. The rows now pass parse, semantic, compile, execute, and
output in the scoped rerun.

## Standing Evidence-Bound Probe

The v1 evidence-bound enum title continuation probe remains unchanged:
same-line enum field titles parse, but an enum title string placed on a new line
after `=` still needs TradingView compiler evidence before grammar widening.
