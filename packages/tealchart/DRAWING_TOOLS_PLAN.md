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

## Shipped: Font Family Controls

- Shared drawing style normalizes text-label font family to a small
  cross-platform allowlist.
- Web Canvas honors the selected font family for text-label rendering and
  normalizes unsupported family values.
- Web top bar and mobile top bar expose matching selected text-label font
  family controls.
- Mobile Skia maps the shared logical font family values to native system
  families for both canvas labels and active text editing.

## Shipped: Multiline Text Labels

- Shared text-label layout splits committed text into stable lines and preserves
  existing single-line geometry.
- Web Canvas and mobile Skia render each text-label line from the same measured
  layout model.
- Web and mobile text editors size from the longest line and line count while
  preserving newline text through shared reducers and layout serialization.
- Web and mobile selection hit testing use rendered text metrics for multiline
  label bounds.

## Shipped: Arrow Line Tool

- Shared drawing state supports the two-anchor `arrowLine` tool and persists it
  through layout save/load.
- Web Canvas renders arrow-line stems and arrowheads through the same line style
  pipeline used by existing drawing lines.
- Mobile Skia render models expose matching arrowhead geometry and render it
  with the same clip, color, opacity, and width behavior.

## Shipped: Extended Line Tool

- Shared drawing state supports the two-anchor `extendedLine` tool and persists
  it through layout save/load.
- Web Canvas and mobile Skia render the same chart-bound extended segment from
  the shared geometry resolver.
- Selection, hit testing, and endpoint editing reuse the existing line-family
  behavior on both platforms.

## Shipped: Price Range Tool

- Shared drawing state supports the two-anchor `priceRange` tool and persists
  it through layout save/load.
- Web Canvas and mobile Skia render a filled measurement range with a shared
  signed price/percent label.
- Selection, hit testing, fill controls, and corner editing reuse rectangle
  behavior on both platforms.

## Shipped: Date Range Tool

- Shared drawing state supports the two-anchor `dateRange` tool and persists it
  through layout save/load.
- Web Canvas and mobile Skia render a full-pane time-span measurement band with
  a shared duration label.
- Selection, hit testing, fill controls, and boundary editing reuse shared
  drawing behavior on both platforms.

## Shipped: Path Tool

- Shared drawing state supports a fixed three-anchor `path` tool and persists it
  through layout save/load.
- Web Canvas and mobile Skia render matching stroked polylines from shared
  screen-space geometry.
- Selection, hit testing, whole-drawing moves, and point-index handle editing
  use shared logic on both platforms.

## Shipped: Info Line Tool

- Shared drawing state supports the two-anchor `infoLine` tool and persists it
  through layout save/load.
- Web Canvas and mobile Skia render matching finite line segments with shared
  price/percent and elapsed-time labels.
- Selection, hit testing, and endpoint editing reuse line-family behavior on
  both platforms.

## Shipped: Arrow Marker Tool

- Shared drawing state supports the two-anchor `arrowMarker` tool and persists
  it through layout save/load.
- Web Canvas and mobile Skia render matching filled arrow marker polygons from
  shared geometry.
- Selection, polygon hit testing, whole-drawing moves, and endpoint editing
  work through shared drawing behavior on both platforms.

## Shipped: Arrow Marks

- Shared drawing state supports single-anchor `arrowMarkUp` and `arrowMarkDown`
  tools and persists them through layout save/load.
- Web Canvas and mobile Skia render matching fixed-size filled arrow mark
  polygons from shared geometry.
- Selection, polygon hit testing, whole-drawing moves, and fill controls use
  shared drawing behavior on both platforms.

## Shipped: Circle Tool

- Shared drawing state supports the two-anchor `circle` tool and persists it
  through layout save/load.
- Web Canvas and mobile Skia render matching filled/stroked circles from shared
  screen-space geometry.
- Selection, edge hit testing, whole-drawing moves, corner editing, and fill
  controls use shared drawing behavior on both platforms.

## Shipped: Ellipse Tool

- Shared drawing state supports the two-anchor `ellipse` tool and persists it
  through layout save/load.
- Web Canvas and mobile Skia render matching filled/stroked ellipses from shared
  screen-space geometry.
- Selection, edge hit testing, whole-drawing moves, corner editing, and fill
  controls use shared drawing behavior on both platforms.

## Shipped: Triangle Tool

- Shared drawing state supports the three-anchor `triangle` tool and persists it
  through layout save/load.
- Web Canvas and mobile Skia render matching filled/stroked triangle polygons
  from shared screen-space geometry.
