Pine Style controls on web retain coded plots separately from display overrides.
Reselecting a plot sets all display locations; Defaults resets coded inputs and
clears Style overrides. Omitted percent precision uses two decimal places in the
shared output formatter; explicit script precision still wins.

# CLAUDE.md — @tealstreet/tealchart

Web widget hosts may inject `TealchartWidgetOptions.overlayHost`, a package-neutral
`WebOverlayHostFactory`. Modal subclasses, saved layouts, context menus, interval
pickers and drawing properties/object-tree panels adopt their original DOM into
the admitted document; callbacks, drafts and widget owners remain unchanged.
`Modal.setOverlayHost` and `LayoutSelector.setOverlayHost` must run before opening.
Host input ancestry includes descendants for outside-pointer dismissal, while
Escape targets the exact surface so a nested popup does not close its parent.
The web app adapter uses the shared desktop registry and copies chart theme vars;
the package never imports Electron or creates another React root or state store.
Raw anchors first pass through the host's `sourcePoint`, then clamp in the source
app viewport and pass through the admitted document's `targetPoint`. Retained
interval menus observe source/target layout changes and release those listeners.
Constructor-time host failures retire through a guarded microtask, after caller
ownership is assigned. Retained modal focus runs after subclass form rebuilding.

The native canvas mounts the Pine drawing worklet only while drawing outputs
exist. Empty charts never capture their bar history for an empty picture;
removing the last drawing unmounts its derived-value mapper.

Native zero-offset plots share their original output and visible-bar objects.
Nonzero offsets share memoized source windows by offset, invalidated by the
history, visible bars, outputs or viewport bounds.

Native background stripes are recorded in one picture per plot, with a single
live geometry mapper and plot-level clipping. Rectangle order, colors and
minimum pixel widths are retained, including overlapping translucent stripes.

Time-anchored labels are culled before searching history. Price labels need no
candle lookup; above/below-bar labels use a lower-bound binary timestamp search
on sorted bars, preserving the first match when timestamps repeat.

Explicit Pine `format.price` output labels inherit chart precision when script
precision is omitted, including in an indicator pane. The shared web/native
formatter uses supplied chart `pricePrecision` for this format before pane-range
heuristics. Explicit script precision wins; unspecified-format pane labels and
volume formatting retain their existing policies.

Canvas-based OHLCV charting library with a TradingView-compatible widget API.

Pine tables display the newest object per creation site and per location within
each script. Select replacements before excluding empty tables so an empty
replacement does not expose an older table. Merged dimensions use neighboring
unmerged cells; merged and covered cells do not influence column/row sizing.

Serialized native worklet tests must materialize the closure shape emitted by
the installed mobile Babel plugin: Worklets 0.13 uses arrays, while older
versions used objects. Preserve array captures recursively instead of forcing
object closures, so these gates execute the actual serialized UI function body.

## Architecture

`PriceLineManager` accepts an optional host pointer-event predicate before
financial down/drag handlers mutate state. Hosted frames require the original
trusted DOM event; omitted predicates retain ordinary Tealchart behavior.
Programmatic drag cancellation restores geometry without submitting callbacks.

Trading adapter body/quantity fonts flow into shared label segments; PnL uses
the body font. Bounded pixel-font parsing drives both text measurement and Konva
rendering. The largest visible font sets pill/control height with an 18px minimum;
axis typography remains independent. Segment fonts participate in the retained
node signature, so updates rebuild text and hit geometry together.

**Hybrid rendering model:**

- **Canvas 2D API**: Candlesticks, volume, grid, time/price axes, crosshair (high-frequency updates)
- **Konva.js**: Interactive trading geometry on web — order/position lines with draggable labels and controls
- **DOM / React Native overlays**: Menus, buttons, chrome controls, and toolbars that do not require per-frame chart projection

`WebCanvasContext.font` reads and deduplicates against the actual native context
state. A private font cache becomes stale after save/restore or canvas resizing,
making repeated Hosted axis-tag paints fall back to the default 10px font.


`ui/LayoutSelector` is the shared saved-layout list and action modal. Hosts can
open/close it through a native header without adding a second menu. Optional
`requestName`, `confirmDelete` and `onClose` callbacks connect Electron's
existing app-origin dialogs; omitted callbacks keep browser prompt/confirm.
Hosted calls mount the original modal in the chart root and use its existing
Escape, overlay and close-button behavior. Pending hosted naming results are
retired when that selector is unmounted.
The shared web `ui/Modal` overlay declares `role="dialog"`, including its default
absolute chart-contained form. Native Electron chart hosts use this semantic
surface to hide their view while app-owned picker/settings/layout dialogs cover
it; closed overlays retain `display:none` and do not occlude the chart.

**Overlay UI rule:** Use real DOM nodes on web and real React Native nodes on mobile for controls, menus, buttons, popovers, context menus, floating action buttons, and toolbars whenever their size/value is not a high-frequency function of chart data. Canvas/Skia should own plot primitives and chart-derived labels that must stay inside the draw pass: candles, volume, grid, axes, crosshair, price/time labels, and projected drawing or trading geometry. The left drawing tool rail, reset-view affordance, context menus, price-axis plus menus, and similar chrome belong in overlay UI, not canvas/Skia.

**Hit-testing rule:** What draws a control decides what receives its taps.

- **Drawn into the canvas** — candles, axes, crosshair, trade and price lines,
  user drawings, axis tags. These have no element to attach a handler to, so the
  chart's hit-test system owns them: `hitTestUserDrawings` and `EventManager` on
  web, the gesture runtime under `mobile/interaction/` on native.
- **Not drawn into the canvas** — every DOM node on web and every React Native
  node on mobile. These take their own events: `addEventListener` / `onclick` on
  web, `onPress` on native. That is true whether the element sits in a reserved
  chrome band (top bar, left tool rail) or floats over the plot (legend, gear,
  selection toolbar, context menus).

Never re-derive a rect for an element that already has a callback. `onPress`
arrives in the element's own coordinate space and stays correct when the element
moves, scrolls, or re-lays out. A rect measured with `onLayout` and re-projected
into canvas space is the same information, worse: it is a copy that has to be
kept in sync, and it will drift. A native top bar built that way had to have its
horizontal scrolling disabled to hide the drift, and nobody noticed until the
controls past the right edge became unreachable.

The genuine problem is different and has a different fix. React Native touches
and gesture-handler gestures do compete over the same area, so a React Native
control that floats over the canvas must also report its box into
`nativeGestureControlZones`, which makes pan/crosshair/drawing gestures fail
their start underneath it. Measure that box with `onLayout` — suppression zones
should come from measured layout, never from recomputed geometry. Controls in a
reserved band get one coarse zone for the whole band instead.

So: `onPress` for the tap, a control zone for the suppression, and no hit target
in between. The left tool rail is the reference implementation on native, and
web chrome has always worked this way.

Grow small targets inward with hit slop only. Slop pushed past the canvas edge
buys nothing, because the gesture layer never sees touches outside it.

**Native gesture release rule:** Mobile Skia gestures must not clear preview,
override, or ownership state directly on gesture finalize when that state masks a
React/Skia propagation seam. Commit the target first, then release the visual
hold through `mobile/interaction/nativeReleaseHold.ts` after the committed frame
reports that the target is visible. **A commit is not a paint.** If clearing the
hold can expose the commit's all-old frame, the hold has to outlive the repaint
as well, and that is decided inside the canvas rather than here - see **One
commit, two channels**. React render and layout-effect passes are not
presentation frames, and neither is an animation frame counted from one. This is
the single owner for release-hold timing across
viewport ownership, pane divider resize snapshots, pane maximize legend freezes,
and pane-range overrides. Do not add ad hoc `requestAnimationFrame`, timeout, or
effect-based release gates as the normal release path for new mobile visual
holds; add a named hold kind, a caught-up predicate, and if needed a centralized
presentation release instead. A timeout may exist only as a documented ceiling
for a hold that would otherwise be able to freeze forever if the target
disappears.

**Native viewport gesture ownership rule:** `Gesture.Simultaneous` is event
composition, not ownership. Any native gesture that mutates the shared viewport,
pane divider bands, or indicator pane range must claim the shared
`NativeViewportGestureOwnerState` before it begins mutating, and must clear that
owner on finalize or forced reset. Two-finger pinch may take over from a
one-finger viewport pan/axis scale by clearing that active flag first; divider
and indicator-pane owners are exclusive. Do not rely on callback order between
pan, pinch, price-axis scale, and time-axis scale to decide who wins.

**Icon rule:** There is exactly one icon language, and it is already defined. Never
use emoji, system glyphs, font icons, or a bespoke inline SVG for chrome.

- **Native:** `<NativeDrawingIcon name="..." />`, whose paths come from
  `src/drawings/icons.ts` (`DRAWING_ICONS`). This is what the left tool rail,
  selection toolbar, and layout selector already use.
- **Web:** the `icons` helpers in `src/ui/dom.ts`.

The two registries are intentionally the same Feather-style 24x24 stroke set, so a
given concept looks identical on both platforms — `gear` exists in both, for
example. If an icon you need is missing, **add it to both registries** and use it
from there; do not inline a one-off path at the call site, and do not reach for a
character like ⚙ because it is quicker. A stray emoji renders at the system font's
weight and colour and immediately looks foreign next to the real chrome.

**Key classes:**

| Class                 | File                                  | Purpose                                                            |
| --------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| `TealchartWidget`     | `src/TealchartWidget.ts`              | TradingView-compatible widget (factory: `createTealchartWidget()`) |
| `TealchartApi`        | `src/TealchartApi.ts`                 | Per-chart API: symbol, interval, trading lines, studies            |
| `TealchartRenderer`   | `src/TealchartRenderer.ts`            | Pure canvas rendering (~1500 lines, no React state)                |
| `PaneManager`         | `src/rendering/PaneManager.ts`        | Unified pane layout — main chart and indicator panes               |
| `TealscriptManager`   | `src/tealscript/TealscriptManager.ts` | Web Worker lifecycle for tealscript indicators                     |
| `GapDetectionManager` | `src/GapDetectionManager.ts`          | Detects bar data gaps, auto-recovery with backoff                  |

**Indicator output axis labels:** Missing Pine `indicator(precision=...)` means
"unspecified", not a fixed decimal count. Indicator readouts in every pane inherit
the instrument tick precision from `RenderOptions.pricePrecision`; the range-based
magnitude ladder is a fallback when that context is unavailable. Apply this only
while formatting text. Never round or clamp stored plot values to make labels tidy.

