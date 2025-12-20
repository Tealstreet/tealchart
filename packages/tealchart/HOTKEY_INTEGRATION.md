# CustomChart Hotkey Integration

## Overview

This document tracks the implementation of TradingView-compatible hotkey support in CustomChartWidget, allowing the custom chart to integrate with the existing `useWidgetStateManagement.ts` and `useHotkeyHandlers.ts` infrastructure without any changes to those files.

---

## Goal

**Zero changes to `useWidgetStateManagement.ts`** - the custom chart should implement the same APIs that TradingView provides:
- `onShortcut(shortcut, callback)` - register keyboard shortcut handlers
- `subscribe('mouse_down', callback)` - mouse down events
- `subscribe('mouse_up', callback)` - mouse up events
- Crosshair position updates via `crossHairAtom`

---

## Completed Work

### 1. Keyboard Event Handling (Document-Level with Hover Tracking)

**File:** `CustomChartWidget.ts`

**Problem:** Container-level keyboard listeners require focus, which is unreliable.

**Solution:** Use document-level listeners with mouse hover tracking:
- Added `_isHovered` flag to track when mouse is over the chart container
- `mouseenter`/`mouseleave` events on container toggle the flag
- `keydown`/`keyup` events on `document` only process when `_isHovered` is true

```typescript
private _isHovered = false;

private _setupKeyboardListeners(): void {
  this._boundHandleKeyDown = this._handleKeyDown.bind(this);
  this._boundHandleKeyUp = this._handleKeyUp.bind(this);
  this._boundHandleMouseEnter = () => { this._isHovered = true; };
  this._boundHandleMouseLeave = () => { this._isHovered = false; };

  document.addEventListener('keydown', this._boundHandleKeyDown);
  document.addEventListener('keyup', this._boundHandleKeyUp);
  this._container.addEventListener('mouseenter', this._boundHandleMouseEnter);
  this._container.addEventListener('mouseleave', this._boundHandleMouseLeave);
}
```

**Commit:** `183c6a0218` - feat(customChart): complete hotkey integration with crosshair events

---

### 2. Shortcut Matching Logic

**File:** `CustomChartWidget.ts`

Parses TradingView-style shortcut strings and matches against keyboard events:

| Shortcut String | Meaning |
|----------------|---------|
| `"b"` | B key |
| `"ctrl+b"` | Ctrl + B |
| `"shift+a"` | Shift + A |
| `"Escape"` | Escape key |
| `"ctrl+shift+c"` | Ctrl + Shift + C |

```typescript
private _matchShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts.pop()!;
  const modifiers = new Set(parts);

  const eventKey = e.key.toLowerCase();
  const eventCode = e.code.toLowerCase();
  if (eventKey !== key && eventCode !== key) {
    return false;
  }

  if (modifiers.has('ctrl') !== e.ctrlKey) return false;
  if (modifiers.has('alt') !== e.altKey) return false;
  if (modifiers.has('shift') !== e.shiftKey) return false;
  if (modifiers.has('meta') !== e.metaKey) return false;

  return true;
}
```

---

### 3. Crosshair Event Emission

**Files:** `CustomChartWidget.ts`, `CustomChart.tsx`, `CustomChartRenderer.ts`

**Problem:** `useWidgetStateManagement.ts` relies on `crossHairAtom` being updated with the current price/time when the mouse moves over the chart. This is needed for click-to-place-order hotkeys.

**Solution:**
1. Added `publicXToTime()` method to `CustomChartRenderer`
2. Added `onCrossHairMoved` callback prop through `ChartContainer` to `CustomChart`
3. In `CustomChart.tsx` render loop, calculate price/time from crosshair position and call the callback
4. In `CustomChartWidget._render()`, emit the event via `chartApi.emitCrossHairMoved()`
5. Added 50ms throttle to prevent lag during rapid mouse movement or key repeat

```typescript
// In CustomChartWidget._render():
onCrossHairMoved: (price: number, time: number) => {
  const now = Date.now();
  if (now - this._lastCrossHairEmit >= this._crossHairEmitThrottleMs) {
    this._lastCrossHairEmit = now;
    this._chartApi.emitCrossHairMoved({ price, time });
  }
},
```

---

### 4. Mouse Event Emission (Fixed Double Events)

**Files:** `CustomChartWidget.ts`, `CustomChart.tsx`

**Problem:** `onMouseUp` was being called twice - once from `handleWindowMouseUp` and once from Konva Stage's `onMouseUp`.

**Solution:** Check if click was on a Konva element vs empty chart area:

