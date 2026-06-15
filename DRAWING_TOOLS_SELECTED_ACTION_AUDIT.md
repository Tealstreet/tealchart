# Drawing Tools Selected Action Audit

Epic B checks whether selected drawings expose local actions near the selected
object on both web Canvas and mobile Skia. This audit records current evidence
and the remaining gaps before more selected-action work starts.

## Current Model

The selected-action surface is shared:

- Shared descriptor resolver: `resolveUserDrawingSelectedActionSurface`.
- Shared visibility guard: `shouldRenderUserDrawingSelectedActionSurface`.
- Shared anchor geometry: selected bounds and preferred action anchors resolve
  from the drawing render model and are consumed by web and mobile.
- Shared command concepts: properties, object tree, text edit, copy, duplicate,
  delete, z-order, visibility, lock/unlock, and style actions.

## Evidence Map

| Area | Web evidence | Mobile evidence | Shared evidence |
| --- | --- | --- | --- |
| Local action surface | `ChartTopBar.test.ts` renders the chart-overlay selected drawing actions and blocks chart click fallthrough. | `UserDrawingSelectedActionSurface.test.tsx` renders the anchored Skia/RN action strip and blocks chart tap fallthrough. | `toolbar.test.ts` covers descriptor groups, enabled state, and the Epic B checklist. |
| Properties and object tree | `TealchartWidget.test.ts` and `ChartTopBar.test.ts` cover built-in/app-owned open paths. | `drawingActionDispatch.test.ts` covers mobile toolbar/context object-tree and properties dispatch. | Properties/object-tree commands come from the selected-action model. |
| Text edit | Web context, double-click, and selected actions route text-capable drawings into text edit. `ChartTopBar.test.ts` now verifies the rendered floating toolbar keeps properties reachable for non-text drawings, enables local text edit for unlocked text drawings, and disables it for locked text drawings. | Mobile action dispatch and double-tap edit intent share the same text/properties concepts. `UserDrawingSelectedActionSurface.test.tsx` now verifies the rendered action strip matches the same non-text, unlocked text, and locked text behavior. | `toolbar.test.ts` ensures text edit is only enabled for unlocked text drawings. |
| Copy/duplicate/delete/z-order | Web floating toolbar and context menu dispatch copy, duplicate, delete, and z-order callbacks. | Mobile selected action strip dispatches the same selected-object commands, with copy writing the mobile clipboard and mutations flowing through mobile command history. | Shared descriptor commands map local copy to `copySelected` and mutations to history-backed command actions. |
| Style/visibility/lock | Web floating toolbar renders style popovers and visibility/lock controls. | Mobile action strip renders the same style groups and mutation commands. | Shared style descriptors define line, fill, text, opacity, visibility, and lock controls. |
| Chrome-safe placement | `ChartTopBar.test.ts` covers the selected toolbar clamping below the top bar and clear of the left drawing rail when space allows. | `UserDrawingSelectedActionSurface.test.tsx` covers the same top/left rail clamp for the Skia/RN action strip. | `chartGeometry.test.ts` covers the shared left-rail avoidance inset helper, including constrained widths. |

## Findings

- Epic B is not missing the core action model. The shared descriptor and command
  layer already covers the north-star checklist.
- Web and mobile both have local selected-action surfaces. The main product
  risk is polish and discoverability, not missing command plumbing.
- The selected-action surface now uses chart chrome metrics to avoid the left
  drawing rail when there is enough width, while staying in-bounds on narrower
  mobile layouts where the full rail reservation cannot fit.
- Copy selected is now locally reachable from the selected-object surface on
  both web and mobile, not only through keyboard/API command paths.
- Duplicate-while-dragging is now locally reachable from the selected-object
  surface on both web and mobile. Web keeps Shift-drag as a shortcut while the
  local action provides a pointer-only mode; mobile toggles the existing
  touch-native duplicate edit-drag override from the same shared descriptor.
- Rendered web and mobile selected-action surfaces now prove the same local
  text-edit availability rules for representative non-text, unlocked text, and
  locked text drawings while keeping properties reachable.
- Future selected-action work should target a specific user-visible polish gap,
  such as action density, mobile gesture dismissal, or a tool-specific style
  control that is missing from both web and mobile.

## Next Useful Gap

Move to one of these narrow improvements:

1. Add browser-level visual/e2e evidence that the web selected toolbar is
   anchored near real selected geometry, beyond the current component-level
   chrome clamp tests.
2. Add mobile render/e2e evidence that the action strip remains reachable near
   chart edges and does not block chart gestures outside the strip, beyond the
   current component-level chrome clamp tests.
3. Add one missing tool-specific selected style control only if it can be
   implemented in the shared descriptor and rendered by both web and mobile.
