# Drawing Tools Visual Evidence Checklist

Use this checklist when a drawing PR changes rendering, interaction surfaces, or
manual workflows that are hard to prove with unit tests alone. Evidence can be
screenshots, short clips, or a written manual pass in the PR description. Check
the states affected by the PR and any already-available sibling surfaces. Mark
states that are not built yet or not touched as not applicable with a short note.

Every user-facing drawing behavior must cover both web Canvas/DOM and mobile
Skia/RN unless the PR is documentation-only.

The checklist below is mirrored in
`packages/tealchart/src/drawings/visualEvidence.ts`. Use
`USER_DRAWING_VISUAL_EVIDENCE_MATRIX` when tooling needs the canonical viewport
and state list, and `createUserDrawingVisualEvidencePrNoteTemplate()` when a PR
needs a fresh evidence block.

## Viewports

Capture the affected surface in these viewport families:

| Target | Size | Notes |
| --- | --- | --- |
| Desktop | 1280 x 900 or wider | Include top bar, left drawing rail, legend, price axis, and time axis when visible. |
| Narrow desktop | 900 x 700 | Verify overlays do not occlude the legend or chart chrome. |
| Mobile portrait | 390 x 844 or comparable | Verify Skia drawing surfaces, top bar, and touch affordances fit. |
| Mobile landscape | 844 x 390 or comparable | Verify selected actions and context surfaces remain reachable. |

## Required Drawing States

| State | Web evidence | Mobile evidence | Expected checks |
| --- | --- | --- | --- |
| Empty chart with drawing rail | Canvas plus overlay chrome | Skia chart plus mobile toolbar/action entry points | Chart remains max-size; overlays do not hide legend, axes, or candles unexpectedly. |
| Active tool draft | Draft preview for a two-anchor and one-anchor tool | Matching Skia draft primitive | Draft style, opacity, handles, and cancellation state match platform expectations. |
| Selected drawing | Selected outline, handles, and action anchor | Matching Skia selected primitives and touch target geometry | Handles are visible, stable, clipped to pane, and do not shift layout. |
| Floating/action toolbar | Selected-object actions near selection | Mobile selected action surface or sibling controls | Delete, duplicate, z-order, style, lock, and hide actions map to the same command semantics. |
| Context menu/long press | Drawing-specific context actions | Mobile context menu/long-press equivalent | Ordering, visibility, lock, duplicate, delete, and properties actions remain reachable. |
| Object tree | Row order, selected rows, lock/visibility/name state | Mobile object tree/sheet or app-owned surface using the shared row model | Row order matches z-order, IDs remain stable, hidden/locked state is clear. |
| Text/property editing | Double-click edit and property surface | Double-tap edit and property surface | Text edits commit/cancel as one transaction and preserve selection/history state. |
| Pane split indicators | Drawings over main pane plus non-overlay indicator panes | Skia panes with drawing primitives routed to the correct pane | Drawings clip to their pane and do not overlap dedicated indicator canvases unexpectedly. |

## Regression Checks

- Selected and draft drawings render with consistent colors, opacity, dash style,
  fill, labels, and handles across web and mobile.
- Moving, duplicating, hiding, locking, deleting, and reordering a drawing does
  not change its ID unless the action creates a new drawing.
- Drawing overlays do not block normal chart gestures outside the active drawing
  interaction.
- The top-left legend avoids the left drawing rail on web; mobile has no hidden
  legend collision from drawing surfaces.
- Object-tree ordering matches the actual render order on both Canvas and Skia.
- Text/property popovers or sheets do not obscure the edited object in a way
  that prevents confirming the result.

## PR Note Template

```markdown
## Drawing Visual Evidence

- Desktop:
- Narrow desktop:
- Mobile portrait:
- Mobile landscape:

Checked states:
- [ ] Empty chart / drawing rail, if affected
- [ ] Active tool draft, if affected
- [ ] Selected drawing, if affected
- [ ] Floating/action toolbar, if available and affected
- [ ] Context menu or long press, if available and affected
- [ ] Object tree, if available and affected
- [ ] Text/property editing, if affected
- [ ] Pane split indicators, if affected

Known visual gaps:
```
