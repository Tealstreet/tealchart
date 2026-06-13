# Drawing Tools Capability Matrix

This file is the working source of truth for drawing-tool parity planning. It
tracks TradingView-grade drawing dimensions separately from individual shape
rendering so foundational UX gaps do not get hidden by adding more tools.

Sources:

- TradingView Advanced Charts Drawings docs:
  https://www.tradingview.com/charting-library-docs/latest/ui_elements/drawings/
- TradingView Advanced Charts Drawings List:
  https://www.tradingview.com/charting-library-docs/latest/ui_elements/drawings/Drawings-List/
- TradingView Drawings API:
  https://www.tradingview.com/charting-library-docs/latest/ui_elements/drawings/drawings-api/
- TradingView Rectangle tool help:
  https://www.tradingview.com/support/solutions/43000516984-rectangle-drawing-tool/

## Status Legend

| Status | Meaning |
| --- | --- |
| `shipped` | Implemented and tested for both web Canvas/DOM and mobile Skia paths. |
| `partial` | Some shared/web/mobile support exists, but at least one expected behavior is incomplete. |
| `scaffolded` | Types/descriptors/reducers exist, but end-user behavior is not TradingView-grade. |
| `missing` | No meaningful implementation yet. |
| `deferred` | Intentionally out of scope for the current foundation pass. |

## Cross-Cutting Capability Matrix

| Capability dimension | Shared model | Web Canvas/DOM | Mobile Skia/RN | Current status | Next roadmap gap |
| --- | --- | --- | --- | --- | --- |
| Tool/category inventory | Roadmap added; matrix now tracks categories | Same source doc | Same source doc | `partial` | Gap 1 |
| Active tool selection | Tool descriptors and state exist | Left rail/top controls exist | Mobile top/toolbar controls exist | `shipped` | Gap 4 polish |
| Click/tap anchor placement | Draft reducer exists | Click/tap creates anchors | Tap creates anchors | `partial` | Gap 3 |
| Drag-to-draw placement | Path family only | Path drag only; shape drag missing | Path/tap support partial; shape drag missing | `partial` | Gap 3 |
| Draft preview | Render model supports preview anchor | Preview plumbing exists but not general gesture-driven placement | Skia render model supports preview entries | `partial` | Gap 3 |
| Selection and hit testing | Shared hit testing and selection state exist | Click/tap selection exists | Tap selection exists | `shipped` | Gap 4 |
| Multi-select | Group selection state exists | Modifier selection exists | Two-finger additive selection exists | `shipped` | Gap 5 |
| Handle editing | Shared edit helpers exist | Select-mode handle drag exists | Select-mode handle drag exists | `shipped` | Gap 6 polish |
| Whole-object move | Shared edit helpers exist | Select-mode whole drag exists | Select-mode whole drag exists | `shipped` | Gap 7 duplicate-drag |
| Duplicate action | Shared reducer exists | API/top-bar action exists | Handle/top-bar action exists | `partial` | Gap 4, Gap 7 |
| Shift+drag duplicate | No command/gesture transaction yet | Missing | Needs mobile equivalent | `missing` | Gap 7 |
| Delete selected | Shared reducer exists | API/top-bar/keyboard Delete exists | Handle/top-bar action exists | `partial` | Gap 2, Gap 4 |
| Z-order actions | Shared reducer exists | API/top-bar action exists | Handle/top-bar action exists | `partial` | Gap 4, Gap 5 |
| Lock/hide | Shared reducers exist | API/top-bar style controls exist | Handle/top-bar controls exist | `partial` | Gap 4, Gap 5 |
| Style controls | Shared descriptors/reducers exist | Top-bar controls exist | Top-bar controls exist | `partial` | Gap 4, Gap 6 |
| Floating selected toolbar | Descriptors exist but surface model missing | Actions currently live in top bar | Actions currently live in top bar/sibling controls | `missing` | Gap 4 |
| Drawing context menu | Reducers/actions exist | General context menu exists; drawing-specific menu incomplete | Mobile context menu exists; drawing-specific menu incomplete | `missing` | Gap 4 |
| Object tree | No row model yet | Missing | Missing | `missing` | Gap 5 |
| Double-click/double-tap edit | Text edit reducers exist | Text double-click editor exists for text labels | Text double-tap editor exists for text labels | `partial` | Gap 6 |
| Undo/redo | No drawing history stack yet | `Ctrl/Cmd+Z` drawing undo missing | Handle/API undo missing | `missing` | Gap 2 |
| Command transactions | Reducers exist but no command envelope | APIs call reducers directly | Handles call reducers directly | `missing` | Gap 2 |
| Keyboard shortcuts | Some Delete behavior exists | Delete/Backspace partial | Hardware keyboard coverage missing | `partial` | Gap 7 |
| Public APIs | Many widget APIs exist | Web API coverage broad | Mobile handle coverage broad | `partial` | Gap 8 |
| Event subscriptions | General widget/event infrastructure exists | Drawing command events incomplete | Drawing command events incomplete | `missing` | Gap 8 |
| Persistence | Committed drawing state persists; transient state cleared | Layout save/load includes drawings | Mobile import/export exists | `partial` | Gap 8 |
| Visual parity evidence | Tests exist across render/input pieces | Canvas tests exist | Skia render-model tests exist | `partial` | Gap 8 |

