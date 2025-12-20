# Custom Chart Development Status

## Project Overview

The `@tealstreet/custom-chart` package is a TradingView-compatible charting library built from scratch. It provides a drop-in replacement for TradingView charts with canvas-based rendering, supporting the same widget API so existing infrastructure (`useWidgetStateManagement`, `ChartLineCoordinator`, etc.) works unchanged.

**Goal**: Replace TradingView dependency while maintaining 100% API compatibility.

---

## Branch: `feat/custom-chart`

This branch contains all custom chart development work. Below is a comprehensive status of all features.

---

## Completed Features

### 1. Core Rendering Engine

**Files**: `CustomChartRenderer.ts`, `CustomChart.tsx`

| Feature | Status | Notes |
|---------|--------|-------|
| OHLCV Candlestick rendering | ✅ Complete | Canvas-based, high performance |
| Volume bars | ✅ Complete | Configurable height ratio |
| Price axis with auto-scaling | ✅ Complete | Dynamic decimal places based on price range |
| Time axis with smart labeling | ✅ Complete | Adapts to zoom level |
| Grid lines | ✅ Complete | Configurable color/opacity |
| Crosshair with price/time labels | ✅ Complete | Follows mouse, snaps to bar centers |
| Device pixel ratio support | ✅ Complete | Crisp rendering on Retina displays |

### 2. Interactions

**Files**: `CustomChart.tsx`

| Feature | Status | Notes |
|---------|--------|-------|
| Pan (drag on chart) | ✅ Complete | Time + price panning |
| Zoom (scroll wheel) | ✅ Complete | Time axis zoom centered on cursor |
| Price axis zoom (drag) | ✅ Complete | Exponential scaling for natural feel |
| Historical data backfetch | ✅ Complete | Auto-loads on pan/zoom to edges |
| Reset viewport button | ✅ Complete | Appears on hover near bottom center |
| Scroll event isolation | ✅ Complete | Prevents propagation to parent page |

### 3. Multi-Pane Indicator System

**Files**: `PaneManager.ts`, `CustomChartRenderer.ts`, pane layout types

| Feature | Status | Notes |
|---------|--------|-------|
| Unified pane layout system | ✅ Complete | Supports main pane + multiple indicator panes |
| Indicator pane rendering | ✅ Complete | Separate Y-axis scaling per pane |
| Overlay indicators | ✅ Complete | Render on main pane with shared Y-axis |
| Pane Y-axis zoom | ✅ Complete | Drag on indicator pane price axis |
| Crosshair labels per pane | ✅ Complete | Shows value at cursor for each pane |
| Indicator legends in panes | ✅ Complete | Name + current values displayed |

### 4. TealScript Integration

**Files**: `TealScriptManager.ts`, `useTealScript.ts`, indicator registry

| Feature | Status | Notes |
|---------|--------|-------|
| TealScript worker support | ✅ Complete | Web worker for indicator calculations |
| Built-in indicators | ✅ Complete | SMA, EMA, RSI, MACD, Bollinger, etc. |
| Custom indicator support | ✅ Complete | User-defined TealScript indicators |
| Plot styling | ✅ Complete | Line, histogram, area, circles, etc. |
| Per-bar coloring | ✅ Complete | Dynamic colors based on values |
| Style customization UI | ✅ Complete | Color, line width, plot style per indicator |

### 5. Order/Position Lines (Konva Layer)

**Files**: `PriceLineLayer.tsx`, `CustomChartApi.ts`

| Feature | Status | Notes |
|---------|--------|-------|
| Order line rendering | ✅ Complete | Price, quantity, text labels |
| Position line rendering | ✅ Complete | Entry price, PnL display |
| Draggable order lines | ✅ Complete | Drag to modify price |
| Cancel button (X) | ✅ Complete | Click to cancel order |
| Close button | ✅ Complete | Click to close position |
| Reverse button | ✅ Complete | Click to reverse position |
| Label collision resolution | ✅ Complete | Priority-based stacking when overlapping |
| Pending state visualization | ✅ Complete | Prevents snap-back during drag |
| Line deduplication | ✅ Complete | By orderId/positionId |
| Bracket orders | ✅ Complete | TP/SL display with parent lines |
| Cursor changes on hover | ✅ Complete | Pointer for buttons, grab for drag |

