# Custom Chart Context Menu Implementation

## Overview

This document details the implementation of a TradingView-style context menu feature for the custom chart, including the technical challenges encountered and their solutions.

## Feature Description

The context menu feature provides:
1. A **"+" button** that appears to the left of the crosshair price label when hovering over the chart
2. **Right-click context menu** anywhere on the chart
3. Both trigger the same dropdown menu with customizable items (e.g., place limit order, place stop order)

## Architecture

### Components Involved

| File | Purpose |
|------|---------|
| `CustomChart.tsx` | Main chart component, handles mouse events and context menu state |
| `PriceLineLayer.tsx` | Konva layer for interactive price lines (orders, positions, crosshair, + button) |
| `ContextMenu.tsx` | DOM-based dropdown menu rendered via React portal |
| `CustomChartApi.ts` | API for order/position line management |
| `types.ts` | Type definitions including `ContextMenuItem` |

### Rendering Layers

```
┌─────────────────────────────────────────────────────┐
│  DOM Layer (z-index: highest)                       │
│  - ContextMenu (portal to document.body)            │
│  - Reset button                                     │
├─────────────────────────────────────────────────────┤
│  Konva Stage (position: absolute, over main pane)  │
│  - Order/Position line labels (draggable)          │
│  - Crosshair horizontal line + price label         │
│  - Crosshair vertical line                         │
│  - Context menu "+" button                         │
├─────────────────────────────────────────────────────┤
│  Canvas (base layer)                               │
│  - Candlesticks, grid, axes                        │
│  - Price lines (non-interactive)                   │
│  - Indicator plots                                 │
└─────────────────────────────────────────────────────┘
```

## Implementation Details

### Context Menu Button (+ Button)

**Location**: `PriceLineLayer.tsx` (lines ~687-738)

The + button is rendered as a Konva `Group` containing:
- A `Circle` (outline with transparent fill for hit detection)
- Two `Line` elements forming the "+" shape

**Key Design Decision**: The button is a **Konva element** (not DOM) to ensure perfect synchronization with the crosshair line and price label. Both are rendered in the same Konva layer and update in the same render cycle.

**Positioning**:
- X: `width - margins.right - 10` (left of price axis)
- Y: `crosshair.y` (vertically aligned with crosshair)

**Cursor Handling**:
```typescript
onMouseEnter={(e) => {
  // Set cursor directly on container - NOT via onCursorChange
  // This avoids triggering isOverKonvaElementRef which would hide the crosshair
  const container = e.target.getStage()?.container();
  if (container) container.style.cursor = 'pointer';
}}
onMouseLeave={(e) => {
  const container = e.target.getStage()?.container();
  if (container) container.style.cursor = '';
}}
```

**Critical**: We set the cursor directly on the stage container instead of using `onCursorChange`. Using `onCursorChange` would set `isOverKonvaElementRef.current = true`, which hides the crosshair (designed for order/position label hover).

### Crosshair Line Termination

The crosshair horizontal line terminates before the + button to avoid visual overlap.

**Location**: `PriceLineLayer.tsx`, `PriceLineGroup` component

```typescript
const lineEndX = (lineType === 'crosshair' && hasContextMenuButton)
  ? width - margins.right - 18  // Stop at left edge of "+" button
  : priceAxisLabelX;
```

### Context Menu Component

**Location**: `ContextMenu.tsx`

Key features:
- **Portal rendering**: Uses `createPortal(menu, document.body)` to escape parent transforms
- **Fixed positioning**: `position: fixed` with screen coordinates (`e.clientX`, `e.clientY`)
- **Smart positioning**: Flips upward if would overflow bottom of container
- **Click outside**: Closes menu when clicking outside
- **Escape key**: Closes menu on Escape press

```typescript
// Position menu to the LEFT of the trigger point
let newX = x - rect.width - 5;
if (newX < 5) newX = 5;

// Flip up if would go below container bottom
let newY = y;
if (y + rect.height > bottomBound - 10) {
  newY = y - rect.height;
}
```

### Right-Click Handling

Both the canvas and Konva Stage have `onContextMenu` handlers:

**Canvas** (`CustomChart.tsx`):
```typescript
const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
  e.preventDefault();
  if (!onContextMenu) return;
  // ... get price from Y coordinate
  openContextMenu(price, e.clientX, e.clientY);
}, [...]);
```

**Konva Stage** (`CustomChart.tsx`):
```typescript
onContextMenu={(e) => {
  e.evt.preventDefault();
  if (!onContextMenu) return;
  // ... get price from Y coordinate
  openContextMenu(price, nativeEvent.clientX, nativeEvent.clientY);
}}
```

Both are needed because:
- Canvas handles right-click when Konva Stage isn't rendered (no interactive elements)
- Stage handles right-click when it covers the main pane area

## Problems Encountered and Solutions

### Problem 1: Crosshair Disappears on + Button Hover

**Symptom**: Hovering over the + button caused the crosshair and button to disappear and never come back.

