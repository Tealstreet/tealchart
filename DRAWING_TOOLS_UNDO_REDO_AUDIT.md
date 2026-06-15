# Drawing Tools Undo/Redo Audit

Scope: Epic E, Phase E1 in `DRAWING_TOOLS_NORTH_STAR.md`.

## Current Contract

- Undo/redo history is shared by web Canvas and mobile Skia through
  `dispatchUserDrawingCommandWithHistory`.
- History snapshots intentionally store drawing layout state, selection, and
  persistent drawing mode flags while excluding transient drafts, active text
  edit state, and temporary measure overlays.
- Repeated gesture updates with the same transaction key coalesce into one undo
  entry, so drag placement, edit-drag, duplicate-drag, and text edit commits do
  not spam history.
- Redo is cleared whenever a new undoable command is recorded after undo.
- Mobile command utilities call the same shared history reducer as web.

## Evidence Matrix

Shared command-history tests cover:

- API add and committed placement creation.
- Duplicate, delete, paste, clear, and nudge commands.
- Edit-drag and duplicate-drag coalescing.
- Style, visibility, lock, and z-order mutations.
- Text edit commit, cancel, and unchanged commit behavior.
- Temporary tool, selection, draft, and measure commands remaining
  non-undoable.
- Bounded undo stack capacity and redo clearing.
- Compile-time command-type checklist so newly added drawing commands must be
  classified as undoable or transient.

Mobile command-history tests cover:

- API add, duplicate, delete, clear, and toolbar command dispatch.
- Rendered mobile toolbar undo/redo dispatch and disabled-state changes.
- Style, visibility, lock, and z-order mutations through the shared history.
- Tap placement, drag placement, path-family creation, cancellation, and
  cross-pane rejection.
- Edit-drag and duplicate-drag coalescing.
- Text edit commit, cancel, unchanged commit, undo, and redo.
- Hardware-keyboard command adapters for undo, redo, delete, duplicate,
  copy/paste, select-all, and nudge.

## Known Gaps

- This audit proves reducer and adapter behavior, not pixel-level manual UX
  coverage.
- Web and mobile still need a selected popover toolbar that exposes the common
  undoable actions in a TradingView-grade editing workflow.
- Table row/column and rich text mutations are covered by command dispatch and
  history classification, but they need more end-to-end product workflow QA.
- Undo/redo UI disabled-state presentation now has web and mobile unit-level
  evidence, but browser/device visual QA is still thin.
- The history classification checklist intentionally mirrors the reducer
  switch today; a later cleanup can move both to one exported classifier table.

## Follow-Up

- Epic E2 should verify web keyboard ownership and shortcut routing at the
  widget boundary.
- Epic E3 should continue verifying mobile imperative handle and host-toolbar
  parity for the same history commands as more host integrations appear.
- Consider replacing the private history reducer switch plus checklist arrays
  with one exported typed command-history classification table.
- Later toolbar/object-tree phases should add interaction-level tests around
  visible undoable actions rather than only reducer-level coverage.
