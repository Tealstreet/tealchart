# Drawing Tools Edit Lifecycle Audit

Epic D checks whether edits behave like deliberate transactions instead of
incidental mutations. This audit records the current D1 evidence for handle
drags, whole-object moves, cancellation, locked/hidden/stale targets, and undo
boundaries across web Canvas and mobile Skia.

## Current Model

Edit lifecycle behavior is shared:

- Shared edit drag resolver: `beginUserDrawingEditDragAtPoint`.
- Shared edit drag applier: `applyUserDrawingEditDrag`.
- Shared duplicate edit-drag resolver: `beginUserDrawingDuplicateEditDragAtPoint`.
- Shared command/history path: `beginEditDragAtPoint`, `applyEditDrag`, and
  `beginDuplicateEditDragAtPoint`.
- Shared edit intent resolver: `resolveUserDrawingEditIntentAtPoint`, consumed
  by web and mobile double-click/double-tap/property flows.

## Evidence Map

| Area | Web evidence | Mobile evidence | Shared evidence |
| --- | --- | --- | --- |
| Handle drag | Web widget drag starts route through `beginEditDragAtPoint` and keep edit state outside history until movement applies. | Mobile Skia touch/edit starts route through the same command result and store `editDrag` refs. | `editing.test.ts` covers handles across line, range, path, shape, projection, icon, note, and pattern tools. |
| Whole-object move | Web select-mode body drags use the shared edit drag applier. | Mobile touch edit drags use the same applier through command dispatch. | `editing.test.ts` covers selected and grouped whole-object moves while skipping locked group members. |
| Cancellation/interruption | Selection-only begin states and draft/text edit cancellation are non-history commands. | Mobile placement cancellation and failed commits stay out of history. | `history.test.ts` and `drawingCommands.test.ts` cover non-history begin/cancel paths. |
| Locked/hidden/stale targets | Web hit/edit intent guards avoid mutating locked targets unless explicitly read-only. | Mobile command helpers return no-op/failure results for stale IDs and protected locked drawings. | Shared edit and command tests cover locked selection members, stale IDs, hidden cleanup, and no-op history preservation. |
| Undo transaction boundary | Web command dispatch records only committed layout mutations. | Mobile command dispatch uses the same history stack and transaction-key coalescing. | Shared and mobile tests cover coalesced edit drags, duplicate drags, text edits, placement, delete, duplicate, style, visibility, lock, and z-order. |

## Findings

- D1 is not missing a structural edit state machine. Handle/body edit drags,
  duplicate edit drags, and history transaction coalescing are already shared.
- Web and mobile both enter edit drags through command results and only record
  layout-changing apply/commit commands.
- Remaining D-domain risk is higher-level lifecycle polish: double-click versus
  properties intent, app-owned versus built-in fallback behavior, and visual
  proof that gesture cancellation feels correct.

## Next Useful Gap

Move to D2:

1. Verify double-click and double-tap behavior for text and non-text drawings.
2. Confirm text drawings enter text edit and non-text drawings open properties
   consistently across app-owned callbacks and built-in fallbacks.
3. Add only the smallest shared/web/mobile fix needed by a reproduced mismatch.
