# External Pine Corpus AST Structure Invariants - 2026-09-11

Parent parity commit: `5527d33731881513b0ddd67a44a85f803b2badb5`
Report commit: this commit

## Purpose

The parse censuses count scripts that produce an AST. They do not prove the AST is structurally correct. This pass added parser-side structural invariants and ran them over every parse-passing source in the v5, v6, and v7 external Pine corpus caches.

## Instrument Validation

The invariant checker was validated against parser-owned known-good tests before corpus use. The validation fixture includes boundary, tuple-initializer, switch, and operator-precedence shapes that should pass cleanly. Mutated AST tests prove the checker catches:

- An indented function-body statement moved outside its function body.
- A tuple initializer `if` expression that loses its same-indent `else`.
- A binary expression whose AST root operator disagrees with source precedence.
- A relational/equality precedence shape checked against the Pine v6 documented precedence ladder, not against the grammar under test.

Focused validation command:

```text
yarn workspace @tealstreet/tealscript exec vitest run src/parser/parser.test.ts --testNamePattern "AST structure invariants|switch|loop-valued"
```

Result: `1` file passed, `175` tests passed.

## Calibration Notes

Several early hits were instrument errors and were fixed before classifying corpus rows:

- The checker now mirrors parser wrapper source normalization for line endings, leading tabs, NBSP layout whitespace, and the parser's 3-space UDF indentation normalization.
- Same-indent `else` scanning masks comments and strings, so commented-out Pine snippets do not count as visible syntax.
- Switch arm counting uses masked source to ignore comments/strings but raw normalized source for indentation, so string-literal case labels like `"SMA" =>` do not shift the apparent arrow column.
- Operator scanning now requires identifier boundaries for `and`/`or`, skips unary signs, and skips exponent signs such as `1e-9`.
- Block-region scanning ignores obvious wrapped continuation lines, including leading-comma argument continuations.

The operator-precedence invariant is intentionally conservative: it only checks isolated single-line binary expression spans with unique AST locations. Broader spans are skipped rather than reported because they are not evidence-bearing.

The binary precedence table is derived from TradingView's Pine Script v6 operator reference, not from `grammar.peggy`: multiplicative `*`/`/`/`%` above additive `+`/`-`, relational `>`/`<`/`>=`/`<=` above equality `==`/`!=`, then `and`, then `or`. The same reference says same-precedence operators are evaluated left-to-right, so the invariant rejects unparenthesized right-nesting at the same documented precedence.

## Final Sweep

Corpus caches:

- v5: `pine-corpus-v5-20260910`
- v6: `pine-corpus-v6-20260911`
- v7: `pine-corpus-v7-20260911`

Final counts:

| Corpus | Sources | Parsed | Parse Failed |
|---|---:|---:|---:|
| v5 | 1000 | 990 | 10 |
| v6 | 1000 | 989 | 11 |
| v7 | 456 | 440 | 16 |
| Total | 2456 | 2419 | 37 |

Final invariant result after fixes:

| Bucket | Rows | Issues | Verdict |
|---|---:|---:|---|
| Confirmed parser-owned silent AST defects fixed in this pass | 2 | 4 | Real |
| Remaining malformed-indentation candidates | 2 | 21 | Not classified as TradingView-valid without compiler evidence |
| Clean parse-passing rows | 2415 | 0 | Clean under these invariants |

Precedence-specific result after the doc-derived table was installed: `0` precedence invariant rows across all `2419` parse-passing sources.

## Standing Gate

The AST structural and doc-derived precedence invariants are now wired into
`src/compat/pineInvariantGate.test.ts`, which runs in the normal TealScript
Vitest suite. The gate uses a fast corpus-derived subset covering the silent
classes fixed in this pass: comma-chained `break` block boundaries, nested
switch arm boundaries, loop-valued reassignment boundaries, tuple `if`/`else`
binding, and equality/relational precedence.

## Additional Precedence Finding

While making the precedence invariant explicitly doc-derived, the checker exposed one more silent parser defect in the local regression corpus: relational and equality operators were grouped together, so `a == b > c` parsed as `(a == b) > c`. The Pine v6 operator table gives relational operators higher precedence than equality, so the correct tree is `a == (b > c)`. The expression grammar now separates relational and equality precedence, and the invariant sweep found no remaining precedence rows in the external corpora.

## Fixed Defects

### Nested switch case boundary

Row: v6 `0622`

Shape:

```pine
switch obj.dir.get(i)
    1 =>
        switch obj.wM.get(i)
            1 => ...
            2 => ...
            3 => ...
    -1 =>
        switch obj.wM.get(i)
            1 => ...
```

Before the fix, the inner `switch obj.wM.get(i)` treated the outer `-1 =>` as its own fourth case. The outer switch therefore had one case instead of two.

Fix: switches parsed inside arbitrary nested function blocks now tie all cases to the first case's exact indentation instead of allowing fixed-depth indentation prefixes to match deeper or shallower sibling arms.

### Loop-valued reassignment body boundary

Row: v6 `0382`

Shape:

```pine
made := for i = 0 to count
    Point.new(...)
made
```

and the same shape for `while`.

Before the fix, the `made` function-body return expression could be consumed as part of the `for` or `while` expression body, or dropped out of the function body after tightening the loop body. The function-context reassignment grammar now handles expression-valued `for`/`while` RHS forms directly, and the generic `IndentedBlock` captures full indentation on candidate lines before accepting them into a block.

## Remaining Rows

These rows still trip block-region invariants, but the visible source is malformed indentation. I did not change acceptance behavior without TradingView compiler evidence that these layouts are accepted.

### v5 `0651`

File: `sources/0651__knectardev-pine_scripts__v2.5.6_v2.5.10.pine`

Shape:

```pine
if not na(entryBarIndex) and (bar_index - entryBarIndex) >= maxHoldBarsInput
strategy.close_all(comment=EXIT_TIMEOUT_COMMENT)
```

The supposed `if` body is at the same indentation as the `if` header.

### v7 `0438`

File: `sources/0438__alboogycOdR-dev-projects__SMC_SSE_v221_Strategy.pine`

This file has repeated same-indent body candidates, including:

```pine
if arrSize > 0
    for i = 0 to arrSize - 1
        if i < array.size(activeFVGs)
    fvg = array.get(activeFVGs, i)
```

and:

```pine
if array.size(levels) > 0
for i = 0 to array.size(levels) - 1
```

Those remain classified as malformed-indentation candidates, not confirmed TradingView-valid AST defects.

## Result

The structural invariant pass found two additional real silent parser boundary defects across the 2,419 parse-passing corpus sources, both fixed here. After those fixes, all parse-passing rows with valid-looking structure are clean under the automated invariants. The only remaining invariant hits are two rows whose source indentation appears invalid and needs live compiler evidence before changing acceptance.
