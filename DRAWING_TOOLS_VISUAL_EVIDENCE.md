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

State status values:

- `ready`: first-party platform surface exists and can be manually verified.
- `app-owned`: shared APIs/intents exist, but the host app owns the visible
  surface that should be captured.
- `known-gap`: a platform sibling is intentionally tracked as missing.

## Viewports

Capture the affected surface in these viewport families:

| Target           | Size                    | Notes                                                                               |
| ---------------- | ----------------------- | ----------------------------------------------------------------------------------- |
| Desktop          | 1280 x 900 or wider     | Include top bar, left drawing rail, legend, price axis, and time axis when visible. |
| Narrow desktop   | 900 x 700               | Verify overlays do not occlude the legend or chart chrome.                          |
| Mobile portrait  | 390 x 844 or comparable | Verify Skia drawing surfaces, top bar, and touch affordances fit.                   |
| Mobile landscape | 844 x 390 or comparable | Verify selected actions and context surfaces remain reachable.                      |

## Required Drawing States

| State                         | Web status  | Mobile status | Web evidence                                                                                | Mobile evidence                                                                                | Expected checks                                                                                                                                                      |
| ----------------------------- | ----------- | ------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty chart with drawing rail | `ready`     | `ready`       | Canvas plus overlay chrome                                                                  | Skia chart plus mobile toolbar/action entry points                                             | Chart remains max-size; overlays do not hide legend, axes, or candles unexpectedly.                                                                                  |
| Active tool draft             | `ready`     | `ready`       | Draft preview for a two-anchor and one-anchor tool                                          | Matching Skia draft primitive                                                                  | Draft style, opacity, handles, and cancellation state match platform expectations.                                                                                   |
| Selected drawing              | `ready`     | `ready`       | Selected outline, handles, and action anchor                                                | Matching Skia selected primitives and touch target geometry                                    | Handles are visible, stable, clipped to pane, and do not shift layout.                                                                                               |
| Floating/action toolbar       | `ready`     | `ready`       | Selected-object actions near selection                                                      | Mobile selected action surface or sibling controls                                             | Delete, duplicate, z-order, style, lock, and hide actions map to the same command semantics.                                                                         |
| Context menu/long press       | `ready`     | `ready`       | Drawing-specific context actions                                                            | Mobile context menu/long-press equivalent                                                      | Ordering, visibility, lock, duplicate, delete, and properties actions remain reachable.                                                                              |
| Object tree                   | `ready`     | `ready`       | Row order, selected rows, lock/visibility/name state                                        | Mobile object tree/sheet or app-owned surface using the shared row model                       | Row order matches z-order, IDs remain stable, hidden/locked state is clear.                                                                                          |
| Text/property editing         | `ready`     | `ready`       | Double-click edit and built-in/app-owned property surface                                   | Double-tap edit and built-in/app-owned property surface                                        | Text edits commit/cancel as one transaction and preserve selection/history state.                                                                                    |
| Keyboard/modifier actions     | `ready`     | `ready`       | Chart-owned keyboard shortcuts, Shift placement constraints, and Shift-drag duplicate       | Hardware-keyboard adapter actions plus touch-native duplicate and constraint override surfaces | Drawing shortcuts respect chart focus; undo, redo, delete, duplicate, copy, paste, select-all, nudge, duplicate-drag, and placement constraints use shared commands. |
| API/events/persistence        | `ready`     | `ready`       | Widget drawing APIs, command events, layout import/export, and persistence restore behavior | Skia handle APIs, command events, drawing import/export, and persistence restore behavior      | Web and mobile expose sibling APIs, matching command-event shapes, explicit no-op results, and the same versioned drawing layout schema.                             |
| Pane split indicators         | `ready`     | `ready`       | Drawings over main pane plus non-overlay indicator panes                                    | Skia panes with drawing primitives routed to the correct pane                                  | Drawings clip to their pane and do not overlap dedicated indicator canvases unexpectedly.                                                                            |

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

- [ ] Empty chart with drawing rail (web: ready, mobile: ready), if affected
- [ ] Active tool draft (web: ready, mobile: ready), if affected
- [ ] Selected drawing (web: ready, mobile: ready), if affected
- [ ] Floating/action toolbar (web: ready, mobile: ready), if affected
- [ ] Context menu/long press (web: ready, mobile: ready), if affected
- [ ] Object tree (web: ready, mobile: ready), if affected
- [ ] Text/property editing (web: ready, mobile: ready), if affected
- [ ] Keyboard/modifier actions (web: ready, mobile: ready), if affected
- [ ] API/events/persistence (web: ready, mobile: ready), if affected
- [ ] Pane split indicators (web: ready, mobile: ready), if affected

Regression checks:

- [ ] Selected and draft drawings render with consistent colors, opacity, dash
      style, fill, labels, and handles across web and mobile.
- [ ] Moving, duplicating, hiding, locking, deleting, and reordering a drawing
      does not change its ID unless the action creates a new drawing.
- [ ] Drawing overlays do not block normal chart gestures outside the active
      drawing interaction.
- [ ] The top-left legend avoids the left drawing rail on web; mobile has no
      hidden legend collision from drawing surfaces.
- [ ] Object-tree ordering matches the actual render order on both Canvas and
      Skia.
- [ ] Text/property popovers or sheets do not obscure the edited object in a way
      that prevents confirming the result.

Known visual gaps:

- None recorded in the matrix for affected states.
```
