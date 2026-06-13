# Drawing Tools Plan

## Shipped

- Selection, editing primitives, and drawing style controls exist for both web Canvas and mobile Skia paths.
- Shared chart geometry now computes pane positions and first-party chrome regions for top bar, left drawing tools, right price axis, and bottom time axis.
- The web drawing rail mounts into a transparent chart overlay root; mobile uses the sibling full-chart overlay region for tap-away dismissal.

## Current Direction

- Keep the chart canvas full size by default.
- Treat chart chrome as first-party layout metadata with overlay, reserve, or hybrid behavior per region.
- Land web drawing UI changes only with mobile Skia sibling behavior in the same PR.

## Supported User Drawing Surface

- Active tool selection and draft creation.
- Drawing selection, deletion, duplication, z-order changes, locking, visibility, and style edits.
- Shared render/input model coverage for web and mobile drawing paths.

## Known Gaps

- Layout reservations are computed but not yet exposed as a public API.
- Indicator legend collision avoidance still uses local DOM positioning rather than the shared chrome metadata.
- TradingView-grade grouped toolbar affordances need continued parity work across web and mobile.