## Placement Mode Legend

| Placement mode | Meaning |
| --- | --- |
| `none` | Selection/action tool, no drawing anchors. |
| `one-point` | One chart anchor creates the drawing. |
| `two-point-drag-click` | Should support press-drag-release and two-click placement. |
| `multi-point-click` | User places a fixed number of anchors through repeated clicks/taps. |
| `freehand-drag` | Pointer/touch path creates multiple sampled points. |
| `anchored-pane` | Uses pane-relative anchored position instead of normal chart anchor semantics. |
| `computed-special` | Requires bars, volume bins, risk/reward model, or other computed payload. |

## Tealchart Tool Inventory

The anchor counts below come from `getRequiredAnchorCount`. Placement modes are
the intended TradingView-grade modes, not necessarily current behavior.

| Category | Tools | Anchor count | Intended placement | Current status | Primary gaps |
| --- | --- | --- | --- | --- | --- |
| Cursor | `select` | 0 | `none` | `partial` | Floating toolbar, context menu, object tree |
| Lines | `trendLine`, `trendAngle`, `extendedLine`, `infoLine`, `arrowLine`, `ray` | 2 | `two-point-drag-click` | `partial` | Drag-to-draw, command history |
| Lines | `horizontalLine`, `verticalLine`, `horizontalRay`, `crossLine` | 1 | `one-point` | `partial` | Command history, selected toolbar |
| Lines | `arrowMarker` | 2 | `two-point-drag-click` | `partial` | Drag-to-draw, selected toolbar |
| Lines | `arrowMarkLeft`, `arrowMarkRight`, `arrowMarkUp`, `arrowMarkDown` | 1 | `one-point` | `partial` | Selected toolbar, object tree |
| Channels | `parallelChannel`, `regressionTrend`, `flatTopBottom` | 3 | `multi-point-click` | `partial` | Placement previews, command history |
| Channels | `disjointChannel` | 4 | `multi-point-click` | `partial` | Placement previews, object tree |
| Pitchforks | `pitchfork`, `schiffPitchfork`, `modifiedSchiffPitchfork`, `insidePitchfork`, `pitchfan` | 3 | `multi-point-click` | `partial` | Placement previews, style/property surface |
| Gann/Fibonacci | `fibRetracement`, `fibExtension`, `fibFan`, `fibSpeedResistanceFan`, `fibArcs`, `fibSpeedResistanceArcs`, `fibCircles`, `fibSpiral`, `gannFan`, `gannBox`, `gannSquare`, `gannSquareFixed`, `fibTimeZone` | 2 | `two-point-drag-click` | `partial` | Drag-to-draw, properties |
| Gann/Fibonacci | `trendBasedFibExtension`, `fibWedge`, `fibChannel`, `trendBasedFibTime` | 3 | `multi-point-click` | `partial` | Placement previews, properties |
| Geometric shapes | `rectangle`, `circle`, `ellipse`, `sineLine`, `cyclicLines`, `timeCycles` | 2 | `two-point-drag-click` | `partial` | Drag-to-draw, Shift constraints |
| Geometric shapes | `rotatedRectangle`, `triangle`, `curve`, `arc`, `polyline` | 3 | `multi-point-click` | `partial` | Placement previews, properties |
| Geometric shapes | `doubleCurve` | 4 | `multi-point-click` | `partial` | Placement previews, properties |
| Brushes | `path`, `brush`, `highlighter` | 3 currently | `freehand-drag` | `partial` | Real sampled path model, history grouping |
| Annotation | `textLabel`, `note`, `comment`, `anchoredText`, `anchoredNote`, `priceLabel`, `pin`, `emoji`, `sticker`, `balloon`, `signpost`, `table` | 1 | `one-point` or `anchored-pane` | `partial` | Floating toolbar, properties, object tree |
| Annotation | `callout`, `priceNote`, `image` | 2 | `two-point-drag-click` | `partial` | Drag-to-draw, properties |
| Forecasting/measurement | `priceRange`, `dateRange`, `datePriceRange`, `forecast`, `fixedRangeVolumeProfile` | 2 | `two-point-drag-click` or `computed-special` | `partial` | Drag-to-draw, computed settings |
| Forecasting/measurement | `longPosition`, `shortPosition`, `projection`, `sector`, `barsPattern` | 3 | `multi-point-click` or `computed-special` | `partial` | Properties, placement previews |
| Volume/profile | `anchoredVwap`, `anchoredVolumeProfile` | 1 | `one-point` / `computed-special` | `partial` | Properties, computed settings |
| Patterns | `trianglePattern`, `abcdPattern` | 4 | `multi-point-click` | `partial` | Placement previews, labels/properties |
| Patterns | `xabcdPattern`, `cypherPattern`, `threeDrivesPattern`, `headShouldersPattern`, `elliottImpulseWave`, `elliottTripleComboWave`, `elliottTriangleWave` | 5 | `multi-point-click` | `partial` | Placement previews, labels/properties |
| Patterns | `elliottCorrectiveWave`, `elliottDoubleComboWave` | 3 | `multi-point-click` | `partial` | Placement previews, labels/properties |
| Icons | `icon`, `flagMark` | 1 | `one-point` | `partial` | Icon picker/properties, object tree |

