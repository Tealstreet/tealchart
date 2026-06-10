# Drawing Tools Plan

This tracks user markup work for Tealchart. Web Canvas and mobile Skia must land
matching behavior in the same PR for every user-facing drawing feature.

## Shipped

- Shared drawing geometry, render model, hit testing, input draft state, and
  canvas renderer.
- Widget and Skia chart user drawing state APIs.
- Web and mobile drawing input for placing supported drawing types.
- Web Canvas and mobile Skia passive rendering for committed, draft, and
  selected drawing states.

## Shipped: Selection Foundation

- Shared selection helper resolves a screen point to the topmost visible,
  unlocked drawing and clears selection on misses.
- Web click/tap and mobile tap behavior use the same helper in select mode while
  preserving drawing placement priority for active drawing tools.

## Shipped: Drag Editing

- Shared edit helpers resolve selected drawing handles and apply screen-space
  drag deltas to drawing state.
- Web Canvas and mobile Skia route select-mode drag gestures through the shared
  editing helpers.

## Current Epic: Selected Drawing Actions

- Shared action reducers select drawings by id, delete selected or targeted
  drawings, clear all drawings, and cancel active drafts.
- Web widget APIs expose toolbar-ready drawing actions and Delete/Backspace
  removes the selected drawing when the chart owns keyboard input.
- Mobile Skia exposes the same drawing action concepts on its imperative handle.

## Known Gaps

- Full toolbar UI for drawing tool selection and selected drawing actions.
- Text editing UX for text labels.
- Persistence handoff into app-level chart layout state.