**Pine numeric display surfaces:** `plot`, `plotshape`, `plotchar`, `plotarrow`,
`plotbar`, and `plotcandle` independently consume pane (1), Data Window (2),
status line (4), and price scale (8) bits. Pine `display.all` is 31. The web
legends and opt-in expandable Data Window show values at the hovered source bar (latest
on mouse leave). `show_last` masks earlier values as na; drawing offsets do not
rewrite the underlying readout series. Candle/bar
readouts contain four OHLC values. Plot-level format/precision override declaration
defaults; `format.volume` intentionally ignores precision. Numeric marker readouts
use `displayValues` so false/zero remain visible as 0 even when no marker is drawn.
Price tags use all six numeric types, with `force_overlay` routed to the main axis.
Color, level, and fill outputs support only `display.all`/`display.none`, not
numeric readouts. Native legends consume the same numeric readout helper for status lines and
the per-study Data Window. The legend owns its selected source index: a UI
reaction changes it only when the crosshair moves to another loaded bar, and
resets to latest when hidden. This updates the React Native overlay without
putting crosshair state in the chart owner. Data Window controls report measured
layout into the legend's gesture suppression zones; the window uses the shared
native floating Modal. Titles label its rows and accessible status values. Native price tags also consume
`scalesProperties.showStudyPlotLabels` through the shared render option; the
default is false, and enabled titles participate in tag width measurement.

**Pine title labels (web):** The Scales setting “Indicator Name Label” persists
as the canonical boolean `scalesProperties.showStudyPlotLabels`. It prepends
authored output titles to numeric price tags and participates in normal axis
width measurement. The default is false; layout loads must explicitly forward
that false when the next layout omits the setting, because renderer option
updates merge. Unchecked tags remain numeric; display.price_scale is still
required. Preserve the boolean in imported/exported layouts.

**External Pine plot sources (web):** Settings Source dropdowns show authored
`plot()` titles from other managed scripts, including display.none and hidden
providers. Persist the stable script/plot binding string, not its title or
sample array. The manager sends a `plot-source` sample descriptor through the
existing inputs payload, waits for provider results, recalculates dependents
when providers change, and cascades removal through the widget’s persisted
indicator cleanup (including its study/instance maps). Cycles are refused. `addScript` on an existing id only swaps the worker: it
must not call `removeScript`, whose cascade and `onScriptRemoved` delete the
indicator and its dependents from the saved layout on every source edit. Source inputs
read unshifted source samples, including na and history. Other numeric plot
families are not offered without explicit authority for their source eligibility.
Source refreshes retain the last plots and drawings only while a replacement
result is pending. A completed provider missing the selected plot or a fatal
consumer/provider error clears visuals through all descendants and retires blocked
descendants' workers; valid provider results or builtin-source edits recover them.
Only direct dependents refresh; each consumer has one refresh in flight
and coalesces intervening provider results into one follow-up full recalculation.
Input edits during a source refresh join that queue and retain consumer visuals.
Mobile removal callbacks also clean dependent indicator entries, panes and caches.
Replacing a mobile script swaps its worker in place while preserving visibility,
inputs, styles and pane placement; replacement must not cascade-remove dependents.

**Host indicator catalogs:** Tealchart's picker owns the built-in categories, but
hosts may pass `customTealscriptIndicators` plus `additionalIndicatorCategories`
for user-authored or host-specific catalogs. Keep those categories neutral:
Tealchart renders them only when matching indicators are available and must not
hardcode Tealstreet-only buckets into `builtinIndicators.ts`.
Hosts can register New Indicator and custom-source Edit actions through
`setCustomIndicatorEditor`. The shared picker closes before invoking those
callbacks; editing does not also add an indicator. Source storage and the
editor remain host-owned, and hosts must clear callbacks on unmount.
Custom-source catalog edits recompile existing study IDs in place, retaining
inputs, styles, visibility and panes. Explicit overlay changes move the existing
indicator; delayed adds and restores reconcile with the newest source only
while their widget and layout generation still own the pending study.

**TealScript drawing outputs on native:** `SkiaTealchart` reads
`MobileIndicatorManager.getDrawings()` on the plot revision (drawing updates
advance that revision too) and passes them through `NativeChartCanvasLayers` to
`NativeTealScriptDrawingLayer`. All six families (line, label, box, table,
polyline, linefill) use the same pure `paintTealScriptDrawings` function,
coordinate helpers and pane routing as web. The native adapter lives in
`mobile/render/nativeTealScriptDrawings.ts` and `nativeDrawingContext.ts`.
The picture is derived on the UI thread from the live viewport and pane range
overrides; it recomputes pixel geometry, so stroke widths and arrowheads do not
stretch during pan/zoom. Static projection holds use the held viewport.
Labels use shared font normalization with native font host objects prepared on
JS, including numeric sizes, monospace, bold/italic and multiline layout.
`TealScriptDrawingText` distinguishes label sizes from box/table sizes, and
native font preparation must include that family in its cache key. The shared
worklet painter also owns zero-as-auto table dimensions, interpolating closed
curves, arrow label shafts and outlined text. Native `strokeText` uses the same
font metrics and glyph origin as `fillText`, with Skia stroke paint before fill;
outlined labels do not need offset text copies. Web tooltip targets are collected
through an optional painter callback owned by the JS renderer; native omits it
so mutable web hover state never enters a UI worklet closure.
Boxes reuse web border/extension and wrapped-text alignment/padding rules.
Tables share all nine anchors, auto and percent sizing, merged-cell skipping
and cell/frame paints with web. Polylines share straight/curved paths,
closure/fill, point coordinate resolution and arrowhead/stroke styles.
Linefills resolve their two handles inside the routed pane and paint beneath
boxes, polylines, lines, labels and tables, in web order. The inherited
trace-undetermined label clamping/table sizing rules remain in
`pineVisualNormalizationRegister.ts`; native support does not resolve those TV
raster questions. `nativeDrawingWorklet.test.ts` exercises serialized mobile
Babel worklets as well as ordinary Skia draw-call tests. Interactive user
drawings remain in `NativeUserDrawingLayer`.
Serialized-worklet test loaders must preserve the plugin's `__closure` container
shape (named object or indexed array) while recursively materializing imports.
Turning an array closure into an object fails before the UI body can paint.
Native TealScript indicator colors are passed to Skia as strings; the installed
Skia CSS color parser supports `#rrggbbaa`, and
`NativeWebIndicatorRendererDifferential.test.tsx` guards eight-digit alpha
preservation across plot, fill, bgcolor, barcolor, plotshape, plotchar,
plotarrow, plotbar, and plotcandle.
`src/mobile/generatedTealscriptWebViewRuntimeHtml.ts` is a checked-in generated
bundle of the TealScript worker runtime. Regenerate it with
`yarn workspace @tealstreet/tealchart build:mobile-tealscript-runtime` after
TealScript runtime/codegen changes that must reach mobile. As of 2026-09-12,
no CI/test freshness gate was found for this artifact; checking for runtime
symbols in the committed bundle is manual until a gate is added.

**Pine plot widths:** Histogram `linewidth` is its width in pixels, even when
wider than a bar slot; columns ignore `linewidth`. Cross/circle marker sizes
remain relative to `linewidth`, but `join=true` uses a one-pixel joining line
on both web canvas and native Skia.

**Native study styles:** The native legend offers a Style sheet when a study has
editable outputs. The sheet labels rows by plot title, omits `editable=false`
outputs, and saves only user changes. Native manager style views preserve raw
worker arrays so Reset to script restores dynamic colors, and style changes
advance the plot revision as well as the indicator revision. Barcolor overrides
retain the aligned color array and its na slots, which the candle painter
requires. Locked outputs ignore incoming overrides and are excluded from newly saved overrides. The
sheet uses the shared floating Modal, while its measured legend gear suppresses
canvas gestures. Hex color edits retain incomplete local text without sending
invalid Skia colors; palette choices and valid hex values update the draft.

**Pine OHLC drawing adapters:** Keep supplied `openValues`, `highValues`,
`lowValues`, and `closeValues` available to numeric readouts. The shared web
OHLC painter derives its upper/lower stem from the maximum/minimum of all four
finite samples; open/close still define body or ticks. If any sample is missing
or nonfinite, suppress the whole glyph. Projection must not rewrite the packet
arrays. Legacy and unified routes use the same painter. This preserves the
previous on-screen geometry as engine output moves to raw, individually supplied
OHLC fields. Pane scaling also excludes incomplete quartets so suppressed bars
cannot stretch the visible range. This is a status-quo preservation adapter;
`MobileIndicatorManager` uses shared `getPlotOhlcGeometry` to scan only complete
quartets within `show_last`, retaining raw fields for readouts and the existing
native glyph adapter.
TradingView-specific geometry remains unsettled pending v4 screenshots. Numeric
CSV evidence alone does not establish glyph geometry.

**Pine locked styles:** Outputs with `editable=false` are omitted from the
indicator Style controls, including fills, levels and color outputs. The modal
also filters locked plots out of saved/default style overrides, so opening and
applying settings cannot introduce an override for a locked output.

**Pine bar offsets on web:** Plot points and axis-guide source times resolve
`sourceIndex + offset` against loaded bars, including session gaps. Only targets
outside loaded history extrapolate from the nearest end's interval. Fills sample
each boundary at `destinationIndex - boundary.offset`, including hidden
boundary plots; they must follow the plotted geometry rather than source time.

**Pine plotchar glyphs:** An explicitly empty `char` hides the glyph while
leaving any `text` visible. Only an omitted `char` selects the default glyph.

**Pine tracking lines on web:** `trackprice` uses the latest finite source
value, independent of shifted plot position and viewport time. Its residual
one-pixel dotted line survives `show_last=1, offset=-99999`. Price tags come
through the ordinary `display.price_scale` consumer, never through `trackprice`.

**Pine hline colors:** An omitted color defaults to gray; explicit `color=na`
is an empty color output and paints no horizontal line on web or native. Hidden
levels remain available as fill boundaries.

**Pine gradient fills:** `PlotOutput.gradient` carries per-bar stop
values/colors. Canvas creates a vertical gradient at those stop values and uses
the two boundary plots/hlines as its polygon mask. `fillgaps` defaults to false;
true bridges missing boundary values. Gradient stops do not contribute to the
mask geometry. TradingView native capture CF011 (v2 batch8 visual PNG)
confirms gradient fills between hline handles: use each hline `price` as the
mask boundary even when its values array is empty or its own display is hidden.
Keep stop100/red above stop0/blue and clip the paint to the handle mask; the
web behavior suite covers both legacy and unified indicator-pane routes.
`WebCanvasContext` exposes gradients; adapters without that API
omit gradient painting. Native Skia uses the same stop values/colors and polygon sampling, with a vertical
`LinearGradient` shader inside the boundary path. Equal stop values paint
transparently, matching Canvas degenerate gradients.

**Pine visual normalization register:** Renderer-side Pine normalizations whose
TradingView behavior is not documented live in
`src/rendering/pineVisualNormalizationRegister.ts`. Keep unresolved visual
questions there rather than only in audit prose. The current trace-undetermined
entries cover label price-coordinate clamping, area fill alpha normalization,
plotarrow height flooring/reordering, table explicit width/height invalid-input
normalization, and `plotshape`/`plotchar` `textcolor=na` fallback. Do not turn
these into behavior fixes or quiet assumptions without a TradingView trace.

**Pine drawing text sizes:** `TealScriptDrawingRenderer` uses distinct documented
font maps: labels tiny/small/normal/large/huge are approximately 7/10/12/18/24px;
box and table text use 8/10/14/20/36px. Positive integer strings are pixel sizes.
Do not share the label map with table measurement or box wrapping; their font
and line-height calculations must agree with the font used to paint text.

