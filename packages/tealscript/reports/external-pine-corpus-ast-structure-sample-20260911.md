> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus AST Structure Sample

Measured: 2026-09-11
Code under test: `800d920eaf + comma-chain loop-control boundary fix`
Worktree: `tealscript-parser`

## Purpose

The parse and semantic censuses count accepted sources, but a source that
parses to the wrong AST still counts as accepted. This pass samples that blind
spot by running structural AST invariants over every currently parse-passing
script in the v5, v6, and v7 corpus caches, then reporting a stratified sample
from the risky constructs that produced silent parser defects today.

## Inputs

| Corpus | Cache | Sources | Parsed at current HEAD |
| --- | --- | ---: | ---: |
| v5 | `pine-corpus-v5-20260910` | 1000 | 990 |
| v6 | `pine-corpus-v6-20260911` | 1000 | 989 |
| v7 | `pine-corpus-v7-20260911` | 456 | 440 |
| Total | | 2456 | 2419 |

The v5/v6 caches were read from the parity worktree cache; the v7 cache was
read from the corpus worktree cache. Parsing used this worktree's current
`packages/tealscript/src/parser` implementation.

## Invariants

The automated sweep checked only structural properties that can reveal a
wrong-tree pass without TradingView execution:

- Statement order inside program, function, loop, if, and switch-case bodies
  must remain source order.
- Statements that remain indented under a `for`, `while`, `once`, or UDF body
  header must be descendants of that block.
- Same-indent `else` lines inside an `IfStatement` source span must appear in
  the AST alternate.
- Tuple declaration initializers whose RHS is an `if` must retain a same-indent
  `else`.
- Switch cases must stay ordered, and statement consequents must stay ordered.

NBSP was normalized in the audit before indentation checks because the parser
normalizes NBSP outside strings before parsing.

## Feature Coverage

| Risk family | Parse-passing scripts containing shape | Rows in stratified sample |
| --- | ---: | ---: |
| Loop blocks | 648 | 13 |
| If/else boundaries | 1316 | 18 |
| Switch arms | 224 | 10 |
| Tuple bindings | 627 | 17 |
| Type/enum blocks | 231 | 11 |
| Line wrapping | 1519 | 17 |
| Operator precedence | 2419 | 28 |
| Comma chains | 2057 | 23 |

The stratified sample contains 28 unique scripts selected from the riskiest
feature intersections plus a deterministic spread across v5, v6, and v7. The
sample itself had zero structural invariant failures.

## Finding

The all-script invariant sweep did find one real parser-owned wrong-tree class
before the fix: comma-chained loop control inside an indented block could
consume the following function-body return expression.

Representative source:

```pine
check_liquidity_sweep(string direction) =>
    swept = false
    if array.size(liquidityPools) > 0
        for pool in liquidityPools
            if pool.swept
                swept := true, break
    swept
```

Before the fix, the nested `break` parsed as part of the comma chain but its
statement consumption reached across the line terminator. The UDF source range
included the final `swept` line, but the function body array stopped before the
return expression. That is a silent AST-boundary defect: the source parsed, but
the tree did not contain the full function body.

Rows exposed by the invariant:

- v6 `0486`: `institutional_crt_frameworkv8.pine`
- v7 `0243`: `Siege-_structure-_engine_v6.pine`
- v7 `0441`: `institutional_crt_frameworkv9.pine`
- v7 `0442`: `institutional_crt_frameworkv8.1.pine`

The grammar now uses the inline loop-control production for comma-chained
statements, so `break` and `continue` do not consume the enclosing block's
following line terminator.

## Post-Fix Result

After the fix, the same all-script structural sweep reported one invariant hit,
and inspection showed it was an audit false positive: v6 `0980` contains a
second complete script template inside a `/* ... */` block comment, and the
text scanner saw an `else if` inside that comment. The parser did not parse
that commented template as code.

Post-fix structural result:

| Metric | Rows |
| --- | ---: |
| Parse-passing scripts checked | 2419 |
| Stratified sample size | 28 |
| Sample structural failures | 0 |
| Real post-fix structural failures | 0 |
| Inspected audit false positives | 1 |

## Sample Rows

| Corpus | Row | Features |
| --- | --- | --- |
| v7 | `0131` | comma chains, if/else, wrapping, loops, precedence, switch, tuples, type/enum |
| v6 | `0622` | comma chains, if/else, wrapping, loops, precedence, switch, tuples, type/enum |
| v5 | `0535` | comma chains, if/else, wrapping, loops, precedence, switch, tuples, type/enum |
| v5 | `0838` | comma chains, if/else, wrapping, loops, precedence, switch, tuples, type/enum |
| v7 | `0388` | comma chains, if/else, wrapping, loops, precedence, switch, tuples, type/enum |
| v7 | `0389` | comma chains, if/else, wrapping, loops, precedence, switch, tuples, type/enum |
| v5 | `0493` | comma chains, if/else, wrapping, loops, precedence, switch, tuples, type/enum |
| v6 | `0357` | comma chains, if/else, wrapping, loops, precedence, switch, tuples, type/enum |
| v7 | `0397` | comma chains, if/else, wrapping, loops, precedence, switch, tuples, type/enum |
| v5 | `0506` | comma chains, if/else, wrapping, loops, precedence, switch, tuples, type/enum |
| v5 | `0001` | comma chains, wrapping, precedence, tuples |
| v5 | `0199` | comma chains, if/else, wrapping, precedence |
| v5 | `0397` | comma chains, wrapping, precedence, tuples |
| v5 | `0595` | comma chains, if/else, wrapping, precedence, tuples |
| v5 | `0794` | comma chains, if/else, precedence |
| v5 | `1000` | comma chains, if/else, loops, precedence |
| v6 | `0001` | comma chains, precedence, tuples |
| v6 | `0200` | comma chains, if/else, precedence, tuples |
| v6 | `0398` | comma chains, precedence |
| v6 | `0600` | comma chains, precedence |
| v6 | `0799` | comma chains, if/else, precedence |
| v6 | `1000` | wrapping, precedence, type/enum |
| v7 | `0001` | precedence |
| v7 | `0096` | precedence |
| v7 | `0186` | precedence |
| v7 | `0279` | precedence |
| v7 | `0369` | comma chains, if/else, wrapping, loops, precedence, tuples |
| v7 | `0456` | comma chains, if/else, wrapping, loops, precedence, tuples |

## Notes

An attempted generic precedence invariant was discarded as too noisy because
AST expression locations do not include grouping parentheses consistently. For
example, parenthesized arithmetic such as `(a + b) / c` appears as a lower-
precedence child under `/`, which is correct. Precedence remains represented in
the stratified source sample and the parser unit tests, but this report does
not claim a corpus-wide automated precedence proof.
