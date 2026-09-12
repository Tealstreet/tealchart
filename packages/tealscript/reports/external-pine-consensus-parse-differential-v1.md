# External Pine Consensus Parse Differential v1

Code under test: `c8a7e4d653378d01c7efe1afed3329398fca44fb`

Inputs:

- PineTS side: `external-pine-consensus-full-v1.json` from `origin/tealscript-corpus`
  - measured commit: `0a5c87fe05b6542616b6331bab7956a79beb38a0`
- TealScript side: local parse-only sweep using `parse(source, { grammarSource })`
- Population: `2,428` declared v5/v6 rows from the consensus run.
  - The corpus caches contain `2,506` rows total, but the consensus harness filters to declared v5/v6 candidates; the remaining `78` v5-cache rows are undeclared and have no PineTS consensus result to compare.

PineTS parse acceptance is inferred from the recorded PineTS outcome:

- PineTS parse fail: engine failure text contains parser/transpiler markers such as `Failed to transpile`, `Unexpected token`, `Unexpected character`, `Expected ...`, or `Indentation error`.
- PineTS parse pass: PineTS produced plots or failed later with runtime/semantic text such as unknown builtins, bad sessions, or JavaScript runtime errors.

This is intentionally weaker than a direct PineTS AST API, but it separates parser/transpiler failures from later engine failures in the available independent run.

## Headline

| Result | Rows |
| --- | ---: |
| Both parse | 2,147 |
| TealScript parses, PineTS refuses | 246 |
| Both refuse | 33 |
| TealScript refuses, PineTS parses | 2 |

TealScript parse pass: `2,393 / 2,428`.

PineTS parse/transpile pass: `2,149 / 2,428`.

## Verdict

The parse-stage closure still holds for confirmed parser-owned gaps: this differential found `0` doc-supported Pine constructs that TealScript rejects while PineTS parses.

It does add one useful external signal to an already-known unclassified row:

- `v7 0253`, tuple declaration whose `=` appears after a blank continuation line, is accepted by PineTS parsing and rejected by TealScript parsing. This row was already listed as unclassified in `external-pine-corpus-v7-parse-stage-census-20260911.md`. PineTS acceptance raises its priority for TradingView compiler evidence, but documentation alone does not settle the blank-line-before-`=` shape, so it is not classified as parser-owned here.

The other TealScript-refuses/PineTS-parses row is invalid Pine syntax (`if ... then`) that PineTS parses loosely.

## Direction 1: TealScript Refuses, PineTS Parses

| Cause | Rows | Verdict | Examples | Notes |
| --- | ---: | --- | --- | --- |
| JavaScript-style/Algol-style `if ... then` single-line statement | 1 | PineTS-loose; TealScript refusal stands | `v6 0560` | Source has `if not na(bsl_line) then line.delete(bsl_line)`. Pine uses indentation-delimited `if` blocks, not `then`. PineTS parses, then fails later on `session.regular`; that does not make the syntax valid Pine. |
| Tuple declaration `=` after a blank continuation line | 1 | Evidence-bound, not confirmed ours | `v7 0253` | Source splits a tuple declaration over several lines, leaves a whitespace-only continuation line, then places `= normalizedData()` on the next line. PineTS parses and later fails at runtime. Existing v7 parse census kept this row unclassified; this differential adds independent parse acceptance but not enough TradingView evidence to call it a parser defect. |

No confirmed parser fix queue comes out of Direction 1.

## Direction 2: TealScript Parses, PineTS Refuses

This direction is the weaker signal. The clusters line up with known PineTS parser/transpiler limitations rather than TealScript over-acceptance.

| Cause | Rows | Verdict | Examples | Notes |
| --- | ---: | --- | --- | --- |
| PineTS lacks library `import` / `export` syntax | 125 | PineTS-incomplete | `v5 0490`, `v5 0602`, `v6 0202` | Largest bucket. `import` and exported library members are valid Pine syntax; PineTS rejects them as unexpected keywords. |
| PineTS expression/declaration grammar limitations | 53 | PineTS-incomplete | `v5 0010`, `v5 0053`, `v5 0150` | Includes `Expected OPERATOR`, `Expected RBRACKET`, comma and declaration-form failures. TealScript acceptance is not a defect signal without TradingView refusal evidence. |
| PineTS indentation/block/continuation limitations | 49 | PineTS-incomplete | `v5 0043`, `v5 0193`, `v5 0476` | Includes unexpected `INDENT`/`DEDENT`, continuation, and `else` handling. This matches the class where TealScript already had boundary-specific corpus fixes and invariant gates. |
| PineTS lexical/Unicode limitations | 16 | PineTS-incomplete or artifact-sensitive | `v5 0165`, `v5 0642`, `v6 0284` | Includes NBSP and other Unicode characters. TealScript intentionally tolerates NBSP layout whitespace based on prior evidence; full-width space remains rejected. |
| Other PineTS tokenization limitations | 3 | PineTS-incomplete | `v6 0231`, `v6 0423`, `v6 0490` | Small tail of token-level PineTS parse failures. |

No TealScript parser change should be made to match Direction 2.

## Both Refuse

There are `33` rows both parsers refuse. They are not a differential signal, but the top shapes are consistent with earlier invalid/unclassified rows:

- numeric-literal/prose artifacts in encoded v5 sources
- JavaScript-style semicolons, `return`, `||`, and inline callback syntax
- U+3000 full-width spaces
- malformed tuple/comma wrapping rows

These do not affect the closure verdict.

## Instrument Notes

- The PineTS package is not present in this worktree cache, so this report does not rerun PineTS. It consumes the already-recorded full consensus PineTS outcomes and reruns only the TealScript parse stage locally.
- The comparison is parse/transpile acceptance, not runtime/value agreement.
- PineTS parse acceptance is weak evidence. Documentation and declared Pine version still adjudicate validity.
- Huge Direction 2 buckets are treated as PineTS limitations first, per the instrument-suspicion rule; the largest bucket is a clear harness/engine limitation (`import`/`export`).

## Follow-Up

Add `v7 0253` to the compile-evidence runbook if it is not already covered:

```pine
//@version=5
indicator("Tuple equals after blank continuation")

f() =>
    [1, 2, 3]

[a, b,
 c]

  = f()

plot(a + b + c)
```

Accepted by TradingView means TealScript has a real parser gap in tuple declaration continuation handling. Rejected by TradingView means the existing unclassified row becomes invalid Pine/source-copy artifact and the parse-stage closure remains closed without caveat.