**Table dimensions:** A cell width or height of zero selects automatic text
measurement, just like omission. Positive dimensions are percentages of the
pane's drawable space; explicit columns/rows still take precedence over auto
measurements in other cells. Invalid-input normalization remains in the visual
normalization register.

**Curved polylines:** Supplied points are interpolation points, not quadratic
control points. Each cubic segment ends at the next supplied point; closed
curves include a curved last-to-first segment with periodic tangents. The local
Catmull-Rom kernel satisfies point passage but is not a certified TradingView
spline match; its exact kernel remains in the visual normalization register.

**Script drawing tooltips:** Label bodies/text and table cells record their
painted rectangles during the drawing pass. Hit targets are clipped to the pane
and chart area; merged cells expose only the leading cell's tooltip over the
whole merged span. `ChartCore` paints the hovered tooltip on the crosshair
canvas, so cursor movement does not repaint plots. The renderer replaces targets
on each content draw, clears absent/removed/collapsed panes, and retains targets
through axis-only passes. Runtime tooltip setter updates follow the normal
drawing invalidation path.
Hosted content passes use the same pane retirement and replace visible tooltip
targets on every redraw, including empty drawing output. Removed or collapsed
hosted panes cannot retain hover targets.

**Arrow label styles:** Arrow labels have both a head and shaft; they must
not share the triangle-label branch. Shaft proportions are local approximations,
not a TradingView raster-dimension certification.

**Horizontal label pointers:** `label_left` places its body to the right of the
anchor, while `label_right` places it to the left. A gap separates the anchor
from the body, and the triangle base attaches to the nearest body edge. Web and
native share this layout and path; exact spacing and glyph pixels remain unpinned.

**Corner label pointers:** `label_lower_left` and `label_lower_right` place the
body above the tip; `label_upper_left` and `label_upper_right` place it below.
Left/right controls which side the body extends toward, and the pointer base
attaches to the body edge nearest the tip. This topology follows the official
Text and shapes illustrations and is shared by web and native; exact glyph
dimensions and boundary clamping remain unpinned.

**Outlined label text:** `text_outline` is anchored text without a rounded
label body: paint a stroke in the label's `color`, then fill the glyphs in
`textColor`. Web uses `strokeText`; canvas adapters without it use a one-pixel
text halo. Outline thickness is a local approximation, not a TradingView raster
dimension certification.

Order drag handlers read the cached group's current projected line Y when a
gesture starts. Scale/pan updates translate cached groups without rebuilding
listeners, so their creation-time Y must never seed a new drag. Cancellation
restores the saved node-local Y; a zero-distance drag never submits an amend.

## Directory Structure

```
src/
├── TealchartWidget.ts          # TradingView-compatible widget class (entry)
├── TealchartVanilla.ts         # Vanilla JS entry point (non-React)
├── TealchartApi.ts             # Per-chart API (symbol, interval, lines, studies)
├── TealchartRenderer.ts        # Pure canvas rendering (no React state)
├── GapDetectionManager.ts      # Gap detection + auto-recovery
├── constants.ts
├── index.ts / index.native.ts  # Package entries (web / React Native)
├── core/
│   └── ChartWidgetCore.ts      # Shared widget core used by both platforms
├── react/
│   └── VanillaChartReact.tsx   # React wrapper for the vanilla widget
├── mobile/                     # React Native / Skia implementation
│   ├── MobileIndicatorManager.ts
│   ├── render/                 # Passive native frame/projection helpers
│   └── utils/                  # Passive native coordinate/trade-line helpers
├── ui/                         # Plain-JS/DOM UI layer (NOT React)
│   ├── ChartCore.ts            # Canvas + Konva interactive lines
│   ├── ChartTopBar.ts          # Timeframe selector + indicators + layouts
│   ├── ChartLegend.ts          # Indicator legend + visibility toggles
│   ├── ChartSettingsModal.ts       # Chart settings gear modal (registry-driven)
│   ├── ContextMenu.ts
│   ├── IndicatorsModal.ts
│   ├── IndicatorSettingsModal.ts
│   ├── LayoutSelector.ts
│   ├── Modal.ts                # Modal primitive
│   ├── DomManager.ts
│   ├── Component.ts            # Base UI component
│   └── dom.ts
├── rendering/
│   ├── PaneManager.ts          # Unified pane system (main + indicator panes)
│   ├── CanvasContext.ts        # Web canvas adapter
│   ├── SkiaCanvasContext.ts    # Mobile Skia adapter
│   ├── WebCanvasContext.ts
│   └── RenderScheduler.ts
├── settings/                   # Declarative chart settings control registry
│   └── chartSettingsControls.ts # Shared by the web modal + native overlay
├── state/                      # Nanostores chart state
│   ├── chartState.ts           # Per-chart stores + persistent UI preferences
│   ├── ChartApiContext.tsx     # Context provider for TealchartApi
│   ├── indicatorActions.ts     # Indicator CRUD helpers
│   └── safeDeepMerge.ts        # Handles corrupted localStorage
├── interaction/                # Drag/click state machines, event manager,
│   │                           # price line manager (shared web+mobile)
├── viewport/                   # ViewportController + viewScale + AutoScaleManager
├── indicators/
│   └── builtinIndicators.ts    # Registry of tealscript-based indicators
├── jailbreak/                  # Tealscript runtime bridge (computeCandleCoordinates etc.)
├── tealscript/                 # Tealscript integration
│   ├── TealscriptManager.ts    # Web Worker lifecycle management
│   └── useTealscript.ts        # React hook
├── transformer/                # TradingView layout interop (bidirectional)
│   ├── chartProperties.ts      # Canonical TV chart-property placement
│   ├── toTvFormat.ts           # CustomChart → TradingView layout
│   ├── fromTvFormat.ts         # TradingView → CustomChart
│   ├── indicatorMapping.ts     # Study ID mappings
│   └── README.md               # Detailed transformer docs
├── events/EventEmitter.ts      # Pub-sub + Subscription class
├── debug/TealchartLogger.ts    # Ring buffer logger with categories
├── hooks/                      # React hooks (useMobileTapHover)
├── utils/                      # labelCollision, safeNumber, syncPromise
└── i18n/                       # Internationalization context provider
```

> **Note:** there is no `components/` directory at `src/` root. Web UI
> lives in `ui/` (plain JS/DOM, NOT React), and the native chart currently
> uses root `SkiaTealchart.tsx` plus passive helpers under `mobile/`. The
> only React-adjacent code is `react/VanillaChartReact.tsx`,
> `SkiaTealchart.tsx`, and `state/ChartApiContext.tsx`.

## Native Skia Runtime Rules

The native chart is React Native at the shell, but the chart runtime is not a
React lifecycle control loop. Treat Skia/Reanimated gesture, viewport, pane,
crosshair, and axis state like web's imperative canvas runtime:

- React lifecycle hooks may mount/unmount resources, subscribe/unsubscribe,
  push host props into shared values, and perform non-correctness cleanup.
- React lifecycle hooks must not decide when an active chart interaction
  preview is released. Gesture preview release is chart correctness state and
  belongs in explicit runtime state machines keyed by the interaction that
  produced the preview.
- Gesture handlers follow this protocol: hit-test/accept on touch-down, mutate
  shared preview on update, record a committed target on end, and make finalize
  cleanup-only after a commit. Android may report `finalize(success=false)`
  after a committed end; that must never roll shared values back to the
  gesture-start state.
- Secondary-pane range drags and pane divider drags are not special cases. They
  need the same begin/update/commit/observe/release semantics as the primary
  viewport. Do not patch them with `requestAnimationFrame`, `setTimeout`, or
  layout-effect timing guesses.
- Shared values are the transport for live preview state. React state/frame
  updates are the committed model catching up. Render helpers must be able to
  bridge that handoff deterministically from current frame data rather than by
  waiting “a frame or two.”

`src/mobile/interaction/nativeLifecycleBoundary.test.ts` enforces the strictest
part of this rule for the core gesture/preview modules. If a future change needs
a lifecycle hook in one of those files, the architecture is probably drifting;
move the policy into a runtime helper instead.

The pane divider's release preview is the one sanctioned exception, and it is
sanctioned because it was earned rather than assumed: four release-timing
attempts failed before it, and the reason no state machine can decide this one
is written up under **One commit, two channels**. Its fence is a presented-frame
count read inside the draw pass, not a lifecycle hook, and the `setTimeout`s
beside it are a disposal delay and a freeze ceiling - neither is the release
path. Do not read it as licence for the next one.


## State Management

Uses Nanostores-backed, chart-keyed stores for chart state and UI preference persistence:

```typescript
// Per-chart stores created via factory
getChartStore(chartKey).settings → chart settings store
getChartStore(chartKey).uiPreferences → shared UI preference store
```

- Schema versioning via `CHART_SETTINGS_VERSION` with migration system
- `safeDeepMerge` handles corrupted localStorage gracefully
- Legacy helpers such as `createChartFocusAtoms` and `getChartSettingsAtom` remain compatibility wrappers; new code should use `getChartStore`.
- UI chrome preferences must use `getChartStore(chartKey).uiPreferences` and the `TealchartKeyValueStorage` contract. Web defaults to `createLocalStorageKeyValueStorage()`, while native hosts pass `createAsyncStorageKeyValueStorage(AsyncStorage)` through `SkiaTealchart.uiPreferencesStorage`.
- Do not read or write `localStorage`, `AsyncStorage`, or cwd-scoped memory directly for Tealchart UI settings. Add preferences to `ChartUiPreferences`, normalize them in `chartState.ts`, and test both sync and async storage hydration.
- `rightSidebarCollapsed` defaults to false and stores the linked TradingView website rail visibility independently from `leftToolRailCollapsed`. Unsupported hosts retain the preference without creating a rail; old or invalid saved values normalize to the default, and asynchronous hydration uses the existing shared store subscription.

## Tealscript Integration

**Planned convergence — read [`MOBILE_RUNTIME_v1.md`](MOBILE_RUNTIME_v1.md)
before changing backend selection, `MobileIndicatorManager` execution, or the
worker message protocol.** Tealchart is converging on a single execution
backend (`compiled`), with mobile hosting it in a hidden WebView instead of
executing inline on the React Native JS thread. That doc records why, the
loading contract (candles never block on the runtime), the `na`/`NaN`-across-
JSON bridge hazard, and the one unproven step.

1. User selects indicator → `TealchartWidget.createStudy()`
2. `TealscriptManager` creates a Web Worker with the indicator code
3. Bar data pushed to worker → plots returned
4. Overlay indicators render on main pane; non-overlay get dedicated panes
5. Requires factory function `createTealscriptWorker()` from the consuming app

