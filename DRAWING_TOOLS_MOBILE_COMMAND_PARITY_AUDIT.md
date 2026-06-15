# Drawing Tools Mobile Command Parity Audit

Scope: Epic E, Phase E3 in `DRAWING_TOOLS_NORTH_STAR.md`.

## Current Contract

- Mobile Skia exposes the same core drawing command concepts as web: select,
  duplicate, delete, copy, paste, undo, redo, keyboard dispatch, draft cancel,
  z-order, style, lock, visibility, and object-tree actions.
- Imperative handle commands route through shared drawing command/history
  reducers instead of mutating drawing state directly.
- Mobile hardware-keyboard dispatch reuses the shared keyboard resolver from
  web, then routes changed commands through mobile history.
- Copy is clipboard-only and does not create an undo entry. Paste, duplicate,
  delete, nudge, and edit commits create undoable history entries when they
  change drawing state.

## Mobile Evidence

- `SkiaTealchart.test.tsx` covers the actual Skia imperative handle for
  duplicate, undo, redo, keyboard undo, keyboard copy/paste, and keyboard
  delete.
- `drawingCommands.test.ts` covers the mobile command adapter for shared
  history dispatch, command-event emission, undo/redo, copy/paste,
  duplicate, delete, select-all, nudge, draft cancel, selected-action
  dismissal, object-tree actions, drag placement, edit drag, duplicate drag,
  and text-edit commit.
- `SkiaTealchart.tsx` keeps handle command APIs backed by
  `dispatchMobileUserDrawingHistoryCommand`,
  `dispatchMobileUserDrawingKeyboardAction`, and shared command-event helpers.

## Web Sibling Evidence

- Web command/keyboard ownership evidence is recorded in
  `DRAWING_TOOLS_WEB_KEYBOARD_AUDIT.md`.
- Shared command/history evidence is recorded in
  `DRAWING_TOOLS_UNDO_REDO_AUDIT.md`.

## Known Gaps

- Mobile host apps still need native hardware-keyboard plumbing into
  `dispatchUserDrawingKeyboardAction` for non-test surfaces.
- Mobile toolbar UI does not yet expose every command as a polished local
  selected-object surface; that belongs to Epic B.
- This phase is jsdom/RN-component coverage, not physical-device manual QA.

## Follow-Up

- Move back to Epic A placement work so drag-to-draw behavior is verified and
  fixed across web Canvas and mobile Skia before adding more drawing shapes.