**Root Cause**: The + button's `onMouseEnter` called `onCursorChange('pointer')`, which set `isOverKonvaElementRef.current = true`. This flag is checked to hide the crosshair when hovering interactive Konva elements (order/position labels). But for the + button, we want the crosshair to remain visible.

**Solution**: Set cursor directly on the stage container without using `onCursorChange`:
```typescript
const container = e.target.getStage()?.container();
if (container) container.style.cursor = 'pointer';
```

### Problem 2: Context Menu Positioned Incorrectly

**Symptom**: Menu appeared in wrong location, far from click point.

**Root Cause**: Used `position: absolute` with screen coordinates, but the menu was inside a transformed container.

**Solution**:
1. Changed to `position: fixed`
2. Render via `createPortal(menu, document.body)` to escape parent transforms
3. Use native event coordinates (`e.evt.clientX/Y` for Konva, `e.clientX/Y` for React)

### Problem 3: + Button Lagging Behind Crosshair

**Symptom**: When moving the mouse quickly, the + button lagged behind the crosshair line.

**Root Cause (Initial Attempt)**: The + button was rendered as a DOM element, which updates in React's render cycle. The crosshair is drawn on canvas in a RAF callback. These update at different times.

**Failed Solutions**:
1. **Direct DOM manipulation**: Updated button position in mouse handler, but this made it move FASTER than everything else
2. **flushSync always**: Would hurt performance

**Final Solution**: Render the + button as a **Konva element** in `PriceLineLayer`, in the same layer as the crosshair. Now both update in the same render cycle, perfectly synchronized.

### Problem 4: Native Context Menu Showing Instead of Custom

**Symptom**: Right-clicking showed browser's native context menu ("Save Image As...", etc.)

**Root Cause**: The Konva Stage sits on top of the canvas in the main pane area. Right-click events went to the Stage, which didn't have an `onContextMenu` handler.

**Solution**: Added `onContextMenu` handler to both canvas and Konva Stage.

### Problem 5: Order/Position Line Price Updates Not Rendering

**Symptom**: Calling `setPrice()` on an order line adapter (e.g., liquidation line) didn't update the visual position.

**Root Cause**: Race condition in `scheduleRender`:
1. `setPrice()` triggers `_render()` in Widget
2. `root.render()` schedules async React render (React 18)
3. If a RAF was already pending, it runs with **stale** ref data
4. React render completes, refs updated
5. useEffect calls `scheduleRender()`, but early-returns because RAF is "already scheduled"
6. No new RAF with updated data

**Solution**: Modified `scheduleRender` to always cancel pending RAF and reschedule:
```typescript
const scheduleRender = useCallback(() => {
  if (rafIdRef.current !== null) {
    cancelAnimationFrame(rafIdRef.current);
  }
  rafIdRef.current = requestAnimationFrame(() => {
    // ... render with latest ref data
  });
}, []);
```

## Current State

### Working Features
- [x] + button appears at correct position (left of price label, at crosshair Y)
- [x] + button shows pointer cursor on hover
- [x] + button click opens context menu
- [x] Crosshair lines remain visible when hovering + button
- [x] Right-click anywhere on chart opens context menu
- [x] Context menu positioned correctly (left of trigger, flips up near bottom)
- [x] Context menu closes on click outside or Escape
- [x] Order/position label hover still works (cursor change, drag)
- [x] Price axis cursor (ns-resize) still works
- [x] Crosshair line terminates before + button
- [x] + button perfectly synced with crosshair (both Konva)
- [x] Order line `setPrice()` updates render correctly

### API Usage

```typescript
// In CustomChartWidget options or ChartContainer props
onContextMenu={(unixTime: number, price: number) => {
  return [
    { text: 'Limit Buy', click: () => placeLimitOrder('buy', price) },
    { text: 'Limit Sell', click: () => placeLimitOrder('sell', price) },
    { text: '-' }, // Separator
    { text: 'Stop Buy', click: () => placeStopOrder('buy', price) },
    { text: 'Stop Sell', click: () => placeStopOrder('sell', price) },
  ];
}}
```

### Type Definitions

```typescript
// types.ts
export interface ContextMenuItem {
  text: string;           // Display text, '-' for separator
  click: () => void;      // Click handler
  enabled?: boolean;      // Optional disabled state
}
```

## Commits

1. `d8f17c1c39` - feat(customChart): add context menu with + button like TradingView
2. `4654a46a68` - refactor(customChart): replace Konva + button with DOM element
3. `1ccc48bb6e` - fix(customChart): add context menu handler to Konva Stage
4. `656eadc1c1` - refactor(customChart): remove DOM + button, use Konva for sync rendering
5. (pending) - fix(customChart): fix scheduleRender race condition for line updates

## Future Considerations

1. **Touch support**: The + button has `onTap` handler but hasn't been tested on touch devices
2. **Keyboard navigation**: Context menu could support arrow key navigation
3. **Submenu support**: Currently flat list only, could add nested menus
4. **Custom styling**: Menu uses hardcoded dark theme, could respect chart theme
