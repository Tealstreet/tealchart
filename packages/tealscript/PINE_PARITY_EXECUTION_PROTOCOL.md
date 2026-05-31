# Pine Parity Execution Protocol

This document is the operating protocol for reaching Pine Script parity in
TealScript. It does not replace the roadmap or inventory files. Use those as the
source of truth for what to build:

- [`PINE_PARITY_EPICS.md`](./PINE_PARITY_EPICS.md): product and language parity
  roadmap.
- [`PINE_HYGIENE_EPICS.md`](./PINE_HYGIENE_EPICS.md): structural cleanup
  required to keep parity work maintainable.
- [`PINE_COMPATIBILITY_INVENTORY.md`](./PINE_COMPATIBILITY_INVENTORY.md):
  current compatibility checklist and audit surface.
- [`PINE_COMPATIBILITY.md`](./PINE_COMPATIBILITY.md): user-facing compatibility
  status.

## North Star

The goal is full Pine Script v6 feature parity where practical for Tealchart.
Every epic should move the implementation, tests, and documentation toward that
goal without letting parser, runtime, renderer, worker, or docs behavior drift.

Real PineScript examples from official TradingView docs and common public idioms
should be reduced into deterministic local fixtures when they are useful
checkpoints. Tests must not depend on TradingView, network access, or random
public scripts at runtime.

## Epic And PR Rules

Treat each PR as one epic.

1. Start from latest `master`.
2. Cut one branch for the current epic.
3. Split the epic into coherent phases.
4. Keep each phase small enough to verify and commit independently.
5. Do not batch unrelated epics into one PR.
6. Do not start a dependent epic from a stale branch when the previous epic must
   land first.
7. Update the roadmap or compatibility inventory when behavior, scope, or known
   gaps change.

Use the repository workflow helpers where possible:

```bash
just start <branch>
just check
just pr
just done <branch>
```

## Required Phase Cadence

Use the plan-execute cadence for every phase inside every epic. Do not skip
gates.

1. Plan the phase.
   - List files to create or modify.
   - State behavior changes and public API changes.
   - Identify risks, edge cases, and verification commands.
2. Audit the plan before editing.
   - Check paths, imports, existing patterns, compatibility risks, and missing
     tests.
   - Revise the plan before editing if the audit finds a real issue.
3. Implement and verify.
   - Keep edits scoped to the phase.
   - Run focused tests first when useful.
   - Run full package checks before the epic is marked ready.
4. Audit the implementation, fix findings, and commit.
   - Read the changed files.
   - Compare the result to the plan.
   - Inspect edge cases, diagnostics, and test coverage.
   - Fix in-scope findings, rerun affected checks, and commit the coherent
     phase.

## Verification Bar

For code changes, the default final gate before opening a PR is:

```bash
yarn typecheck && yarn lint && yarn test
```

For parser grammar changes, also run:

```bash
cd packages/tealscript
yarn build:parser
yarn check:parser
```

Commit generated parser artifacts with grammar changes.

Docs-only changes may use a narrower verification pass, but the PR description
must state that the change is docs-only.

## Review And Merge Loop

When the epic branch is ready:

1. Push the branch and open one PR.
2. Run the CodeRabbit review loop.
3. Fix or explicitly reply to every CodeRabbit thread.
4. Wait for CI and CodeRabbit to be green.
5. Merge with maintainer/admin privileges once the gates are green.
6. Delete the merged branch.
7. Return to latest `master` and cut the next epic branch.

CodeRabbit review may run in a background agent when the next work is genuinely
non-blocking and branch-safe. If the next epic depends on the current PR, wait
for the PR to merge before continuing.

## Branch Safety

Use one active implementation branch per epic unless a maintainer explicitly
approves parallel branches. Parallel work must have disjoint write scopes and
must not require rebasing through unresolved review changes.

Before cutting the next branch:

```bash
git switch master
git pull --ff-only origin master
git status --short
```

Stop if the worktree is dirty in a way that cannot be explained by the current
phase.

## Checkpoint Fixture Policy

For Pine parity checkpoints:

- Prefer reduced fixtures derived from official docs or common public idioms.
- Keep source comments or links where they clarify the Pine behavior being
  modeled.
- Use deterministic local bars and hand-checked expected values.
- Include negative diagnostics for unsupported features when the unsupported
  behavior is intentional for the current epic.
- Avoid large pasted scripts when a smaller semantic fixture proves the same
  behavior.

## Completion Criteria

An epic is complete when:

- planned phases are committed,
- focused and full verification gates pass,
- docs and compatibility inventory are updated where relevant,
- CI and CodeRabbit are green,
- the PR is merged,
- the next branch is cut from updated `master`.

Continue through the roadmap until the work is blocked, the parity roadmap is
complete, or the agreed budget is near exhaustion.
