# Drawing Tools Web Keyboard Ownership Audit

Scope: Epic E, Phase E2 in `DRAWING_TOOLS_NORTH_STAR.md`.

## Current Contract

- Web drawing shortcuts only run while the chart owns keyboard input.
- Input controls and app-owned controls keep their native keyboard events in
  widget-level tests. Textareas, selects, and contenteditable targets use the
  same implementation-level owner detection and still need explicit widget
  regressions.
- Widget keydown handling routes drawing shortcuts through the shared keyboard
  resolver before legacy widget shortcuts.
- Shared keyboard action resolution is reused by mobile Skia host keyboard
  adapters, so mobile hardware-keyboard parity follows the same action map.

## Web Evidence

- `TealchartWidget.test.ts` covers chart-owned Delete/Backspace deletion with
  undo restoration.
- `TealchartWidget.test.ts` covers input and app-control refusal for Delete,
  duplicate, and select-all paths.
- `TealchartWidget.test.ts` covers chart-owned undo, redo, copy, paste,
  duplicate, select-all, and Escape selection dismissal.
- `TealchartWidget.test.ts` covers chart-owned Arrow-key nudge with undo
  restoration.
- `keyboard.test.ts` covers focus-owner refusal for text input and app control
  owners and now keeps the keyboard action type checklist exhaustive.

## Mobile Sibling Evidence

- `drawingCommands.test.ts` covers mobile hardware-keyboard dispatch for undo,
  redo, delete, duplicate, copy, paste, select-all, nudge, Escape draft cancel,
  and Escape selected-action dismissal.
- Mobile keyboard dispatch uses `resolveUserDrawingKeyboardAction`, matching the
  web resolver and focus-owner contract.

## Known Gaps

- Web shortcut tests are unit-level jsdom coverage, not browser screenshot or
  manual keyboard QA.
- Textarea, select, and contenteditable ownership are covered by shared owner
  detection, but not by explicit widget-level jsdom cases yet.
- Built-in toolbar affordances for visible undo/redo buttons are not part of
  this phase.
- App integrations still need to decide which native mobile host surface sends
  hardware-keyboard events into the Skia handle.

## Follow-Up

- Epic E3 should verify mobile imperative handle and host-toolbar parity for
  the same keyboard/history commands.
- Later selected-popover toolbar work should expose undoable actions visually
  while preserving this keyboard ownership contract.