### 6. Context Menu

**Files**: `ContextMenu.tsx`, `PriceLineLayer.tsx`, `CustomChart.tsx`

| Feature | Status | Notes |
|---------|--------|-------|
| "+" button at crosshair | ✅ Complete | Konva-based for sync with crosshair |
| Right-click menu | ✅ Complete | Both canvas and Konva Stage handled |
| Portal rendering | ✅ Complete | Escapes parent transforms |
| Smart positioning | ✅ Complete | Flips up if near bottom edge |
| Menu item callbacks | ✅ Complete | Custom actions per item |

See: `CONTEXT_MENU_IMPLEMENTATION.md`

### 7. Hotkey Integration

**Files**: `CustomChartWidget.ts`, event handling

| Feature | Status | Notes |
|---------|--------|-------|
| `onShortcut()` API | ✅ Complete | TradingView-compatible |
| Mouse down/up events | ✅ Complete | For click-to-trade hotkeys |
| Crosshair position events | ✅ Complete | Price/time at cursor for orders |
| Shortcut matching | ✅ Complete | Supports modifiers (ctrl, shift, etc.) |
| Hover-based activation | ✅ Complete | Only fires when mouse over chart |
| Event throttling | ✅ Complete | 50ms throttle on crosshair events |

See: `HOTKEY_INTEGRATION.md`

### 8. Layout Save/Load System

**Files**: `chartState.ts`, `CustomChartWidget.ts`

| Feature | Status | Notes |
|---------|--------|-------|
| Chart state persistence | ✅ Complete | Jotai atoms with localStorage |
| TradingView layout adapter | ✅ Complete | Converts TV layouts to custom format |
| Indicator instance mapping | ✅ Complete | Maps study IDs to persisted instances |
| Auto-save | ✅ Complete | Debounced saves on changes |
| Unsaved changes indicator | ✅ Complete | Dirty state tracking |
| Layout delete/duplicate | ✅ Complete | Management operations |
| Auto-load selected layout | ✅ Complete | Restores on chart mount |

### 9. Widget API (TradingView Compatibility)

**Files**: `CustomChartWidget.ts`, `CustomChartApi.ts`

| API Method | Status | Notes |
|------------|--------|-------|
| `onChartReady()` | ✅ Complete | Chart ready callback |
| `chart()` / `activeChart()` | ✅ Complete | Get chart API |
| `createOrderLine()` | ✅ Complete | Returns Promise for TV compat |
| `createPositionLine()` | ✅ Complete | Returns Promise for TV compat |
| `setSymbol()` / `symbol()` | ✅ Complete | Symbol management |
| `setResolution()` / `resolution()` | ✅ Complete | Interval management |
| `crossHairMoved()` | ✅ Complete | Subscription API |
| `onSymbolChanged()` | ✅ Complete | Subscription API |
| `onIntervalChanged()` | ✅ Complete | Subscription API |
| `subscribe()` / `unsubscribe()` | ✅ Complete | Event pub/sub |
| `applyOverrides()` | ✅ Complete | Theme/style overrides |
| `createStudy()` | ✅ Complete | Add indicators |
| `removeAllStudies()` | ✅ Complete | Clear indicators |
| `getAllStudies()` | ✅ Complete | List active indicators |

---

## Known Issues / In Progress

### 1. Non-Click Hotkeys Not Working

**Status**: ⚠️ In Progress

**Symptom**: Click-based hotkeys work (e.g., 'a' + click = place limit order, 'x' + click = cancel order). Non-click hotkeys do NOT work (e.g., 'q' = toggle post-only).

**Root Cause**: `useHotkeyHandlers.isValidHotkeyPress()` checks `e.target.tagName`:
```typescript
const isKeyboardEventTriggeredByInput = (ev: KeyboardEvent) => {
  return tagFilter(ev, ['INPUT', 'TEXTAREA', 'SELECT']);
};
```

With document-level keyboard listeners, `e.target` is whatever element has focus on the page (could be an INPUT in another part of the UI), causing `isValidHotkeyPress` to return false and reject the hotkey.

