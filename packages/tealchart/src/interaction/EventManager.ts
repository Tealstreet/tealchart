/**
 * EventManager - Vanilla JS event handling for chart interactions
 *
 * Handles mouse, touch, wheel, and keyboard events for:
 * - Pan and zoom
 * - Price axis zoom
 * - Crosshair tracking
 * - Pinch-to-zoom (touch)
 * - Context menu (right-click and long-press)
 */

import type { Viewport } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface PaneInfo {
  paneId: string;
  yMin: number;
  yMax: number;
  /** Actual pixel height of this pane */
  paneHeight: number;
}

export interface EventManagerCallbacks {
  /** Called when viewport changes (pan, zoom, etc.) - triggers external callbacks */
  onViewportChange?: (viewport: Viewport) => void;
  /** Called during drag for internal viewport updates only (no external callback) */
  onViewportChangeInternal?: (viewport: Viewport) => void;
  /** Called when an indicator pane Y range changes (for price axis zoom) */
  onPaneYRangeChange?: (paneId: string, yMin: number, yMax: number) => void;
  /** Called when more historical bars are needed */
  onRequestMoreBars?: (direction: 'left' | 'right') => void;
  /** Called when crosshair position updates */
  onCrossHairMoved?: (x: number, y: number) => void;
  /** Called when crosshair visibility changes */
  onCrossHairVisibilityChange?: (visible: boolean) => void;
  /** Called on mouse down (for hotkey integration) */
  onMouseDown?: () => void;
  /** Called on mouse up (for hotkey integration) */
  onMouseUp?: () => void;
  /** Called on context menu (right-click or long-press) */
  onContextMenu?: (x: number, y: number, price: number, time: number) => void;
  /** Called when render is needed */
  onRender?: () => void;
  /** Called when cursor should change */
  onCursorChange?: (cursor: string) => void;
  /** Get current viewport */
  getViewport: () => Viewport;
  /** Get chart dimensions */
  getDimensions: () => {
    width: number;
    height: number;
    priceAxisWidth: number;
    timeAxisHeight: number;
    topMargin: number;
    leftMargin: number;
  };
  /** Get pane at Y position (for price-axis zoom) */
  getPaneAtY?: (y: number) => PaneInfo | null;
  /** Get divider at Y position (for pane resizing) */
  getDividerAtY?: (y: number) => PaneDividerInfo | null;
  /** Called when pane heights change via divider drag */
  onPaneHeightsChange?: (heights: { paneId: string; heightRatio: number }[]) => void;
  /** Called when auto-scale should be disabled (user starts price axis zoom) */
  onAutoScaleDisabled?: (paneId: string) => void;
  /** Returns whether auto-scale is active for a given pane (pan should skip vertical movement) */
  isAutoScale?: (paneId: string) => boolean;
  /** Check if position is over interactive Konva element */
  isOverInteractiveElement?: (x: number, y: number) => boolean;
  /** Get price from Y coordinate */
  getPriceFromY?: (y: number) => number;
  /** Get time from X coordinate */
  getTimeFromX?: (x: number) => number;
  /** Called on double-click/double-tap on a pane */
  onPaneDoubleClick?: (paneId: string, point: { x: number; y: number }) => void;
  /** Called on chart-surface click/tap when user drawing input wants first refusal */
  onDrawingInput?: (x: number, y: number, source: 'mouse' | 'touch', options?: DrawingInputEventOptions) => DrawingInputResult;
  /** Called before drag starts when drawing mode may need to preserve click input */
  onDrawingDragPending?: (x: number, y: number, source: 'mouse' | 'touch', options?: DrawingDragEventOptions) => boolean;
  /** Called before pan starts so selected drawing edits can claim the drag */
  onDrawingDragStart?: (x: number, y: number, source: 'mouse' | 'touch', options?: DrawingDragEventOptions) => boolean;
  /** Called while an active drawing edit drag moves */
  onDrawingDragMove?: (x: number, y: number, source: 'mouse' | 'touch', options?: DrawingDragEventOptions) => boolean;
  /** Called when an active drawing edit drag ends */
  onDrawingDragEnd?: (source: 'mouse' | 'touch') => void;
  /** Crosshair-only render (skips main canvas repaint) */
  onCrosshairRender?: () => void;
}

export interface DrawingInputHandledResult {
  handled: boolean;
  allowPaneDoubleClick?: boolean;
}

export interface DrawingInputEventOptions {
  additiveSelection?: boolean;
}

export interface DrawingDragEventOptions {
  constrainedPlacement?: boolean;
}

export type DrawingInputResult = boolean | DrawingInputHandledResult;

function isDrawingInputHandled(result: DrawingInputResult | undefined): boolean {
  return typeof result === 'boolean' ? result : result?.handled === true;
}

function allowsPaneDoubleClick(result: DrawingInputResult | undefined): boolean {
  return typeof result === 'boolean' ? false : result?.allowPaneDoubleClick === true;
}

function getMouseDrawingDragOptions(e: MouseEvent): DrawingDragEventOptions | undefined {
  return e.shiftKey ? { constrainedPlacement: true } : undefined;
}

function invokeDrawingDragCallback(
  callback: ((x: number, y: number, source: 'mouse' | 'touch', options?: DrawingDragEventOptions) => boolean) | undefined,
  x: number,
  y: number,
  source: 'mouse' | 'touch',
  options?: DrawingDragEventOptions,
): boolean {
  return options ? callback?.(x, y, source, options) === true : callback?.(x, y, source) === true;
}

export type DragMode = 'none' | 'pan' | 'priceAxisZoom' | 'paneDivider' | 'drawing' | 'pendingDrawing';

export interface PaneDividerInfo {
  /** Index of the divider (0 = between pane 0 and 1, etc.) */
  dividerIndex: number;
  /** Y position of the divider */
  y: number;
  /** ID of the pane above the divider */
  paneAboveId: string;
  /** ID of the pane below the divider */
  paneBelowId: string;
  /** Height ratio of pane above at drag start */
  paneAboveRatio: number;
  /** Height ratio of pane below at drag start */
  paneBelowRatio: number;
}