- Selection, polygon hit testing, whole-drawing moves, point editing, and fill
  controls use shared drawing behavior on both platforms.

## Shipped: Parallel Channel Tool

- Shared drawing state supports the three-anchor `parallelChannel` tool and
  persists it through layout save/load.
- Web Canvas and mobile Skia render matching filled/stroked channel polygons
  from shared screen-space geometry.
- Selection, rail/polygon hit testing, whole-drawing moves, width-anchor
  editing, and fill controls use shared drawing behavior on both platforms.

## Shipped: Fibonacci Retracement Tool

- Shared drawing state supports the two-anchor `fibRetracement` tool and
  persists it through layout save/load.
- Web Canvas and mobile Skia render matching horizontal Fibonacci retracement
  levels and ratio/price labels from shared screen-space geometry.
- Selection, level-line hit testing, endpoint editing, and whole-drawing moves
  use shared drawing behavior on both platforms.

## Shipped: Fibonacci Extension Tool

- Shared drawing state supports the two-anchor `fibExtension` tool and persists
  it through layout save/load.
- Web Canvas and mobile Skia render matching horizontal Fibonacci extension
  levels and ratio/price labels from shared screen-space geometry.
- Selection, level-line hit testing, endpoint editing, and whole-drawing moves
  use shared drawing behavior on both platforms.

## Shipped: Horizontal Ray Tool

- Shared drawing state supports the single-anchor `horizontalRay` tool and
  persists it through layout save/load.
- Web Canvas and mobile Skia render matching right-extending horizontal ray
  segments from shared screen-space geometry.
- Selection, segment hit testing, anchor handles, and whole-drawing moves use
  shared drawing behavior on both platforms.

## Shipped: Cross Line Tool

- Shared drawing state supports the single-anchor `crossLine` tool and persists
  it through layout save/load.
- Web Canvas and mobile Skia render matching full-width horizontal and
  full-height vertical crosshair segments from shared screen-space geometry.
- Selection, segment hit testing, anchor handles, and whole-drawing moves use
  shared drawing behavior on both platforms.

## Shipped: Trend Angle Tool

- Shared drawing state supports the two-anchor `trendAngle` tool and persists it
  through layout save/load.
- Web Canvas and mobile Skia render matching finite trend-angle segments with a
  shared screen-space angle label.
- Selection, hit testing, endpoint editing, and whole-drawing moves reuse
  line-family behavior on both platforms.

## Shipped: Regression Trend Tool

- Shared drawing state supports the three-anchor `regressionTrend` tool and
  persists it through layout save/load.
- Web Canvas and mobile Skia render matching filled/stroked regression channel
  polygons from shared bar-aware regression geometry.
- Selection, polygon/rail hit testing, whole-drawing moves, and point-index
  editing use shared channel behavior on both platforms.

## Shipped: Date and Price Range Tool

- Shared drawing state supports the two-anchor `datePriceRange` measurement
  tool and persists it through layout save/load.
- Web Canvas and mobile Skia render matching filled/stroked range rectangles
  with shared price-change and duration labels.
- Selection, rectangle hit testing, whole-drawing moves, corner editing, and
  fill controls reuse shared range behavior on both platforms.

## Shipped: Anchored Line Tools

- Shared drawing state supports `ray`, `horizontalLine`, and `verticalLine`
  tools and persists them through layout save/load.
- Web Canvas and mobile Skia resolve matching chart-bound line primitives for
  rays and full-pane axis lines.
- Selection, line hit testing, anchor handles, and whole-drawing moves use
  shared drawing behavior on both platforms.

## Shipped: Freehand Path Capture

- Shared path drawings support variable-length point arrays while preserving
  existing fixed-tap path workflows.
- Web Canvas and mobile Skia collect path samples through matching drag
  gestures and commit the same path drawing state shape.
- Layout persistence, point editing, hit testing, and render models retain all
  sampled path anchors on both platforms.

## Shipped: Risk/Reward Position Tools

- Add long and short position markup with entry, target, and stop anchors.
- Web Canvas and mobile Skia render matching profit/risk regions, labels,
  selection handles, persistence, and editing behavior.

## Shipped: Bars Pattern Tool

- Add bars pattern markup with source-start, source-end, and placement anchors.
- Shared geometry copies source OHLC bars from the chart data and places them
  at the placement anchor with stable IDs, persistence, hit testing, and editing.
- Web Canvas and mobile Skia render matching copied candle bodies and wicks
  from the shared render model.

## Shipped: Flat Top/Bottom Tool

- Shared drawing state supports the three-anchor `flatTopBottom` tool and
  persists it through layout save/load.
