# Drawing Tools North Star

This is the directional source of truth for the drawing-tools push. The goal is
not "more supported primitive types"; the goal is TradingView-grade user markup
that feels correct on both web Canvas and mobile Skia.

Every user-facing drawing feature must ship with its mobile Skia sibling in the
same PR. Do not land web-only behavior. Do not land mobile-only behavior.

## Product Bar

Tealchart drawing tools should feel like real markup tools:

- The user chooses a tool and draws the intended shape with pointer/touch
  gestures, not random defaults.
- Selection exposes local actions near the selected object, not only global top
  bar controls.
- Edits are reversible, predictable, and preserve drawing IDs.
- Web and mobile use the same concepts: active tool, draft, command,
  transaction, selection, edit intent, action surface, context action, and
  object-tree action.
- Canvas stays visually maximized, but chrome and overlays avoid important chart
  content such as symbol/indicator legends.

## Current Reality

Foundation is broad:

- Shared drawing state, commands, history, render models, placement helpers,
  selection, editing, z-order, style controls, context/action descriptors, object
  tree models, persistence, and mobile primitive render models exist.
- Web and mobile both have substantial paths wired through those shared layers.
- Recent work hardened public/mobile primitive compatibility and label/control
  parity.

The remaining work is not primarily "add another primitive." It is UX
convergence and polish:

- Make the common drawing flows feel deliberate and inspectable.
- Move selected-object operations to local surfaces.
- Make object management discoverable.
- Tighten edit, duplicate, undo, and keyboard/modifier behavior until it matches
  the expected TradingView workflow.

## Stop Doing By Default

Do not spend new PRs on these unless they directly unblock a UX epic:

- Adding isolated primitive/export coverage.
- Adding new drawing shapes without improving the interaction dimensions they
  need.
- Tweaking public types or render-model fields without a concrete user-facing
  parity reason.
- Shipping toolbar/property controls that only exist on one platform.

## Next Epics

### Epic A: Real Draw Workflow Verification and Fixes

Goal: prove the shipped placement foundation produces the object the user
intended in real web and mobile workflows, then fix any reproduced regressions
or UX gaps.

Phase A1: Audit current placement behavior

- Test these tools manually and in focused tests where feasible: `trendLine`,
  `rectangle`, `circle`, `ellipse`, `priceRange`, `datePriceRange`,
  `longPosition`, `brush`, `textLabel`.
- Document whether each supports click placement, drag placement, draft preview,
  cancel, and mobile sibling behavior.
- Treat existing placement docs and tests as claims to verify, not assumptions
  to redo. Any reproduced "random-sized" or surprising placement is a bug unless
  explicitly documented as a placeholder-only tool.

Phase A2: Fix reproduced placement gaps

- Start with the highest-friction verified gap from Phase A1.
- Web: pointer down/move/up should size drag-capable drafts from the actual
  gesture.
- Mobile: touch begin/update/end should produce the same anchor semantics for
  the sibling tool.
- Keep click-to-place only where it has a deliberate TradingView-like meaning.

Phase A3: Visual/interaction evidence

- Add or update focused shared placement tests.
- Add web input tests for pointer/touch gesture sequencing.
- Add mobile input/render-model tests for sibling behavior.
- Update capability matrix rows only when behavior is proven.

### Epic B: Local Selected-Object Action Surface

Goal: selected drawings expose actions where the user is working.

Phase B1: Anchor and action model audit

- Verify selected action anchor positions for common drawing kinds on web and
  mobile.
- Confirm the shared selected-action descriptors cover delete, duplicate,
  lock/hide, z-order, style, text edit, and properties/object-tree open.
- Current evidence is recorded in `DRAWING_TOOLS_SELECTED_ACTION_AUDIT.md`.

Phase B2: Web floating toolbar polish

- Render selected-object action controls as a chart overlay near the selection,
  clamped to chart bounds and avoiding chart chrome.
- Do not rely on the top bar as the primary selected-object action surface.

Phase B3: Mobile selected action strip parity

- Expose the same action concepts through mobile Skia/RN surfaces.
- Keep gesture dismissal and chart pan/zoom interaction predictable.

### Epic C: Context Menu and Object Tree Workflow

Goal: object management becomes discoverable and complete.

Phase C1: Context menu parity

- Web right-click and mobile long-press should select the target drawing and
  expose shared context actions.
- Include z-order, duplicate, delete, lock/hide, properties, and object-tree
  navigation.
- Current context/object-tree evidence is recorded in
  `DRAWING_TOOLS_OBJECT_TREE_AUDIT.md`.

Phase C2: Object tree polish

- Ensure built-in web panel and mobile sheet support select, rename when
  available, hide/show, lock/unlock, z-order, delete, and group operations.
- Keep app-owned callbacks and built-in fallbacks consistent.

Phase C3: Layer/z-index evidence

- Add tests for z-order commands from toolbar, context menu, and object tree.
- Confirm render order changes on both web and mobile.

### Epic D: Edit Lifecycle Polish

Goal: edits behave like transactions, not incidental mutations.

Phase D1: Handle and whole-object edit audit

- Verify drag handles, whole-object move, cancel/interruption, locked drawings,
  hidden drawings, and stale IDs.
- Ensure each gesture creates one undo entry.
- Current D1 edit-lifecycle evidence is recorded in
  `DRAWING_TOOLS_EDIT_LIFECYCLE_AUDIT.md`.

Phase D2: Double-click/double-tap edit

- Text drawings should enter text edit.
- Non-text drawings should open properties when appropriate.
- App-owned callbacks and built-in fallbacks should match across platforms.
- Current D2 double-edit evidence is recorded in
  `DRAWING_TOOLS_DOUBLE_EDIT_AUDIT.md`.

Phase D3: Duplicate and modifier behavior

- Web Shift+drag duplicate should be reliable and undoable.
- Mobile should expose an equivalent duplicate-edit mode through host toolbar or
  handle APIs.

### Epic E: Undo/Redo Confidence Pass

Goal: every common user-visible mutation can be undone/redone.

Phase E1: Coverage audit

- Create, drag-place, edit handles, move, duplicate, delete, z-order,
  lock/hide, style, text edit, and object-tree/context actions.

Phase E2: Web keyboard ownership

- Ctrl/Cmd+Z, redo, Delete, copy/paste, select-all, nudge, Escape.
- Confirm chart shortcuts are not hijacked outside drawing focus.

Phase E3: Mobile command parity

- Imperative handle and toolbar command paths mirror web history behavior.

## Acceptance Rules

Each PR must answer:

- What user-visible drawing workflow improved?
- What shared state/command/render/input layer changed?
- What is the web Canvas/DOM coverage?
- What is the mobile Skia/RN coverage?
- What tests prove the behavior?
- What manual evidence is still needed?

If a PR only changes public types, primitive aliases, or render payload shape,
it must explicitly name the UX epic it unblocks. Otherwise it should not be the
next PR.

## Current Next Move

Placement, selected-action, object-tree, edit-lifecycle, and double-edit audits
are recorded in `DRAWING_TOOLS_PLACEMENT_AUDIT.md`,
`DRAWING_TOOLS_SELECTED_ACTION_AUDIT.md`, `DRAWING_TOOLS_OBJECT_TREE_AUDIT.md`,
`DRAWING_TOOLS_EDIT_LIFECYCLE_AUDIT.md`, and
`DRAWING_TOOLS_DOUBLE_EDIT_AUDIT.md`.

Move next to Epic D, Phase D3. Verify duplicate and modifier behavior, starting
with web Shift-drag duplicate and the mobile duplicate-edit-mode sibling.