TealScript worker imports and request data are host-owned seams. Pass
`getTealscriptLibraries` for deterministic Pine library ASTs and
`resolveTealscriptRequestData` for serializable `request.*` cache misses; the
manager must answer every `requestData` worker message, including a typed
`missing-provider` result when no resolver is configured, so scripts do not hang
waiting for data that cannot cross structured clone.
TealScript backend selection is host-configurable. Web/worker paths default to
compiled. Native must not run TealScript inline after the compiled-only cutover;
it should host the compiled worker model in a hidden WebView. Keep
`RuntimeProfile.selectedBackend` visible alongside the actual `executionMode`
because runtime routing can make those differ.
Tealscript user-facing diagnostics carry a structural taxonomy: true parse,
semantic, worker, and `runtime.error` failures use `severity: 'error'`;
provider-data absence uses `severity: 'warning'` with stable code
`request-data-unavailable`. Compiled realtime unsupported constructs are fatal:
the worker reports `severity: 'error'`, preserves `RuntimeProfile.fallbackReason`
and `fallbackDiagnostics`, and clears script output. UI should branch on `type`,
`code`, profile fields, and `severity`, never on message wording.
Tealscript execution observability is host-owned but Tealchart is the
per-execution summary boundary. `TealscriptManager.onExecution` fires only for
accepted worker results and runtime halts after stale responses have been
discarded. Keep that
summary compact: backend selected, backend actually run, timing/profile counts,
request kind, output counts, and closed unsupported family. Do not add source text,
script code, traded symbols, line/column, or raw unsupported diagnostics to the
execution summary; web Sentry telemetry must be able to report runtime health
without receiving private Pine or instrument identifiers.
Native TealScript execution uses the hidden-WebView compiled host. The runtime
is a self-contained bundled HTML asset in this package; do not replace it with
a hosted URL or make consumers host TealScript code. `react-native-webview` is
an optional peer/dev-only dependency, never a runtime dependency for web
consumers. If a native caller constructs `MobileIndicatorManager` without a
worker factory, TealScript studies must fail loudly instead of executing inline.
The measured native TealScript capability baseline lives in
`src/mobile/mobileTealscriptCapabilityBaseline.ts` and is pinned by
`src/mobile/MobileIndicatorManager.test.ts`: custom source save, plot/drawing
handoff, pane metadata, parse/runtime diagnostics, imported Pine libraries, and
request-backed scripts are supported when the native host supplies the relevant
seams (`getTealscriptLibraries` and `getTealscriptRequestDatafeed`). Request
scripts without a native provider still emit a visible
`request-data-unavailable` warning. On realtime ticks `ChartWidgetCore` calls
`MobileIndicatorManager.updateBar`, which only posts the bar to the hidden
WebView that owns compiled execution off the React Native JS thread; the chart
hears nothing until the worker's result arrives.

Tealscript render routing carries `indicator()` declaration `format`,
`precision`, and `scale` into the pane-info map. Plot-level format/precision
override declaration defaults for output-axis labels, while `scale.none`
suppresses those labels.

Tealscript visual rendering covers both web canvas and native Skia for
`plot`, `plotbar`, `plotcandle`, `plotarrow`, `hline`, `fill`, and `bgcolor`.
`plotbar`/`plotcandle` skip a bar when any OHLC value is `na`, and native
Skia batches those OHLC and arrow primitives by resolved per-bar color instead
of allocating one path per bar.
OHLC output arrays retain the supplied raw values. The native draw adapter
uses the maximum/minimum of all four finite fields for the spine/wick, preserving
the geometry formerly normalized by the producer without rewriting readouts.
This preserves existing rendering; inconsistent-OHLC TV geometry still requires
visual capture evidence.
Native `plot` paths close every area island using the shared baseline geometry,
break joined point-marker lines at `na`, retain color alpha without additional
histogram opacity, and use rounded line caps/joins. `trackprice` adds a one-pixel
dotted residual line at the latest finite value in the full history (subject to
`show_last` and the latest color), including historical views; axis readouts are
handled separately. Live and static plot paths follow the same rules.
Native `hline` defaults to gray dashed paint, preserves invisible colors, skips
out-of-range levels, and clips to its routed pane; the clip follows the same
live or static channel as the path.
Native base-candle `barcolor` evaluates `show_last` against the full source bar
count supplied by the canvas owner, rather than the currently visible slice.
The native host preserves declaration format/precision/scale and
`explicit_plot_zorder` in its pane-info handoff. Native paints default fills
beneath each script's plots/levels; explicit plot order sorts that script's
plots, fills and levels by their recorded call order.
Native fills share pure boundary sampling and quadrilateral geometry with web.
Each boundary is sampled at destination index minus its own offset, including
hidden levels/plots and each boundary's `show_last`; the fill independently owns
its `show_last` and pane route. Color transitions retain the connecting quad,
`fillgaps` defaults false, and invisible/invalid gradient stops break islands.
Native batches identical paints and derives live paths, clips and gradient stops
on the UI thread; static holds use their frozen projection for all three.
Native `bgcolor` uses its own `force_overlay`/study-pane route and `show_last`
window. Live rectangles derive their coordinates and pane geometry on the UI
thread, while snapshot rectangles retain the frozen projection.
Native numeric plot offsets select source bars before culling and use the shared
bar-index time resolver, so loaded gaps and endpoint extrapolation match web.
Projected marker bars retain their source index/OHLC and carry the shifted time;
the painter receives offset zero to avoid applying it twice.
Web and native marker glyphs share `plotMarkerGeometry.ts`: vertices, rounded
label bounds, and separate fill/stroke parts. Native flags retain their stems,
crosses use two-pixel strokes, and text is centered with font metrics, per-size
fonts, and shared multiline offsets. Marker text follows pane clipping and UI
viewport visibility even when the marker body color is `na`.
Native `plotchar` prepares a separate body font at `max(10, size*2)` and keeps
that centered glyph on the middle baseline; its optional marker text uses the
shared text font/line layout. An explicit empty `char` suppresses only the body.
Native `plotarrow` uses the shared web glyph, excludes `na` body colors from both
painting and magnitude normalization, and derives the visible maximum on the UI
thread so arrow heights update during gestures.
`src/rendering/tealscriptRenderingBehavior.test.ts` is the named web-canvas
render-command matrix for TealScript output behavior: plot styles, per-bar
colors, transparency, fills, OHLC/arrow skip rules, overlay-vs-pane routing,
axis label scale/precision, and drawing command order/styles. Keep broad pixel
snapshots for regression smoke coverage, but add new user-visible TealScript
render semantics to that matrix so failures name the broken behavior directly.
New rendering parity checks must reuse the shared TealScript output comparator
rather than introducing a second definition of equivalent output.
Visual snapshot tests may write `__visual_snapshots__/*.diff.png` actual-output
comparison artifacts when PNG bytes differ; those files are generated diagnostics
only and are ignored locally. Do not promote a `.diff.png` into a baseline or
refresh a tracked `.png` without deciding whether the old or new rendering is
correct.
The visual snapshot harness currently allows up to 8% differing pixels before
failing. That is intentionally unchanged here, but it is a loose smoke-test
threshold: after the T54 render differential work, existing tolerated drift was
measured at 3.63% for `composite-macd` and 4.87% for `histogram-basic`, so a
new 5% render regression could still pass. Tighten that harness only after
accounting for the existing drift; do not refresh baselines just to make the
number smaller.
`src/rendering/visualSnapshotDriftBaseline.ts` turns tolerated drift into
committed data for the renderer platform that produced it. Exact pixel drift is
not stable across every `@napi-rs/canvas` platform: macOS and Linux can render
different under-threshold PNG bytes from the same draw commands. The snapshot
tests still use the global 8% failure threshold on every platform, so CI catches
gross visual regressions everywhere. The per-snapshot drift ratchet is enforced
only on platforms that have committed baseline entries; on platforms without a
recorded renderer baseline, under-threshold drift is tolerated because exact
pixel counts would be platform noise rather than a reviewable semantic signal.
The committed baseline includes `darwin` entries from local macOS rendering and
`linux` entries measured on CI, so the ratchet now enforces both on developer
Macs and on the platform that gates merges. If Linux drift moves, raise the
Linux entries from a Linux measurement (Docker or CI), not by widening the
threshold, deleting the ratchet, or regenerating whichever platform happens to
be local.
**The `linux` entries are a CEILING across TWO CI hosts, and
`assertVisualSnapshotDriftMatchesBaseline` compares `differingPixels` with `>`
for exactly that reason.** This monorepo gates on `runs-on: [self-hosted,
tealstreet]`; the `Tealstreet/tealchart` mirror gates the same source on
`ubuntu-latest`. Their font stacks rasterise glyphs differently, so the same
five text-bearing snapshots measure different pixel counts on each, while
`process.platform` says `linux` on both and cannot tell them apart. An exact
ratchet is therefore unsatisfiable: on 2026-09-17 the mirror's numbers were
committed there, Copybara carried them here on 2026-09-20, and master went red
for a day on five tests that had been green — the same trade in reverse had
reddened the mirror three days earlier. Under a ceiling one entry satisfies
both hosts, holding the higher of the two measurements. Never regenerate the
`linux` entries wholesale from one host's run: that lowers the ceiling to that
host and re-breaks the other. Raise a single entry by hand when a host measures
above it, and say which host measured it.
Regenerate platform drift deliberately with
`yarn workspace @tealstreet/tealchart visual:snapshot:drift` only after running
the snapshot tests that produce `.diff.png` diagnostics; if the numbers move,
the commit message must explain why the drift is accepted. This is a ratchet for
visibility, not permission to refresh PNG baselines or loosen the threshold.
A `.diff.png` with `0` differing pixels after channel tolerance still means the
PNG bytes changed on that renderer platform, so it belongs in that platform's
committed drift baseline rather than being silently ignored.
Use `yarn workspace @tealstreet/tealchart test-ci` as the pre-push visual
snapshot gate. It currently delegates to `test-unit`, but CI runs `test-ci`, and
that name is the contract to preserve if the package scripts diverge again.

The indicator picker is capability-aware: Tealscript indicators are only offered
when `createTealscriptWorker` is supplied, and jailbreak indicators are only
offered when that indicator's `jailbreakIndicatorFactories[id]` factory is
supplied. This keeps runtimes like v2 from showing indicators they cannot
execute.

Built-in indicators defined in `builtinIndicators.ts`: SMA, EMA, RSI, MACD, Bollinger Bands, etc.

## `_loadBars` must re-subscribe on FAILURE too

The datafeed's `onResetCacheNeededCallback` is **one-shot per subscription**, and
honouring it is what ends that subscription's lifecycle: a fresh `subscribeBars`
registers a fresh, re-armable reset. Our reset callback is `_loadBars()`, so if a
failed history load returns without reaching `_subscribeToBars()`, the old
`listenerGuid` is stranded with its reset already spent — the host's
`forceResetCacheCallbacks()` becomes a permanent no-op for that chart, and its
kline listener stays bound to whatever exchange object the account reload
disposed. The symptom is a chart that looks fine and never ticks again, only on
the second reconnect, only after a venue hiccup.