- Web Canvas and mobile Skia render matching filled/stroked polygons from a
  sloped edge plus a horizontal flat boundary.
- Selection, polygon/rail hit testing, whole-drawing moves, point editing, and
  fill controls use shared drawing behavior on both platforms.

## Shipped: Disjoint Channel Tool

- Shared drawing state supports the four-anchor `disjointChannel` tool and
  persists it through layout save/load.
- Web Canvas and mobile Skia render matching filled/stroked polygons from two
  independently positioned channel rails.
- Selection, polygon/rail hit testing, whole-drawing moves, point editing, and
  fill controls use shared drawing behavior on both platforms.

## Shipped: Anchored VWAP Tool

- Shared drawing state supports the single-anchor `anchoredVwap` tool and
  persists it through layout save/load.
- Web Canvas and mobile Skia render matching cumulative VWAP curves from the
  selected anchor using chart OHLCV bars.
- Selection, curve/anchor hit testing, whole-drawing moves, and public/native
  exports use shared drawing behavior on both platforms.

## Shipped: Polyline Tool

- Shared drawing state supports the three-anchor `polyline` tool and persists
  it through layout save/load.
- Web Canvas and mobile Skia render matching open stroked polylines from shared
  screen-space geometry.
- Selection, segment hit testing, whole-drawing moves, and point-index handle
  editing use shared drawing behavior on both platforms.

## Shipped: Rotated Rectangle Tool

- Shared drawing state supports the three-anchor `rotatedRectangle` tool and
  persists it through layout save/load.
- Web Canvas and mobile Skia render matching filled/stroked rotated rectangles
  from a shared perpendicular-width geometry resolver.
- Selection, polygon/rail hit testing, whole-drawing moves, point editing, and
  fill controls use shared drawing behavior on both platforms.

## Shipped: Pitchfork Tool

- Shared drawing state supports the three-anchor `pitchfork` tool and persists
  it through layout save/load.
- Web Canvas and mobile Skia render matching median and parallel tines from a
  shared Andrews' pitchfork geometry resolver.
- Selection, tine hit testing, whole-drawing moves, and point-index handle
  editing use shared drawing behavior on both platforms.

## Shipped: Pitchfork Variants

- Shared drawing state supports `schiffPitchfork`,
  `modifiedSchiffPitchfork`, and `insidePitchfork` tools and persists them
  through layout save/load.
- Web Canvas and mobile Skia render matching variant median geometry from the
  shared pitchfork resolver while reusing pitchfork tine rendering.
- Selection, tine hit testing, whole-drawing moves, and point-index handle
  editing use shared drawing behavior on both platforms.

## Shipped: Pitchfan Tool

- Shared drawing state supports the three-anchor `pitchfan` tool and persists it
  through layout save/load.
- Web Canvas and mobile Skia render matching Fibonacci fan rays from the shared
  pitchfan geometry resolver.
- Selection, ray hit testing, whole-drawing moves, and point-index handle
  editing use shared drawing behavior on both platforms.

## Shipped: Fibonacci Fan Tool

- Shared drawing state supports the two-anchor `fibFan` tool and persists it
  through layout save/load.
- Web Canvas and mobile Skia render matching Fibonacci fan rays from the shared
  fib fan geometry resolver.
- Selection, ray hit testing, whole-drawing moves, and endpoint editing use
  shared drawing behavior on both platforms.

## Shipped: Gann Fan Tool

- Shared drawing state supports the two-anchor `gannFan` tool and persists it
  through layout save/load.
- Web Canvas and mobile Skia render matching Gann ratio fan rays from the shared
  Gann fan geometry resolver.
- Selection, ray hit testing, whole-drawing moves, and endpoint editing use
  shared drawing behavior on both platforms.

## Shipped: Fibonacci Channel Tool

- Shared drawing state supports the three-anchor `fibChannel` tool and persists
  it through layout save/load.
- Web Canvas and mobile Skia render matching Fibonacci channel levels from the
  shared fib channel geometry resolver.
- Selection, channel/level hit testing, whole-drawing moves, and point-index
  handle editing use shared drawing behavior on both platforms.

## Shipped: Fibonacci Time Zone Tool

- Shared drawing state supports the two-anchor `fibTimeZone` tool and persists
  it through layout save/load.
- Web Canvas and mobile Skia render matching vertical Fibonacci time levels from
  the shared fib time zone geometry resolver.
- Selection, time-level hit testing, whole-drawing moves, and endpoint editing
  use shared drawing behavior on both platforms.

## Shipped: Fibonacci Speed Resistance Fan Tool

