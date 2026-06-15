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
| Built-in surface | `TealchartWidget.test.ts` covers the web built-in object-tree fallback when no app-owned callback is provided, including panel pointer/context-event bubbling isolation in jsdom and row z-order actions. | `UserDrawingObjectTreeSheet.test.tsx` covers the built-in mobile sheet, including the responder boundary flag and mocked tap isolation while row/actions are used. `SkiaTealchart.test.tsx` now covers opening the rendered sheet through the Skia handle and dispatching a z-order row action through live Skia drawing state. | `objectTree.test.ts` covers row/group model generation. |
| App-owned entry points | Web selected actions and context menus can open object-tree callbacks. `ContextMenu.test.ts` now verifies the rendered web context menu exposes and dispatches the object-tree entry without chart click fallthrough. `TealchartWidget.test.ts` now verifies a web drawing context menu selects the hit drawing and dispatches duplicate with `contextMenu` command metadata. | Mobile selected action strip and long-press context menus can open object-tree callbacks. `ContextMenuComponent.test.tsx` now verifies the rendered mobile context menu exposes and dispatches the same object-tree entry without chart tap fallthrough. `SkiaTealchart.test.tsx` now verifies a rendered Skia long-press context menu selects the hit drawing and dispatches duplicate with `contextMenu` command metadata. | Selected/context action descriptors share the same object-tree open command concept. |
| Row actions | Web panel rows dispatch select, rename, hide/show, lock/unlock, duplicate, delete, and z-order actions. | Mobile sheet rows dispatch the same row actions through the shared resolver. | `objectTree.test.ts` covers row action enablement and dispatch shape. |
| Bulk actions | Web object-tree hosts can use the shared selected-row descriptors. | Mobile object-tree hosts can use the same selected-row descriptors. | `objectTree.test.ts` covers additive/range selection and selected mutation commands. |
| Layering | Web renderer tests assert committed drawing paint order follows drawing z-order. | Mobile render-model tests assert Skia primitive order follows drawing z-order. | `visualEvidence.test.ts` tracks object-tree row, action, and layering evidence as ready on both platforms. |

## Findings

- Epic C is no longer a structural blocker. The shared row/action/command model
  exists and has web and mobile built-in surfaces.
- Context menu and object-tree open commands are already shared between the
  selected-action model, web right-click paths, and mobile long-press paths.
- Rendered web and mobile context menu surfaces now both prove the object-tree
  entry is present and isolated from chart event fallthrough.
- Live web and mobile context-menu entry points now both prove target selection
  before action dispatch and duplicate command metadata with `source:
  "contextMenu"`. Web context-menu toolbar actions now dispatch duplicate,
  delete, and z-order commands with context-menu source metadata instead of
  falling through API-source convenience methods.
- Built-in web and mobile object-tree surfaces now both have focused unit-level
  regression evidence that surface interactions do not bubble through the
  jsdom/RN-test wrappers or dismiss the mobile sheet before a row/action can
  complete.
- Built-in web and mobile object-tree surfaces now both have component-level
  z-order evidence: the web panel dispatches row z-order actions through
  `TealchartWidget`, and the mobile sheet dispatches row z-order actions through
  `SkiaTealchart`.
- Built-in web and mobile object-tree surfaces now both pin basic reachability
  layout constraints: the web panel stays viewport-capped with wrapped row
  actions, while the mobile sheet stays height-capped with wrapped row actions.
- The next useful C-domain work is visual polish or app integration evidence,
  not another command model layer.

## Follow-Up Risks

- Browser-level evidence for real chart-container pointer isolation remains
  thinner than unit-level panel placement, clipping, and row-action evidence.
- Mobile object-tree sheet ergonomics and native responder isolation should be
  rechecked on small screens once more drawing actions are added.
- Future row or context actions must be added through the shared resolvers so
  web and mobile stay in lockstep.
