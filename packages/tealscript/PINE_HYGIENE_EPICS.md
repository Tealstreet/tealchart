# TealScript Hygiene Epic Roadmap

This roadmap tracks structural cleanup that should happen alongside Pine Script
parity work. The goal is to keep TealScript and Tealchart maintainable while
feature coverage expands toward full Pine Script v6 parity.

Use [`PINE_PARITY_EXECUTION_PROTOCOL.md`](./PINE_PARITY_EXECUTION_PROTOCOL.md)
as the canonical branch, phase, review, and merge process for every hygiene and
parity epic.

Each item below is treated as an epic-sized PR. Every epic is implemented with
the phased plan-execute cadence:

1. Plan the phase.
2. Audit the plan before editing.
3. Implement and verify the phase.
4. Audit the implementation, fix findings, and commit the coherent phase.

After an epic PR is ready, run CodeRabbit review, fix or reply to every review
thread, wait for CI and CodeRabbit to be green, merge, and cut the next branch
from latest `master`.

## Execution Protocol

Use this protocol for every hygiene epic until the roadmap is complete or the
work is blocked:

1. Cut one branch from latest `master` for the current epic.
2. Treat every phase inside the epic as a coherent, committable unit.
3. For every phase, run all four required gates without skipping:
   - write the implementation plan
   - audit the plan before editing
   - implement and verify the phase
   - audit the implementation, fix findings, and commit
4. Open one PR for the completed epic.
5. Run CodeRabbit review, resolve or reply to every review thread, and wait for
   CI and CodeRabbit to be green.
6. Merge the PR with maintainer/admin privileges when review gates are green.
7. Cut the next branch from updated `master` and continue with the next epic.

Do not batch unrelated epics into one PR. Do not start a dependent epic from a
stale branch when the previous epic must land first.

## Why This Exists

The Pine parity roadmap is the product north star. This hygiene roadmap is the
engineering guardrail for reaching it without letting the parser, runtime,
worker protocol, renderer, tests, and docs drift apart.

Current pressure points:

- `src/runtime/engine.ts` owns interpreter flow, builtin dispatch, drawing APIs,
  coercions, TA helpers, time/session behavior, plot output, and runtime object
  handling.
- `src/runtime/context.ts` owns execution state plus drawing storage and
  lifecycle rules.
- `packages/tealchart/src/TealchartRenderer.ts` owns broad chart rendering plus
  TealScript drawing rendering.
- Compatibility docs and roadmap entries can drift from implementation.
- Large runtime and compatibility test files make parity changes harder to
  review and easier to regress.

## Epic Order

The recommended order front-loads low-risk cleanup, then extracts runtime and
renderer seams before adding more visual object features.

1. Low-risk dead code and baseline hygiene.
2. TealScript drawing type and store extraction.
3. Builtin registry and drawing builtin extraction.
4. Test and docs inventory cleanup.
5. Parser generation and public API guardrails.
6. Renderer drawing pipeline extraction.
7. TealScript output atomicity and freshness.
8. Pane-aware drawing semantics.

## Epic 1: Low-Risk Dead Code And Baseline Hygiene

Goal: remove verified dead or duplicate code before larger refactors.

Phases:

1. Confirm candidate dead code with static search and targeted reads.
2. Remove unused runtime helpers, counters, aliases, or duplicate paths only
   when no caller remains.
3. Remove unused renderer helpers only when no caller remains.
4. Run focused tests and full package checks.

Done means the codebase has less noise and no behavior change.

## Epic 2: TealScript Drawing Type And Store Extraction

Goal: separate drawing object data and lifecycle from general execution state.

Phases:

1. Move drawing output types into a dedicated runtime drawing module and
   re-export them without changing public shapes.
2. Introduce a `DrawingStore` behind existing `ExecutionContext` methods.
3. Move add/get/delete/copy/truncate/persistent marking into the store.
4. Add focused lifecycle tests for persistent drawings, realtime truncation,
   copy semantics, and deletion.

Done means labels, lines, linefills, boxes, future polylines, and future tables
share one lifecycle model.

## Epic 3: Builtin Registry And Drawing Builtin Extraction

Goal: stop `engine.ts` from absorbing every Pine namespace.

Phases:

1. Define a small builtin registration contract that preserves current call
   behavior and diagnostics.
2. Move drawing coercion and handle helpers into drawing-specific modules.
3. Extract `label.*`, `line.*`, `linefill.*`, and `box.*` registration into
   dedicated files.
4. Harden handle validation where existing behavior is clearly incomplete,
   especially object-id checks between drawing namespaces.

Done means new namespaces can be added without expanding the core interpreter.

## Epic 4: Test And Docs Inventory Cleanup

Goal: make parity status measurable and reduce test churn.

Phases:

1. Create a single compatibility inventory format or checklist that can drive
   docs and PR review.
2. Refresh `PINE_COMPATIBILITY.md` and stale items in `PINE_PARITY_EPICS.md`
   from the current implementation.
3. Split oversized parser/runtime/compatibility tests by topic.
4. Add reduced Pine idiom checkpoints with deterministic bars and checked
   outputs.

Done means contributors can identify implemented, partial, planned, and
unsupported behavior without reading the runtime.

## Epic 5: Parser Generation And Public API Guardrails

Goal: prevent parser and export drift while syntax work expands.

Phases:

1. Add a check that regenerated Peggy output matches checked-in generated
   parser files.
2. Fix parse start-rule typing so expression and statement parsing do not claim
   to always return a full program.
3. Decide and document the supported public package surface.
4. Add public-entry import tests or tighten broad `./src/*` exposure in a
   compatibility-conscious way.

Done means parser edits and public API changes have explicit guardrails.

## Epic 6: Renderer Drawing Pipeline Extraction

Goal: isolate TealScript drawing rendering from the monolithic chart renderer.

Phases:

1. Extract drawing partitioning into a one-pass helper.
2. Extract shared coordinate helpers used by drawing rendering.
3. Move label, line, linefill, and box rendering into a canvas drawing renderer.
4. Preserve current output with focused renderer tests.

Done means adding polylines and tables does not require growing the main
renderer function body.

## Epic 7: TealScript Output Atomicity And Freshness

Goal: make script output updates coherent and prevent stale worker results from
repainting the chart.

Phases:

1. Add an atomic output bundle for plots, drawings, alerts, inputs, and runtime
   metadata.
2. Preserve legacy callbacks during migration where required by current callers.
3. Add generation or request ids to worker results and discard stale results.
4. Split dirty flags so drawings and plots are not conflated.

Done means a single worker result is applied once, in order, and old results do
not repaint after symbol or interval changes.

## Epic 8: Pane-Aware Drawing Semantics

Goal: align drawing routing with Pine overlay and pane behavior before adding
more drawing objects.

Phases:

1. Define pane routing rules for overlay, non-overlay, and `forceOverlay`
   drawings.
2. Render drawing output in the correct pane rather than only the main pane.
3. Add tests for overlay, separate-pane, and forced-overlay drawing cases.
4. Use the pane-aware path as the required base for polyline and table work.

Done means future visual object parity builds on the correct rendering model.
