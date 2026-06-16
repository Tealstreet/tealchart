# Drawing Tools Web Keyboard Ownership Audit

Scope: Epic E, Phase E2 in `DRAWING_TOOLS_NORTH_STAR.md`.

## Current Contract

- Web drawing shortcuts only run while the chart owns keyboard input.
- Input controls and app-owned controls keep their native keyboard events in
  widget-level tests. Textareas, selects, and contenteditable targets now have
  explicit widget-level regressions for drawing shortcut ownership.
- Widget keydown handling routes drawing shortcuts through the shared keyboard
  resolver before legacy widget shortcuts.
- Shared keyboard action resolution is reused by mobile Skia host keyboard
  adapters, so mobile hardware-keyboard parity follows the same action map.

## Web Evidence

- `TealchartWidget.test.ts` covers chart-owned Delete/Backspace deletion with
  undo restoration.
- `TealchartWidget.test.ts` covers input and app-control refusal for Delete,
  duplicate, and select-all paths.
- `TealchartWidget.test.ts` explicitly covers textarea, select, and
  contenteditable refusal for chart-owned Delete behavior, then verifies the
  same shortcut still runs when the chart owns the event.
- `TealchartWidget.test.ts` covers chart-owned undo, redo, copy, paste,
  duplicate, select-all, and Escape selection dismissal.
- `TealchartWidget.test.ts` covers chart-owned Arrow-key nudge with undo
  restoration.
- `keyboard.test.ts` covers focus-owner refusal for text input and app control
  owners and now keeps the keyboard action type checklist exhaustive.

## Mobile Sibling Evidence

- `drawingCommands.test.ts` covers mobile hardware-keyboard dispatch for undo,
  redo, delete, duplicate, copy, paste, select-all, nudge, Escape draft cancel,
  and Escape selected-action dismissal, including explicit refusal for
  `textInput`/`appControl` owners and acceptance for `chart`.
- Mobile keyboard dispatch uses `resolveUserDrawingKeyboardAction`, matching the
  web resolver and focus-owner contract.

## Browser Evidence (web Canvas, Chrome MCP)

Live keyboard QA against the running app (shortcuts require the chart to own
keyboard input — the widget sets `_isHovered` and focuses its container on
`mouseenter`, so a synthetic `mouseenter` on the container is needed before each
key):

- Delete removes the selected drawing; Cmd+Z restores it; Cmd+Shift+Z redoes the
  delete; Cmd+Z again restores. Verified live.
- Escape clears the selection, and also closes an open built-in panel
  (object tree / properties) instead of running chart shortcuts.
- Cmd+C / Cmd+V duplicates the selected drawing (object-tree count 1 → 2).
- Cmd+A select-all followed by Delete clears all drawings — but only when no
  built-in panel is open: while the object-tree/properties panel is open the
  keydown handler intentionally processes only Escape, suppressing chart
  shortcuts. Verified both states live.
- Arrow-key nudge runs on the selected drawing.

No keyboard-ownership defect reproduced; this closes the browser-QA gap below.

## Known Gaps

- Web shortcut tests are unit-level jsdom coverage; browser keyboard QA is now
  recorded above for the core shortcut set.
- Built-in toolbar affordances for visible undo/redo buttons are not part of
  this phase.
- App integrations still need to decide which native mobile host surface sends
  hardware-keyboard events into the Skia handle.

## Follow-Up

- Epic E3 should verify mobile imperative handle and host-toolbar parity for
  the same keyboard/history commands.
- Later selected-popover toolbar work should expose undoable actions visually
  while preserving this keyboard ownership contract.
