> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# TealScript Interpreter Differential Premise Check v1

Date: 2026-09-11
Worktree commit checked: 8a342a5a02f89f9853674d99fbd44a8b42408dac

## Answer

The current repo does not have a genuinely separate interpreter implementation
available behind the public runtime APIs. A corpus harness that compares
`executeScript(...)` with `tryCompile(...)` + `executeCompiled(...)` would compare
the compiled wrapper against the compiled direct path.

That is not an independent Pine semantics differential.

## Evidence

- `src/runtime/compiledOnly.ts` exports `executeScript(...)`, but that function
  immediately calls `executeCompiledScript(...)` from `src/runtime/codegen/execute`
  and throws if compiled execution fails.
- `src/runtime/executeSelected.ts` also calls `executeCompiledScript(...)`
  directly. Backend selection currently admits only `compiled`.
- `src/runtime/backendSelection.ts` defines `TealscriptExecutionBackend =
  'compiled'`; any explicit non-compiled backend is rejected.
- `src/compat/sourceClassifier.ts` names the first result `interpreted`, but it is
  assigned from `executeScript(...)`, so it is compiled execution through the
  wrapper. The later comparison against `executeCompiled(...)` is wrapper versus
  direct compiled execution.
- `tests/compat/README.md` records the cutover explicitly: legacy fixtures that
  asserted against the removed interpreter remain as specification material, but
  the compiled runtime is the active gate.
- Searches for an AST-walking runtime entry point such as an interpreter class,
  `evaluateExpression`, `executeStatement`, or another exported `executeScript`
  found no surviving runtime evaluator outside generated-code execution. The
  `executeStatement` hit is inside `src/runtime/codegen/execute.ts` request
  subprogram plumbing, not a separate interpreter backend.

## Consequence

Do not build the proposed 2,000-script compiled-vs-interpreter corpus diff
against current HEAD. It would be another self-consistency instrument and would
not attack the output-correctness blind spot.

The existing corpus correctness work should instead use trace-free output
property checks, TradingView traces, or a genuinely independent implementation if
one is restored later.
