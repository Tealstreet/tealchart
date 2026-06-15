# Drawing Tools Object Tree Audit

Epic C checks whether context menu and object-tree workflows make drawing
management discoverable on both web Canvas and mobile Skia. This audit records
the current evidence before work moves to edit lifecycle polish.

## Current Model

Object-tree behavior is shared:

- Shared row resolver: `resolveUserDrawingObjectTreeModel`.
- Shared row dispatch resolver: `resolveUserDrawingObjectTreeRowDispatchAction`.
- Shared selection dispatch resolver:
  `resolveUserDrawingObjectTreeSelectionDispatchAction`.
- Shared command resolver: `resolveUserDrawingObjectTreeActionCommands`.
- Shared command metadata: object-tree mutations use `meta.source:
  "objectTree"` and preserve drawing IDs unless an explicit duplicate command
  creates new IDs.

## Evidence Map

| Area | Web evidence | Mobile evidence | Shared evidence |
| --- | --- | --- | --- |
| Built-in surface | `TealchartWidget.test.ts` covers the web built-in object-tree fallback when no app-owned callback is provided. | `UserDrawingObjectTreeSheet.test.tsx` covers the built-in mobile sheet. | `objectTree.test.ts` covers row/group model generation. |
| App-owned entry points | Web selected actions and context menus can open object-tree callbacks. | Mobile selected action strip and long-press context menus can open object-tree callbacks. | Selected/context action descriptors share the same object-tree open command concept. |
| Row actions | Web panel rows dispatch select, rename, hide/show, lock/unlock, duplicate, delete, and z-order actions. | Mobile sheet rows dispatch the same row actions through the shared resolver. | `objectTree.test.ts` covers row action enablement and dispatch shape. |
| Bulk actions | Web object-tree hosts can use the shared selected-row descriptors. | Mobile object-tree hosts can use the same selected-row descriptors. | `objectTree.test.ts` covers additive/range selection and selected mutation commands. |
| Layering | Web renderer tests assert committed drawing paint order follows drawing z-order. | Mobile render-model tests assert Skia primitive order follows drawing z-order. | `visualEvidence.test.ts` tracks object-tree row, action, and layering evidence as ready on both platforms. |

## Findings

- Epic C is no longer a structural blocker. The shared row/action/command model
  exists and has web and mobile built-in surfaces.
- Context menu and object-tree open commands are already shared between the
  selected-action model, web right-click paths, and mobile long-press paths.
- The next useful C-domain work is visual polish or app integration evidence,
  not another command model layer.

## Follow-Up Risks

- Browser-level visual evidence for panel placement and clipping is still thin.
- Mobile object-tree sheet ergonomics should be rechecked on small screens once
  more drawing actions are added.
- Future row or context actions must be added through the shared resolvers so
  web and mobile stay in lockstep.