- Shared drawing state supports the two-anchor `fibSpeedResistanceFan` tool and
  persists it through layout save/load.
- Web Canvas and mobile Skia render matching one-third, two-third, and full
  speed-resistance fan rays from the shared fib fan geometry resolver.
- Selection, ray hit testing, whole-drawing moves, and endpoint editing use
  shared drawing behavior on both platforms.

## Shipped: Fibonacci Circles Tool

- Shared drawing state supports the two-anchor `fibCircles` tool and persists
  it through layout save/load.
- Web Canvas and mobile Skia render matching concentric Fibonacci circle levels
  from the shared fib circles geometry resolver.
- Selection, ring hit testing, whole-drawing moves, and endpoint editing use
  shared drawing behavior on both platforms.

## Shipped: Trend-Based Fibonacci Time Tool

- Shared drawing state supports the three-anchor `trendBasedFibTime` tool and
  persists it through layout save/load.
- Web Canvas and mobile Skia render matching projected Fibonacci time levels
  from a shared trend-based fib time geometry resolver.
- Selection, time-level hit testing, whole-drawing moves, and point-index
  handle editing use shared drawing behavior on both platforms.

## Shipped: Fibonacci Speed Resistance Arcs Tool

- Shared drawing state supports the two-anchor `fibSpeedResistanceArcs` tool and
  persists it through layout save/load.
- Web Canvas and mobile Skia render matching one-third, two-third, and full
  speed-resistance arc levels from a shared arc geometry resolver.
- Selection, arc hit testing, whole-drawing moves, and endpoint editing use
  shared drawing behavior on both platforms.

## Shipped: Fibonacci Wedge Tool

- Shared drawing state supports the three-anchor `fibWedge` tool and persists
  it through layout save/load.
- Web Canvas and mobile Skia render matching filled Fibonacci wedge arcs and
  boundary rays from a shared wedge geometry resolver.
- Selection, arc/boundary hit testing, whole-drawing moves, fill controls, and
  point-index handle editing use shared drawing behavior on both platforms.

## Shipped: Fibonacci Spiral Tool

- Shared drawing state supports the two-anchor `fibSpiral` tool and persists
  it through layout save/load.
- Web Canvas and mobile Skia render matching Fibonacci-growth spiral paths from
  a shared spiral geometry resolver.
- Selection, spiral path hit testing, whole-drawing moves, and endpoint editing
  use shared drawing behavior on both platforms.

## Shipped: Gann Box Tool

- Shared drawing state supports the two-anchor `gannBox` tool and persists it
  through layout save/load.
- Web Canvas and mobile Skia render matching filled Gann boxes with price/time
  levels and angle lines from a shared geometry resolver.
- Selection, grid/angle hit testing, whole-drawing moves, fill controls, and
  rectangle-corner editing use shared drawing behavior on both platforms.

## Shipped: Gann Square Tool

- Shared drawing state supports the two-anchor `gannSquare` tool and persists it
  through layout save/load.
- Web Canvas and mobile Skia render matching filled Gann squares with equal
  price/time extents, grid levels, and angle lines from a shared geometry
  resolver.
- Selection, grid/angle hit testing, whole-drawing moves, fill controls, and
  square-corner editing use shared drawing behavior on both platforms.

## Shipped: Curve Tool

- Shared drawing state supports the three-anchor `curve` tool and persists it
  through layout save/load.
- Web Canvas renders quadratic Bezier curves from shared start/control/end
  geometry while mobile Skia renders the same sampled curve path.
- Selection, sampled-curve hit testing, whole-drawing moves, and point-index
  anchor editing use shared drawing behavior on both platforms.

## Shipped: Arc Tool

- Shared drawing state supports the three-anchor `arc` tool and persists it
  through layout save/load.
- Web Canvas renders circular arcs through start/middle/end anchors while
  mobile Skia renders the same sampled arc path.
- Selection, sampled-arc hit testing, whole-drawing moves, and point-index
  anchor editing use shared drawing behavior on both platforms.

## Shipped: Cyclic Lines Tool

- Shared drawing state supports the two-anchor `cyclicLines` tool and persists
  it through layout save/load.
- Web Canvas and mobile Skia render matching repeated vertical cycle lines
  across the visible time range from a shared geometry resolver.
- Selection, cycle-line hit testing, whole-drawing moves, and endpoint editing
  use shared drawing behavior on both platforms.

## Shipped: Time Cycles Tool

- Shared drawing state supports the two-anchor `timeCycles` tool and persists it
  through layout save/load.
