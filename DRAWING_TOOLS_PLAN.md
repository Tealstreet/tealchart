# Drawing Tools Plan

## North Star

Use `DRAWING_TOOLS_NORTH_STAR.md` as the first planning document for the next
drawing-tools push. The current priority is TradingView-grade user markup UX,
not more isolated primitive/export hardening.

Next work should begin with the north-star Epic A audit/fix loop:

- Reproduce real placement behavior for common tools.
- Fix surprising or random-sized shape placement with real drag-to-draw flows.
- Prove every user-facing improvement on both web Canvas and mobile Skia.

Primitive/API compatibility work should only be the next PR when it directly
unblocks one of the north-star UX epics.

## Shipped

- Selection, editing primitives, and drawing style controls exist for both web Canvas and mobile Skia paths.
- Shared chart geometry now computes pane positions and first-party chrome regions for top bar, left drawing tools, right price axis, and bottom time axis.
- Top-left legend overlay metadata is represented in shared geometry; mobile currently reports no separate legend region.
- Chart chrome geometry helpers and metrics are exported for app-level toolbar and overlay integration.
- Web top-left legend shifts right of the drawing rail when left drawing tools are visible.
- The web drawing rail mounts into a transparent chart overlay root; mobile uses the sibling full-chart overlay region for tap-away dismissal.

## Current Direction

- Keep the chart canvas full size by default.
- Treat chart chrome as first-party layout metadata with overlay, reserve, or hybrid behavior per region.
- Land web drawing UI changes only with mobile Skia sibling behavior in the same PR.
- Use `DRAWING_TOOLS_CAPABILITY_MATRIX.md`, `DRAWING_TOOLS_INTERACTION_INVARIANTS.md`,
  and `DRAWING_TOOLS_DIMENSIONAL_GAP_PLAN.md` as the source of truth before
  adding more drawing shape coverage.

## Supported User Drawing Surface

- Active tool selection and draft creation.
- Drawing selection, deletion, duplication, z-order changes, locking, visibility, and style edits.
- Shared render/input model coverage for web and mobile drawing paths.
- Shared command dispatch envelope for app-facing drawing mutations on web and
  mobile.
- Drawing-only undo/redo history for committed command mutations, with web
  keyboard/API controls and mobile Skia imperative handle controls.
- Initial two-anchor drag-to-draw placement for core line/shape tools on both
  web Canvas and mobile Skia, backed by the shared drawing command layer.

## Known Gaps

- Public layout helpers expose metadata only; they do not yet drive every internal overlay placement.
- Indicator legend collision avoidance still needs to consume the shared top-left legend metadata end to end.
- TradingView-grade grouped toolbar affordances need continued parity work across web and mobile.
- Drag-to-draw, floating selected-object actions, context menu, object tree,
  advanced grouped transactions, and modifier behavior are tracked in
  `DRAWING_TOOLS_NORTH_STAR.md` and `DRAWING_TOOLS_DIMENSIONAL_GAP_PLAN.md`.
