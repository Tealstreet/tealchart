# CLAUDE.md — @tealstreet/tealchart

Canvas-based OHLCV charting library with a TradingView-compatible widget API.

## Architecture

**Hybrid rendering model:**

- **Canvas 2D API**: Candlesticks, volume, grid, time/price axes, crosshair (high-frequency updates)
- **Konva.js**: Interactive trading geometry on web — order/position lines with draggable labels and controls
- **DOM / React Native overlays**: Menus, buttons, chrome controls, and toolbars that do not require per-frame chart projection

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
hold can expose the commit's all-old frame, wait for the canvas to echo the
committed geometry back - `createNativePaneGeometrySignature` through
`nativePresentedPaneGeometry` - and release on that. React render and
layout-effect passes are not presentation frames, and neither is an animation
frame counted from one. This is the single owner for release-hold timing across
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

## Tealscript Integration

1. User selects indicator → `TealchartWidget.createStudy()`
2. `TealscriptManager` creates a Web Worker with the indicator code
3. Bar data pushed to worker → plots returned
4. Overlay indicators render on main pane; non-overlay get dedicated panes
5. Requires factory function `createTealscriptWorker()` from the consuming app

The indicator picker is capability-aware: Tealscript indicators are only offered
when `createTealscriptWorker` is supplied, and jailbreak indicators are only
offered when that indicator's `jailbreakIndicatorFactories[id]` factory is
supplied. This keeps runtimes like v2 from showing indicators they cannot
execute.

Built-in indicators defined in `builtinIndicators.ts`: SMA, EMA, RSI, MACD, Bollinger Bands, etc.

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
Tealchart interfaces and the v3 iframe `WidgetHost` method bridge against the
vendored TradingView declarations; update that test when TradingView is
upgraded or when a deliberate backwards-compatible extension is added.

Datafeed input follows TradingView's external shape. For example, datafeed bars
may omit `volume`; Tealchart normalizes them at the widget/core boundary before
renderer, tealscript, and Skia paths see the stricter internal `Bar` shape.

Exchange-prefixed symbols (for example `BYBITV5:BTCUSDT`) are resolved with the full string but stored internally as the clean symbol (`BTCUSDT`), including during initial widget construction. A prefix change with the same clean symbol must still reload data so adapters that key by `EXCHANGE:SYMBOL` get fresh symbol info and subscriptions.

Order and position trading-line labels derive their body, quantity, price-label, and action-button colors from `lineColor` using the package defaults in `constants.ts`: blue for buy/unspecified lines, red when consumers supply the default sell/short color, dark low-glare label fills, and filled quantity/PnL-style text on accent segments. Consumers should set semantic line color and line length rather than restyling every label segment. PnL must be passed separately with `setPnl` / `setProfitState`; it is the only label segment that flips to profit/loss color independently of `lineColor`.

The `transformer/README.md` documents the TradingView layout schema in detail.

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

Every one of them retires through `mobile/interaction/nativeReleaseHold.ts`,
never inline and never through a private `requestAnimationFrame` gate. Indicator
pane range is the one that is easy to miss, because the hold-until-the-frame-
agrees logic looks like it already solves this — it makes the override survive
the *commit*, but the release itself can still be a frame early if it is not
routed through the shared hold controller. That is what makes dragging or
scaling a MACD pane snap back to its pre-drag scale for one frame.

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

A gate that observed the propagation was tried, reverted, and is now back in a
shape that costs nothing. Echoing pane geometry through a `useDerivedValue` and
releasing on the echo is sound in principle. The reverted attempt paid for it by
mounting the echo as an unmemoized `<Canvas>` child, which re-rendered on every
parent render - every bar tick - invalidating the Skia scene graph and repainting
each time. The chart became slow enough that double taps started missing the 200ms
inter-tap window, so the maximize worked about half the time.

What was wrong there was the node, not the echo. `nativePresentedPaneGeometry` in
`SkiaTealchart` is a `useDerivedValue` closed over
`createNativePaneGeometrySignature(frame.panes)` that **draws nothing** - it is not
a Skia element and has no reconciler root to invalidate, so it cannot cost a
repaint. Ordering holds without one: Reanimated restarts a derived value's mapper
from a `useEffect`, effects run children before parents, and mappers run in
registration order, so the mirror lands in the same run as the plot paths it is
reporting on. A `useAnimatedReaction` carries it back to JS. If you touch this,
the thing to measure is still repaints per tick, and the rule is that an echo may
observe the canvas but must never draw into it.

**JS cannot retire a preview that covers the canvas, and three builds proved it.**
The pane divider's bitmap was retired from JS on the React commit, which is the
all-old frame, so Android showed the pre-drag layout until the propagation
landed - iOS never did, being one paint wide there and several here. An extra
animation frame, then a single-commit clear, then this echo releasing on the
mapper run: each was closer and none was right, because JS can only guess at
frames after the commit and a slow one makes the guess wrong. The last of them
worked about 60% of the time, and the ceiling was observed firing *after* the
clear with the canvas still on the old layout.

**A preview drawn inside the canvas must retire inside the canvas.**
`NativePaneDividerResizeLayer` takes the committed geometry signature and the
signature the released drag asked for as plain props and reads both through the
band's own `useDerivedValue`, collapsing the bitmap to zero height when they
agree. That is the same channel the plot paths take, so the hide and the rebuild
land in one mapper run and Skia records one picture from it - the bitmap cannot
vanish on a frame where the paths behind it still draw the pre-drag layout.
Ordering is structural rather than timed: the paths' mappers restart in the
commit's effect flush and the hide in the flush after it, so the paths are always
registered first. The echo is still here but demoted to disposing the images,
where being late costs memory and nothing on screen.

**Pane height overrides are shares of a layout, not of a pane.** A divider drag
writes a ratio for the panes on both sides of it, and `computePaneGeometry`
multiplies by them without normalising - so a surviving `main: 0.154` whose
partner pane was deleted lays the main pane out at 15% of the plot and leaves the
rest blank. `pruneNativePaneHeightOverrides` drops the whole set the moment any
pane it named is gone; partial pruning would keep a share of a layout that no
longer exists.

**The Android debug overlay is an instrument, and it was changing what it
measured.** Its entries were chart state, so every append re-rendered the whole
chart - and a divider drag logs once per gesture update, which put a full chart
render on every frame of the drag being measured. It never mounts on iOS, so the
one platform that showed the flap was also the only one paying for the log. It
owns its own state now (`NativeGestureDebugOverlay`, appends through a ref) and
touches nothing above it. Any future on-device instrument here has the same
obligation: it may read chart state, never hold it.

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

## Gotchas

- `TealchartRenderer` is pure canvas — no React; test it independently
- Text width caching (`ctx.measureText`) provides ~10x speedup — invalidate on font changes
- `PaneManager` treats main chart as "just another pane" (type: `'main'`)
- Gap detection has exponential backoff — don't remove the debounce
- Generated Konva layers must Z-order correctly: canvas → price lines → context menu
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
