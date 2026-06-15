# Drawing Tools Duplicate and Modifier Audit

Scope: Epic D, Phase D3 in `DRAWING_TOOLS_NORTH_STAR.md`.

## Current Contract

- Web select mode supports Shift+drag duplicate through
  `TealchartWidget._handleUserDrawingEditStart`.
- Mobile Skia exposes the same duplicate-edit-drag command through
  `beginDuplicateUserDrawingDragAtPoint`, `duplicateUserDrawingOnEditDrag`, and
  `setUserDrawingDuplicateEditDrag`.
- Both platforms route duplicate-drag through
  `beginDuplicateEditDragAtPoint` and shared command history.
- A duplicate-drag creates the copy, selects the copy, starts the edit drag on
  the copy, and coalesces subsequent drag movement into the same undo entry.
- Web uses Shift for duplicate-drag while mobile exposes host-controlled
  duplicate mode because touch has no native Shift modifier.
- Web Shift placement constraints have a mobile host-controlled constraint
  sibling through the placement constraint override path.

## Evidence

- Shared command tests cover duplicate edit-drag hit metadata and now assert
  the copied drawing can be moved immediately by the returned drag metadata.
- Shared history tests cover duplicate edit-drag start plus movement as one
  undoable transaction.
- Mobile command-history tests cover touch duplicate-drag start plus movement
  as one undoable transaction.
- Mobile input tests cover the prop/imperative override resolver for duplicate
  edit-drag mode.
- Visual evidence records keyboard and modifier parity across web Canvas and
  mobile Skia.

## Known Gaps

- Web duplicate-drag still depends on keyboard modifier availability; there is
  no visible duplicate-mode affordance for pointer-only desktop users.
- Mobile duplicate mode is host-driven. The built-in mobile chart does not yet
  ship a complete TradingView-style floating duplicate/move toolbar.
- Constraint and duplicate mode are parity-equivalent, not gesture-identical,
  because mobile touch needs explicit host controls rather than hardware Shift.
- Manual QA still needs a real-device pass for long-press toolbar flows once
  the final selected popover toolbar lands.

## Follow-Up

- Epic E should verify undo/redo confidence across duplicate, move, placement,
  delete, z-order, lock/hide, style, and object-tree mutations.
- The selected popover toolbar epic should expose duplicate mode as a visible
  action on web and mobile rather than only through keyboard/host APIs.
