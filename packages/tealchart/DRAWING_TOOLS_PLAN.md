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

## Shipped: Duplicate Drawing Action

- Shared duplicate reducer clones every committed drawing kind with new IDs,
  timestamps, and deep-copied nested payloads.
- Web widget/top bar and mobile Skia/top bar expose matching duplicate-selected
  drawing behavior through the same toolbar descriptors.

## Shipped: Group Selection Foundation

- Shared selection state can preserve an ordered group of selected drawing IDs
  while keeping the first ID as the backward-compatible primary selection.
- Web Canvas and mobile Skia render every drawing in a grouped selection as
  selected through the shared render-entry model.
- Web widget APIs and mobile Skia handles expose matching grouped selection,
  delete-selected, and duplicate-selected behavior.

## Shipped: Group Drag Editing

- Shared edit-drag state snapshots grouped selections at drag start and moves
  all selected, unlocked drawings together for whole-drawing drags.
- Handle and point-index edits remain single-drawing operations so endpoint and
  corner editing behavior stays stable on web Canvas and mobile Skia.

## Shipped: Group Style Actions

- Shared style, visibility, and lock reducers apply to grouped selections while
  preserving targeted single-drawing calls.
- Locked drawings remain protected unless the caller opts into locked updates;
  hide and lock actions remove affected drawings from the active selection.

## Shipped: Additive Selection Input

- Shared point selection supports additive toggling so selected drawing groups
  can be built or reduced without clearing the existing selection on misses.
- Web Canvas uses Shift/Cmd/Ctrl-click for additive selection, and mobile Skia
  uses a two-finger tap routed through the same shared selection reducer.

## Shipped: Z-Order Action APIs

- Shared z-order reducers move selected or targeted drawings forward, backward,
  to front, or to back while preserving group membership and drawing IDs.
- Locked drawings remain protected unless the caller opts into locked updates.
- Web widget APIs and mobile Skia handles expose matching z-order methods for
  app toolbar integration.

## Shipped: Z-Order Toolbar Controls

- Shared toolbar action descriptors include bring-forward, send-backward,
  bring-to-front, and send-to-back controls.
- Web and mobile top bars enable the controls from the same shared reducer
  semantics and route actions through the matching platform state owner.

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

## Shipped: Signpost Tool

- Shared drawing state supports the single-anchor `signpost` annotation and
  persists text and alignment through layout save/load.
- Web Canvas and mobile Skia render signpost annotations through the shared text
  annotation geometry and styling pipeline.
- Selection, hit testing, whole-drawing moves, text editing, and style controls
  reuse the existing text annotation behavior on both platforms.

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

- Shared drawing state supports single-anchor `arrowMarkLeft`,
  `arrowMarkRight`, `arrowMarkUp`, and `arrowMarkDown` tools and persists them
  through layout save/load.
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

## Shipped: Trend-Based Fibonacci Extension Tool

- Shared drawing state supports the three-anchor `trendBasedFibExtension` tool
  and persists it through layout save/load.
- Web Canvas and mobile Skia render matching projected Fibonacci extension
  levels from the first trend leg, anchored at the retrace point, using shared
  screen-space geometry.
- Selection, level-line hit testing, whole-drawing moves, and point-index
  handle editing use shared drawing behavior on both platforms.

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

## Shipped: Date Range Bar Count Labels

- Shared date/date-price range geometry resolves elapsed time and inclusive bar
  counts from loaded chart bars.
- Web Canvas and mobile Skia consume the same resolved measurement labels,
  rendering `N bars, duration` when bar data is available.
- Duration-only labels remain the fallback for callers without bar data.

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

## Shipped: Double Curve Tool

- Shared drawing state supports the four-anchor `doubleCurve` tool and persists
  it through layout save/load.
- Web Canvas renders cubic Bezier curves from shared start/control/control/end
  geometry while mobile Skia renders the same sampled double-curve path.
