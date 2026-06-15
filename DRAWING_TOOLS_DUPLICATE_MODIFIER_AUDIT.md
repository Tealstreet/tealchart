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
- Web and mobile selected-object action surfaces now expose a shared
  duplicate-while-dragging toggle. Web keeps Shift-drag as a shortcut while the
  local action covers pointer-only users; mobile routes the same descriptor to
  the touch-native duplicate edit-drag override.
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
- Rendered selected-action tests cover the visible duplicate-drag toggle on the
  web floating toolbar and mobile selected action strip.
- Visual evidence records keyboard and modifier parity across web Canvas and
  mobile Skia.

## Known Gaps

- Mobile duplicate mode remains host-driven for app-owned toolbars, but the
  built-in selected action strip now exposes the same duplicate-drag toggle
  concept as web.
- Constraint and duplicate mode are parity-equivalent, not gesture-identical,
  because mobile touch needs explicit host controls rather than hardware Shift.
- Manual QA still needs a real-device pass for long-press toolbar flows once
  the final selected popover toolbar lands.

## Follow-Up

- Epic E should verify undo/redo confidence across duplicate, move, placement,
  delete, z-order, lock/hide, style, and object-tree mutations.
- Continue selected popover polish with gesture dismissal and density checks
  rather than another duplicate command layer.