```typescript
// In CustomChart.tsx Stage component:
onMouseDown={(e) => {
  const stage = e.target.getStage();
  const clickedOnStage = e.target === stage;
  const clickedOnLayer = e.target.getType?.() === 'Layer';
  if (clickedOnStage || clickedOnLayer) {
    // Click on empty area - forward to canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const syntheticEvent = new MouseEvent('mousedown', {...});
      canvas.dispatchEvent(syntheticEvent);
    }
  } else {
    // Click on Konva element - emit directly
    onMouseDown?.();
  }
}}
```

**Commit:** `14b89b2f93` - fix(customChart): dedupe order/position lines and fix double mouse events

---

### 5. Order/Position Line Deduplication

**Files:** `CustomChartApi.ts`, `types.ts`

**Problem:** When placing an order via hotkey, both the "submitting" order line and the API result order line would show briefly, causing visual duplication.

**Solution:** Added optional `orderId`/`positionId` fields for external ID tracking and deduplication:

```typescript
// In types.ts:
export interface OrderLineRenderData {
  id: string;           // Internal adapter ID
  orderId?: string;     // External order ID for deduplication
  // ...
}

export interface IOrderLineAdapter {
  setOrderId(orderId: string): this;
  // ...
}

// In CustomChartApi.ts getOrderLinesRenderData():
const seenOrderIds = new Map<string, OrderLineRenderData>();
const result: OrderLineRenderData[] = [];
for (const line of allLines) {
  if (line.orderId) {
    seenOrderIds.set(line.orderId, line);  // Later entries overwrite earlier
  } else {
    result.push(line);  // No ID = no deduplication
  }
}
result.push(...seenOrderIds.values());
return result;
```

---

### 6. Non-Click Hotkeys Fix (Focus Management + Event Propagation)

**Files:** `CustomChartWidget.ts`

**Problem:** Non-click hotkeys (like 'q' for toggle post-only, 'h' for toggle overlay) were not working, while click-based hotkeys ('a' + click to place order) and cancel hotkey ('x') worked.

**Root Cause:** Two issues were identified through debugging:

1. **Focus/Target Issue:** With document-level keyboard listeners, `e.target` is whatever element has focus on the page. `useHotkeyHandlers.isValidHotkeyPress()` rejects events when target is an INPUT/TEXTAREA/SELECT.

2. **Double-Triggering Issue:** Hotkey actions were triggering TWICE on CustomChart (e.g., toggle post-only was toggling on then immediately off, resulting in no visible change). This was because another keyboard listener was catching the same event after our callback completed.

**Solution:** Combined two fixes:

1. **Focus Management:** Auto-focus container on mouse enter with `tabIndex="-1"`:
   ```typescript
   this._boundHandleMouseEnter = () => {
     this._isHovered = true;
     this._container.focus();  // Focus so e.target is the container
   };

   // In _setupKeyboardListeners():
   this._container.tabIndex = -1;  // Focusable but not in tab order
   this._container.style.outline = 'none';  // Hide focus ring
   ```

2. **Stop Event Propagation:** Prevent other listeners from handling the same event:
   ```typescript
   private _handleKeyDown(e: KeyboardEvent): void {
     if (!this._isHovered) return;

     for (const [shortcut, callback] of this._shortcuts) {
       if (this._matchShortcut(e, shortcut)) {
         callback(e);
         // Stop propagation to prevent double-triggering
         e.stopPropagation();
         e.preventDefault();
       }
     }
   }
   ```

---

## Files Modified

| File | Changes |
|------|---------|
| `CustomChartWidget.ts` | Keyboard listeners, shortcut matching, mouse event emission, crosshair throttling, focus management, event propagation control |
| `CustomChart.tsx` | Mouse event forwarding with Konva element detection, crosshair calculation |
| `CustomChartApi.ts` | `orderId`/`positionId` fields, `setOrderId()`/`setPositionId()` methods, deduplication logic |
| `CustomChartRenderer.ts` | `publicXToTime()` method |
| `types.ts` | `orderId`, `positionId` fields in render data interfaces, setter methods in adapter interfaces |
| `ChartContainer.tsx` | Prop forwarding for mouse and crosshair callbacks |

---

## Status

**All hotkey integration is complete and working.** Both click-based hotkeys (hold key + click to place order) and non-click hotkeys (press key to toggle settings) work correctly.

---

## Commits

1. `183c6a0218` - feat(customChart): complete hotkey integration with crosshair events
2. `14b89b2f93` - fix(customChart): dedupe order/position lines and fix double mouse events

---

## Constraint

**All changes must be within `/packages/custom-chart/`** - no modifications allowed to `useWidgetStateManagement.ts`, `useHotkeyHandlers.ts`, or other external files.