- Selection, sampled-path hit testing, whole-drawing moves, and point-index
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

## Shipped: Forecast and Projection Bar Count Labels

- Shared info-line metrics can include inclusive bar counts from loaded chart
  bars while preserving duration-only labels when no bar data is available.
- Forecast and projection geometry pass chart bars through the shared metrics,
  so web Canvas and mobile Skia render matching `N bars, duration` change
  labels.

## Shipped: Info Line Bar Count Labels

- Info-line geometry resolves shared measurement metrics with loaded chart bars.
- Web Canvas and mobile Skia consume the same info-line geometry label, rendering
  `N bars, duration` when bars are available and preserving duration-only
  fallback labels otherwise.

## Shipped: XABCD Pattern Tool

- Shared drawing state supports the five-anchor `xabcdPattern` tool and
  persists it through layout save/load.
- Web Canvas and mobile Skia render matching X-A-B-C-D connected pattern paths
  with shared point labels.
- Selection, segment hit testing, whole-drawing moves, duplicate actions, and
  point-index anchor editing use shared drawing behavior on both platforms.

## Shipped: Cypher Pattern Tool

- Shared drawing state supports the five-anchor `cypherPattern` tool and
  persists it through layout save/load.
- Web Canvas and mobile Skia render matching X-A-B-C-D connected pattern paths
  with shared point labels.
- Selection, segment hit testing, whole-drawing moves, duplicate actions, and
  point-index anchor editing use shared drawing behavior on both platforms.

## Shipped: ABCD Pattern Tool

- Shared drawing state supports the four-anchor `abcdPattern` tool and persists
  it through layout save/load.
- Web Canvas and mobile Skia render matching A-B-C-D connected pattern paths
  with shared point labels.
- Selection, segment hit testing, whole-drawing moves, duplicate actions, and
  point-index anchor editing use shared drawing behavior on both platforms.

## Shipped: Triangle Pattern Tool

- Shared drawing state supports the four-anchor `trianglePattern` tool and
  persists it through layout save/load.
- Web Canvas and mobile Skia render matching AC/BD boundary lines, A-C-D-B fill
  regions, and shared A-B-C-D labels.
- Selection, fill/boundary hit testing, whole-drawing moves, duplicate actions,
  fill controls, and point-index anchor editing use shared drawing behavior on
  both platforms.

## Shipped: Three Drives Pattern Tool

- Shared drawing state supports the five-anchor `threeDrivesPattern` tool and
  persists it through layout save/load.
- Web Canvas and mobile Skia render matching connected 1-A-2-C-3 pattern paths
  with shared point labels.
- Selection, segment hit testing, whole-drawing moves, duplicate actions, and
  point-index anchor editing use shared drawing behavior on both platforms.

## Shipped: Head and Shoulders Pattern Tool

- Shared drawing state supports the five-anchor `headShouldersPattern` tool and
  persists it through layout save/load.
- Web Canvas and mobile Skia render matching left-shoulder, neckline, head, and
  right-shoulder paths with a shared neckline segment and labels.
- Selection, path/neckline hit testing, whole-drawing moves, duplicate actions,
  and point-index anchor editing use shared drawing behavior on both platforms.

## Shipped: Elliott Impulse Wave Tool

- Shared drawing state supports the five-anchor `elliottImpulseWave` tool and
  persists it through layout save/load.
- Web Canvas and mobile Skia render matching connected 1-2-3-4-5 impulse wave
  paths with shared point labels.
- Selection, segment hit testing, whole-drawing moves, duplicate actions, and
  point-index anchor editing use shared drawing behavior on both platforms.

## Shipped: Elliott Corrective Wave Tool

- Shared drawing state supports the three-anchor `elliottCorrectiveWave` tool
  and persists it through layout save/load.
- Web Canvas and mobile Skia render matching connected A-B-C corrective wave
  paths with shared point labels.