export interface InteractionState {
  isDragging: boolean;
  dragMode: DragMode;
  dragStartX: number;
  dragStartY: number;
  dragStartViewport: Viewport | null;
  draggedPaneId: string | null;
  dragStartPaneYRange: { yMin: number; yMax: number } | null;
  dragStartPaneHeight: number;
  isOverPriceAxis: boolean;
  isOverPaneDivider: boolean;
  isOverInteractive: boolean;
  hoveredDividerIndex: number;
  hoveredX: number;
  hoveredY: number;
  // Crosshair position at drag start (for tracking during drag)
  dragStartCrosshairX: number;
  dragStartCrosshairY: number;
  // Pane divider drag state
  draggedDivider: PaneDividerInfo | null;
}

export interface CrosshairState {
  visible: boolean;
  x: number;
  y: number;
}

// ============================================================================
// Constants
// ============================================================================

const TOUCH_TAP_THRESHOLD = 10; // Max movement in pixels for a touch to be considered a tap
const TOUCH_TAP_TIMEOUT = 300; // Max duration in ms for a touch to be considered a tap
const LONG_PRESS_DURATION = 500; // Duration for long-press context menu
const ZOOM_FACTOR = 1.015; // Wheel zoom factor

// ============================================================================
// EventManager Class
// ============================================================================

export class EventManager {
  private container: HTMLElement;
  private callbacks: EventManagerCallbacks;

  // Interaction state
  private state: InteractionState = {
    isDragging: false,
    dragMode: 'none',
    dragStartX: 0,
    dragStartY: 0,
    dragStartViewport: null,
    draggedPaneId: null,
    dragStartPaneYRange: null,
    dragStartPaneHeight: 0,
    isOverPriceAxis: false,
    isOverPaneDivider: false,
    isOverInteractive: false,
    hoveredDividerIndex: -1,
    hoveredX: 0,
    hoveredY: 0,
    dragStartCrosshairX: 0,
    dragStartCrosshairY: 0,
    draggedDivider: null,
  };

  // Crosshair state
  private crosshair: CrosshairState = {
    visible: false,
    x: 0,
    y: 0,
  };

  // Touch tracking
  private activeTouches = new Map<number, { x: number; y: number }>();
  private touchStart: { x: number; y: number; time: number } | null = null;
  private isTouchDragging = false;
  private touchCrosshairLocked = false;
  private touchCrosshairPosition = { x: 0, y: 0 };
  private pinchStartDistance = 0;
  private pinchStartViewport: Viewport | null = null;
  private touchYPanUnlocked = false;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;

  // Double-click/double-tap tracking
  private _lastClickTime = 0;
  private _lastClickPaneId: string | null = null;

  // RAF batching
  private renderScheduled = false;

  // Bound handlers for cleanup
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundMouseLeave: (e: MouseEvent) => void;
  private boundWheel: (e: WheelEvent) => void;
  private boundContextMenu: (e: MouseEvent) => void;
  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundWindowMouseMove: (e: MouseEvent) => void;
  private boundWindowMouseUp: (e: MouseEvent) => void;
  private boundDocumentMouseMove: (e: MouseEvent) => void;