So the error callback re-subscribes — **only for the reset callers**, via
`_loadBars(resubscribeOnError)`. There are TWO of them, and missing the second
made the first useless: the host's reconnect calls `forceResetCacheCallbacks()`
*and then* `resetData()`, so `resetData` -> `_handleResetData` ->
`_startDataLoad({reason:'reset'})` begins a second transition behind the reset
callback's own load. `_startDataLoad` therefore passes the flag for
`reason === 'reset'` too — and it is that request which actually survives a
reconnect.

**The superseding is on the RESOLVE generation, not on `_loadBarsRequestId`
alone**, and the distinction is load-bearing rather than pedantic.
`_startDataLoad` bumps `_resolveSymbolRequestId`; the only bump of
`_loadBarsRequestId` is inside `_loadBars` itself, reached after an async
`resolveSymbol`. So for as long as that resolve is in flight the earlier
request's `_loadBarsRequestId` still matches, and if getBars settles first — which
`cachedFetchOhlcv` makes ordinary, since the cache can answer while resolveSymbol
is still polling a cold exchange for markets — the superseded request writes its
bars, calls `_setReady()` and re-subscribes behind the transition. `_loadBars`
therefore captures `_resolveSymbolRequestId` as well and checks both. This
paragraph previously credited `_loadBarsRequestId` with the whole job; it did not
do it, and the outcome was benign only because the later `_subscribeToBars`
happened to unsubscribe the resurrected subscription.

**`_startDataLoad`'s own two failure exits re-subscribe too**, through
`_restoreSubscriptionAfterFailedReset`. It unsubscribes and nulls
`_barSubscriptionGuid` at the TOP, so `!symbolToResolve` and a `resolveSymbol`
that errors each leave the chart with nothing — and on a reconnect the
replacement exchange has an empty market list, which makes `resolveSymbol` the
likeliest thing to fail of the two. Same narrow scope as above: `reason`
must be `'reset'`, since a reset re-subscribes the symbol and interval it already
had while a symbol change would bind the new market's ticks onto the old series.

**`ChartWidgetCore` needs the same fix, and it is the one mobile uses.** The
native Skia chart runs on `ChartWidgetCore` (via `useTealchartCore`), not on
`TealchartWidget` — `index.native.ts` deliberately exports no web widget. Its
`_loadBars` carries the same parameter and its reset callback passes `true`.
`unsubscribeBars` lives inside `_subscribeToBars`, so re-subscribing is also what
cleans up, and the reset callback bails unless its subscription is still the
current one, which means the symbol and interval are unchanged and `_bars` belongs
to the market being re-subscribed.

The narrow scope is load-bearing, not caution. `_loadBars`'s other callers are the
init path, `_handleRecoveryNeeded` and `_startDataLoad`; the latter two null the
guid before loading, so they strand nothing. Re-subscribing for all of them would
break two things: on `_startDataLoad`'s symbol/interval change `_symbolInfo` is
already the new market while `_bars` deliberately still holds the old one (that is
what `_barsAreForRequestedMarket` fades) and `_handleNewBar` has no market-key
guard, so the new symbol's ticks would append to the old symbol's series; and
`_handleNewBar` reaches `_handleRecoveryNeeded` directly, bypassing
`_triggerRecovery`'s backoff and retry cap, so a venue serving ticks while failing
history would retry once per tick without bound.

**The web host has a backstop for live bars; mobile does not.** On web,
`DefaultDatafeed`'s `startMonitoring` watchdog re-subscribes its kline listener
after `KLINES_TIMEOUT_MS` of silence, and `useChartSession` drives `resetData()`
on every reconnect regardless — so a stranded guid costs the bars that CLOSED
during the gap, plus the chart's own reset. Neither exists on mobile:
`ChartWidgetCore` has no `resetData` at all (`useTealchartCore` exposes
`setSymbol`/`setInterval` only), and the native datafeed has no equivalent of
that watchdog, which is a `DefaultDatafeed` member. On mobile the same shape is
terminal until the chart remounts, so do not read the web backstop as cover for
both halves — and remember `packages/tealchart` is excluded from `yarn sync`, so
a fix here reaches mobile only through Copybara into its `vendor/tealchart`.

## TradingView Compatibility

Implements TradingView-compatible interfaces:

- `IChartingLibraryWidget` — widget lifecycle (`onChartReady`, `remove`)
- `IChartWidgetApi` — per-chart operations (symbol, interval, studies, trading lines)
- `IOrderLineAdapter`, `IPositionLineAdapter` — trading line adapters
- Layout save/load via `transformer/` (bidirectional conversion)

TradingView is the canonical public API shape. If TradingView exposes an
imperative method on widget/chart/datafeed/order-line/position-line interfaces,
Tealchart must mirror that method name and chaining semantics instead of adding
a React prop, adapter wrapper, or parallel helper API. Tealstreet-only features
such as `setCancelAsSubmit`, compact labels, PnL, TP/SL controls, and bracket callbacks are additive extensions on the same imperative adapter
objects, not a second line API. `src/imperative-contract.test.ts` compares the
Tealchart interfaces against the vendored TradingView declarations; update that
test when TradingView is
upgraded or when a deliberate backwards-compatible extension is added.

Datafeed input follows TradingView's external shape. For example, datafeed bars
may omit `volume`; Tealchart normalizes them at the widget/core boundary before
renderer, tealscript, and Skia paths see the stricter internal `Bar` shape.

Exchange-prefixed symbols (for example `BYBITV5:BTCUSDT`) are resolved with the full string but stored internally as the clean symbol (`BTCUSDT`), including during initial widget construction. A prefix change with the same clean symbol must still reload data so adapters that key by `EXCHANGE:SYMBOL` get fresh symbol info and subscriptions.

Order and position trading-line labels derive their body, quantity, price-label, and action-button colors from `lineColor` using the package defaults in `constants.ts`: blue for buy/unspecified lines, red when consumers supply the default sell/short color, dark low-glare label fills, and filled quantity/PnL-style text on accent segments. Consumers should set semantic line color and line length rather than restyling every label segment. PnL must be passed separately with `setPnl` / `setProfitState`; it is the only label segment that flips to profit/loss color independently of `lineColor`.

The `transformer/README.md` documents the TradingView layout schema in detail.

Official hosted study identifiers (`SMA@tv-basicstudies-278`, or exact builtin
display names in `tv-basicstudies`/`tv-prostudies`) use the same existing indicator
mapping registry as licensed `STD;` layouts. Private/Pine namespaces and approximate
display names are preserved as unsupported sources, never guessed from a name.
The `hosted` entry exports the existing transformer and state types so desktop
adapters can preserve the same saved-chart schema without another storage format.

Editor-created sources without a catalog row carry optional
`IndicatorInstance.inlineTealscript` (`code`, `overlay`) in the existing
`_tealstreetOriginalIndicators` metadata. Hosted saved layouts preserve that
descriptor through save, import and resave, and feed it back to the existing
runtime resolver. Stable builtin/catalog studies keep their identifiers; no
schema migration or native executable source is added. Current parent study
state owns removal and replacement of inline source metadata.

## Commands

```bash
yarn build-force      # Build with tsup
yarn dev-force        # Watch mode
yarn test             # Vitest
yarn typecheck        # tsc --noEmit
yarn lint             # ESLint
```

## Key Dependencies

- `konva` — vector graphics for interactive web trading geometry
- `nanostores` — per-chart state stores and subscriptions
- `jotai` / `jotai-optics` / `optics-ts` — legacy state helpers and nested updates
- `@tealstreet/tealscript` — indicator scripting via Web Workers

## Web + Mobile Feature Parity

**CRITICAL: All features must be implemented for BOTH web (canvas/HTML) and mobile (React Native/Skia).**

When implementing any new feature, always implement it for both platforms in the same PR. Do not ship web-only or mobile-only features. The two platforms share:

- `ChartWidgetCore` — shared bar fetching, indicator management, pane management
- `chartState.ts` — shared state (AVAILABLE_TIMEFRAMES, chart settings)
- `labelCollision.ts` — shared collision resolution for web rendering
- `InteractiveLineState.ts` — shared drag state machine
- `ViewportController` / `viewScale.ts` — shared viewport preservation

Platform-specific rendering:

- **Web**: `ChartCore.ts` (canvas + Konva interactive lines), `EventManager.ts` (mouse/touch)
- **Mobile**: `SkiaTealchart.tsx` (passive Skia canvas) plus pure native frame/projection helpers

When adding features like TP/SL drag preview, crosshair improvements, or new line types — implement for both platforms.

## External chart hosts

The `./analysis` source entry exposes pure loaded-bar snapshots, inclusive
millisecond range selection, normalized OHLC shape similarity and a curated
loaded-bars-only builtin descriptor catalog. It imports no UI, model or fetch
runtime. `TealchartApi.getAnalysisSnapshot` returns at most 500 newest contiguous
bars within the requested range, with clipping and truncation metadata; defaults
use the owner's visible range. Similarity requires a fully loaded 5–500-bar
query, excludes overlapping query windows and scans at most 2,000 newest
candidate windows. Results disclose the searched range/count and scan cap.
Web and native install readers from their authoritative data owners; loading,
stale market, disposal and invalid data return explicit unavailable reasons.
Native reads also wait for held frames and viewport layout to settle.
Snapshots clone only finite OHLCV fields from sorted unique timestamps.
`contextRevision` advances on market/account/reset changes and owner history
generations, retaining a stable identity during ticks and viewport movement.
The package owns no AI provider credentials, prompts, transport or extra history.

`AnalysisSelector` is reusable presentation for external hosts. Frozen frames can
supply ordered millisecond/CSS-pixel candle anchors for native index-based time
scales; affine first-party projections retain their existing path. Hosts can admit
trusted DOM events and synchronously block financial input while selection is
active. Geometry or ownership changes cancel the frozen selection visibly.

`TealchartApi.addBuiltinIndicator(id)` is the awaitable saved-indicator capability.
The web owner uses the picker path, including instance mapping, layout dirtiness,
save/restore and removal through the returned study. Raw `createStudy` retains
its managed-script semantics. Owners without this capability fail explicitly;
native analysis currently has no saved-indicator owner. Runtime replacement
detaches old instance mappings before teardown so restored settings survive.
Layout loading applies render options before creating replacement workers.

`@tealstreet/tealchart/hosted` is the narrow web entry for hosts that supply their
own candles, data, and viewport. It exports the real `TealchartApi` and snapshot
reader, `OemsTradingRuntime`, `PriceLineManager`, shared trading-line assembly,
projected label layout, existing bracket preview draw pass, and canvas adapter.
It does not construct a Tealchart widget or datafeed. External hosts call
`PriceLineManager.cancelDrag()` before clearing a binding, disabling gestures,
or disposing presentation. This reuses Escape cancellation and never commits a
stale drag into the next binding; destroying rendered groups alone leaves the
manager's active-drag ownership latched.

`interaction/OemsTradingRuntime.ts` owns the web OEMS action manager and the raw
versus action-applied line snapshots extracted from `ChartCore`. Both normal
`ChartCore` and external hosts use it. Keep action transitions in the existing
`OemsActionManager`/`oemsLineState`; external presentation must not create a
second pending-action or reconciliation manager. The runtime receives registered
adapter callbacks from its owner. Frame transports keep those functions in the
parent and resolve gestures by the stable adapter ID.

