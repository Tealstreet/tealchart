# Drawing Tools Overnight Prompt

Use this prompt to continue the drawing tools dimensional gap roadmap in this
chat.

```markdown
Continue Tealchart drawing tools dimensional gap work until the full roadmap in
`DRAWING_TOOLS_DIMENSIONAL_GAP_PLAN.md` is implemented, reviewed, merged, and
the next branch is cut, or until genuinely blocked.

## Orientation

Read these first:

- `AGENTS.md`
- root `CLAUDE.md`
- `packages/tealchart/CLAUDE.md`
- `DRAWING_TOOLS_PLAN.md`
- `packages/tealchart/DRAWING_TOOLS_PLAN.md`
- `DRAWING_TOOLS_DIMENSIONAL_GAP_PLAN.md`

Then inspect the current drawing implementation before editing:

- `packages/tealchart/src/drawings/`
- `packages/tealchart/src/TealchartWidget.ts`
- `packages/tealchart/src/ui/ChartCore.ts`
- `packages/tealchart/src/ui/ChartTopBar.ts`
- `packages/tealchart/src/interaction/EventManager.ts`
- `packages/tealchart/src/SkiaTealchart.tsx`
- `packages/tealchart/src/mobile/`
- drawing tests under `packages/tealchart/src/**`

## Non-Negotiable Parity Rule

No drawing feature ships unless the web Canvas/DOM behavior and mobile React
Native/Skia sibling behavior ship in the same commit/PR.

Every phase must explicitly cover:

- Shared model/reducer/command/render logic where applicable.
- Web path through `TealchartWidget`, `ChartCore`, `EventManager`, DOM/canvas UI.
- Mobile path through `SkiaTealchart`, mobile input utilities, mobile render
  model, RN UI/imperative handle.
- Tests for shared logic plus web and mobile adapters where behavior changes.

If a feature cannot be done on both platforms, reduce scope or stop before PR.

## Strategic Objective

Implement the entire dimensional gap roadmap in
`DRAWING_TOOLS_DIMENSIONAL_GAP_PLAN.md` before adding more drawing shapes.

Build the foundation in this order:

1. Capability matrix and invariants.
2. Command transaction layer and undo/redo history.
3. Real drawing gesture placement.
4. Selection action surfaces: floating toolbar and context menu.
5. Object tree and layer management.
6. Text/property edit lifecycle.
7. Keyboard and modifier behavior.
8. Public API, events, persistence, and test harness hardening.

Use the roadmap's epics and phases as the source of truth. Update it as
implementation details become concrete.

## Implementation Method

Use `$plan-execute` for every epic.

For each epic:

- Break it into small, committable phases.
- For each phase: plan, audit, implement, verify, audit, fix, commit.
- Do not skip audit or verification steps.
- Keep commits focused.
- Prefer shared drawing commands/models over platform-specific one-offs.
- Do not add new drawing shape families until the current foundational gap is
  complete.

Start from latest master or the current clean worktree state as appropriate:

- If in main checkout: `just start feat/<name>`
- If in active worktree: sync latest master, then cut a fresh feature branch
  from `origin/master`.

Before every PR:

- Run focused tests for touched drawing logic.
- Run `just check`.
- Ensure web and mobile sibling behavior are present.
- Ensure `DRAWING_TOOLS_DIMENSIONAL_GAP_PLAN.md` and/or drawing tracking docs
  reflect shipped work.
- Ensure worktree is clean after commits.

## Review and Merge

At every epic boundary:

1. Open a PR with the repo workflow, usually `just pr`.
2. Run `$review-coderabbit`.
3. Fix all valid CodeRabbit, reviewer, and sub-agent feedback.
4. Reply to every review thread when GitHub auth permits.
5. Repeat review loop until clean.
6. Admin-merge using maintainer privileges. The maintainer has explicitly
   authorized admin merges:
   `gh pr merge N --merge --admin`
7. Sync local master:
   `git fetch origin master:master && git checkout master`
8. Cut the next branch immediately.
9. Continue the next epic automatically.

Use merge commits unless repository instructions or PR context clearly require
another mode. Do not omit `--admin` when merging; the user is the repo
maintainer and wants admin merges.

## CodeRabbit / Review Policy

Use `$review-coderabbit` for every PR.

- Run CodeRabbit plus independent review loop until clean.
- If CodeRabbit is rate-limited, rely on independent review and record that
  clearly.
- Fix correctness, parity, testing, simplification, and maintainability issues.
- Ignore style-only nits unless they reveal real maintainability risk.
- Do not merge with unresolved valid feedback.
- Stop only for a human product decision, auth/CI blocker, unsafe worktree, or
  repeated review loop failure.

## Quality Bar

Before a PR is ready:

- `just check` passes.
- Relevant focused tests pass.
- Web behavior is present.
- Mobile Skia sibling behavior is present.
- Shared command/model behavior is tested.
- No web-only drawing feature lands.
- No mobile-only drawing feature lands.
- Docs/tracking are updated.
- Worktree is clean.
- PR description lists web coverage and mobile Skia coverage.

## Specific Foundation Requirements

Make sure the final system covers these dimensions:

- `Ctrl/Cmd+Z` undo and redo.
- Drawing command transaction layer.
- Object tree.
- Right-click / long-press drawing context menu.
- Z-index ordering: bring forward/back/front/back.
- Double-click / double-tap edit.
- Single-click selection shows drawing-native floating toolbar/action surface,
  not top chart bar.
- Drag-to-draw for shape tools.
- Shift constraints and Shift+drag duplicate on web.
- Mobile-native equivalents for web modifier behavior.
- Public web and mobile APIs for the same concepts.
- Persistence/migration behavior for committed drawing state.
- Tests and parity matrix evidence.

## Tracking

Keep these current:

- `DRAWING_TOOLS_DIMENSIONAL_GAP_PLAN.md`
- `DRAWING_TOOLS_PLAN.md`
- `packages/tealchart/DRAWING_TOOLS_PLAN.md`

Each merged epic should mark what shipped, what remains, web/mobile parity
status, and known risks.

## Continuation

Do not send a final status-only response after completing a PR/merge/checkpoint.

After each merge:

- Sync master.
- Cut the next branch.
- Choose the next roadmap epic/phase.
- Continue implementation automatically.

Only send a final response if:

- genuinely blocked,
- a command/auth/CI condition requires user action,
- the worktree is unsafe to continue,
- repeated review loop failure requires a maintainer decision,
- or the user explicitly asks for status/stop.

If blocked, include:

- blocker,
- current branch,
- PR URL if any,
- last passing verification,
- worktree status,
- next recommended action.

Proceed now with `$plan-execute` starting at Gap 1 / Epic 1.1 from
`DRAWING_TOOLS_DIMENSIONAL_GAP_PLAN.md`, then continue through the entire
roadmap using `$review-coderabbit` at every epic PR boundary.
```
