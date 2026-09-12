> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v5 Output Differential v1

## Scope

- Corpus: fixed v5 corpus at `packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910`
- Rows: 1,000 pinned scripts
- Public path: current `executeScript()` compiled-only wrapper at `abdbd149a78151eae878823eb901bc00ccccc76e`
- Direct path: current `executeCompiled()` direct compiled path at `abdbd149a78151eae878823eb901bc00ccccc76e`
- Bars: 160 synthetic bars from the existing external-corpus generator
- Compared dimensions: plots, drawings/tables, alerts, logs, strategy ledger, selected diagnostic profile signals
- Baseline: `packages/tealscript/reports/external-pine-corpus-v5-output-differential-baseline-v1.json`

This supersedes the earlier archived-reference measurement. That earlier run
compared current compiled output against an archived interpreter runtime, so its
`284`/`283` divergence count mixed runtime changes across commits and was not a
valid current-path differential. The current tree no longer contains an
interpreter backend; the honest same-commit comparison is the public compiled
entry point against direct compiled execution.

## Commands

Generate:

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:output-differential \
  --input packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910 \
  --timeout-script sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine \
  --output packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910/value-differential/report-abdbd149a7-current-current-output.json \
  --write-baseline packages/tealscript/reports/external-pine-corpus-v5-output-differential-baseline-v1.json
```

Check:

```bash
yarn workspace @tealstreet/tealscript pine:external-corpus:output-differential \
  --input packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910 \
  --timeout-script sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine \
  --output /tmp/tealscript-output-differential.json \
  --baseline packages/tealscript/reports/external-pine-corpus-v5-output-differential-baseline-v1.json
```

The check fails if a new row diverges, if an expected divergent row starts
matching, or if a row remains divergent but changes dimension/cause.

## Funnel

| Status | Rows |
| --- | ---: |
| Matched | 864 |
| Mismatched | 0 |
| Skipped before comparison | 136 |
| Execution errors | 0 |

Comparable rows: 864. Divergence rate on comparable rows: 0.00%.

## Remaining Skips

These rows are not silent skips; each is blocked before both execution paths can
be compared.

| Skip class | Rows | Meaning |
| --- | ---: | --- |
| Semantic diagnostics | 113 | Current checker rejects the script before execution. |
| Parse error | 20 | Current parser cannot build an AST for the pinned source. |
| Compile error | 2 | Current compiled path cannot emit valid JS for the row. |
| Explicit timeout | 1 | Deep-expression row is excluded from this in-process differential to keep the denominator bounded. |

## Finding

The true current-current output differential is clean: every comparable row
matches across every `ExecutionResult` dimension. This is an API-wrapper
consistency result for the compiled-only tree: `executeScript()` and
`executeCompiled()` are two entry points into the same implementation. It is not
an independent semantic parity oracle and proves nothing by itself about Pine
correctness.

The previous differential design required two current independent
implementations. That condition no longer holds because the interpreter backend
has been deleted. The archived interpreter was an independent implementation,
but comparing current compiled output against that archived runtime crossed a
commit boundary and produced phantom divergences from implementation drift. Do
not rebuild the archived-reference comparison as a semantic gate.

Keep the current-current check as a cheap wrapper-consistency gate. It can catch
API drift between the public runtime entry point and direct codegen execution,
but independent-oracle value vectors are the only current value-parity evidence
for Pine semantics.