  constructor(container: HTMLElement, callbacks: EventManagerCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // Bind handlers
    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
    this.boundMouseLeave = this.handleMouseLeave.bind(this);
    this.boundWheel = this.handleWheel.bind(this);
    this.boundContextMenu = this.handleContextMenu.bind(this);
    this.boundTouchStart = this.handleTouchStart.bind(this);
    this.boundTouchMove = this.handleTouchMove.bind(this);
    this.boundTouchEnd = this.handleTouchEnd.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundWindowMouseMove = this.handleWindowMouseMove.bind(this);
    this.boundWindowMouseUp = this.handleWindowMouseUp.bind(this);
    this.boundDocumentMouseMove = this.handleDocumentMouseMove.bind(this);

    this.attach();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get current interaction state
   */
  getState(): Readonly<InteractionState> {
    return { ...this.state };
  }

  /**
   * Get current crosshair state
   */
  getCrosshair(): Readonly<CrosshairState> {
    return { ...this.crosshair };
  }

  /**
   * Check if currently dragging (panning or zooming)
   * Used by ChartCore to skip expensive updates during drag
   */
  getIsDragging(): boolean {
    return this.state.isDragging;
  }

  /**
   * Dispose and remove all event listeners
   */
  dispose(): void {
    this.detach();
    this.clearLongPressTimer();
    if (this._inputRafId !== null) {
      cancelAnimationFrame(this._inputRafId);
      this._inputRafId = null;
    }
  }

  // ============================================================================
  // Private: Attach/Detach
  // ============================================================================

  private attach(): void {
    // Detach first to prevent duplicate listeners on HMR remount
    this.detach();

    // Mouse events (capture phase for priority)
    this.container.addEventListener('mousedown', this.boundMouseDown, { capture: true });
    this.container.addEventListener('mousemove', this.boundMouseMove, { capture: true });
    this.container.addEventListener('mouseleave', this.boundMouseLeave);
    this.container.addEventListener('contextmenu', this.boundContextMenu, { capture: true });

    // Wheel event (capture, passive: false for preventDefault)
    this.container.addEventListener('wheel', this.boundWheel, { capture: true, passive: false });

    // Touch events (capture, passive: false for preventDefault)
    this.container.addEventListener('touchstart', this.boundTouchStart, { capture: true, passive: false });
    this.container.addEventListener('touchmove', this.boundTouchMove, { capture: true, passive: false });
    this.container.addEventListener('touchend', this.boundTouchEnd, { capture: true, passive: false });
    this.container.addEventListener('touchcancel', this.boundTouchEnd, { capture: true, passive: false });

    // Keyboard events
    document.addEventListener('keydown', this.boundKeyDown);

    // Document-level mousemove to catch fast mouse exits
    document.addEventListener('mousemove', this.boundDocumentMouseMove);
  }

  private detach(): void {
    // Container events
    this.container.removeEventListener('mousedown', this.boundMouseDown, { capture: true });
    this.container.removeEventListener('mousemove', this.boundMouseMove, { capture: true });
    this.container.removeEventListener('mouseleave', this.boundMouseLeave);
    this.container.removeEventListener('contextmenu', this.boundContextMenu, { capture: true });
    this.container.removeEventListener('wheel', this.boundWheel, { capture: true });
    this.container.removeEventListener('touchstart', this.boundTouchStart, { capture: true });
    this.container.removeEventListener('touchmove', this.boundTouchMove, { capture: true });
    this.container.removeEventListener('touchend', this.boundTouchEnd, { capture: true });
    this.container.removeEventListener('touchcancel', this.boundTouchEnd, { capture: true });

    // Window events (only if dragging was active)
    window.removeEventListener('mousemove', this.boundWindowMouseMove);
    window.removeEventListener('mouseup', this.boundWindowMouseUp);

    // Document events
    document.removeEventListener('keydown', this.boundKeyDown);
    document.removeEventListener('mousemove', this.boundDocumentMouseMove);
  }

  // ============================================================================
  // Private: Mouse Events
  // ============================================================================

  private handleMouseDown(e: MouseEvent): void {
    // Skip if over interactive element (like order lines)
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.callbacks.isOverInteractiveElement?.(x, y)) {
      return;
    }

    this.callbacks.onMouseDown?.();

    const dims = this.callbacks.getDimensions();

    // Check if over a pane divider first
    const divider = this.callbacks.getDividerAtY?.(y);
    if (divider) {
      this.state.isDragging = true;
      this.state.dragMode = 'paneDivider';
      this.state.dragStartX = x;
      this.state.dragStartY = y;
      this.state.draggedDivider = divider;
      this.callbacks.onCursorChange?.('ns-resize');

      window.addEventListener('mousemove', this.boundWindowMouseMove);
      window.addEventListener('mouseup', this.boundWindowMouseUp);
      return;
    }

    if (e.button === 0 && invokeDrawingDragCallback(this.callbacks.onDrawingDragPending, x, y, 'mouse', getMouseDrawingDragOptions(e))) {
      this.state.isDragging = true;
      this.state.dragMode = 'pendingDrawing';
      this.state.dragStartX = x;
      this.state.dragStartY = y;
      window.addEventListener('mousemove', this.boundWindowMouseMove);
      window.addEventListener('mouseup', this.boundWindowMouseUp);
      return;
    }

    if (e.button === 0 && invokeDrawingDragCallback(this.callbacks.onDrawingDragStart, x, y, 'mouse', getMouseDrawingDragOptions(e))) {
      this.state.isDragging = true;
      this.state.dragMode = 'drawing';
      this.state.dragStartX = x;
      this.state.dragStartY = y;
      this.callbacks.onCursorChange?.('move');
      window.addEventListener('mousemove', this.boundWindowMouseMove);
      window.addEventListener('mouseup', this.boundWindowMouseUp);
      this.scheduleRender();
      return;
    }

    const isOverPriceAxis = x > dims.width - dims.priceAxisWidth;

    const viewport = this.callbacks.getViewport();
    this.state.isDragging = true;
    this.state.dragMode = isOverPriceAxis ? 'priceAxisZoom' : 'pan';
    this.state.dragStartX = x;
    this.state.dragStartY = y;
    this.state.dragStartViewport = { ...viewport };
    // Save crosshair position at drag start for tracking during drag
    this.state.dragStartCrosshairX = this.crosshair.x;
    this.state.dragStartCrosshairY = this.crosshair.y;

    // Track which pane the drag started in (for both pan and price-axis zoom)
    if (this.callbacks.getPaneAtY) {
      const pane = this.callbacks.getPaneAtY(y);
      if (pane) {
        this.state.draggedPaneId = pane.paneId;
        this.state.dragStartPaneYRange = { yMin: pane.yMin, yMax: pane.yMax };
        this.state.dragStartPaneHeight = pane.paneHeight;
      }
    }

    // Notify that auto-scale should be disabled when user zooms the price axis
    if (isOverPriceAxis) {
      this.callbacks.onAutoScaleDisabled?.(this.state.draggedPaneId ?? 'main');
    }

    // Add window listeners for off-canvas drag
    window.addEventListener('mousemove', this.boundWindowMouseMove);
    window.addEventListener('mouseup', this.boundWindowMouseUp);

    // Set cursor based on drag mode
    if (this.state.dragMode === 'pan') {
      this.callbacks.onCursorChange?.('grabbing');
    } else if (this.state.dragMode === 'priceAxisZoom') {
      this.callbacks.onCursorChange?.('ns-resize');
    }

    this.scheduleRender();
  }

  // Unified pending input state — all high-frequency handlers store data and defer to RAF
  private _pendingEventType: 'none' | 'move' | 'drag' | 'touchmove' | 'leave' | 'docmove' = 'none';
  private _pendingMouseClientX = 0;
  private _pendingMouseClientY = 0;
  private _pendingMouseConstrainedPlacement = false;
  private _pendingTouchEvent: TouchEvent | null = null;
  private _inputRafId: number | null = null;

  /**
   * Schedule deferred input processing in next RAF frame.
   * All high-frequency handlers (mousemove, drag, touchmove, leave, docmove)
   * store their data and call this instead of processing inline.
   */
  private scheduleInputProcessing(): void {
    if (this._inputRafId !== null) return; // Already scheduled
    this._inputRafId = requestAnimationFrame(() => {
      this._inputRafId = null;
      this.processInput();
    });
  }

