# CLAUDE.md — @tealstreet/tealchart

Canvas-based OHLCV charting library with a TradingView-compatible widget API.

## Architecture

**Hybrid rendering model:**

- **Canvas 2D API**: Candlesticks, volume, grid, time/price axes, crosshair (high-frequency updates)
- **Konva.js + react-konva**: Interactive elements on top of canvas — order/position lines with draggable labels, context menus

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
│   ├── components/             # RN components (ChartTopBar, context menu,
│   │                           # crosshair, order/position lines, modals)
│   └── hooks/                  # useChartGestures, useLabelCollision
├── ui/                         # Plain-JS/DOM UI layer (NOT React)
│   ├── ChartCore.ts            # Canvas + Konva interactive lines
│   ├── ChartTopBar.ts          # Timeframe selector + indicators + layouts
│   ├── ChartLegend.ts          # Indicator legend + visibility toggles
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
├── state/                      # Jotai state management
│   ├── chartState.ts           # Per-chart atoms w/ atomWithStorage + migrations
│   ├── ChartApiContext.tsx     # Context provider for TealchartApi
│   ├── indicatorActions.ts     # Indicator CRUD operations (atoms)
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
> lives in `ui/` (plain JS/DOM, NOT React), mobile UI in `mobile/`. The
> only React-adjacent code is `react/VanillaChartReact.tsx` plus a few
> `.tsx` files in `mobile/components/` and `state/ChartApiContext.tsx`.

## State Management

Uses Jotai with `atomWithStorage` for per-chart persistence:

```typescript
// Per-chart atoms created via factory
createChartFocusAtoms(chartKey) → settingsAtom, indicatorActionsAtoms, dirtyAtom
getChartSettingsAtom(chartKey) → atomWithStorage(`tealchart:${chartKey}`, defaults)
```

- Schema versioning via `CHART_SETTINGS_VERSION` with migration system
- `safeDeepMerge` handles corrupted localStorage gracefully

## Tealscript Integration

1. User selects indicator → `TealchartWidget.createStudy()`
2. `TealscriptManager` creates a Web Worker with the indicator code
3. Bar data pushed to worker → plots returned
4. Overlay indicators render on main pane; non-overlay get dedicated panes
5. Requires factory function `createTealscriptWorker()` from the consuming app

Built-in indicators defined in `builtinIndicators.ts`: SMA, EMA, RSI, MACD, Bollinger Bands, etc.

## TradingView Compatibility

Implements TradingView-compatible interfaces:

- `IChartingLibraryWidget` — widget lifecycle (`onChartReady`, `remove`)
- `IChartWidgetApi` — per-chart operations (symbol, interval, studies, trading lines)
- `IOrderLineAdapter`, `IPositionLineAdapter` — trading line adapters
- Layout save/load via `transformer/` (bidirectional conversion)

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

- `konva` / `react-konva` — vector graphics for interactive elements
- `jotai` / `jotai-optics` / `optics-ts` — atomic state with nested updates
- `@tealstreet/tealscript` — indicator scripting via Web Workers

## Web + Mobile Feature Parity

**CRITICAL: All features must be implemented for BOTH web (canvas/HTML) and mobile (React Native/Skia).**

When implementing any new feature, always implement it for both platforms in the same PR. Do not ship web-only or mobile-only features. The two platforms share:

- `ChartWidgetCore` — shared bar fetching, indicator management, pane management
- `chartState.ts` — shared state (AVAILABLE_TIMEFRAMES, chart settings)
- `labelCollision.ts` — shared collision resolution (web imports directly, mobile via `useLabelCollision` hook)
- `InteractiveLineState.ts` — shared drag state machine
- `ViewportController` / `viewScale.ts` — shared viewport preservation

Platform-specific rendering:

- **Web**: `ChartCore.ts` (canvas + Konva interactive lines), `EventManager.ts` (mouse/touch)
- **Mobile**: `SkiaTealchart.tsx` (Skia canvas), `PositionLineComponent.tsx` / `OrderLineComponent.tsx` (RN components), `useChartGestures.ts` (gestures)

When adding features like TP/SL drag preview, crosshair improvements, or new line types — implement for both platforms.

## Gotchas

- `TealchartRenderer` is pure canvas — no React; test it independently
- Text width caching (`ctx.measureText`) provides ~10x speedup — invalidate on font changes
- `PaneManager` treats main chart as "just another pane" (type: `'main'`)
- Gap detection has exponential backoff — don't remove the debounce
- Generated Konva layers must Z-order correctly: canvas → price lines → context menu
- Crosshair overlay canvas has `z-index: 3` — above interactive line container (`z-index: 2`)
- TP/SL drag hit rects must convert with absolute Konva coordinates. Cached line groups shift on price updates, so local rect `x`/`y` can be stale relative to the chart.
- Cursor writes are centralized through `ChartCore.applyCursor`; active Konva line drags must keep `grabbing`, and Konva hit targets set `tealchartCursor` (`grab` for order-label drag handles, `pointer` for buttons) so EventManager hover processing cannot overwrite the intended cursor.
- All crosshair rendering is canvas-drawn (+ button, price label, time label) — zero DOM mutations for performance
- Event handlers (mousemove, drag, touch) defer all processing to RAF — event handler itself is near-zero cost
- `style.cursor` writes are guarded (`this.cursor !== cursor`) to avoid triggering style recalculation
- **Per-chart interval persistence**: the interval lives in the chartKey-scoped `chartStore.settings`. A widget created with an explicit `interval` uses (and persists) it; created without one, it restores the interval a prior widget with the same `chartKey` persisted, else defaults to `'60'`. `setResolution` writes the new interval back to the store (via `_handleIntervalChange` → `_startDataLoad`, which persists `newInterval`). The store is held in a **process-lifetime** `chartStoreCache` (`getChartStore`), so tests must call `clearChartStoreCache()` (from `state/chartState`) in `afterEach` to avoid interval bleed across tests.