**TradingView Difference**: TradingView's `onShortcut` callbacks receive events where `target` is within the widget, so the input check passes.

**Attempted Fixes**:
1. Created synthetic KeyboardEvent with container as target via `Object.defineProperty` - Not working (property override doesn't seem effective)

**Next Steps to Try**:
1. **Focus management**: Auto-focus container on mouse enter with `tabIndex="-1"` so keyboard events have container as target
2. **Alternative synthetic event approach**: Dispatch event on container instead of property override
3. **Debug logging**: Trace exact `e.target` value when hotkey fails

See: `HOTKEY_INTEGRATION.md` for detailed analysis.

### 2. Line Price Updates (setPrice)

**Status**: ✅ Fixed (pending test)

Race condition in `scheduleRender` could cause `setPrice()` updates to not render. Fixed by cancelling pending RAF and rescheduling.

### 3. Performance During Rapid Updates

**Status**: ⚠️ Monitor

The `flushSync` during drag and RAF cancellation patterns may need optimization if performance issues arise.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CustomChartWidget                              │
│  (TradingView-compatible API wrapper)                               │
│  - Lifecycle management                                             │
│  - Event subscriptions                                              │
│  - Layout save/load                                                 │
│  - Keyboard/mouse event routing                                     │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CustomChartApi                                 │
│  (Per-chart API)                                                    │
│  - Symbol/interval management                                       │
│  - Order/position line adapters                                     │
│  - Study (indicator) management                                     │
│  - Data subscriptions                                               │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ChartContainer                                 │
│  (React component wrapper)                                          │
│  - Top bar (symbol, timeframe, indicators)                          │
│  - Jotai Provider for chart state                                   │
│  - Props forwarding to CustomChart                                  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CustomChart                                    │
│  (Main React component)                                             │
│  - Mouse/touch event handling                                       │
│  - Viewport state management                                        │
│  - RAF render scheduling                                            │
│  - Context menu state                                               │
└─────────┬──────────────────────────────────┬────────────────────────┘
          │                                  │
          ▼                                  ▼
┌──────────────────────────┐    ┌────────────────────────────────────┐
│  CustomChartRenderer     │    │  PriceLineLayer (Konva)            │
│  (Canvas rendering)      │    │  - Order/position lines            │
│  - Candlesticks          │    │  - Crosshair lines                 │
│  - Volume                │    │  - Context menu button             │
│  - Axes, grid            │    │  - Interactive drag/click          │
│  - Indicator plots       │    │  - Label collision resolution      │
│  - Price lines           │    │                                    │
└──────────────────────────┘    └────────────────────────────────────┘
          │
          ▼
┌──────────────────────────┐
│  TealScriptManager       │
│  (Web Worker)            │
│  - Indicator calculations│
│  - Plot data generation  │
└──────────────────────────┘
```

---

## File Structure

```
packages/custom-chart/
├── src/
│   ├── index.ts                    # Main exports
│   ├── CustomChartWidget.ts        # TradingView-compatible widget class
│   ├── CustomChartApi.ts           # Per-chart API with line adapters
│   ├── CustomChartRenderer.ts      # Canvas rendering engine
│   ├── CustomChart.tsx             # Main React component
│   ├── types.ts                    # All type definitions
│   │
│   ├── components/
│   │   ├── ChartContainer.tsx      # Wrapper with top bar
│   │   ├── ChartTopBar.tsx         # Symbol, timeframe, indicators UI
│   │   ├── PriceLineLayer.tsx      # Konva layer for interactive lines
│   │   └── ContextMenu.tsx         # Dropdown menu component
│   │
│   ├── state/
│   │   ├── chartState.ts           # Jotai atoms for persistence
│   │   ├── ChartApiContext.tsx     # React context for chartApi
│   │   └── indicatorActions.ts     # Indicator state management
│   │
│   ├── rendering/
│   │   └── PaneManager.ts          # Multi-pane layout management
│   │
│   ├── indicators/
│   │   └── builtinIndicators.ts    # Registry of built-in indicators
│   │
│   ├── tealscript/
│   │   ├── TealScriptManager.ts    # Worker management
│   │   └── useTealScript.ts        # React hook for indicators
│   │
│   ├── transformer/
│   │   └── tradingviewAdapter.ts   # TV layout conversion
│   │
│   └── events/
│       └── EventEmitter.ts         # Pub-sub for widget events
│
├── README.md                       # Basic usage documentation
├── DEVELOPMENT_STATUS.md           # This file
├── CONTEXT_MENU_IMPLEMENTATION.md  # Context menu details
└── HOTKEY_INTEGRATION.md           # Hotkey implementation details
```

---

## Integration Points

### 1. ChartLineCoordinator

The existing `ChartLineCoordinator` works unchanged with the custom chart because:
- `CustomChartWidget` implements `IChartWidgetApi` interface
- `createOrderLine()` / `createPositionLine()` return compatible adapters
- `symbol()`, `safeSymbol()` methods work identically

### 2. useWidgetStateManagement

Works unchanged because:
- Widget emits `mouse_down`, `mouse_up` events via `subscribe()`
- Widget implements `onShortcut()` for keyboard handling
- `crossHairMoved()` subscription updates `crossHairAtom`

### 3. Datafeed (IBasicDataFeed)

Same datafeed interface as TradingView:
- `getBars()` for historical data
- `subscribeBars()` / `unsubscribeBars()` for real-time
- `resolveSymbol()` for symbol info

---

## Commits History (Chronological)

### Phase 1: Package Extraction
| Commit | Description |
|--------|-------------|
| `68f5d4b59c` | Extract custom chart to standalone package |
| `53f5546a7a` | Add README and narrow initial viewport |

### Phase 2: Core Chart Features
| Commit | Description |
|--------|-------------|
| `dba8389172` | Add top bar with timeframe selector and loading states |
| `c036653d41` | Add price line system with last trade line and countdown |
| `90a1d98560` | Add price precision support and improve label density |
| `ac061cff2c` | Make top bar and price axis fully transparent |
| `145e0e6ef3` | Snap viewport price bounds to nice grid values |
| `006106df61` | Snap crosshair to candle centers |
| `80b5496d94` | Adjust zoom speed and grid line visibility |
| `7505ff3baa` | Fix candle width calculation to prevent overlap |
| `690598be8f` | Fix viewport, zoom backfetch, and price axis drag |

### Phase 3: Indicators & TealScript
| Commit | Description |
|--------|-------------|
| `19d1c0cce8` | Integrate PineScript indicators with plot rendering |
| `117dafbb1b` | Rename PineScript to TealScript throughout codebase |
| `2f07172bbb` | Fix TealScript worker path resolution |
| `38e0a60661` | Add Indicators button and modal for built-in indicators |
| `327ecac0ae` | Add ChartLegend with OHLC display and indicator management |
| `6d2e63668b` | Add indicator settings modal with input configuration |
| `c1d6c4e828` | Add persistent indicator storage with safe merge system |
| `bc6a1dc19c` | Move indicator legends to their dedicated panes |
| `508413ed12` | Add indicator style customization with persistence |

### Phase 4: Multi-Pane System
| Commit | Description |
|--------|-------------|
| `d7d345c3bf` | Add floating label support and crosshair price line |
| `eedd5f911f` | Implement unified pane system |
| `da188bef8f` | Add crosshair Y-axis labels for indicator panes |
| `70b4173737` | Correct indicator time alignment with main chart |
| `1c7a9e9f9c` | Fix source series handling in TA indicators |

### Phase 5: Order/Position Lines (Konva Layer)
| Commit | Description |
|--------|-------------|
| `35d322f935` | Add Konva-based interactive order line layer |
| `70dd00e841` | Improve Konva layer cursor and drag handling |
| `123ce71009` | Optimize Konva layer updates during drag |
| `46104aeb8d` | Implement order and position line rendering with offset support |
| `89a54b9e42` | Unify order/position/price lines into single rendering system |
| `4edefb92dc` | Implement TradingView-compatible order/position callbacks |
| `8b9d4269c3` | Hide crosshair when hovering over interactive elements |

### Phase 6: Drag & Pending State
| Commit | Description |
|--------|-------------|
| `7f848f6f52` | Detect order update completion to clear pending drag state |
| `f5de465f7e` | Prevent order line snap-back after drag release |
| `7f6a4bfff9` | Reliably clear pending state and preserve cursor after drag |
| `ebc4a89aa3` | Remove unused drag props and variables |
| `7c72907982` | Reset cursor when interactive lines change while hovering |

### Phase 7: Layout Save/Load
| Commit | Description |
|--------|-------------|
| `a066fb4b14` | Add layout save/load with TradingView adapter integration |
| `9f491460d0` | Implement TradingView layout loading with indicator mapping |
| `6ffece8c5b` | Persist and auto-load selected layout across sessions |
| `e5cbf7a6f7` | Add auto-save timer and unsaved changes indicator |
| `f99f837ded` | Add save status indicator, delete/duplicate, fix duplicates |

### Phase 8: Polish & Bug Fixes
| Commit | Description |
|--------|-------------|
| `40e9882df6` | Add priority-based label collision resolution |
| `36a457c4a4` | Rewrite label collision resolution with cluster-based stacking |
| `620c573eec` | Improve label collision priority handling |
| `fa68a54251` | Improve line label rendering |
| `ff3d117fc1` | Use sync promise for line adapters to prevent duplicates |
| `4fbd278a48` | Center crosshair time label in time axis area |
| `705c07a928` | Extend candles/volume/plots under transparent price axis |
| `d57dcc5107` | Restore transparent top bar with proper label safe zones |
| `130dcd4682` | Hide crosshair when cursor enters dead zones |
| `54bceca8b6` | Validate crosshair position on each render cycle |
| `11b1935a6a` | Correct lineLength interpretation for label positioning |
| `de7f26fbe0` | Fix stuck crosshair and tighten price axis margin |
| `5e35ab4e25` | Prevent scroll events from propagating to parent page |

### Phase 9: Context Menu & Hotkeys
| Commit | Description |
|--------|-------------|
| `d8f17c1c39` | Add context menu with + button like TradingView |
| `888722dbbf` | Add hotkey and mouse event support |
| `4654a46a68` | Replace Konva + button with DOM element |
| `1ccc48bb6e` | Add context menu handler to Konva Stage |
| `183c6a0218` | Complete hotkey integration with crosshair events |
| `656eadc1c1` | Remove DOM + button, use Konva for sync rendering |
| `14b89b2f93` | Dedupe order/position lines and fix double mouse events |

---

## Testing Checklist

### Core Functionality
- [x] Candlesticks render correctly
- [x] Pan and zoom work smoothly
- [x] Historical data loads on scroll
- [x] Crosshair follows mouse

### Order/Position Lines
- [x] Lines appear at correct prices
- [x] Drag to modify works
- [x] Cancel/close buttons work
- [x] Labels don't overlap (collision resolution)
- [x] Pending state prevents snap-back
- [ ] `setPrice()` updates render immediately (testing fix)

### Indicators
- [x] Built-in indicators calculate correctly
- [x] Overlay indicators render on main pane
- [x] Separate pane indicators have own Y-axis
- [x] Style customization persists

### Context Menu
- [x] + button appears at crosshair
- [x] Right-click opens menu
- [x] Menu positioned correctly
- [x] Actions execute on click

### Hotkeys
- [x] Click-based hotkeys work (place order)
- [ ] Non-click hotkeys work (toggle settings)
- [x] Only fires when hovering chart

### Layout Persistence
- [x] Indicators restore on reload
- [x] Custom styles persist
- [x] Selected layout auto-loads

---

## Future Work / Roadmap

### Short-term
1. Fix non-click hotkey issue
2. Verify `setPrice()` fix for liquidation lines
3. Performance profiling and optimization

### Medium-term
1. Drawing tools (trend lines, rectangles, etc.)
2. Multiple chart layouts (split view)
3. More indicator types
4. Alert visualization

### Long-term
1. Full TradingView feature parity
2. Custom indicator IDE
3. Replay mode
4. Social features (shared layouts)

---

## Notes

- All changes are contained within `/packages/custom-chart/`
- No modifications to external files (`useWidgetStateManagement.ts`, etc.)
- API compatibility is maintained for drop-in replacement
- Performance is prioritized (canvas rendering, RAF batching, worker offloading)
