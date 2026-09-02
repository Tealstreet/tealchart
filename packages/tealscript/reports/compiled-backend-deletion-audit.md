# Compiled Backend Deletion Audit

Generated for T165 after the product-path corpus proof. This is an inventory,
not a deletion plan or implementation.

## Verdict

Deleting the generated-JavaScript compiled backend is not a one-file cleanup.
The obvious runtime implementation is contained, but the backend is still an
active product default, a worker request-discovery tool, a realtime fallback
classification target, and a baseline in most parity reports.

Estimated deletion size:

- **Compiled execution removed as a selectable backend:** 3-6 engineering days.
- **Compiled removed without weakening corpus/report gates:** 5-9 engineering
  days, because the reports and tests need a new non-compiled baseline story.
- **Compiled removed as part of the full one-evaluation-system cutover:** blocked
  on the separately costed request-subprogram and generated-incremental work.

The largest non-obvious blocker is worker request discovery:
`src/worker/worker.ts` runs `tryExecuteScript(...)` before the selected backend
executes when request routing arguments cannot be statically preloaded. That is
compiled code being used as infrastructure, not as the user-selected backend.
It needs a closure/shared replacement before the string emitter can disappear.

## Product Call Sites

- `apps/web/src/components/tealchart/tealscriptProductRuntime.ts`
  defines `TEALSTREET_PRODUCT_TEALSCRIPT_BACKEND = 'compiled'`. This is the
  Tealstreet web product default and the first product flip.
- `apps/web/src/components/tealchart/TealchartDirectWeb.tsx` passes
  `tealscriptExecutionBackend: TEALSTREET_PRODUCT_TEALSCRIPT_BACKEND` into the
  Tealchart widget.
- `packages/tealchart/src/TealchartWidget.ts` accepts
  `tealscriptExecutionBackend`/`enableTealscriptClosureBackend` and forwards
  them into `TealscriptManager`.
- `packages/tealchart/src/tealscript/TealscriptManager.ts` constructs workers
  and reports `RuntimeProfile.executionMode`/`selectedBackend` summaries. It
  does not execute compiled code directly, but its public API currently allows
  hosts to request it.
- `packages/tealchart/src/mobile/MobileIndicatorManager.ts` uses the shared
  backend selector with `defaultBackend: 'interpreter'`; mobile does not depend
  on compiled by default, but its override type still permits `'compiled'`.
- `packages/tealchart/src/mobile/useNativeTealchartCoreRuntime.ts` and
  `packages/tealchart/src/SkiaTealchart.tsx` expose the same backend override
  surface to native consumers.

## TealScript Runtime Call Sites

- `src/runtime/backendSelection.ts` includes `'compiled'` in
  `TealscriptExecutionBackend` and sets
  `DEFAULT_TEALSCRIPT_EXECUTION_BACKEND = 'compiled'`.
- `src/runtime/executeSelected.ts` selects compiled by default and calls
  `tryExecuteScript(...)`, falling back to the interpreter when compile fails.
- `src/worker/worker.ts` has three compiled anchors:
  - hidden request discovery for unpreloadable request routing arguments via
    `tryExecuteScript(...)`, before backend selection;
  - selected-backend execution through `tryExecuteScript(...)`;
  - compiled-only realtime safety fallback to interpreter incremental execution.
- `src/runtime/codegen/index.ts` exports the compiled API.
- `src/index.ts` and `src/runtime/index.ts` re-export the backend selector and
  codegen entry points.

## Compiled Implementation Tree

The implementation to remove or retire lives under `src/runtime/codegen/`:

- `compile.ts` - AST analysis to emitted JavaScript, including
  `compileSecurityExpression(...)` for request expression subprograms.
- `emitter.ts` - JavaScript source writer and assignment/statement/expression
  emission.
- `execute.ts` - `tryCompile`, `tryExecuteScript`, `executeCompiled`, runtime
  helper bridge, compiled request execution, drawing/strategy integration, and
  swallowed compiled-bar error accounting.
- `runtime.ts` - generated-script runtime support.
- `analyzer.ts` - max-bars-back and codegen support analysis.
- `ta-classes.ts` - generated-path TA helper classes.
- `fallbackInventory.ts` - inventory for compile fallback classification.
- Direct tests in the same directory:
  `compile.test.ts`, `execute.test.ts`, `fallbackInventory.test.ts`,
  `parity.test.ts`, `runtime.test.ts`, `ta-classes.test.ts`.

This tree is mostly mechanically isolated, but `compileSecurityExpression(...)`
is important design precedent for a closure request-expression backend and
should not be deleted before that seam is replaced or copied into shared design.

## Tests And Harnesses That Depend On Compiled

Direct compiled execution tests:

- `src/runtime/codegen/*.test.ts`
- `src/runtime/backendSelection.test.ts`
- `src/runtime/closure/execute.test.ts` uses compiled as a comparator.

Compatibility and corpus tests with compiled expectations:

- `tests/compat/pine-composite-indicators.test.ts`
- `tests/compat/pine-composite-performance.test.ts`
- `tests/compat/pine-grammar-differential.test.ts`
- `tests/compat/pine-alert-log-runtime-behavior.test.ts`
- `tests/compat/pine-barstate-behavior.test.ts`
- `tests/compat/pine-input-behavior.test.ts`
- `tests/compat/pine-request-ticker-option-behavior.test.ts`
- `tests/compat/pine-runtime-metadata-behavior.test.ts`
- `tests/compat/pine-strategy-value-behavior.test.ts`
- `tests/compat/pine-ta-value-behavior.test.ts`
- `tests/compat/external-corpus-runner.test.ts`
- `tests/compat/pine-external-corpus-classifier.test.ts`
- `tests/compat/productionWorkerHarness.ts`
- `tests/worker/requestDataBridge.test.ts`

