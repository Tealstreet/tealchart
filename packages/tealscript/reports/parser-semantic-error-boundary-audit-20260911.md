# Parser/Semantic Error Boundary Audit - 2026-09-11

Measurement commit: `09b6222b25`

Scope: production files under `packages/tealscript/src/parser/` and `packages/tealscript/src/semantic/`, excluding generated parser output and tests.

## Question

The runtime lane found the same defect at three error boundaries: Pine-facing runtime exceptions were classified by exception type instead of `isKnownPineRuntimeError()`, then discarded as generated/backend failures. This audit checks whether parser or semantic has the same class: a catch boundary that can misclassify a genuine Pine-facing parse or semantic error and hide it from the user.

## Method

Searched production parser/semantic files for exception boundaries and error conversions:

```bash
rg -n "try\s*\{|catch\s*\(|finally|throw\s+" \
  packages/tealscript/src/parser packages/tealscript/src/semantic \
  -g '!**/*.test.ts' -g '!generated.*'

rg -n "catch\s*\(|try\s*\{|finally" \
  packages/tealscript/src/parser packages/tealscript/src/semantic \
  -g '!**/*.test.ts' -g '!generated.*' --glob '!**/node_modules/**'
```

## Boundary Inventory

| Boundary | Location | Classification | Result |
| --- | --- | --- | --- |
| Parser wrapper around `generatedParser.parse(...)` | `src/parser/parser.ts:95-121` | Uses `isPeggyError(error)`, a structural predicate requiring `Error` plus Peggy `location`, `found`, and `expected`; Peggy syntax errors are converted to `TealscriptParseError`, optional source-aware message shims are applied, and non-Peggy errors are rethrown. | No swallowed Pine-facing error found. Syntax failures become parse diagnostics; limit/internal errors do not get demoted into syntax errors. |
| Parser `validate(source)` public helper | `src/parser/parser.ts:785-792` | Uses `error instanceof TealscriptParseError` only to format known parse errors as `Line N: ...`; all other `Error` instances return their message, and non-Errors return `Unknown error`. | No swallowed Pine-facing error found. This loses structured fields by design because the helper returns `string | null`, but it does not hide parse or limit errors. |
| Semantic return/type inference recursion guards | `src/semantic/checker.ts:3242-3249`, `3261-3268`, `4639-4646`, `8630-8648` | `try/finally` only; no `catch`. The `finally` blocks remove active inference markers after recursive type/qualifier inference. | Not an error classifier. Exceptions propagate rather than being converted, demoted, or swallowed. |
| Semantic diagnostic production | `src/semantic/checker.ts:2959-3001`, `11688-11696` and explicit `addDiagnostic(...)` call sites | Semantic failures are produced directly as diagnostics during checker traversal. There is no production `catch` in `src/semantic` that converts thrown errors into diagnostics or recoverable results. | No equivalent runtime-style boundary found in semantic. |

## Conclusion

Parser and semantic do not share the runtime error-boundary defect in the audited tree.

The parser has two production catches. The main parse boundary uses a syntax-error predicate and rethrows everything outside that shape; the validation helper formats errors but does not suppress them. Semantic has no production catch classifiers: its only `try` blocks are `finally` cleanup around recursion guards, and semantic refusals are emitted through explicit diagnostics rather than caught exceptions.

The class appears confined to runtime/codegen boundaries in the current tree. No parser/semantic fix is required from this sweep.