- Selection, segment hit testing, whole-drawing moves, duplicate actions, and
  point-index anchor editing use shared drawing behavior on both platforms.

## Shipped: Elliott Double Combo Wave Tool

- Shared drawing state supports the three-anchor `elliottDoubleComboWave` tool
  and persists it through layout save/load.
- Web Canvas and mobile Skia render matching connected W-X-Y double combo wave
  paths with shared point labels.
- Selection, segment hit testing, whole-drawing moves, duplicate actions, and
  point-index anchor editing use shared drawing behavior on both platforms.

## Shipped: Elliott Triple Combo Wave Tool

- Shared drawing state supports the five-anchor `elliottTripleComboWave` tool
  and persists it through layout save/load.
- Web Canvas and mobile Skia render matching connected W-X-Y-X-Z triple combo
  wave paths with shared point labels.
- Selection, segment hit testing, whole-drawing moves, duplicate actions, and
  point-index anchor editing use shared drawing behavior on both platforms.

## Shipped: Elliott Triangle Wave Tool

- Shared drawing state supports the five-anchor `elliottTriangleWave` tool and
  persists it through layout save/load.
- Web Canvas and mobile Skia render matching connected A-B-C-D-E triangle wave
  paths with shared point labels.
- Selection, segment hit testing, whole-drawing moves, duplicate actions, and
  point-index anchor editing use shared drawing behavior on both platforms.

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

## Shipped: Price Label Tool

- Shared drawing state supports the single-anchor `priceLabel` annotation and
  persists text, alignment, and style through layout save/load.
- Web Canvas and mobile Skia render matching price-label text boxes from shared
  text annotation layout.
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

## Shipped: Icon Tool

- Shared drawing state supports the single-anchor `icon` marker with a default
  star symbol, a small reusable icon-name library, and layout persistence.
- Web Canvas and mobile Skia render matching filled/stroked vector icon
  polygons from shared icon geometry for star, circle, square, triangle, flag,
  arrow-up, and arrow-down variants.
- Web top bar and mobile top bar expose matching selected-icon controls for
  switching icon names through shared reducers and public APIs.
- Selection, polygon hit testing, whole-drawing moves, and center-handle
  editing use shared drawing behavior on both platforms.

## Shipped: Flag Mark Tool

- Shared drawing state supports the single-anchor `flagMark` annotation marker
  and persists it through layout save/load.
- Web Canvas and mobile Skia render matching flag polygons through the shared
  icon geometry pipeline.
- Selection, polygon hit testing, whole-drawing moves, center-handle editing,
  and fill controls use shared marker behavior on both platforms.

## Shipped: Emoji Tool

- Shared drawing state supports the single-anchor `emoji` annotation and
  persists emoji text, alignment, and style through layout save/load.
- Web Canvas and mobile Skia render matching emoji text annotations through the
  shared text annotation geometry and render-model pipeline.
- Selection, text-box hit testing, whole-drawing moves, text editing, alignment
  controls, and style controls use shared text annotation behavior on both
  platforms.

## Shipped: Sticker Tool

- Shared drawing state supports the single-anchor `sticker` annotation with a
  default star sticker and persists sticker text, alignment, and style through
  layout save/load.
- Web Canvas and mobile Skia render matching sticker text annotations through
  the shared text annotation geometry and render-model pipeline.
- Selection, text-box hit testing, whole-drawing moves, text editing, alignment
  controls, and style controls use shared text annotation behavior on both
  platforms.

## Shipped: Balloon Tool

- Shared drawing state supports the single-anchor `balloon` text annotation and
  persists text, alignment, and style through layout save/load.
- Web Canvas and mobile Skia render matching balloon text boxes with triangular
  tails from a shared balloon layout helper.
- Selection, text-box/tail hit testing, whole-drawing moves, text editing,
  alignment controls, and style controls use shared text annotation behavior on
  both platforms.

## Shipped: Anchored Annotation Tools

