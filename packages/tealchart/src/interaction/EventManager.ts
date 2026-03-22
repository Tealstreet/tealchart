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
  onAutoScaleDisabled?: () => void;
  /** Check if position is over interactive Konva element */
  isOverInteractiveElement?: (x: number, y: number) => boolean;
  /** Get price from Y coordinate */
  getPriceFromY?: (y: number) => number;
  /** Get time from X coordinate */
  getTimeFromX?: (x: number) => number;
}

export type DragMode = 'none' | 'pan' | 'priceAxisZoom' | 'paneDivider';

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

    // Notify that auto-scale should be disabled when user zooms the price axis
    if (isOverPriceAxis) {
      this.callbacks.onAutoScaleDisabled?.();
    }

    // Track which pane the drag started in (for both pan and price-axis zoom)
    if (this.callbacks.getPaneAtY) {
      const pane = this.callbacks.getPaneAtY(y);
      if (pane) {
        this.state.draggedPaneId = pane.paneId;
        this.state.dragStartPaneYRange = { yMin: pane.yMin, yMax: pane.yMax };
        this.state.dragStartPaneHeight = pane.paneHeight;
      }
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

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.state.hoveredX = x;
    this.state.hoveredY = y;

    const dims = this.callbacks.getDimensions();
    const wasOverPriceAxis = this.state.isOverPriceAxis;
    const wasOverPaneDivider = this.state.isOverPaneDivider;
    this.state.isOverPriceAxis = x > dims.width - dims.priceAxisWidth;

    // Check for pane divider hover
    const divider = this.callbacks.getDividerAtY?.(y);
    this.state.isOverPaneDivider = divider !== null && divider !== undefined;
    this.state.hoveredDividerIndex = divider?.dividerIndex ?? -1;

    // Check if in dead zone (top bar or time axis - areas where crosshair shouldn't show)
    const inDeadZone = y < dims.topMargin || y > dims.height - dims.timeAxisHeight;

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
      // Update cursor based on what we're hovering over
      if (wasOverPaneDivider !== this.state.isOverPaneDivider || wasOverPriceAxis !== this.state.isOverPriceAxis) {
        if (this.state.isOverPaneDivider) {
          this.callbacks.onCursorChange?.('ns-resize');
        } else if (this.state.isOverPriceAxis) {
          this.callbacks.onCursorChange?.('ns-resize');
        } else {
          this.callbacks.onCursorChange?.('crosshair');
        }
      }
      // Only schedule render when NOT dragging
      // During drag, handleWindowMouseMove handles rendering via onViewportChange
      this.scheduleRender();
    }
    // Note: During drag, we don't call scheduleRender here because
    // handleWindowMouseMove → handlePan → onViewportChange already does it
  }

  private handleWindowMouseMove(e: MouseEvent): void {
    if (!this.state.isDragging) return;

    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle pane divider dragging
    if (this.state.dragMode === 'paneDivider') {
      this.handlePaneDividerDrag(y);
      return;
    }

    if (!this.state.dragStartViewport) return;

    const dx = x - this.state.dragStartX;
    const dy = y - this.state.dragStartY;

    if (this.state.dragMode === 'pan') {
      this.handlePan(dx, dy);
      // Update crosshair to follow data during pan
      // Crosshair moves with the drag to stay on the same data point
      this.crosshair.x = this.state.dragStartCrosshairX + dx;
      this.crosshair.y = this.state.dragStartCrosshairY + dy;
      this.callbacks.onCrossHairMoved?.(this.crosshair.x, this.crosshair.y);
    } else if (this.state.dragMode === 'priceAxisZoom') {
      this.handlePriceAxisZoom(dy);
    }
    // Note: handlePan and handlePriceAxisZoom call onViewportChange which already schedules a render
    // No need to call scheduleRender() here to avoid double-rendering
  }

  private handleMouseUp(e: MouseEvent): void {
    this.handleWindowMouseUp(e);
  }

  private handleWindowMouseUp(_e: MouseEvent): void {
    this.callbacks.onMouseUp?.();

    if (this.state.isDragging) {
      this.state.isDragging = false;
      this.state.dragMode = 'none';

      // Reset cursor back to crosshair
      this.callbacks.onCursorChange?.('crosshair');

      // Sync viewport change
      this.callbacks.onViewportChange?.(this.callbacks.getViewport());
    }

    this.state.dragStartViewport = null;
    this.state.draggedPaneId = null;
    this.state.dragStartPaneYRange = null;
    this.state.dragStartPaneHeight = 0;
    this.state.draggedDivider = null;

    // Remove window listeners
    window.removeEventListener('mousemove', this.boundWindowMouseMove);
    window.removeEventListener('mouseup', this.boundWindowMouseUp);

    this.scheduleRender();
  }

  private handleMouseLeave(_e: MouseEvent): void {
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

    const rect = this.container.getBoundingClientRect();
    const isInside =
      e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

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

      const viewport = this.callbacks.getViewport();
      this.state.dragStartX = x;
      this.state.dragStartY = y;
      this.state.dragStartViewport = { ...viewport };
      this.state.dragMode = isOverPriceAxis ? 'priceAxisZoom' : 'pan';
      // Save crosshair position at touch start for tracking during drag
      this.state.dragStartCrosshairX = this.crosshair.x;
      this.state.dragStartCrosshairY = this.crosshair.y;

      // Notify that auto-scale should be disabled when user zooms the price axis
      if (isOverPriceAxis) {
        this.callbacks.onAutoScaleDisabled?.();
      }

      // Track which pane the touch started in (for both pan and price-axis zoom)
      if (this.callbacks.getPaneAtY) {
        const pane = this.callbacks.getPaneAtY(y);
        if (pane) {
          this.state.draggedPaneId = pane.paneId;
          this.state.dragStartPaneYRange = { yMin: pane.yMin, yMax: pane.yMax };
          this.state.dragStartPaneHeight = pane.paneHeight;
          if (isOverPriceAxis) {
            this.touchYPanUnlocked = true; // Allow Y-axis zooming immediately for price axis drag
          }
        }
      }

      // Start long-press timer for context menu
      this.clearLongPressTimer();
      this.longPressTimer = setTimeout(() => {
        if (!this.isTouchDragging && this.touchStart) {
          // Long press triggered - show context menu
          const price = this.callbacks.getPriceFromY?.(y) ?? 0;
          const time = this.callbacks.getTimeFromX?.(x) ?? 0;
          this.callbacks.onContextMenu?.(x, y, price, time);
        }
      }, LONG_PRESS_DURATION);
    } else if (e.touches.length === 2) {
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
    // Update tracked touches
    for (const touch of Array.from(e.changedTouches)) {
      this.activeTouches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
      });
    }

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

        if (this.touchCrosshairLocked) {
          // Move crosshair proportionally
          this.crosshair.x = this.touchCrosshairPosition.x + dx;
          this.crosshair.y = this.touchCrosshairPosition.y + dy;
          this.callbacks.onCrossHairMoved?.(this.crosshair.x, this.crosshair.y);
        } else if (this.state.dragMode === 'priceAxisZoom') {
          this.handlePriceAxisZoom(dy);
          // handlePriceAxisZoom calls onViewportChange which schedules render
        } else {
          this.handlePan(dx, dy);
          // Update crosshair to follow data during touch pan
          this.crosshair.x = this.state.dragStartCrosshairX + dx;
          this.crosshair.y = this.state.dragStartCrosshairY + dy;
          this.callbacks.onCrossHairMoved?.(this.crosshair.x, this.crosshair.y);
          // handlePan calls onViewportChange which schedules render
        }
      }
    } else if (e.touches.length === 2 && this.pinchStartViewport) {
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
        // Use internal callback during pinch to avoid triggering external callbacks
        const updateViewport = this.callbacks.onViewportChangeInternal ?? this.callbacks.onViewportChange;
        updateViewport?.(newViewport);
        // updateViewport schedules render, no need for extra scheduleRender
      }
    }

    e.preventDefault();
    // Note: Most cases above already schedule render via onViewportChange or onCrossHairMoved
    // Only schedule here for edge cases not covered above
  }

  private handleTouchEnd(e: TouchEvent): void {
    // Remove ended touches
    for (const touch of Array.from(e.changedTouches)) {
      this.activeTouches.delete(touch.identifier);
    }

    this.clearLongPressTimer();

    if (e.touches.length === 0 && this.touchStart) {
      const endTime = Date.now();
      const duration = endTime - this.touchStart.time;

      if (!this.isTouchDragging && duration < TOUCH_TAP_TIMEOUT) {
        // This was a tap, not a drag
        this.handleTap(this.touchStart.x, this.touchStart.y);
      } else if (this.state.isDragging) {
        // Drag ended - sync viewport
        this.callbacks.onViewportChange?.(this.callbacks.getViewport());
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

    if (this.state.draggedPaneId === 'main') {
      // Update viewport for main pane (horizontal + vertical)
      updateViewport?.({
        ...viewport,
        startTime: newStartTime,
        endTime: newEndTime,
        priceMin: newPriceMin,
        priceMax: newPriceMax,
      });
    } else {
      // For indicator panes: only update time (viewport), let Y auto-scale
      // Matching React version behavior - indicator panes don't pan vertically,
      // they always auto-scale based on visible data. User can zoom Y via price axis.
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