`rendering/priceLineLayout.ts` is the shared measurement/collision/clipping pass.
`TealchartRenderer.computeExternalPriceLineLabelBounds` supplies existing
measurement and grow-only tag widths against a host's actual projection.
Projection coordinates and pane bounds use CSS pixels in the overlay container;
logarithmic/percentage scales must use the host conversion, not a fabricated
linear viewport. `renderExternalCanvasPriceLines` draws only primitives marked
`renderLineOnCanvas`, once, while `PriceLineManager` owns their tags and the other
interactive lines. `rendering/bracketDragPreview.ts` retains the existing draw
pass and inline PnL behavior with injected projection and price-axis rendering.
Registered custom PnL calculators remain callbacks in `TealchartApi`, not
serializable render snapshot fields. `tealscript/timeframeInfo.ts` preserves the
existing widget resolution-to-runtime flags; Hosted and normal widgets both use
`createTealscriptTimeframeInfo` rather than deriving daily/weekly/monthly flags
independently.

`rendering/externalAxisLabels.ts` lets hosts provide native boxed value tags
(last trade, studies, drawings and crosshair) with their original formatting,
colors and projected CSS coordinates. `TealchartRenderer.layoutExternalAxisLabels`
reuses the existing bounded label collision pass and updates supplied OEMS bounds
in place before `PriceLineManager.update`, so presentation and hit tests agree.
Anonymous OEMS bounds retain the collision cache's positional fallback; never
fabricate a shared empty ID, which aliases distinct tags on cache hits and makes
unchanged order stacks jump between cached and fresh passes.
Collision stacking preserves projected Y order, including inverted scales, through
fixed-tag eviction. Ordering passes scale with the label count, and the quantized
cache key includes label rank so subpixel crossings cannot reuse a reversed stack.
`computeExternalIndicatorAxisLabels` reuses existing Tealscript tag eligibility,
formatting, grow-only measured width, font and plot-color border with the host's
value converter; these tags join the same pass. `renderExternalIndicatorAxisGuides`
reuses the normal guide style with exact host bar-index anchors, including plot
offsets. Floating crosshair tags bypass collisions. Ordinary tags sit below
interactive trading geometry; last trade and crosshair use separate foreground
layers, with last trade above trading tags and crosshair above last trade.
`renderExternalAxisLabels` draws only those tags. Native numeric scale ticks stay
host-owned; hosts release native label suppression on clear, model replacement
or canvas failure and apply DPR once to each owned canvas.

`TealchartRenderer.renderExternalOverlayContent` reuses existing main/indicator
plot, drawing, and execution render passes without candles, grids, backgrounds,
or axis chrome. Its projection is scoped to that call and restored even on
failure. Hosts supply real pane bounds, visible-time bounds, native millisecond
`timeToX`, array-relative `barIndexToX`, price/value projection, and positive CSS
pixel bar spacing. Plot offsets and `bar_index` drawings use native index space,
including future slots, rather than time interpolation across market-session
gaps. Callers own the canvas DPR transform. This above-candle pass does not make
behind-candle output or candle recoloring available; hosts must gate those until
they have native draw-order capabilities.


## Line identity (OEMS)

**A line is the adapter it was drawn from.** `createOrderLine()` mints `order_1`,
`order_2`... and returns an adapter that lives until the host removes it. That id
is the line's identity everywhere in the OEMS layer, and it is the only thing
that survives what the venue does.

This is TradingView's model. Its line adapter has no order identity at all — it
is a line at a price, and the venue's id is payload a host attaches, not a name
the chart answers to. `getOemsOrderObjectId` returns `line.id` for exactly that
reason.

**Never key on `orderId`.** On most venues an amend is a cancel and a place, so
the venue's id changes mid-action. Keying on it orphans the pending action the
moment the host re-points its adapter at the replacement, and the chart then
draws a line the host has already retired — beside its replacement. The
precedence `orderId || id` lived in **seven** places: `oemsLineState`,
`PriceLineManager` and `tradeLineLayout`, and four more inside `ChartCore`
(`getBoundTradingObject` twice, `_updateBracketDragState` twice) that survived
the first sweep. Web then started actions under the venue's id and looked them
up under the adapter's, so nothing rendered as pending — and the bracket drag's
`find` failed outright, which is a drag that works with no preview at all.

If you are looking for another one: it is any `find` over `orderLines` or
`positionLines`, and it must compare `getOemsOrderObjectId` /
`getOemsPositionObjectId`, never a raw field. Note that only a host which
actually sets `orderId`/`positionId` shows the symptom, so a fixture that leaves
them undefined passes either way.

**Colour is not identity, and neither is any other styling.** A previous version
hashed `quantity|lineColor` to recognise a replacement. A line whose order is in
flight is faded by the host, so it hashed as `rgba(...,0.4)` and came back as
`rgb(...)`: same order, no match, two lines until a 30s timeout. The logic layer
reads no presentation field, and there is nothing left in it to tempt you.

**Confirmation is still by field.** `confirmState` compares the optimistic state
against what came back, with the price allowed a tick of slack
(`createOemsStateEquals`) — the venue rounds to its own tick and an exact
comparison would never match.

**A bracket the user drags into existence has no order yet.** The optimistic
TP/SL is merged into `brackets` even when the line has none
(`applyOemsBracketActionState`), or it would have nowhere to live. Bracket
*creation* settles on the callback rather than the echo (`settleOnCallback`),
which is deliberate — see `3c84ee37` — because the echo may arrive as its own
order line and never as a bracket on the parent.

### What owns an object

An action owns its object **only while its callback is in the air**. Once the
venue has answered, the action is merely waiting for a snapshot to echo the new
state, and that wait must never cost the user their next gesture: a second drag
supersedes it (`superseded`), and an object that has left the snapshot by then
is dropped (`abandoned`) rather than held to the timeout. Both are restricted to
`awaitingConfirmation` — a callback still in flight owns its object outright, so
a host that clears and rebuilds its lines in one pass cannot cancel it.

**A `confirmsRemoved` action keeps its object either way** — cancel, close and
reverse. It is confirmed by the line leaving the feed, so there is no echo to
give up waiting for, and letting a second click through would submit the same
cancel twice.

That distinction is the whole reason the gates differ. On web, the drag gates
read `isAwaitingCallback` and the click gates read `isPending` in
`PriceLineManager` — cancel, close, reverse, and the click half of the
TP/SL hit rect, which shares one rect with a drag and so is gated separately
inside `dragend`. Gating a drag on `isPending` is the bug this replaced: a
confirmation that never matched left the line refusing every later drag for
thirty seconds.

Native only shares the drag-zone gate (`tradeLineLayout`) and the dim. Its click
path reads action state off the **raw** snapshot, where it is never set, so that
gate is dead code and `startAction` is the only guard that actually holds — and
`startNativeBracketMoveAction` has no gate at all. Do not read
`shouldClear*DragForSnapshot`'s `isPending` as one of these: there it means the
optimistic state now owns the line, which is when the preview may retire.

**Start actions from the raw lines**, never the action-applied ones. Built from
a line that already carries an unsettled action, a new action inherits that
action's guess as a field it must also see echoed — and `confirmState` compares
every field it was given, so the replacement could never confirm either.

**The adapter module is shared.** `interaction/oemsLineState.ts` is used by both
`ChartCore` and the native runtime. It was duplicated once, drifted, and the
drift was invisible because the tests passed `{}` where the render data actually
carries `null`.

### What hosts must do

**Keep the adapter alive across an amend.** Do not remove a line and create
another because the venue reissued its id, or because the set of available
actions changed. Re-point the adapter you already have. Register callbacks
**once**, as closures that read your current line at call time, so a handler
appearing or disappearing never costs you the adapter — glyde's
`bindOrderLineCallbacks` is the reference shape.

A host that destroys its adapter is telling the chart the order is gone. The
chart believes it, because that is the contract. The orphaned action is now
dropped by the same snapshot pass that retires the line, so what a host pays for
breaking this is the churn itself — a remove and a create — and no longer a
replacement line that refuses to be dragged.

### Drag state on native: `active` vs `activeObjectId`

A trade-line drag holds two pieces of state and they retire at different times.

- `active` is **gesture arbitration**. The axis pinch fails outright while it is
  true, and the drag's own touch guard skips its checks. It must fall on the
  frame the finger lifts — `releaseNativeOrderDragGesture` /
  `releaseNativeBracketDragGesture`, called from the commit branch of `onEnd`.
- `activeObjectId` is **the preview**. It survives the gesture so the line keeps
  drawing at the dropped price until the projection carries it, and it is
  retired by `shouldClear*DragForSnapshot`.

Holding `active` until the projection caught up looked equivalent and was not.
When a host removed its adapter instead of re-pointing it, the hand-off never
came, and `active` stranded true forever: no axis pinch, and the next touch
resumed the dead drag rather than starting a new one — a drag that silently did
nothing until something else cleared it.

The hand-off therefore also retires on a line that has **gone**, not only on one
that went pending. `!line` is a terminal state, not a reason to keep waiting.

**An action that fails still has to release the line.** A rejected callback, a
`false`, or a timeout settles the action, and that can happen before any render
sees it pending — so waiting for the pending state waits forever. The preview
then keeps drawing where the user dropped it while its drag zone stays at the
price the venue still holds: the line looks solid and healthy, and every tap
lands on empty chart because it is not where it appears. `commitOrderMove`
records a hand-off so `shouldReleaseNativeOrderDragForSnapshot` can tell "action
gone" from "commit not started yet", which is the only reason that branch is
safe.

The host is not doing anything wrong here — throwing, rejecting, or returning
`false` from `onMove` is the documented way to say a move failed, and the action
layer honours it. It was the drag preview that had no failure path.

**Nothing retires a live gesture.** The hand-off runs only while `active` is
false, which is the whole reason these two pieces of state exist separately.
Every retirement condition is true at some point during a normal drag — the
first snapshot after touch-down still carries the pre-drag price, so it matches
`activePrice` exactly, and a snapshot arriving mid-amend may not carry the line
at all. Firing on those dropped the line back where it started while the finger
was still down, with `active` false afterwards so nothing could move it again.

## Frame timing on native

Two bugs lived here, and both are invisible on web because the browser's
animation frame collapses them. Skia commits per notification and draws them.

**Removals are deferred, additions are not.** A host reconciling its feed removes
a stale line in one store update and creates the replacement in the next — real
time apart. Painting between them draws a frame with no line. Deferring the
*notification* does not work: any unrelated line ticking triggers one, and with
live orders that is constant. The **deletion** is deferred instead
(`LINE_REMOVAL_COALESCE_MS`), and creating a line flushes pending removals, so
remove-then-create collapses into a single paint.

**Shared values move faster than closures.** `livePrice` reads the drag from a
shared value and falls back to `line.price` from its closure. Writing a shared
value re-evaluates the worklet on the UI thread at once, but a new closure
reaches it only on Reanimated's next propagation. Releasing the drag the moment
the snapshot went pending handed the line to a closure still holding the
*original* price — one frame at the old position, ~23ms. The hand-off waits a
frame.