Tealchart/web tests with compiled-selected assertions:

- `packages/tealchart/src/tealscript/TealscriptManager.test.ts`
- `packages/tealchart/src/TealchartWidget.test.ts`
- `packages/tealchart/src/rendering/tealscriptRenderingDifferential.test.ts`
- `packages/tealchart/src/mobile/MobileIndicatorManager.test.ts`
- `apps/web/src/components/tealchart/tealscriptProductRuntime.test.ts`
- `apps/web/src/components/tealchart/tealscriptLibraryRegistry.test.ts`
- `apps/web/src/utils/sentry/tealscriptExecutionTelemetry.test.ts`

Most of these should be converted to closure-vs-interpreter or product-selected
backend assertions. Tests whose purpose is specifically "compiled fallback"
should either be deleted with compiled or rewritten as closure capability/fallback
tests if generated incremental execution is funded.

## Scripts And Reports

Scripts with compiled as an execution target or baseline:

- `scripts/run-external-pine-corpus.ts`
- `scripts/update-closure-cutover-gate.ts`
- `scripts/run-external-pine-corpus-realtime.ts`
- `scripts/measure-long-bar-corpus-parity.ts`
- `scripts/run-product-path-corpus.ts`
- `scripts/benchmark-production-closure-backend.ts`
- `scripts/profile-production-closure-costs.ts`
- `scripts/profile-realtime-event-costs.ts`
- `scripts/benchmark-closure-codegen-prototype.ts`

Committed reports whose schema currently names compiled:

- `reports/external-pine-corpus-v1.report.json`
- `reports/external-pine-corpus-v2.report.json`
- `reports/closure-cutover-gate.report.json`
- `reports/external-pine-corpus-realtime.report.json`
- `reports/external-pine-long-bars.report.json`
- `reports/product-path-corpus.report.json`
- `reports/production-closure-performance-t102.json`
- `reports/production-closure-profile-t104.json`
- `reports/realtime-event-cost-profile-t121.json`
- `reports/external-pine-strategy-corpus-*.report.json`

Deletion should preserve historical reports as evidence, but any regenerated
report needs a new baseline definition. The current cutover gate is explicitly
"closure dominates compiled"; once compiled is gone, the standing gate should
become "product-selected backend matches the independent baseline on the covered
dimensions" rather than continuing to imply a live compiled backend exists.

## Docs And Public API Surface

Docs/guidance with compiled-specific language:

- `packages/tealscript/CLAUDE.md`
- `packages/tealchart/CLAUDE.md`
- `packages/tealscript/PINE_PARITY_STATE.md`
- `packages/tealscript/PINE_PARITY_PR_DESCRIPTION.md`

Public/source-consumed API surfaces that currently expose `'compiled'`:

- `TealscriptExecutionBackend = 'compiled' | 'closure' | 'interpreter'`
- Tealchart widget/native props `tealscriptExecutionBackend`
- `RuntimeProfile.executionMode` and telemetry fields

Removing `'compiled'` outright is a breaking API change for tealchart/tealscript
source consumers. A safer staged deletion is to stop selecting compiled in
Tealstreet first, then either keep `'compiled'` as a rejected/legacy alias with a
diagnostic for one release, or remove it with a mirror-facing breaking-change
note.

## Behavior Only Compiled Currently Provides

- The generated-JavaScript/string-emitter execution path and its web performance
  baseline. Current closure product-path correctness is clean, but compiled is
  still faster for many web scripts.
- Hidden worker request discovery for dynamic request routing. This is the main
  blocker to deleting the string emitter cleanly.
- `compileSecurityExpression(...)`, the compiled request-expression subprogram.
  Closure still delegates request expression evaluation to the interpreter
  request sub-engine; replacing that is the T133 request-subprogram work.
- Compiled-only realtime safety fallback classification for stateful intrabar
  constructs. The product-path report currently shows 45 compiled realtime
  fallbacks and zero closure fallbacks on the same rows. Deleting compiled removes
  this fallback class, but generated incremental closure work would need its own
  capability guard if it replaces full-window realtime reconstruction.
- Compiled-specific swallowed-bar-error accounting
  (`RuntimeProfile.compiledBarErrors`). If compiled is deleted, keep the general
  swallowed-error accounting and remove only the compiled-specific field after
  reports/tests no longer reference it.

## Deletion Blockers

Blocking before compiled can be deleted safely:

1. Replace worker request discovery's `tryExecuteScript(...)` dependency with a
   closure/shared discovery path.
2. Flip the Tealstreet product default constant away from `'compiled'` and prove
   the product-path corpus still passes.
3. Redefine the corpus/report gates so they no longer require a live compiled
   backend while preserving the evidence captured by existing reports.
4. Decide the public API compatibility story for external tealchart/tealscript
   source consumers that can currently request `'compiled'`.

Not blockers for deleting compiled specifically, but blockers for deleting the
interpreter and claiming one evaluation system:

1. Closure-owned request subprogram evaluation, so `request.security()` scripts
   do not evaluate request expressions in the interpreter.
2. Generated incremental realtime execution or an explicit decision to accept
   full-window closure reconstruction for live ticks.
3. Any replacement for interpreter fallback diagnostics/capability guards needed
   by generated incremental execution.
