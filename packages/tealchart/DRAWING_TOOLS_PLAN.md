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

## Shipped: Selected Drawing Actions

- Shared action reducers select drawings by id, delete selected or targeted
  drawings, clear all drawings, and cancel active drafts.
- Web widget APIs expose toolbar-ready drawing actions and Delete/Backspace
  removes the selected drawing when the chart owns keyboard input.
- Mobile Skia exposes the same drawing action concepts on its imperative handle.

## Shipped: Toolbar Foundation

- Shared toolbar descriptors define the supported drawing tools and selected
  drawing actions.
- Web top bar and mobile top bar render the same drawing tool/action controls
  from the shared descriptors.

## Shipped: Text Editing Foundation

- Shared text edit reducers begin, update, commit, cancel, and directly set text
  labels while preserving drawing IDs.
- Web double-click opens a positioned DOM text editor for text labels and falls
  back to pane maximize for other targets.
- Mobile Skia double-tap opens a positioned React Native text editor for text
  labels and exposes matching imperative text-edit APIs.

## Shipped: Persistence Foundation

- Shared layout serialization preserves committed drawings and clears transient
  active tool, selection, draft, and text-edit state on restore.
- Web layout save/load includes user drawing state through the existing
  SaveLoadAdapter transformer path and marks layouts dirty only when committed
  drawing payloads change.
- Mobile Skia exposes matching layout-safe drawing import/export APIs through
  its imperative handle and mobile utility exports.

## Shipped: Style Foundation

- Shared reducers update drawing style, visibility, and lock state while
  preserving drawing IDs and clearing invalid selection/edit state.
- Web widget APIs expose selected or targeted drawing style/property updates.
- Mobile Skia exposes matching imperative handle methods and mobile utility
  wrappers for style, visibility, and lock updates.

## Shipped: Style Toolbar Controls

- Shared toolbar descriptors define the initial line color, width, dash style,
  visibility, and lock controls for selected drawings.
- Web top bar and mobile top bar render matching selected-drawing style controls
  and route them through the same state-owner APIs.

## Shipped: Fill and Text Style Controls

- Shared toolbar descriptors define fill colors, text colors, and text-label
  font sizes using the existing drawing style model.
- Web top bar and mobile top bar expose fill controls for rectangles/text labels
  and text color/font size controls for text labels.
- Mobile Skia renders text-label fill, stroke, text color, and normalized font
  size in parity with web Canvas.

## Shipped: Text Alignment Controls

- Shared toolbar descriptors and reducers update text-label left, center, and
  right alignment while preserving drawing IDs.
- Web top bar and mobile top bar expose matching selected text-label alignment
  controls.

## Shipped: Opacity Controls

- Shared drawing style supports normalized opacity and applies it in both web
  Canvas and mobile Skia render paths.
- Web top bar and mobile top bar expose matching selected drawing opacity
  controls through shared descriptors.

## Shipped: Fill and Border Toggles

- Shared drawing style supports explicit fill and border visibility flags.
- Web Canvas and mobile Skia skip matching fill or stroke draw calls while
  preserving existing default rendering for older drawings.
- Web top bar and mobile top bar expose matching selected drawing fill and
  border toggles.

## Current Epic: Font Family Controls

- Shared drawing style normalizes text-label font family to a small
  cross-platform allowlist.
- Web Canvas honors the selected font family for text-label rendering.
- Web top bar and mobile top bar expose matching selected text-label font
  family controls; the mobile text editor uses the normalized family while
  Skia canvas labels remain on the existing bundled/system font path until
  font assets are introduced.

## Known Gaps

- Full TradingView-style drawing toolbar organization and overflow menus.
- Rich text label controls and multiline editor polish.
- More complete style controls, including per-tool property panels.
- Cross-device/server sync policy for host apps that need drawing collaboration
  or layout conflict resolution.