- Web Canvas and mobile Skia render matching repeated time-cycle boundaries and
  sampled semicycle arcs from a shared geometry resolver.
- Selection, cycle arc/boundary hit testing, whole-drawing moves, and endpoint
  editing use shared drawing behavior on both platforms.

## Shipped: Sine Line Tool

- Shared drawing state supports the two-anchor `sineLine` tool and persists it
  through layout save/load.
- Web Canvas and mobile Skia render matching sampled sine waves from a shared
  geometry resolver.
- Selection, sampled-path hit testing, whole-drawing moves, and endpoint editing
  use shared drawing behavior on both platforms.

## Shipped: Forecast Tool

- Shared drawing state supports the two-anchor `forecast` tool and persists it
  through layout save/load.
- Web Canvas and mobile Skia render matching forecast projection lines with
  shared source, target, and change labels.
- Selection, projection-line hit testing, whole-drawing moves, and endpoint
  editing use shared drawing behavior on both platforms.

## Shipped: Projection Tool

- Shared drawing state supports the three-anchor `projection` tool and persists
  it through layout save/load.
- Web Canvas and mobile Skia render matching two-leg projection paths with
  shared start, pivot, target, and projected-change labels.
- Selection, two-leg hit testing, whole-drawing moves, and point-index anchor
  editing use shared drawing behavior on both platforms.

## Shipped: Brush Tool

- Shared drawing state supports the variable-point `brush` tool and persists it
  through layout save/load.
- Web Canvas and mobile Skia render matching freehand brush paths from shared
  polyline geometry.
- Drag input, sampled-path hit testing, whole-drawing moves, and point-index
  anchor editing use shared drawing behavior on both platforms.

## Shipped: Highlighter Tool

- Shared drawing state supports the variable-point `highlighter` tool and
  persists it through layout save/load.
- Web Canvas and mobile Skia render matching highlighter paths from shared
  polyline geometry.
- Drag input, sampled-path hit testing, whole-drawing moves, and point-index
  anchor editing use shared drawing behavior on both platforms.

## Shipped: Note Tool

- Shared drawing state supports the single-anchor `note` annotation and persists
  text, alignment, and style through layout save/load.
- Web Canvas and mobile Skia render matching note text boxes from shared text
  label layout.
- Selection, hit testing, whole-drawing moves, text editing, alignment controls,
  and style controls use shared text annotation behavior on both platforms.

## Shipped: Callout Tool

- Shared drawing state supports two-anchor `callout` annotations: one pointer
  anchor and one text-container anchor.
- Web Canvas and mobile Skia render matching callout pointer segments and text
  boxes from shared text annotation layout.
- Selection, hit testing, whole-drawing moves, endpoint handle edits, text
  editing, alignment controls, and style controls stay shared across platforms.

## Shipped: Comment Tool

- Shared drawing state supports the single-anchor `comment` annotation and
  persists text, alignment, and style through layout save/load.
- Web Canvas and mobile Skia render matching comment text boxes from shared text
  annotation layout.
- Selection, hit testing, whole-drawing moves, text editing, alignment controls,
  and style controls use shared text annotation behavior on both platforms.

## Shipped: Price Note Tool

- Shared drawing state supports two-anchor `priceNote` annotations: one price
  pointer anchor and one text-label anchor.
- Web Canvas and mobile Skia render matching price-note pointer segments and
  text boxes from shared text annotation layout.
- Selection, hit testing, whole-drawing moves, endpoint handle edits, text
  editing, alignment controls, and style controls stay shared across platforms.

## Shipped: Pin Tool

- Shared drawing state supports the single-anchor `pin` marker and persists it
  through layout save/load.
- Web Canvas and mobile Skia render matching pin markers with a circle and stem
  from shared anchor geometry.
- Selection, marker/stem hit testing, whole-drawing moves, and center-handle
  editing use shared drawing behavior on both platforms.

## Known Gaps

- Full TradingView-style drawing toolbar organization and overflow menus.
- TradingView pitchfork/pitchfan extra line sets/backgrounds, advanced
  Fibonacci tools beyond retracement/extension/fan/speed-resistance fan/arcs/circles/wedge/spiral/channel/time-zone/trend-based time,
  Gann tools beyond fan/box/square, pattern tools, volume profile tools, annotation/icon tools, and additional curved geometry.
- Additional TradingView measurement tool polish beyond the current price/date
  ranges, risk/reward positions, and bars pattern.
- Rich text label controls and multiline editor polish.
- More complete style controls, including per-tool property panels.
- Cross-device/server sync policy for host apps that need drawing collaboration
  or layout conflict resolution.