  /**
   * Process the pending input event based on type.
   */
  private processInput(): void {
    const type = this._pendingEventType;
    this._pendingEventType = 'none';

    switch (type) {
      case 'move':
        this.processMouseMove();
        break;
      case 'drag':
        this.processDrag();
        break;
      case 'touchmove':
        if (this._pendingTouchEvent) {
          this.processTouchMove(this._pendingTouchEvent);
          this._pendingTouchEvent = null;
        }
        break;
      case 'leave':
        this.processMouseLeave();
        break;
      case 'docmove':
        this.processDocumentMouseMove();
        break;
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    // Store raw coordinates and defer ALL processing to RAF.
    this._pendingMouseClientX = e.clientX;
    this._pendingMouseClientY = e.clientY;
    this._pendingEventType = 'move';
    this.scheduleInputProcessing();
  }

  private processMouseMove(): void {
    const rect = this.container.getBoundingClientRect();
    const x = this._pendingMouseClientX - rect.left;
    const y = this._pendingMouseClientY - rect.top;

    this.state.hoveredX = x;
    this.state.hoveredY = y;

    const dims = this.callbacks.getDimensions();
    this.state.isOverPriceAxis = x > dims.width - dims.priceAxisWidth;

    // Check for pane divider hover
    const divider = this.callbacks.getDividerAtY?.(y);
    this.state.isOverPaneDivider = divider !== null && divider !== undefined;
    this.state.hoveredDividerIndex = divider?.dividerIndex ?? -1;

    // Check if in dead zone (top bar or time axis - areas where crosshair shouldn't show)
    const inDeadZone = y < dims.topMargin || y > dims.height - dims.timeAxisHeight;
    this.state.isOverInteractive =
      !this.state.isOverPriceAxis && !this.state.isOverPaneDivider && !inDeadZone && !!this.callbacks.isOverInteractiveElement?.(x, y);

    // Update crosshair - hide when over price axis, divider, or in dead zones
    if (!this.state.isDragging) {
      const shouldShowCrosshair = !this.state.isOverPriceAxis && !this.state.isOverPaneDivider && !inDeadZone;
      const wasVisible = this.crosshair.visible;
      this.crosshair.visible = shouldShowCrosshair;
      this.crosshair.x = x;
      this.crosshair.y = y;
      if (shouldShowCrosshair) {
        this.callbacks.onCrossHairMoved?.(x, y);
      }
      // Notify visibility change
      if (wasVisible !== shouldShowCrosshair) {
        this.callbacks.onCrossHairVisibilityChange?.(shouldShowCrosshair);
      }
      // Re-assert cursor on every move. Konva/button handlers can set the cursor
      // directly, and relying only on state transitions can leave the container
      // stuck in pointer mode after an interaction completes.
      if (this.state.isOverPaneDivider) {
        this.callbacks.onCursorChange?.('ns-resize');
      } else if (this.state.isOverPriceAxis) {
        this.callbacks.onCursorChange?.('ns-resize');
      } else if (this.state.isOverInteractive) {
        this.callbacks.onCursorChange?.('pointer');
      } else {
        this.callbacks.onCursorChange?.('crosshair');
      }
      // Render crosshair overlay directly (we're already in RAF)
      this.callbacks.onCrosshairRender?.();
    }
    // Note: During drag, we don't call scheduleRender here because
    // handleWindowMouseMove → handlePan → onViewportChange already does it
  }

  private handleWindowMouseMove(e: MouseEvent): void {
    if (!this.state.isDragging) return;
    // Store coordinates and defer to RAF
    this._pendingMouseClientX = e.clientX;
    this._pendingMouseClientY = e.clientY;
    this._pendingMouseConstrainedPlacement = e.shiftKey;
    this._pendingEventType = 'drag';
    this.scheduleInputProcessing();
  }

  private processDrag(): void {
    if (!this.state.isDragging) return;

    const rect = this.container.getBoundingClientRect();
    const x = this._pendingMouseClientX - rect.left;
    const y = this._pendingMouseClientY - rect.top;

    // Handle pane divider dragging
    if (this.state.dragMode === 'paneDivider') {
      this.handlePaneDividerDrag(y);
      return;
    }

    if (this.state.dragMode === 'pendingDrawing') {
      const distance = Math.hypot(x - this.state.dragStartX, y - this.state.dragStartY);
      if (distance < 5) return;

      const options = this._pendingMouseConstrainedPlacement ? { constrainedPlacement: true } : undefined;
      if (invokeDrawingDragCallback(this.callbacks.onDrawingDragStart, this.state.dragStartX, this.state.dragStartY, 'mouse', options)) {
        this.state.dragMode = 'drawing';
        this.callbacks.onCursorChange?.('move');
        invokeDrawingDragCallback(this.callbacks.onDrawingDragMove, x, y, 'mouse', options);
        this.scheduleRender();
      }
      return;
    }

    if (this.state.dragMode === 'drawing') {
      invokeDrawingDragCallback(
        this.callbacks.onDrawingDragMove,
        x,
        y,
        'mouse',
        this._pendingMouseConstrainedPlacement ? { constrainedPlacement: true } : undefined,
      );
      this.scheduleRender();
      return;
    }

    if (!this.state.dragStartViewport) return;

    const dx = x - this.state.dragStartX;
    const dy = y - this.state.dragStartY;

    if (this.state.dragMode === 'pan') {
      this.handlePan(dx, dy);
      // Update crosshair to follow data during pan
      this.crosshair.x = this.state.dragStartCrosshairX + dx;
      this.crosshair.y = this.state.dragStartCrosshairY + dy;
      this.callbacks.onCrossHairMoved?.(this.crosshair.x, this.crosshair.y);
    } else if (this.state.dragMode === 'priceAxisZoom') {
      this.handlePriceAxisZoom(dy);
    }
    // handlePan/handlePriceAxisZoom call onViewportChange(Internal) which schedules render
  }

  private handleMouseUp(e: MouseEvent): void {
    this.handleWindowMouseUp(e);
  }

  private handleWindowMouseUp(e: MouseEvent): void {
    this.callbacks.onMouseUp?.();

    // Double-click detection — only if mouse didn't move (click, not drag)
    const rect = this.container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const dx = Math.abs(mouseX - this.state.dragStartX);
    const dy = Math.abs(mouseY - this.state.dragStartY);
    const wasClick = dx < 5 && dy < 5;

    let wasDrawingDrag = this.state.dragMode === 'drawing';
    if (!wasClick && this.state.dragMode === 'pendingDrawing') {
      const drawingDragOptions = getMouseDrawingDragOptions(e);
      wasDrawingDrag = invokeDrawingDragCallback(
        this.callbacks.onDrawingDragStart,
        this.state.dragStartX,
        this.state.dragStartY,
        'mouse',
        drawingDragOptions,
      );
      if (wasDrawingDrag) {
        invokeDrawingDragCallback(this.callbacks.onDrawingDragMove, mouseX, mouseY, 'mouse', drawingDragOptions);
      }
    }
    const drawingInputResult =
      wasClick && !wasDrawingDrag && e.button === 0
        ? this.callbacks.onDrawingInput?.(mouseX, mouseY, 'mouse', {
            additiveSelection: e.shiftKey || e.metaKey || e.ctrlKey,
          })
        : false;
    const handledDrawingInput = isDrawingInputHandled(drawingInputResult);

    if (
      wasClick &&
      !handledDrawingInput &&
      e.button === 0 &&
      this.callbacks.onPaneDoubleClick &&
      this.callbacks.getPaneAtY
    ) {
      const y = mouseY;
      const pane = this.callbacks.getPaneAtY(y);
      if (pane) {
        const now = Date.now();
        if (this._lastClickPaneId === pane.paneId && now - this._lastClickTime < 300) {
          this.callbacks.onPaneDoubleClick(pane.paneId, { x: mouseX, y: mouseY });
          this._lastClickTime = 0;
          this._lastClickPaneId = null;
        } else {
          this._lastClickTime = now;
          this._lastClickPaneId = pane.paneId;
        }
      }
    } else if (!wasClick) {
      this._lastClickTime = 0;
      this._lastClickPaneId = null;
    }

    if (this.state.isDragging) {
      if (wasDrawingDrag) {
        this.callbacks.onDrawingDragEnd?.('mouse');
      }
      this.state.isDragging = false;
      this.state.dragMode = 'none';

      // Reset cursor back to crosshair
      this.callbacks.onCursorChange?.('crosshair');

      // Sync viewport change
      if (!wasDrawingDrag) {
        this.callbacks.onViewportChange?.(this.callbacks.getViewport());
      }
    }

    this.state.dragStartViewport = null;
    this.state.draggedPaneId = null;
    this.state.dragStartPaneYRange = null;
    this.state.dragStartPaneHeight = 0;
    this.state.draggedDivider = null;
    this._pendingMouseConstrainedPlacement = false;

    // Remove window listeners
    window.removeEventListener('mousemove', this.boundWindowMouseMove);
    window.removeEventListener('mouseup', this.boundWindowMouseUp);

    this.scheduleRender();
  }

  private handleMouseLeave(_e: MouseEvent): void {
    if (!this.state.isDragging) {
      this._pendingEventType = 'leave';
      this.scheduleInputProcessing();
    }
  }

  private processMouseLeave(): void {
    if (!this.state.isDragging) {
      const wasVisible = this.crosshair.visible;
      this.crosshair.visible = false;
      if (wasVisible) {
        this.callbacks.onCrossHairVisibilityChange?.(false);
      }
      this.scheduleRender();
    }
  }

  /**
   * Document-level mousemove listener to catch fast mouse exits
   * The container's onMouseLeave can miss events when the mouse moves quickly
   */
  private handleDocumentMouseMove(e: MouseEvent): void {
    // Skip if dragging (drag continues via window listeners)
    if (this.state.isDragging) return;
    // Skip if crosshair not visible (nothing to hide)
    if (!this.crosshair.visible) return;
    // Don't overwrite a higher-priority pending event (move, drag, touchmove)
    // Both container mousemove and document mousemove fire for the same event —
    // container handler sets 'move', we must not clobber it with 'docmove'
    if (this._pendingEventType !== 'none') return;

    this._pendingMouseClientX = e.clientX;
    this._pendingMouseClientY = e.clientY;
    this._pendingEventType = 'docmove';
    this.scheduleInputProcessing();
  }

  private processDocumentMouseMove(): void {
    if (this.state.isDragging) return;
    if (!this.crosshair.visible) return;

    const rect = this.container.getBoundingClientRect();
    const isInside =
      this._pendingMouseClientX >= rect.left &&
      this._pendingMouseClientX <= rect.right &&
      this._pendingMouseClientY >= rect.top &&
      this._pendingMouseClientY <= rect.bottom;

    if (!isInside) {
      // Mouse is outside container - hide crosshair
      this.crosshair.visible = false;
      this.state.isOverPriceAxis = false;
      this.callbacks.onCrossHairVisibilityChange?.(false);
      this.scheduleRender();
      this.callbacks.onCursorChange?.('crosshair');
    }
  }

  // ============================================================================
  // Private: Wheel Event
  // ============================================================================

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();

    const viewport = this.callbacks.getViewport();
    const dims = this.callbacks.getDimensions();

    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      // Horizontal scroll = pan
      const panAmount = e.deltaX * 0.5;
      const newViewport = this.panViewport(viewport, panAmount, dims.width);
      this.callbacks.onViewportChange?.(newViewport);
    } else {
      // Vertical scroll = zoom
      const zoomFactor = e.deltaY > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      const newViewport = this.zoomViewport(viewport, zoomFactor, dims.width);
      this.callbacks.onViewportChange?.(newViewport);
    }