**Any worklet mixing a shared value with a captured one has this hazard, and it
has bitten three times.** The shape to look for is a value that a gesture drives
through a shared value and React commits through a prop, where JS clears the
shared value to hand back over:

| shared (immediate) | closure (a frame later) |
| --- | --- |
| `orderDragState.activePrice` | `line.price` |
| `paneRangeOverrides[paneId]` | `pane.yMin` / `pane.yMax` |
| `bracketDragState.activeObjectId` | the line's optimistic `brackets` |

These retire through `mobile/interaction/nativeReleaseHold.ts`, never inline and
never through a private `requestAnimationFrame` gate.

**Indicator pane range is the exception, and the reason is worth reading before
you route the next one through the hold controller.** A hold cannot fix it,
because the flap is not the hold releasing early — it is the *write* that
releasing performs. Clearing `paneRangeOverrides[paneId]` from JS marks every
plot worklet that reads it dirty, and those worklets still hold the pre-drag
`pane.yMin`/`yMax` in their closures until Reanimated restarts them, so the run
triggered by the clear draws the pre-drag range. A `useLayoutEffect` made it
worse by firing before the restarts were even queued. Dragging a MACD pane
snapped back to its pre-drag scale on release, on both platforms.

So the override is never cleared. It is written `committed: true` on release,
carrying the range the drag started from, and `shouldApplyNativePaneRangeOverride`
decides inside the worklet whether it still applies: while the pane is still on
the drag-start range it does, once the pane carries the committed range the two
agree and it makes no difference, and once auto-scale moves the pane elsewhere it
goes inert. The preview retires in the draw pass, so nothing has to be cleared
and no run can be woken early. Same principle as the pane divider's bitmap, one
layer down.

## Worklets do not hoist

A `'worklet'` function declaration is rewritten by the Reanimated plugin into an
assignment carrying a serialized closure. Function declarations hoist;
assignments do not. So a worklet that calls another worklet **declared below it
in the same file** captures `undefined`, and the call throws the moment it runs
on the UI thread — `getNativePaneAtY is not a function`.

Nothing catches this before a device does. TypeScript resolves the symbol
happily, eslint sees a legal forward reference, and the test suite runs against
`src/test/reanimatedMock.tsx`, which never builds a closure at all. Declare
every worklet above its callers and read the ordering as load-bearing, not
cosmetic.

## One commit, two channels

Pane geometry used to reach the canvas twice over: plain props took the new frame
in the commit that produced it, while every `useDerivedValue` closing over `frame`
took it one Reanimated propagation later. `Container.redraw()` re-records on the
commit and paints immediately, then starts its mapper - so a commit painted with
new props and old derived values, and a pane maximize sheared for a frame.

**It does not any more, and the rule that keeps it that way is: inside the canvas,
nothing reads pane geometry off a plain prop, and no element count depends on it.**
A commit paints all-old, and the propagation after it paints all-new: two
self-consistent frames. (With one exception, noted below - a maximize during a
data load, where the static branches are on screen.)

Two attempts to hide the seam failed first, and both are worth knowing about.

A covering bitmap could never have worked *as a sibling `<Canvas>`* - its own
reconciler root, its own `CAMetalLayer`, its own drawable present - with its
visibility an `opacity` toggle on a React Native view, a third pipeline again.
Nothing ordered the three. At the *release* both orderings look identical, which
is why two fixes aimed there changed nothing; at the *start* both orderings expose
the live chart underneath. It also cost a `makeImageSnapshot` per tap, which is a
full offscreen GPU render run synchronously on the JS thread.

The pane divider still uses one, because that drag cannot re-lay-out per frame -
that is what made it crawl. It is not the reverted shape: the bands are a child of
the *same* `<Canvas>` as the plot paths, so there is one reconciler root and one
present, and no view opacity in the picture. The snapshot is paid once per divider
grab rather than per tap. Do not move it back out to a sibling canvas, and do not
reach for a covering bitmap for anything that could instead ride the derived
channel.

A gate that observed the propagation was tried and reverted. Echoing pane
geometry through a `useDerivedValue` and releasing on the echo is sound in
principle; the attempt paid for it by mounting the echo as an unmemoized
`<Canvas>` child, which re-rendered on every parent render - every bar tick -
invalidating the Skia scene graph and repainting each time. The chart became slow
enough that double taps started missing the 200ms inter-tap window, so the
maximize worked about half the time. If you try it again, `memo` is not optional,
and the thing to measure is repaints per tick.

**Nothing outside the canvas can retire a preview that covers it.** The pane
divider's bitmap was retired from JS on the React commit - the all-old frame - so
Android showed the pre-drag layout until the repaint landed, while iOS never did,
the seam being one paint wide there and many here. Four attempts to name the
moment the repaint lands each got closer and none was right: an extra animation
frame, a single-commit clear, a JS echo of the committed geometry, then comparing
the committed signature inside the draw pass. They all reduce to JS or a mapper
trying to observe a repaint neither can see. Reanimated *could* order it, since
mappers are sorted topologically on declared shared-value outputs - but the plot
paths declare only themselves, and `useDerivedValue` cannot declare another
output.

**So the preview outlives the repaint instead of chasing it.**
`NativePaneDividerResizeLayer` takes the committed geometry signature and the one
the released drag asked for as plain props, reads both through the band's own
`useDerivedValue`, and collapses the bitmap to zero height once they agree **and**
a fixed number of presented frames have passed, counted on the UI thread with
`useFrameCallback`. That count is the one tuned number in this drag and it is a
fence, not a mechanism: a pane-geometry commit rebuilds every plot path in the
canvas, measured at roughly a quarter of a second on Android with the frames on
the pre-drag layout throughout, so the fence is sized to outlast it. Being late
costs a stretched bitmap for a few more frames; being early is the flap. iOS pays
nothing visible - its paths land in one frame, and the bitmap covering them is
already at the committed geometry. Disposal trails the fence and the ceiling
trails disposal, so neither can uncover a preview that is still drawing.

**An on-device instrument here may read chart state and must never hold it.** The
Android gesture overlay used to keep its log in chart state, so every append
re-rendered the whole chart - and a divider drag logs once per gesture update,
which put a full chart render on every frame of the drag being measured. It never
mounted on iOS, so the one platform showing the flap was the only one paying for
the log, and no timing read through it was sound.

**What is left is the legend**, and it cannot be fixed this way: it is a React
Native view outside the canvas, and it drops a pane's rows the moment that pane's
height reaches zero. So it is held on the frame it was last drawn at until the
layout agrees with the ratios that were asked for, then released one animation
frame later - the frame the canvas repaints on. The ratio gate is what covers
transitions taking more than one commit and stops a bar tick's re-frame releasing
early; the 250ms ceiling is there so a layout that never converges cannot freeze
the legend.

**The seam closes per branch, not globally.** A `<Group clip>` must ride the same
channel as the paths drawn inside it. Live branches build their paths in
`useDerivedValue`, so their clip is a `useDerivedValue` too. Projected and static
branches build paths in a `useMemo` or inline, so their clip stays a plain rect.
Either pairing is self-consistent; crossing them is what shears a pane for a
frame.

Do not be tempted to lift every clip out of the derived values instead, nor to
push every clip into them. Either blanket move crosses one branch's channels.
Note too that capturing a plain number rather than `frame` changes nothing:
anything captured in a worklet closure travels on the closure channel.

Which branch is on screen when: `holdingSnapshot` comes from
`shouldHoldNativeRenderSnapshotForTransition`, which keys on bars, symbol,
interval, `isLoading` and projection readiness - **a pane maximize does not set
it**. So during an ordinary maximize `staticProjection` is null and the live
branches are the ones drawing. The static branches belong to data loads, where
being all-plain makes them internally consistent on their own.

The gap that leaves: a maximize tapped *while a data load is holding* puts the
plot and candle layers on the commit channel and the grid on the derived one, so
that combination can still shear for a frame. Rare, and not worth a bitmap.

Shared-value props are free here. The Skia container restarts one mapper over
every shared value in the tree and it fires once per frame, so a clip that only
changes when `frame` changes adds no repaint that the sibling path was not
already causing. Identity also stabilises, which *reduces* memo pressure.

**Geometry must not decide what exists.** Mount and unmount happen on the React
commit, full stop, so a layer that filters panes by `height > 0` or sizes a tick
array from `pane.height` adds and removes nodes a frame before the canvas follows.
Pooling ticks at the full plot height and hiding the spares was measured and
rejected - it triples the node count and scales with pane count. What works is
collapsing the whole layer into one node whose *contents* carry the geometry:
the pane separators and both axis grid lines are a single derived `SkPath` each,
and both axis label sets are a single `Glyphs` node each, laid out in a worklet
from a char-to-glyph map resolved once on the JS thread. Three panes went from 136
Skia nodes and 476 mapper dispatches to about four and four.

Two traps in that last part. The axis font is **not** monospace - it resolves to
the system font, and the "character width" beside it is a digit's ink bounds, not
an advance - so glyph advances must come from `font.getGlyphWidths`, or every
label loosens around its punctuation. And a character outside the label alphabet
is dropped rather than drawn, so a new format character truncates labels silently;
there is a test pinning the alphabet for that reason.

## The live last bar on native

A tick that only moves the last bar does not render React. `useTealchartCore`
hands every emit to `onLatestBar` before dispatching; the chart publishes the
bar and the last-trade line's price, colour and text into shared values
(`mobile/render/nativeLiveTail.ts`), and the candle/volume worklets, the
last-trade line and tag, the tag stack, the gesture autoscale and the legend
read them in place of the bar their closures hold. The dispatch is skipped only
when `canPaintNativeLiveTail` says the live channel painted the tick completely:
same market and bar as the commit, live branches on screen, high/low inside the
range autoscale fitted, and text the committed tag can hold. Anything else —
a new bar, history, a new high, a wider label, a hold — dispatches as before.

Rules that keep it correct:

- **Match on market and time, never time alone.** Bar times repeat across
  symbols and intervals; every live value carries `symbol\ninterval` and is
  ignored by a closure from another market.
- **Never read a shared value's `.value` on the JS thread on the tick path.** In
  Reanimated 4 that is a synchronous round trip to the UI runtime that copies the
  value back. Decide from committed JS data (`NativeLiveTailCommit`) instead.
- **A new last-bar consumer must read the live channel**, or it shows the
  committed bar until the next dispatch. React state `bars` is no longer updated
  per tick; only the core's own array is.

Indicator results take the same route. `MobileIndicatorManager` diffs each
worker result against the committed plots (`nativeIndicatorTail.ts`): identical
re-sends are dropped, and a result that moved only the last bar of plain `plot`
series — no offset, trackprice or fill, pane ranges unchanged — is offered to
the chart, which publishes the moved points (plot paths, legend), the re-resolved
readouts (`NativeIndicatorOutputAxisLabelLayer`, matched by layout generation)
and the readouts' tag-stack prices. Anything else renders, and a result that
renders replaces the published tail so an older one cannot override the commit.
Extending the tail to another plot type means making its worklets read the tail
first; until then `diffNativeIndicatorPlotTail` must keep refusing it.

