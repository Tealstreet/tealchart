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
| Click/tap anchor placement | Draft reducer exists | Click/tap creates anchors | Tap creates anchors | `partial` | Gap 3 tool expansion |
| Drag-to-draw placement | Shared two-anchor placement commands exist for first proof tools | Web drag creates exact anchors for first proof tools | Mobile touch drag creates exact anchors for first proof tools | `partial` | Gap 3 tool expansion |
| Draft preview | Render model supports preview anchors | Canvas draft previews exist for first proof tools | Skia render model supports matching preview entries | `partial` | Gap 3 tool expansion |
| Selection and hit testing | Shared hit testing and selection state exist | Click/tap selection exists | Tap selection exists | `shipped` | Gap 4 |
| Multi-select | Group selection state exists | Modifier selection exists | Two-finger additive selection exists | `shipped` | Gap 5 |
| Handle editing | Shared edit helpers exist | Select-mode handle drag exists | Select-mode handle drag exists | `shipped` | Gap 6 polish |
| Whole-object move | Shared edit helpers exist | Select-mode whole drag exists | Select-mode whole drag exists | `shipped` | Gap 7 duplicate-drag |
| Duplicate action | Shared command and reducer exist | API, toolbar/context, keyboard, and Shift-drag paths exist | Handle, action/context, keyboard, duplicate-drag handle, and duplicate edit-drag mode paths exist | `shipped` | Gap 4/7 polish |
| Shift+drag duplicate | Shared duplicate edit-drag transaction exists | Shift+drag duplicate-and-move exists in select mode | Mobile duplicate edit-drag mode equivalent exists for host toolbars | `shipped` | Gap 7 polish |
| Delete selected | Shared command and reducer exist | API, toolbar/context, and keyboard Delete exist | Handle, toolbar/context, and keyboard adapter paths exist | `shipped` | Gap 4 polish |
| Z-order actions | Shared command and object-tree action models exist | API, toolbar/context, and object-tree dispatch exist | Handle, toolbar/context, and object-tree dispatch exist | `shipped` | Gap 5 polish |
| Lock/hide | Shared reducers and selected-action descriptors exist | API, floating toolbar/context, and object-tree dispatch exist | Handle, action strip/context, and object-tree dispatch exist | `shipped` | Gap 4/5 polish |
| Style controls | Shared descriptors/reducers/properties surface and quick selected-style commands exist | Top-bar, properties-surface, floating toolbar, and context command paths exist for quick stroke/fill/text appearance style | Top-bar/handle, properties-surface, action strip, and context command paths exist for matching quick stroke/fill/text appearance style | `partial` | Gap 4, Gap 6 polish |
| Floating selected toolbar | Shared selected-action surface and anchor model exist | Floating toolbar opens app-owned properties/object-tree UI, starts text edit for text drawings, and handles initial selected actions plus quick stroke/fill/text appearance style | Anchored mobile action strip opens app-owned properties/object-tree UI, starts text edit for text drawings, and handles matching initial actions plus quick stroke/fill/text appearance style | `partial` | Gap 4/5/6 polish |
| Drawing context menu | Shared context-action resolver exists | Drawing right-click menu opens app-owned properties/object-tree UI, starts text edit for text drawings, and handles matching initial actions plus quick stroke/fill/text appearance style | Drawing long-press menu opens app-owned properties/object-tree UI, starts text edit for text drawings, and handles matching initial actions plus quick stroke/fill/text appearance style | `partial` | Gap 4/5/6 polish |
| Object tree | Shared row/action model and selected/context open action exist | App-owned open/dispatch APIs and selected/context open actions exist | Matching handle/prop open, dispatch APIs, and selected/context open actions exist | `partial` | Gap 5 polish |
| Double-click/double-tap edit | Shared edit-intent and text/property commands exist | Text editor and properties-surface command path exist | Text editor and properties-surface handle path exist | `partial` | Gap 6 polish |
| Undo/redo | Drawing command history stack exists for committed command mutations | Ctrl/Cmd+Z/redo and APIs exist for committed command history | Imperative handle and keyboard adapter paths exist for committed command history | `partial` | Gap 2 validation |
| Command transactions | Shared command envelope and history grouping exist | Widget APIs and gestures dispatch commands | Skia handles/adapters dispatch commands | `shipped` | Gap 2 polish |
| Keyboard shortcuts | Shared keyboard action map exists | Delete/Escape/undo/redo/copy/paste/select-all/duplicate/nudge exist | Host-level hardware-keyboard adapter support exists for matching actions | `partial` | Gap 7 polish |
| Public APIs | Shared command/API concepts exist | Web API coverage broad | Mobile handle coverage broad | `partial` | Gap 8 polish |
| Event subscriptions | Shared command-event shape exists; direct state replacement/import remains silent | `onUserDrawingCommand` and subscription event exist for command dispatch | `onUserDrawingCommand` prop and command utility event path exist for command dispatch | `partial` | Gap 8 polish |
| Persistence | Versioned committed drawing layout schema exists | Layout save/load includes migrated drawings | Mobile import/export uses same unknown-safe schema | `shipped` | Gap 8 polish |
| Visual parity evidence | Tests exist across render/input pieces; manual visual evidence checklist exists | Canvas tests exist plus desktop/narrow-desktop checklist | Skia render-model tests exist plus portrait/landscape checklist | `partial` | Gap 8 |

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
| Lines | `trendLine`, `trendAngle`, `extendedLine`, `infoLine`, `arrowLine`, `ray` | 2 | `two-point-drag-click` | `partial` | Properties, selected toolbar |
| Lines | `horizontalLine`, `verticalLine`, `horizontalRay`, `crossLine` | 1 | `one-point` | `partial` | Command history, selected toolbar |
| Lines | `arrowMarker` | 2 | `two-point-drag-click` | `partial` | Selected toolbar |
| Lines | `arrowMarkLeft`, `arrowMarkRight`, `arrowMarkUp`, `arrowMarkDown` | 1 | `one-point` | `partial` | Selected toolbar, object tree |
| Channels | `parallelChannel`, `regressionTrend`, `flatTopBottom` | 3 | `multi-point-click` with first-segment drag seed | `partial` | Properties, richer multi-point previews |
| Channels | `disjointChannel` | 4 | `multi-point-click` with first-segment drag seed | `partial` | Object tree, richer multi-point previews |
| Pitchforks | `pitchfork`, `schiffPitchfork`, `modifiedSchiffPitchfork`, `insidePitchfork`, `pitchfan` | 3 | `multi-point-click` with first-segment drag seed | `partial` | Style/property surface, richer multi-point previews |
| Gann/Fibonacci | `fibRetracement`, `fibExtension`, `fibFan`, `fibSpeedResistanceFan`, `fibArcs`, `fibSpeedResistanceArcs`, `fibCircles`, `fibSpiral`, `gannFan`, `gannBox`, `gannSquare`, `gannSquareFixed`, `fibTimeZone` | 2 | `two-point-drag-click` | `partial` | Properties |
| Gann/Fibonacci | `trendBasedFibExtension`, `fibWedge`, `fibChannel`, `trendBasedFibTime` | 3 | `multi-point-click` with first-segment drag seed | `partial` | Properties, richer multi-point previews |
| Geometric shapes | `rectangle`, `circle`, `ellipse`, `sineLine`, `cyclicLines`, `timeCycles` | 2 | `two-point-drag-click` | `partial` | Shift constraints for cycle/wave tools |
| Geometric shapes | `rotatedRectangle`, `triangle`, `curve`, `arc`, `polyline` | 3 | `multi-point-click` with first-segment drag seed | `partial` | Properties, richer multi-point previews |
| Geometric shapes | `doubleCurve` | 4 | `multi-point-click` with first-segment drag seed | `partial` | Properties, richer multi-point previews |
| Brushes | `path`, `brush`, `highlighter` | sampled path | `freehand-drag` | `partial` | Smoothing, pressure/stroke properties, object tree polish |
| Annotation | `textLabel`, `note`, `comment`, `anchoredText`, `anchoredNote`, `priceLabel`, `pin`, `emoji`, `sticker`, `balloon`, `signpost`, `table` | 1 | `one-point` or `anchored-pane` | `partial` | Floating toolbar, properties, object tree |
| Annotation | `callout`, `priceNote`, `image` | 2 | `two-point-drag-click` | `partial` | Properties |
| Forecasting/measurement | `priceRange`, `dateRange`, `datePriceRange`, `forecast`, `fixedRangeVolumeProfile` | 2 | `two-point-drag-click` or `computed-special` | `partial` | Computed settings/properties |
| Forecasting/measurement | `longPosition`, `shortPosition`, `projection`, `sector` | 3 | `multi-point-click` with first-segment drag seed | `partial` | Properties, richer multi-point previews |
| Forecasting/measurement | `barsPattern` | 3 | `computed-special` with first-segment drag seed | `partial` | Properties, richer multi-point previews |
| Volume/profile | `anchoredVwap`, `anchoredVolumeProfile` | 1 | `one-point` / `computed-special` | `partial` | Properties, computed settings |
| Patterns | `trianglePattern`, `abcdPattern` | 4 | `multi-point-click` with first-segment drag seed | `partial` | Richer multi-point previews, labels/properties |
| Patterns | `xabcdPattern`, `cypherPattern`, `threeDrivesPattern`, `headShouldersPattern`, `elliottImpulseWave`, `elliottTripleComboWave`, `elliottTriangleWave` | 5 | `multi-point-click` with first-segment drag seed | `partial` | Richer multi-point previews, labels/properties |
| Patterns | `elliottCorrectiveWave`, `elliottDoubleComboWave` | 3 | `multi-point-click` with first-segment drag seed | `partial` | Richer multi-point previews, labels/properties |
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
- [ ] Manual visual evidence checklist was completed for rendering or interaction
      surface changes, or the PR states why it is not applicable.
- [ ] Tracking docs were updated when capability status changed.
- [ ] PR description lists web coverage and mobile Skia coverage explicitly.

## Open Classification Questions

- `path`, `brush`, and `highlighter` use sampled freehand drag input with undo
  transaction grouping on both web Canvas and mobile Skia. TradingView-grade
  behavior still needs smoothing, pressure/stroke properties, and richer style
  presets.
- `anchoredText` and `anchoredNote` currently share one-anchor input semantics,
  but their long-term behavior should be treated as `anchored-pane` placement.
- `fixedRangeVolumeProfile`, `anchoredVolumeProfile`, position tools, and bars
  pattern tools need separate computed payload/property modeling before they can
  be considered complete.
- Magnet modes, stay-in-drawing-mode, measure/zoom drawing actions, alerts, and
  templates are tracked as TradingView action gaps but deferred until command,
  history, placement, toolbar, context menu, and object tree foundations exist.