- Shared drawing state supports `anchoredText` and `anchoredNote` with normalized
  pane positions so annotations stay fixed to the pane during chart pan/zoom.
- Web Canvas/DOM and mobile Skia render and edit anchored annotations through
  the shared text annotation style, hit-test, selection, and text-edit pipeline.
- Layout serialization, duplication, whole-drawing moves, toolbar descriptors,
  and style/text controls preserve matching web/mobile behavior.

## Shipped: Fibonacci Arcs Tool

- Shared drawing state supports the two-anchor `fibArcs` tool and persists it
  through layout save/load.
- Web Canvas and mobile Skia render matching Fibonacci-level semicircular arcs
  from shared geometry.
- Selection, arc hit testing, whole-drawing moves, endpoint handle editing, and
  toolbar descriptors use shared drawing behavior on both platforms.

## Shipped: Fixed Range Volume Profile Tool

- Shared drawing state supports the two-anchor `fixedRangeVolumeProfile` tool
  and persists it through layout save/load.
- Web Canvas and mobile Skia render matching fixed-range volume bins from the
  shared bar-data geometry resolver.
- Selection, bin/bounds hit testing, whole-drawing moves, endpoint handle
  editing, and toolbar descriptors use shared drawing behavior on both
  platforms.

## Shipped: Image Annotation Contract

- Shared drawing state supports the two-anchor `image` annotation with
  persisted `src` and `alt` metadata.
- Web Canvas and mobile Skia render matching empty-image placeholder frames from
  shared rectangle geometry.
- Selection, edge hit testing, whole-drawing moves, corner resizing, layout
  serialization, duplication, and toolbar descriptors use shared drawing
  behavior on both platforms.

## Shipped: Loaded Image Annotation Rendering

- Web Canvas image annotations load and cache their `src` asset, request a chart
  redraw when loading completes, and retain placeholder rendering for empty,
  unsupported, or failed images.
- Mobile Skia image annotations use the same `src`/`alt` primitive contract and
  render loaded assets over the matching placeholder frame with the styled border
  preserved.
- The shared image annotation state, hit testing, editing, serialization, and
  toolbar behavior remain unchanged across web and mobile.

## Shipped: Pitchfork Parallel Lines and Fill

- Shared pitchfork geometry now derives TradingView-style inner/outer parallel
  line sets and a fill band from the existing three-anchor pitchfork state.
- Web Canvas and mobile Skia render matching pitchfork fill and extra parallel
  rays while preserving existing pitchfork variants, editing, and serialization.
- Hit testing includes the added pitchfork parallel rays on both web and mobile
  through the shared geometry/render-model path.

## Shipped: Pitchfan Background Bands

- Shared pitchfan geometry now derives filled Fibonacci fan bands between the
  existing pitchfan rays without changing persisted drawing state.
- Web Canvas and mobile Skia render matching pitchfan background bands behind
  the existing fan rays.
- Pitchfan selection remains line-based to avoid broad accidental background
  hits while preserving existing editing and serialization behavior.

## Known Gaps

- Full TradingView-style drawing toolbar organization and overflow menus.
- TradingView advanced
  Fibonacci tools beyond retracement/extension/trend-based extension/fan/speed-resistance fan/fib arcs/speed-resistance arcs/circles/wedge/spiral/channel/time-zone/trend-based time,
  Gann tools beyond fan/box/square, pattern tools beyond Elliott Triangle Wave/Elliott Corrective Wave/Elliott Impulse Wave/Head and Shoulders/Three Drives/Triangle/ABCD/XABCD, remaining advanced volume profile tools, image source/upload lifecycle controls, and additional curved geometry.
- Additional TradingView measurement tool polish beyond current bar-count
  price/date ranges, risk/reward positions, and bars pattern.
- Rich text label controls and multiline editor polish.
- More complete style controls, including per-tool property panels.
- Cross-device/server sync policy for host apps that need drawing collaboration
  or layout conflict resolution.