## Gesture rebuilds on native

The chart's fifteen gestures are composed into one `Gesture.Simultaneous`, so a
new identity for *any* of them rebuilds the composition and makes the
`GestureDetector` re-attach. Nearly all of them take `controlZones`, which React
derives from layout — so anything that reaches that array at UI speed rebuilds
the entire gesture tree.

The reset-view button was exactly that. Its visibility was React state and its
zone lived in the array, so revealing it, and then dismissing it 2.5s later,
rebuilt every gesture twice per tap and re-rendered the whole chart with it. It
is a shared value now, and the gestures that must yield to the button resolve
its circle from the frame at touch time (`isNativeResetViewControlPoint`)
instead of reading a published zone.

Anything else that moves faster than layout belongs in a shared value the
worklets read, never in `controlZones`. `drawingEditDragZonesShared` is the
other instance of the same shape.

A stable gesture identity is not enough on its own. RNGH's `GestureDetector`
re-applies every attached handler in an effect keyed on **all** of its props,
children included, and the chart canvas is its child — so every bar tick
re-sent fifteen handler configs to native (6.4% of the JS thread under a
4-ticks/s load). `NativeStableGestureDetector` hands the canvas through context
to a memoized detector whose only prop is the gesture. Do not put the canvas
back as a direct child of a plain `GestureDetector`.

## Gotchas

- `TealchartRenderer` is pure canvas — no React; test it independently
- Text width caching (`ctx.measureText`) provides ~10x speedup — invalidate on font changes
- `PaneManager` treats main chart as "just another pane" (type: `'main'`)
- Gap detection has exponential backoff — don't remove the debounce
- Generated Konva layers must Z-order correctly: canvas → price lines → context menu
- Trade-line draw order is a base tier plus a promotion, and the promotion has to
  be rebuilt rather than stacked. Base order is plain price lines → order lines →
  position lines, so a position label always covers an order label it overlaps.
  Hover, selection and an active drag lift one line above that tier — on web in
  `PriceLineManager.applyFloatingLineOrder`, on native through
  `promoteNativeSelectedTradeLineGeometry` (native has no hover). Web used to do
  it with bare `moveToTop()` calls, which nothing ever undid: hovering an order
  once left it permanently above the positions it covered. Each line group now
  carries a `baseOrder` attr assigned at render time and the whole order is
  re-applied by `zIndex` on every hover/selection change.
  Submit previews such as Average Fill use existing priority 60 within the order
  tier; ordinary orders use 50. Priority changes rebuild resting paint order.
  Positions/fixed tags retain their tiers and interaction promotions still reset.
  Equal-distance hover ties follow the current painted group's z-index, so a
  covered entry cannot displace a same-price Average Fill label. Selected/drag
  promotions keep their precedence; unequal centers still choose the nearer row.
- The last-trade tag is king: it is the only `fixed` price line, it never moves
  in collision resolution, nothing is drawn over it, and the crosshair is the
  only thing allowed to cover it. Both halves had holes. Its draw tier sits
  above orders and positions in `baseDrawRank`. And when a stack of order and
  position tags grows taller than its band, something has to give —
  `resolveLabelCollisionsWithinBounds` used to trade the overlap for a clamp and
  park a label right on the fixed tag. `evictOverlapsWithFixed` runs last and
  pushes the movable labels clear instead, past the band edge if that is what it
  takes, where the caller's off-screen filter drops them.
- Crosshair overlay canvas has `z-index: 3` — above interactive line container (`z-index: 2`)
- Trading-line labels and line segments must be clamped after the overlaid left drawing rail (`leftToolRailInset + leftToolRailWidth`) in both web and mobile paths. Do not place labels or left-extending line segments at raw `margins.left`.
- TP/SL drag hit rects must convert with absolute Konva coordinates. Cached line groups shift on price updates, so local rect `x`/`y` can be stale relative to the chart.
- TP/SL empty-button drags create external bracket orders; only existing numeric TP/SL bracket lines should enter the OEMS optimistic bracket-mutation lifecycle. Otherwise the chart invents a bracket state that consumers cannot confirm and leaves stale TP/SL lines behind.
- Cursor writes are centralized through `ChartCore.applyCursor`; active Konva line drags must keep `grabbing`, and Konva hit targets set `tealchartCursor` (`pointer` for order-label drag handles and buttons) so EventManager hover processing cannot overwrite the intended cursor.
- All crosshair rendering is canvas-drawn (+ button, price label, time label) — zero DOM mutations for performance
- Event handlers (mousemove, drag, touch) defer all processing to RAF — event handler itself is near-zero cost
- `style.cursor` writes are guarded (`this.cursor !== cursor`) to avoid triggering style recalculation
- **Per-chart interval persistence**: the interval lives in the chartKey-scoped `chartStore.settings`. A widget created with an explicit `interval` uses (and persists) it; created without one, it restores the interval a prior widget with the same `chartKey` persisted, else defaults to `'60'`. `setResolution` writes the new interval back to the store (via `_handleIntervalChange` → `_startDataLoad`, which persists `newInterval`). The store is held in a **process-lifetime** `chartStoreCache` (`getChartStore`), so tests must call `clearChartStoreCache()` (from `state/chartState`) in `afterEach` to avoid interval bleed across tests.
- Resolution inputs are normalized at Tealchart API boundaries and in shared viewport math. Accept string resolutions (`'1h'`, `'60'`) and legacy numeric minute resolutions (`60`); keep missing interval semantics intact where `undefined`/`null` means "not provided" (for example, widget construction and `setSymbol`).

## `createMultipointShape` exists for TradingView parity

`TealchartApi` implements `createMultipointShape({ shape: 'icon' })` and
`removeEntity` alongside `createExecutionShape`, because the web app's fill
markers (`ExecutionMarksManager`) call the former on BOTH chart engines. When a
shared caller reaches for a TradingView method tealchart lacks, the call throws
inside an async handler and surfaces as an unhandled rejection: nothing renders
and nothing is logged. Anything the web app calls against both engines has to
exist here.

Only `icon` is implemented; any other shape REJECTS by name rather than
returning a handle to a drawing that was never made.

**`_getRenderData()` returns a COPY (`{ ...data }`).** Assigning to its result is
silently discarded, so per-drawing render state — `markerShape` is the first —
must be passed into `_createExecutionLineAdapter`, not set afterwards.

`markerShape` picks the glyph: `arrow` is TradingView's tall stem-and-head marker
offset `arrowSpacing` px beside the bar, `caret` the squat triangle planted ON
the price that icon shapes draw. Defaults to `arrow`, so existing execution
shapes are unchanged.

**Pine Style reset persistence:** Applying settings always publishes the override
list, including an empty list after Reset, so the host clears persisted overrides.
Background plot arrays use source-bar coordinates. Apply plot.offset during web projection and native offset-bar selection, preserving raw color/value indices and show_last source filtering; never pre-shift samples a second time.

Pine box border_width zero suppresses border strokes in the shared web/native painter.
Keep box fill and text, every border style, and width-one commands unchanged.
Line and polyline zero widths retain their runtime one-pixel normalization.

Hosted study adapters keep managed study IDs in the existing `TealchartApi`: hosts wire
`setOnStudyInputsChange` to their existing `TealscriptManager` owner so `IStudyApi.setInputs`
merges values and re-executes that same worker. Removed handles cannot trigger input callbacks.
The hosted entry exports the existing indicator picker and settings modal for app-origin controls.

`renderExternalOverlayContent` projects the existing plot, drawing and execution renderers
through host-provided time/index/price callbacks. Native bar indices are relative to the supplied
bars; explicit irregular-time projection replaces viewport interpolation. The scoped projection
is restored in `finally`, so later normal Tealchart renders keep their own viewport coordinates.
The host supplies pane dimensions and native bar spacing; this pass does not draw OHLCV.

`hosted/canvasCommands.ts` records and replays a bounded Canvas2D primitive allowlist for existing
jailbreak indicators that must retain app-origin data/account access. Text metrics come from a
real app canvas. Gradient handles and captured image pixels are explicit resources; the complete
batch is validated before any draw operation. Replayers own DPR/clip placement and accept only
finite commands for the current native projection revision. Business indicator classes remain
with the app's original `JailbreakIndicatorManager` and factories.

External hosts and ChartCore share `rendering/jailbreakTooltips.ts` for the
original grouped hover/left tooltip placement and styling. Tooltip bar callbacks
consume seconds, as do existing jailbreak drawing factories; internal renderer
and host geometry retain milliseconds. The hosted recorder omits repeated current
property assignments with save/restore semantics while retaining its bounded
100,000-command limit.

ContextMenu accepts `openDirection: 'left'` to place the measured menu width
left of its anchor, still clamped to the viewport. Existing callers keep the
default rightward opening; Hosted uses left at its right-axis plus button.

Hosted last-trade external axis labels match web Konva text placement: shared
11px sizing, two-row centers 11px apart, and alphabetic glyph metrics measured
with an alphabetic baseline. Ordinary external tags retain native middle alignment.

Legacy web price projection maps a flat price range to its midpoint, matching
unified pane projection and keeping gradient endpoints finite.

Built-in MACD and Volume histograms explicitly request linewidth 3 to preserve
their web appearance; Pine histogram widths remain literal pixel widths.

Web readouts consume ChartCore effective plots after editable display overrides,
so a hidden plot has neither a status value nor a Data Window row.

Web readout spans/rows retain their DOM identity across ticks. Unchanged formatted
readouts skip publication; a closed Data Window defers its rows until opened.

`TealchartWidgetOptions.showDataWindow` defaults to false on web. Only explicit
true mounts its control; legend status values remain available by default.

Native background pictures retain the axis-exclusive clip width
`frame.priceAxisLeft - frame.contentLeft` in live and static branches. Gesture
tests retain the mounted picture before changing shared viewport values.

`IndicatorSettingsModal.openWith` accepts optional Style input definitions for
canvas indicators without plot outputs. Colors preserve hex alpha and expose
opacity; Defaults resets both Inputs and Style input values.

Analysis controls are package-owned and model-neutral on web and Skia. The host
opts in with `onAnalysisRequest` and may toggle it without remounting through
`setAnalysisRequestHandler`; no handler means no controls. `startAnalysisSelection`
arms a temporary main-plot time-span selector, and `cancelAnalysisSelection`
clears it. Selection uses the candle projection width, excludes axes/study panes,
freezes geometry until completion, and visibly cancels on identity, viewport,
layout or focus changes. Its input surface contains financial mouse/touch events;
native selection disables the normal canvas gestures and reserves measured real
controls. Completed requests leave a passive identity-bound range highlight.

Native widget mount activity is separate from terminal `remove()`. React StrictMode
layout-effect replay restores liveness before owner layout callbacks; it cannot revive a removed
widget. Analysis readers and imperative handlers share this liveness predicate.

Replacing a native `ChartWidgetCore` rebinds its analysis reader and advances the
public analysis revision even when market and per-core request counters repeat.