## TradingView Category Coverage

| TradingView category | TradingView examples | Tealchart mapping | Status |
| --- | --- | --- | --- |
| Trend line tools | Trend Line, Arrow, Ray, Info Line, Extended Line, Trend Angle, Horizontal Line, Horizontal Ray, Vertical Line, Cross Line, Parallel Channel, Regression Trend, Flat Top/Bottom, Disjoint Channel, Anchored VWAP | Lines, Channels, `anchoredVwap` | `partial` |
| Gann and Fibonacci tools | Fib Retracement, Trend-Based Fib Extension, Pitchfork variants, Fib Channel, Fib Time Zone, Gann Box/Square/Fan, Fib arcs/fans/circles/wedge/spiral | Gann/Fibonacci and Pitchfork categories | `partial` |
| Geometric shapes | Brush, Highlighter, Rectangle, Circle, Ellipse, Path, Curve, Polyline, Triangle, Rotated Rectangle, Arc, Double Curve | Geometric shapes and Brushes | `partial` |
| Annotation tools | Text, Anchored Text, Note, Anchored Note, Signpost, Callout, Comment, Price Label, Price Note, Arrow Marker, Arrow Marks, Flag Mark | Annotation and Icons categories | `partial` |
| Patterns | XABCD, Cypher, ABCD, Triangle, Three Drives, Head and Shoulders, Elliott waves, Cyclic Lines, Time Cycles, Sine Line | Patterns plus Geometric time/cycle tools | `partial` |
| Predictions and measurement | Long/Short Position, Forecast, Date Range, Price Range, Date and Price Range, Bars Pattern, Projection, Fixed Range Volume Profile | Forecasting/measurement category | `partial` |
| Icons, stickers, emojis | Icons, Stickers, Emojis | `icon`, `sticker`, `emoji` | `partial` |
| Actions | Measure, Zoom In, Magnets, Stay in Drawing Mode, Lock All, Hide All, Remove Drawings | Some lock/hide/delete APIs exist; magnets/stay-mode/measure/zoom actions are deferred | `partial` |

## PR Acceptance Checklist

Every drawing PR must include this checklist in its description or an equivalent
summary:

- [ ] Shared model/reducer/command/render-model behavior is implemented or not
      needed for this scope.
- [ ] Web Canvas/DOM behavior is implemented.
- [ ] Mobile React Native/Skia sibling behavior is implemented.
- [ ] No user-facing drawing behavior is web-only.
- [ ] No user-facing drawing behavior is mobile-only.
- [ ] Focused shared tests were added or updated.
- [ ] Focused web tests were added or updated, or a test-gap note explains why
      the behavior cannot be covered yet.
- [ ] Focused mobile tests were added or updated, or a test-gap note explains
      why the behavior cannot be covered yet.
- [ ] `just check` passes before requesting review.
- [ ] Tracking docs were updated when capability status changed.
- [ ] PR description lists web coverage and mobile Skia coverage explicitly.

## Open Classification Questions

- `path`, `brush`, and `highlighter` currently use a fixed anchor count in the
  type contract. TradingView-grade behavior should probably move these to a
  sampled freehand path model with undo transaction grouping.
- `anchoredText` and `anchoredNote` currently share one-anchor input semantics,
  but their long-term behavior should be treated as `anchored-pane` placement.
- `fixedRangeVolumeProfile`, `anchoredVolumeProfile`, position tools, and bars
  pattern tools need separate computed payload/property modeling before they can
  be considered complete.
- Magnet modes, stay-in-drawing-mode, measure/zoom drawing actions, alerts, and
  templates are tracked as TradingView action gaps but deferred until command,
  history, placement, toolbar, context menu, and object tree foundations exist.