    this.scheduleRender();
  }

  // ============================================================================
  // Private: Touch Events
  // ============================================================================

  private handleTouchStart(e: TouchEvent): void {
    // Track all touches
    for (const touch of Array.from(e.changedTouches)) {
      this.activeTouches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
      });
    }

    const rect = this.container.getBoundingClientRect();
    const firstTouch = e.touches[0];
    const x = firstTouch.clientX - rect.left;
    const y = firstTouch.clientY - rect.top;

    // Skip if over interactive element
    if (this.callbacks.isOverInteractiveElement?.(x, y)) {
      return;
    }

    if (e.touches.length === 1) {
      // Single touch - start potential drag or long-press
      this.touchStart = { x, y, time: Date.now() };
      this.isTouchDragging = false;
      this.touchYPanUnlocked = false;

      const dims = this.callbacks.getDimensions();
      const isOverPriceAxis = x > dims.width - dims.priceAxisWidth;

      const drawingDragPending = this.callbacks.onDrawingDragPending?.(x, y, 'touch') === true;
      const drawingDragStarted = !drawingDragPending && this.callbacks.onDrawingDragStart?.(x, y, 'touch') === true;

      const viewport = this.callbacks.getViewport();
      this.state.dragStartX = x;
      this.state.dragStartY = y;
      this.state.dragStartViewport = { ...viewport };
      this.state.dragMode = drawingDragPending ? 'pendingDrawing' : drawingDragStarted ? 'drawing' : isOverPriceAxis ? 'priceAxisZoom' : 'pan';
      // Save crosshair position at touch start for tracking during drag
      this.state.dragStartCrosshairX = this.crosshair.x;
      this.state.dragStartCrosshairY = this.crosshair.y;

      // Track which pane the touch started in (for both pan and price-axis zoom)
      if (this.callbacks.getPaneAtY) {
        const pane = this.callbacks.getPaneAtY(y);
        if (pane) {
          this.state.draggedPaneId = pane.paneId;
          this.state.dragStartPaneYRange = { yMin: pane.yMin, yMax: pane.yMax };
          this.state.dragStartPaneHeight = pane.paneHeight;
          if (isOverPriceAxis && !drawingDragStarted) {
            this.touchYPanUnlocked = true; // Allow Y-axis zooming immediately for price axis drag
          }
        }
      }

      // Notify that auto-scale should be disabled when user zooms the price axis
      if (isOverPriceAxis && !drawingDragStarted) {
        this.callbacks.onAutoScaleDisabled?.(this.state.draggedPaneId ?? 'main');
      }

      // Start long-press timer for context menu
      this.clearLongPressTimer();
      if (!drawingDragStarted) {
        this.longPressTimer = setTimeout(() => {
          if (!this.isTouchDragging && this.touchStart) {
            // Long press triggered - show context menu
            const price = this.callbacks.getPriceFromY?.(y) ?? 0;
            const time = this.callbacks.getTimeFromX?.(x) ?? 0;
            this.callbacks.onContextMenu?.(x, y, price, time);
          }
        }, LONG_PRESS_DURATION);
      }
    } else if (e.touches.length === 2 && this.state.dragMode !== 'drawing' && this.state.dragMode !== 'pendingDrawing') {
      // Two touches - prepare for pinch zoom
      this.clearLongPressTimer();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      this.pinchStartDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      this.pinchStartViewport = { ...this.callbacks.getViewport() };
    }

    e.preventDefault();
  }

  private handleTouchMove(e: TouchEvent): void {
    // Update tracked touches synchronously (needed for state consistency)
    for (const touch of Array.from(e.changedTouches)) {
      this.activeTouches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
      });
    }

    // preventDefault must be synchronous
    e.preventDefault();

    // Store touch event data and defer heavy processing to RAF
    this._pendingTouchEvent = e;
    this._pendingEventType = 'touchmove';
    this.scheduleInputProcessing();
  }

  private processTouchMove(e: TouchEvent): void {
    const rect = this.container.getBoundingClientRect();

    if (e.touches.length === 1 && this.touchStart) {
      // Single touch drag
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const dx = x - this.state.dragStartX;
      const dy = y - this.state.dragStartY;
      const distance = Math.hypot(x - this.touchStart.x, y - this.touchStart.y);

      if (distance > TOUCH_TAP_THRESHOLD) {
        this.isTouchDragging = true;
        this.clearLongPressTimer();
        this.state.isDragging = true;

        if (this.state.dragMode === 'pendingDrawing') {
          if (this.callbacks.onDrawingDragStart?.(this.state.dragStartX, this.state.dragStartY, 'touch')) {
            this.state.dragMode = 'drawing';
            this.callbacks.onDrawingDragMove?.(x, y, 'touch');
            this.scheduleRender();
          }
        } else if (this.state.dragMode === 'drawing') {
          this.callbacks.onDrawingDragMove?.(x, y, 'touch');
          this.scheduleRender();
        } else if (this.touchCrosshairLocked) {
          // Move crosshair proportionally
          this.crosshair.x = this.touchCrosshairPosition.x + dx;
          this.crosshair.y = this.touchCrosshairPosition.y + dy;
          this.callbacks.onCrossHairMoved?.(this.crosshair.x, this.crosshair.y);
        } else if (this.state.dragMode === 'priceAxisZoom') {
          this.handlePriceAxisZoom(dy);
        } else {
          this.handlePan(dx, dy);
          // Update crosshair to follow data during touch pan
          this.crosshair.x = this.state.dragStartCrosshairX + dx;
          this.crosshair.y = this.state.dragStartCrosshairY + dy;
          this.callbacks.onCrossHairMoved?.(this.crosshair.x, this.crosshair.y);
        }
      }
    } else if (
      e.touches.length === 2 &&
      this.pinchStartViewport &&
      this.state.dragMode !== 'drawing' &&
      this.state.dragMode !== 'pendingDrawing'
    ) {
      // Pinch zoom
      this.clearLongPressTimer();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

      if (this.pinchStartDistance > 0) {
        // Scale inverted: spreading fingers zooms out (shows more data)
        const scale = this.pinchStartDistance / currentDistance;
        const dims = this.callbacks.getDimensions();
        const newViewport = this.zoomViewport(this.pinchStartViewport, scale, dims.width);
        const updateViewport = this.callbacks.onViewportChangeInternal ?? this.callbacks.onViewportChange;
        updateViewport?.(newViewport);
      }
    }
    // handlePan/handlePriceAxisZoom/onViewportChange/onCrossHairMoved schedule render
  }

  private handleTouchEnd(e: TouchEvent): void {
    const endedTouches = Array.from(e.changedTouches);
    // Remove ended touches
    for (const touch of endedTouches) {
      this.activeTouches.delete(touch.identifier);
    }

    this.clearLongPressTimer();

    if (e.touches.length === 0 && this.touchStart) {
      const endTime = Date.now();
      const duration = endTime - this.touchStart.time;
      const changedTouch = endedTouches[0];
      const rect = this.container.getBoundingClientRect();
      const endX = changedTouch ? changedTouch.clientX - rect.left : this.touchStart.x;
      const endY = changedTouch ? changedTouch.clientY - rect.top : this.touchStart.y;
      const endDistance = Math.hypot(endX - this.touchStart.x, endY - this.touchStart.y);

      if (
        !this.isTouchDragging &&
        e.type === 'touchend' &&
        endDistance > TOUCH_TAP_THRESHOLD &&
        this.state.dragMode === 'pendingDrawing' &&
        this.callbacks.onDrawingDragStart?.(this.state.dragStartX, this.state.dragStartY, 'touch')
      ) {
        this.isTouchDragging = true;
        this.state.isDragging = true;
        this.state.dragMode = 'drawing';
        this.callbacks.onDrawingDragMove?.(endX, endY, 'touch');
      }

      if (!this.isTouchDragging && e.type === 'touchend' && duration < TOUCH_TAP_TIMEOUT) {
        // This was a tap, not a drag
        this.handleTap(this.touchStart.x, this.touchStart.y);
      } else if (this.state.isDragging) {
        if (this.state.dragMode === 'drawing') {
          this.callbacks.onDrawingDragEnd?.('touch');
        } else {
          // Drag ended - sync viewport
          this.callbacks.onViewportChange?.(this.callbacks.getViewport());
        }
      }

      this.touchStart = null;
      this.state.isDragging = false;
      this.state.dragMode = 'none';
      this.state.dragStartViewport = null;
      this.state.draggedPaneId = null;
      this.state.dragStartPaneYRange = null;
      this.state.dragStartPaneHeight = 0;
      this.state.draggedDivider = null;
    }

    // Reset pinch state when going from 2 to 1 touch
    if (e.touches.length === 1) {
      this.pinchStartDistance = 0;
      this.pinchStartViewport = null;
      // Re-initialize drag from current position
      const touch = e.touches[0];
      const rect = this.container.getBoundingClientRect();
      this.state.dragStartX = touch.clientX - rect.left;
      this.state.dragStartY = touch.clientY - rect.top;
      this.state.dragStartViewport = { ...this.callbacks.getViewport() };
    }

    e.preventDefault();
    this.scheduleRender();
  }

  private handleTap(x: number, y: number): void {
    const drawingInputResult = this.callbacks.onDrawingInput?.(x, y, 'touch');
    const handledDrawingInput = isDrawingInputHandled(drawingInputResult);

    if (handledDrawingInput && !allowsPaneDoubleClick(drawingInputResult)) {
      this.scheduleRender();
      return;
    }

    // Double-tap detection for touch
    if (this.callbacks.onPaneDoubleClick && this.callbacks.getPaneAtY) {
      const pane = this.callbacks.getPaneAtY(y);
      if (pane) {
        const now = Date.now();
        if (this._lastClickPaneId === pane.paneId && now - this._lastClickTime < 300) {
          this.callbacks.onPaneDoubleClick(pane.paneId, { x, y });
          // Reset to prevent triple-tap
          this._lastClickTime = 0;
          this._lastClickPaneId = null;
          this.scheduleRender();
          return;
        }
        this._lastClickTime = now;
        this._lastClickPaneId = pane.paneId;
      }
    }

    if (handledDrawingInput) {
      this.scheduleRender();
      return;
    }

    const dims = this.callbacks.getDimensions();

    // Bottom zone tap - toggle reset button (handled by UI)
    if (y > dims.height - 150) {
      // This would toggle reset button visibility
      // Could emit an event for this
    } else {
      // Crosshair zone - toggle locked state
      if (this.touchCrosshairLocked) {
        this.touchCrosshairLocked = false;
        this.crosshair.visible = false;
      } else {
        this.touchCrosshairLocked = true;
        this.crosshair.visible = true;
        this.crosshair.x = x;
        this.crosshair.y = y;
        this.touchCrosshairPosition = { x, y };
        this.callbacks.onCrossHairMoved?.(x, y);
      }
    }

    this.scheduleRender();
  }

  // ============================================================================
  // Private: Context Menu
  // ============================================================================

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();

    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const price = this.callbacks.getPriceFromY?.(y) ?? 0;
    const time = this.callbacks.getTimeFromX?.(x) ?? 0;

    this.callbacks.onContextMenu?.(x, y, price, time);
  }

  // ============================================================================
  // Private: Keyboard Events
  // ============================================================================

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.state.isDragging) {
      // Cancel drag and revert viewport
      if (this.state.dragStartViewport) {
        this.callbacks.onViewportChange?.(this.state.dragStartViewport);
      }

      this.state.isDragging = false;
      this.state.dragMode = 'none';
      this.state.dragStartViewport = null;
      this.state.draggedPaneId = null;
      this.state.dragStartPaneYRange = null;
      this.state.dragStartPaneHeight = 0;
      this.state.draggedDivider = null;

      window.removeEventListener('mousemove', this.boundWindowMouseMove);
      window.removeEventListener('mouseup', this.boundWindowMouseUp);

      this.scheduleRender();
    }
  }

  // ============================================================================
  // Private: Pan & Zoom Helpers
  // ============================================================================

  private handlePan(dx: number, dy: number): void {
    if (!this.state.dragStartViewport || !this.state.dragStartPaneYRange || !this.state.draggedPaneId) return;

    const viewport = this.callbacks.getViewport();
    const dims = this.callbacks.getDimensions();

    // Calculate time per pixel (horizontal)
    const timeRange = this.state.dragStartViewport.endTime - this.state.dragStartViewport.startTime;
    const msPerPixel = timeRange / dims.width;

    // Pan by time delta (horizontal) - affects all panes
    const timePanned = -dx * msPerPixel;
    const newStartTime = this.state.dragStartViewport.startTime + timePanned;
    const newEndTime = this.state.dragStartViewport.endTime + timePanned;

    // Request more bars if panning left (to earlier times)
    if (newStartTime < this.state.dragStartViewport.startTime) {
      this.callbacks.onRequestMoreBars?.('left');
    }

    // Calculate price per pixel using the actual pane height (not full chart height)
    const { yMin: startYMin, yMax: startYMax } = this.state.dragStartPaneYRange;
    const priceRange = startYMax - startYMin;
    const paneHeight = this.state.dragStartPaneHeight || dims.height - dims.timeAxisHeight - dims.topMargin;
    const pricePerPixel = priceRange / paneHeight;

    // Pan by price delta (vertical) - inverted because Y increases downward
    const pricePanned = dy * pricePerPixel;
    const newPriceMin = startYMin + pricePanned;
    const newPriceMax = startYMax + pricePanned;

    // Use internal callback during drag to avoid triggering external callbacks
    // This matches React version behavior - viewport ref is updated directly during drag,
    // external callback is only called at drag end
    const updateViewport = this.callbacks.onViewportChangeInternal ?? this.callbacks.onViewportChange;

    if (this.state.draggedPaneId === 'main' && !this.callbacks.isAutoScale?.('main')) {
      // Update viewport for main pane (horizontal + vertical)
      // When auto-scale is active, skip vertical — auto-scale will recalculate price axis
      updateViewport?.({
        ...viewport,
        startTime: newStartTime,
        endTime: newEndTime,
        priceMin: newPriceMin,
        priceMax: newPriceMax,
      });
    } else {
      // For indicator panes (or main pane with auto-scale): only update time axis
      updateViewport?.({
        ...viewport,
        startTime: newStartTime,
        endTime: newEndTime,
      });
    }
  }

  private handlePriceAxisZoom(dy: number): void {
    if (!this.state.dragStartViewport || !this.state.dragStartPaneYRange || !this.state.draggedPaneId) return;

    const dims = this.callbacks.getDimensions();
    const fullChartHeight = dims.height - dims.timeAxisHeight - dims.topMargin;
    const paneHeight = this.state.dragStartPaneHeight || fullChartHeight;

    // Scale the zoom factor so smaller panes feel the same as larger ones
    // A 10% drag on a small pane should zoom the same as 10% drag on large pane
    const heightScale = fullChartHeight / paneHeight;
    // Clamp zoom factor to prevent extreme zoom on fast drags (0.1x to 10x)
    const rawZoomFactor = 1 + dy * 0.005 * heightScale;
    const zoomFactor = Math.max(0.1, Math.min(10, rawZoomFactor));

    const { yMin: startPriceMin, yMax: startPriceMax } = this.state.dragStartPaneYRange;
    const range = startPriceMax - startPriceMin;
    const center = (startPriceMax + startPriceMin) / 2;

    const newRange = range * zoomFactor;
    const newPriceMin = center - newRange / 2;
    const newPriceMax = center + newRange / 2;

    // Use internal callback during drag to avoid triggering external callbacks
    const updateViewport = this.callbacks.onViewportChangeInternal ?? this.callbacks.onViewportChange;

    if (this.state.draggedPaneId === 'main') {
      // Update viewport for main pane
      const viewport = this.callbacks.getViewport();
      updateViewport?.({
        ...viewport,
        priceMin: newPriceMin,
        priceMax: newPriceMax,
      });
    } else {
      // Update pane Y overrides for indicator panes
      this.callbacks.onPaneYRangeChange?.(this.state.draggedPaneId, newPriceMin, newPriceMax);
    }
  }

  private handlePaneDividerDrag(y: number): void {
    const divider = this.state.draggedDivider;
    if (!divider) return;

    const dims = this.callbacks.getDimensions();
    const availableHeight = dims.height - dims.timeAxisHeight - dims.topMargin;

    // Calculate the delta in pixels from drag start
    const dy = y - this.state.dragStartY;

    // Convert to ratio change (positive dy = move divider down = pane above gets bigger)
    const ratioChange = dy / availableHeight;

    // Calculate combined ratio of both panes (they share the space)
    const combinedRatio = divider.paneAboveRatio + divider.paneBelowRatio;

    // Calculate new ratios ensuring minimum pane height (10% of combined)
    const minRatio = combinedRatio * 0.1;
    let newAboveRatio = divider.paneAboveRatio + ratioChange;
    let newBelowRatio = divider.paneBelowRatio - ratioChange;

    // Clamp to minimum
    if (newAboveRatio < minRatio) {
      newAboveRatio = minRatio;
      newBelowRatio = combinedRatio - minRatio;
    }
    if (newBelowRatio < minRatio) {
      newBelowRatio = minRatio;
      newAboveRatio = combinedRatio - minRatio;
    }

    // Notify of height change
    this.callbacks.onPaneHeightsChange?.([
      { paneId: divider.paneAboveId, heightRatio: newAboveRatio },
      { paneId: divider.paneBelowId, heightRatio: newBelowRatio },
    ]);
  }

  private panViewport(viewport: Viewport, pixelDelta: number, width: number): Viewport {
    const timeRange = viewport.endTime - viewport.startTime;
    const msPerPixel = timeRange / width;
    const timePanned = pixelDelta * msPerPixel;

    const newStartTime = viewport.startTime + timePanned;
    const newEndTime = viewport.endTime + timePanned;

    // Request more bars if panning left
    if (timePanned < 0) {
      this.callbacks.onRequestMoreBars?.('left');
    }

    return {
      ...viewport,
      startTime: newStartTime,
      endTime: newEndTime,
    };
  }

  private zoomViewport(viewport: Viewport, factor: number, _width: number): Viewport {
    const timeRange = viewport.endTime - viewport.startTime;
    const center = viewport.startTime + timeRange / 2;

    const newTimeRange = timeRange * factor;
    const newStartTime = center - newTimeRange / 2;
    const newEndTime = center + newTimeRange / 2;

    // Request more bars if zooming out left
    if (newStartTime < viewport.startTime) {
      this.callbacks.onRequestMoreBars?.('left');
    }

    return {
      ...viewport,
      startTime: newStartTime,
      endTime: newEndTime,
    };
  }

  // ============================================================================
  // Private: Helpers
  // ============================================================================

  private clearLongPressTimer(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private scheduleRender(): void {
    if (this.renderScheduled) return;
    this.renderScheduled = true;

    requestAnimationFrame(() => {
      this.renderScheduled = false;
      this.callbacks.onRender?.();
    });
  }
}
