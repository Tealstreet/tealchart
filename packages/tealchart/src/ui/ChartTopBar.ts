import type {
  UpdateUserDrawingOptions,
  UserDrawingCommandAvailability,
  UserDrawingFavoriteToolbarPosition,
  UserDrawingIconName,
  UserDrawingMagnetMode,
  UserDrawingSelectionActionAnchor,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTextAlign,
  UserDrawingTool,
  UserDrawingTrendLineExtend,
  UserDrawingZOrderAction,
} from '../drawings';
import type { ChartChromeMetrics } from '../layout/chartGeometry';
import type { ChartStore, TimeframeOption } from '../state/chartState';
import type { ResolutionString } from '../types';
import type { ComponentOptions } from './Component';
import type { LayoutSelectorCallbacks } from './LayoutSelector';

import {
  getUserDrawingAllDrawingsUpdateOptions,
  getUserDrawingFavoriteTools,
  getUserDrawingToolCategoryDescriptorForTool,
  getUserDrawingToolDescriptor,
  isUserDrawingGlobalToolbarAction,
  isUserDrawingRailToolbarAction,
  isUserDrawingToolbarActionEnabled,
  isUserDrawingToolFavorite,
  resolveDrawingSelectedActionIconName,
  resolveDrawingToolbarActionIconName,
  resolveDrawingToolIconName,
  resolveUserDrawingActionSurfacePosition,
  resolveUserDrawingSelectedActionSurface,
  resolveUserDrawingToolCategoryButtonTool,
  shouldRenderUserDrawingSelectedActionSurface,
  USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS,
  USER_DRAWING_TOOL_HOTKEYS,
  USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS,
} from '../drawings';
import {
  computeLeftToolRailAvoidanceInset,
  computeTopLeftLegendRect,
  LEFT_TOOL_RAIL_ANIMATION_DURATION_MS,
  LEFT_TOOL_RAIL_ANIMATION_EASING,
  LEFT_TOOL_RAIL_COLLAPSED_WIDTH,
  resolveLeftToolRailMetrics,
  WEB_CHART_CHROME_METRICS,
} from '../layout/chartGeometry';
import {
  filterTimeframesBySupportedResolutions,
  getChartStore,
  getDefaultFavoriteTimeframeValues,
  TIMEFRAME_GROUPS,
} from '../state/chartState';
import { TIME_AXIS_HEIGHT } from '../types';
import { Component } from './Component';
import { renderDrawingIcon } from './dom';
import { mountWebFloatingElement, positionFixedFloatingElement } from './FloatingLayer';
import { LayoutSelector } from './LayoutSelector';

/**
 * ChartTopBar - Vanilla DOM toolbar for the chart
 *
 * Contains symbol info, timeframe selector, and indicators button.
 */

// tool -> 'Alt+T' label, derived from the shared hotkey map (codes like 'KeyT').
const DRAWING_TOOL_HOTKEY_LABEL: ReadonlyMap<UserDrawingTool, string> = new Map(
  Object.entries(USER_DRAWING_TOOL_HOTKEYS).map(([code, tool]) => [tool, `Alt+${code.replace('Key', '')}`]),
);

function drawingToolTitleWithHotkey(tool: UserDrawingTool, label: string): string {
  const hotkey = DRAWING_TOOL_HOTKEY_LABEL.get(tool);
  return hotkey ? `${label} (${hotkey})` : label;
}

// ============================================================================
// Types
// ============================================================================

export interface ChartTopBarOptions extends ComponentOptions {
  /** Unique key for this chart instance */
  chartKey: string;
  /** Current symbol */
  symbol: string;
  /** Exchange name */
  exchangeName?: string;
  /** Callback when interval changes */
  onIntervalChange?: (interval: ResolutionString) => void;
  /** Callback when the symbol control is clicked */
  onSymbolClick?: () => void;
  /** Callback when indicators button is clicked */
  onIndicatorsClick?: () => void;
  /** Layout selector callbacks (if provided, layout selector is shown) */
  layoutCallbacks?: LayoutSelectorCallbacks;
  /** Current user drawing state for toolbar highlighting and action availability */
  userDrawingState?: UserDrawingState;
  /** Current drawing command history availability for undo/redo toolbar actions */
  userDrawingCommandAvailability?: UserDrawingCommandAvailability;
  /** Resolved selected drawing action surface anchor in chart screen coordinates */
  userDrawingSelectionActionAnchor?: UserDrawingSelectionActionAnchor | null;
  /** True while a drawing is being moved or resized; the action surface hides. */
  userDrawingEditDragActive?: boolean;
  /** Whether selected drawing edit drags should duplicate before moving. */
  userDrawingDuplicateEditDragEnabled?: boolean;
  /** Callback when a drawing tool is selected */
  onUserDrawingToolSelect?: (tool: UserDrawingTool) => void;
  /** Callback when a drawing tool's favorite (starred) status is toggled */
  onUserDrawingToggleFavoriteTool?: (tool: UserDrawingTool) => void;
  /** Callback when the floating favorites toolbar is dragged to a new position */
  onUserDrawingFavoriteToolbarMove?: (position: UserDrawingFavoriteToolbarPosition) => void;
  /** Callback when the drawing toolbar should undo the last drawing command */
  onUserDrawingUndo?: () => void;
  /** Callback when the drawing toolbar should redo the last undone drawing command */
  onUserDrawingRedo?: () => void;
  /** Callback when the selected drawing should be duplicated */
  onUserDrawingDuplicateSelected?: () => void;
  /** Callback when the selected drawing should be copied */
  onUserDrawingCopySelected?: () => void;
  /** Callback when selected drawing duplicate-drag mode should change */
  onUserDrawingDuplicateEditDragChange?: (enabled: boolean) => void;
  /** Callback to save the selected drawing's style as the default for its kind */
  onUserDrawingSaveSelectedStyleAsDefault?: () => void;
  /** Callback when the selected drawing should be deleted */
  onUserDrawingDeleteSelected?: () => void;
  /** Callback when the active drawing draft should be cancelled */
  onUserDrawingCancelDraft?: () => void;
  /** Callback when all user drawings should be cleared */
  onUserDrawingClearAll?: () => void;
  /** Callback when temporary measure mode should toggle */
  onUserDrawingMeasureModeChange?: (enabled: boolean) => void;
  /** Callback when magnet (snap) mode should change */
  onUserDrawingMagnetModeChange?: (magnetMode: UserDrawingMagnetMode) => void;
  /** Callback when keep-drawing (stay in drawing mode) should toggle */
  onUserDrawingStayInDrawingModeChange?: (stayInDrawingMode: boolean) => void;
  /** Callback when the drawing toolbar should zoom the chart time range in */
  onUserDrawingZoomIn?: () => void;
  /** Callback when selected drawings should be reordered */
  onUserDrawingZOrderChange?: (action: UserDrawingZOrderAction) => void;
  /** Callback when selected drawing style should change */
  onUserDrawingStyleChange?: (style: Partial<UserDrawingStyle>) => void;
  /** Callback when selected text-label alignment should change */
  onUserDrawingTextAlignChange?: (textAlign: UserDrawingTextAlign) => void;
  /** Callback when selected trend-line extension should change */
  onUserDrawingTrendLineExtendChange?: (extend: UserDrawingTrendLineExtend) => void;
  /** Callback when selected icon marker shape should change */
  onUserDrawingIconNameChange?: (iconName: UserDrawingIconName) => void;
  /** Callback when selected drawing visibility should change */
  onUserDrawingVisibilityChange?: (visible: boolean, options?: UpdateUserDrawingOptions) => void;
  /** Callback when selected drawing locked state should change */
  onUserDrawingLockedChange?: (locked: boolean, options?: UpdateUserDrawingOptions) => void;
  /** Callback when selected drawing properties should open */
  onUserDrawingPropertiesOpen?: () => void;
  /** Callback when the drawing object tree should open */
  onUserDrawingObjectTreeOpen?: () => void;
  /** Callback when the selected drawing text editor should open */
  onUserDrawingTextEditOpen?: (drawingId: string) => void;
  /** CSS variables for theming */
  cssVars?: Record<string, string>;
  /** Optional overlay root for drawing rail/flyout DOM. Falls back to the top bar parent. */
  drawingOverlayParent?: HTMLElement;
}

interface ChartTopBarState {
  interval: ResolutionString;
  hoveredTimeframe: string | null;
  intervalDropdownOpen: boolean;
  indicatorsHovered: boolean;
}

// ============================================================================
// Styles
// ============================================================================

const SELECTED_ACTION_SURFACE_ESTIMATED_WIDTH = 304;
const SELECTED_ACTION_SURFACE_ESTIMATED_HEIGHT = 70;
const SELECTED_ACTION_SURFACE_POPOVER_OFFSET_Y = 34;
const SELECTED_ACTION_SURFACE_POPOVER_ESTIMATED_HEIGHT = 74;
const DRAWING_RAIL_ANIMATION_DURATION_MS = LEFT_TOOL_RAIL_ANIMATION_DURATION_MS;
const DRAWING_RAIL_COLLAPSE_TAB_WIDTH = 14;
// What the rail still occupies once collapsed. Shared with the layout metrics
// so the chrome that closes up behind it reserves exactly this much.
const DRAWING_RAIL_COLLAPSE_TAB_VISIBLE_WIDTH = LEFT_TOOL_RAIL_COLLAPSED_WIDTH;
// The tab clears the rail entirely, so it stays reachable once the rail has
// slid all the way off-canvas.
const DRAWING_RAIL_COLLAPSE_TAB_OVERHANG = DRAWING_RAIL_COLLAPSE_TAB_WIDTH;

// The left tool rail has 4px top+bottom padding (`drawingToolRail.padding`); flyouts
// cap their height to that content box so long lists don't overflow over the time axis.
const LEFT_TOOL_RAIL_VERTICAL_PADDING = 8;

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    height: '32px',
    boxSizing: 'border-box',
    // Start right of the left tool rail so the rail can run flush to the top: the rail's
    // right border and the top bar's bottom border meet in a top-left "L".
    marginLeft: `${WEB_CHART_CHROME_METRICS.leftToolRailWidth}px`,
    padding: '0 8px',
    backgroundColor: 'var(--tc-topbar-bg, var(--tc-canvas-bg, #131722))',
    borderBottom: '1px solid var(--tc-border, #2a2e39)',
    fontSize: '12px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    gap: '12px',
    userSelect: 'none',
    overflowX: 'auto',
    overflowY: 'hidden',
    flexWrap: 'nowrap',
  } as Partial<CSSStyleDeclaration>,

  symbol: {
    fontWeight: '600',
    color: 'var(--tc-text, #d1d4dc)',
    fontSize: '13px',
    flexShrink: '0',
    whiteSpace: 'nowrap',
  } as Partial<CSSStyleDeclaration>,

  symbolButton: {
    display: 'flex',
    alignItems: 'center',
    border: 'none',
    backgroundColor: 'transparent',
    padding: '0',
    margin: '0',
    font: 'inherit',
    cursor: 'pointer',
    flexShrink: '0',
    whiteSpace: 'nowrap',
  } as Partial<CSSStyleDeclaration>,

  symbolSection: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: '0',
    whiteSpace: 'nowrap',
  } as Partial<CSSStyleDeclaration>,

  symbolCaret: {
    width: '0',
    height: '0',
    marginLeft: '5px',
    borderLeft: '4px solid transparent',
    borderRight: '4px solid transparent',
    borderTop: '5px solid var(--tc-text2, #787b86)',
    pointerEvents: 'none',
  } as Partial<CSSStyleDeclaration>,

  exchange: {
    color: 'var(--tc-text2, #787b86)',
    fontSize: '11px',
    marginLeft: '4px',
  } as Partial<CSSStyleDeclaration>,

  divider: {
    width: '1px',
    height: '16px',
    backgroundColor: 'var(--tc-border, #363a45)',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,

  timeframeGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,

  timeframeButton: {
    padding: '4px 8px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--tc-text2, #787b86)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'background-color 0.15s, color 0.15s',
  } as Partial<CSSStyleDeclaration>,

  timeframeButtonActive: {
    backgroundColor: 'var(--tc-accent-bg, rgba(41, 98, 255, 0.2))',
    color: 'var(--tc-accent, #2962ff)',
  } as Partial<CSSStyleDeclaration>,

  timeframeButtonHover: {
    backgroundColor: 'var(--tc-hover-bg, rgba(255, 255, 255, 0.05))',
  } as Partial<CSSStyleDeclaration>,

  timeframeDropdownTrigger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    padding: '0',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--tc-text2, #787b86)',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: '1',
    transition: 'background-color 0.15s, color 0.15s',
  } as Partial<CSSStyleDeclaration>,

  timeframeDropdownTriggerOpen: {
    backgroundColor: 'var(--tc-hover-bg, rgba(255, 255, 255, 0.05))',
    color: 'var(--tc-text, #d1d4dc)',
  } as Partial<CSSStyleDeclaration>,

  timeframeDropdown: {
    position: 'fixed',
    width: '260px',
    maxHeight: 'min(640px, calc(100vh - 16px))',
    overflowY: 'auto',
    backgroundColor: 'var(--tc-menu-bg, var(--tc-canvas-bg, #131722))',
    border: '1px solid var(--tc-border, #2a2e39)',
    borderRadius: '4px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
    zIndex: '1000',
    padding: '6px 0',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: 'var(--tc-text, #d1d4dc)',
  } as Partial<CSSStyleDeclaration>,

  timeframeDropdownAdd: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    height: '42px',
    padding: '0 16px',
    border: 'none',
    borderBottom: '1px solid var(--tc-border, #2a2e39)',
    backgroundColor: 'transparent',
    color: 'var(--tc-text, #d1d4dc)',
    fontSize: '13px',
    textAlign: 'left',
    cursor: 'default',
    boxSizing: 'border-box',
    opacity: '0.78',
  } as Partial<CSSStyleDeclaration>,

  timeframeDropdownAddIcon: {
    fontSize: '24px',
    lineHeight: '1',
    color: 'var(--tc-text, #d1d4dc)',
  } as Partial<CSSStyleDeclaration>,

  timeframeDropdownGroupLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '30px',
    padding: '0 16px',
    color: 'var(--tc-text2, #787b86)',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    boxSizing: 'border-box',
  } as Partial<CSSStyleDeclaration>,

  timeframeDropdownItem: {
    display: 'grid',
    gridTemplateColumns: '1fr 32px',
    alignItems: 'center',
    width: '100%',
    height: '36px',
    padding: '0 12px 0 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--tc-text, #d1d4dc)',
    fontSize: '13px',
    textAlign: 'left',
    cursor: 'pointer',
    boxSizing: 'border-box',
  } as Partial<CSSStyleDeclaration>,

  timeframeDropdownItemActive: {
    backgroundColor: 'var(--tc-active-bg, rgba(255, 255, 255, 0.12))',
    color: 'var(--tc-text, #d1d4dc)',
  } as Partial<CSSStyleDeclaration>,

  timeframeFavoriteButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--tc-warning, #ff9800)',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: '1',
    padding: '0',
  } as Partial<CSSStyleDeclaration>,

  indicatorsButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--tc-text2, #787b86)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'background-color 0.15s, color 0.15s',
    flexShrink: '0',
    whiteSpace: 'nowrap',
  } as Partial<CSSStyleDeclaration>,

  indicatorsButtonHover: {
    backgroundColor: 'var(--tc-hover-bg, rgba(255, 255, 255, 0.05))',
    color: 'var(--tc-text, #d1d4dc)',
  } as Partial<CSSStyleDeclaration>,

  indicatorsIcon: {
    fontSize: '14px',
    fontStyle: 'italic',
    fontWeight: '700',
  } as Partial<CSSStyleDeclaration>,

  drawingToolRail: {
    position: 'absolute',
    // Flush with the very top; the top bar is shifted right to make room (top-left "L").
    top: '0',
    left: '0',
    bottom: `${TIME_AXIS_HEIGHT}px`,
    width: `${WEB_CHART_CHROME_METRICS.leftToolRailWidth}px`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '4px 0',
    boxSizing: 'border-box',
    borderRight: '1px solid var(--tc-border, #2a2e39)',
    backgroundColor: 'var(--tc-left-rail-bg, var(--tc-canvas-bg, #131722))',
    zIndex: '7',
    pointerEvents: 'auto',
    overflow: 'visible',
    transition: `transform ${DRAWING_RAIL_ANIMATION_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  } as Partial<CSSStyleDeclaration>,

  drawingToolRailList: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    flexGrow: '1',
    flexShrink: '1',
    flexBasis: 'auto',
    minHeight: '0',
    width: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
    scrollbarWidth: 'none',
  } as Partial<CSSStyleDeclaration>,

  drawingToolRailItem: {
    position: 'relative',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,

  drawingRailToggleGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    marginTop: '2px',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,

  drawingRailToggleDivider: {
    width: '28px',
    height: '1px',
    backgroundColor: 'var(--tc-border, #2a2e39)',
    margin: '4px 0',
  } as Partial<CSSStyleDeclaration>,

  drawingRailCollapseTab: {
    position: 'absolute',
    right: `-${DRAWING_RAIL_COLLAPSE_TAB_OVERHANG}px`,
    bottom: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${DRAWING_RAIL_COLLAPSE_TAB_WIDTH}px`,
    height: '38px',
    border: '1px solid var(--tc-border, #2a2e39)',
    borderLeft: 'none',
    borderTopRightRadius: '10px',
    borderBottomRightRadius: '10px',
    backgroundColor: 'var(--tc-text, #d1d4dc)',
    color: 'var(--tc-canvas-bg, #131722)',
    cursor: 'pointer',
    padding: '0',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.18)',
    zIndex: '3',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,

  drawingToolCategoryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '34px',
    height: '34px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--tc-text2, #b2b5be)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    padding: '0',
    transition: 'background-color 0.15s, color 0.15s',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,

  // Right-edge flyout-menu button (revealed on hover); click opens the category menu.
  drawingToolCategoryCaret: {
    position: 'absolute',
    right: '0',
    top: '0',
    bottom: '0',
    width: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: '2px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    opacity: '0',
    transition: 'opacity 0.12s',
  } as Partial<CSSStyleDeclaration>,

  drawingToolCategoryCaretGlyph: {
    width: '0',
    height: '0',
    borderTop: '3px solid transparent',
    borderBottom: '3px solid transparent',
    borderLeft: '4px solid var(--tc-text2, #787b86)',
    pointerEvents: 'none',
  } as Partial<CSSStyleDeclaration>,

  drawingToolTooltip: {
    position: 'absolute',
    display: 'none',
    padding: '3px 8px',
    borderRadius: '4px',
    backgroundColor: 'var(--tc-tooltip-bg, #363a45)',
    color: 'var(--tc-text, #d1d4dc)',
    fontSize: '12px',
    fontWeight: '500',
    lineHeight: '1.4',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: '9',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
  } as Partial<CSSStyleDeclaration>,

  drawingToolFlyout: {
    position: 'absolute',
    top: '0',
    left: `${WEB_CHART_CHROME_METRICS.leftToolRailWidth}px`,
    display: 'none',
    minWidth: '240px',
    maxHeight: `calc(100vh - ${TIME_AXIS_HEIGHT + LEFT_TOOL_RAIL_VERTICAL_PADDING}px)`,
    overflowY: 'auto',
    padding: '10px',
    boxSizing: 'border-box',
    border: '1px solid var(--tc-border, #363a45)',
    borderRadius: '6px',
    backgroundColor: 'var(--tc-popover-bg, var(--tc-canvas-bg, rgba(19, 23, 34, 0.98)))',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.32)',
    zIndex: '2',
  } as Partial<CSSStyleDeclaration>,

  drawingToolFlyoutTitle: {
    color: 'var(--tc-text2, #787b86)',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0',
    textTransform: 'uppercase',
    marginBottom: '6px',
  } as Partial<CSSStyleDeclaration>,

  drawingToolFlyoutHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginBottom: '6px',
  } as Partial<CSSStyleDeclaration>,

  drawingToolPinButton: {
    width: '26px',
    height: '26px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--tc-text2, #787b86)',
    cursor: 'pointer',
    fontSize: '13px',
    lineHeight: '26px',
    padding: '0',
    textAlign: 'center',
  } as Partial<CSSStyleDeclaration>,

  drawingToolFlyoutButton: {
    display: 'grid',
    gridTemplateColumns: '28px 1fr',
    alignItems: 'center',
    columnGap: '8px',
    width: '100%',
    minHeight: '32px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--tc-text, #d1d4dc)',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '4px 8px',
    textAlign: 'left',
  } as Partial<CSSStyleDeclaration>,

  drawingToolFlyoutIcon: {
    color: 'var(--tc-text2, #787b86)',
    fontSize: '13px',
    fontWeight: '600',
    textAlign: 'center',
  } as Partial<CSSStyleDeclaration>,

  drawingToolFlyoutLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as Partial<CSSStyleDeclaration>,

  drawingToolFlyoutRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  } as Partial<CSSStyleDeclaration>,

  drawingToolFlyoutStar: {
    flex: '0 0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '26px',
    minHeight: '32px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--tc-text2, #787b86)',
    cursor: 'pointer',
    opacity: '0.5',
  } as Partial<CSSStyleDeclaration>,

  drawingToolFlyoutStarActive: {
    color: 'var(--tc-accent, #f5c518)',
    opacity: '1',
  } as Partial<CSSStyleDeclaration>,

  drawingFavoritesBar: {
    position: 'absolute',
    zIndex: '7',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '3px 4px',
    borderRadius: '8px',
    backgroundColor: 'var(--tc-popover-bg, var(--tc-canvas-bg, #1e222d))',
    border: '1px solid var(--tc-border, #2a2e39)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
  } as Partial<CSSStyleDeclaration>,

  drawingFavoritesBarHandle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    alignSelf: 'stretch',
    color: 'var(--tc-text2, #787b86)',
    cursor: 'grab',
    fontSize: '12px',
    userSelect: 'none',
  } as Partial<CSSStyleDeclaration>,

  drawingFavoritesBarButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '30px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--tc-text, #d1d4dc)',
    cursor: 'pointer',
  } as Partial<CSSStyleDeclaration>,

  selectedActionSurface: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    alignContent: 'center',
    flexWrap: 'wrap',
    gap: '3px',
    width: `${SELECTED_ACTION_SURFACE_ESTIMATED_WIDTH}px`,
    boxSizing: 'border-box',
    padding: '4px',
    border: '1px solid var(--tc-border, #363a45)',
    borderRadius: '6px',
    backgroundColor: 'var(--tc-popover-bg, var(--tc-canvas-bg, rgba(19, 23, 34, 0.98)))',
    boxShadow: '0 10px 28px rgba(0, 0, 0, 0.32)',
    zIndex: '8',
    pointerEvents: 'auto',
  } as Partial<CSSStyleDeclaration>,

  selectedActionSurfaceGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  } as Partial<CSSStyleDeclaration>,

  selectedActionSurfaceGroupSeparated: {
    borderLeft: '1px solid var(--tc-border, #363a45)',
    paddingLeft: '3px',
  } as Partial<CSSStyleDeclaration>,

  selectedActionSurfacePopover: {
    position: 'absolute',
    top: '34px',
    left: '4px',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '3px',
    padding: '6px',
    border: '1px solid var(--tc-border, #363a45)',
    borderRadius: '6px',
    backgroundColor: 'var(--tc-popover-bg, var(--tc-canvas-bg, rgba(19, 23, 34, 0.98)))',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.34)',
    zIndex: '9',
    pointerEvents: 'auto',
  } as Partial<CSSStyleDeclaration>,

  drawingGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,

  drawingToolCategory: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,

  drawingToolCategoryLabel: {
    color: 'var(--tc-text2, #787b86)',
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '0',
    textTransform: 'uppercase',
    marginRight: '2px',
    whiteSpace: 'nowrap',
  } as Partial<CSSStyleDeclaration>,

  drawingButton: {
    width: '24px',
    height: '24px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--tc-text2, #787b86)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    lineHeight: '24px',
    padding: '0',
    textAlign: 'center',
    transition: 'background-color 0.15s, color 0.15s, opacity 0.15s',
  } as Partial<CSSStyleDeclaration>,

  drawingButtonActive: {
    backgroundColor: 'var(--tc-active-bg, rgba(255, 255, 255, 0.12))',
    color: 'var(--tc-text, #d1d4dc)',
  } as Partial<CSSStyleDeclaration>,

  // TradingView-style persistent toggle (e.g. magnet on): filled light glyph on dark.
  drawingButtonToggleActive: {
    backgroundColor: 'var(--tc-text, #d1d4dc)',
    color: 'var(--tc-canvas-bg, #131722)',
  } as Partial<CSSStyleDeclaration>,

  drawingButtonHover: {
    backgroundColor: 'var(--tc-hover-bg, rgba(255, 255, 255, 0.05))',
    color: 'var(--tc-text, #d1d4dc)',
  } as Partial<CSSStyleDeclaration>,

  drawingSwatch: {
    width: '18px',
    height: '18px',
    border: '1px solid var(--tc-border, #363a45)',
    borderRadius: '4px',
    padding: '0',
  } as Partial<CSSStyleDeclaration>,

  spacer: {
    flex: '1',
  } as Partial<CSSStyleDeclaration>,
};

// ============================================================================
// ChartTopBar Class
// ============================================================================

export class ChartTopBar extends Component<ChartTopBarState> {
  private options: ChartTopBarOptions;
  private chartStore: ChartStore;
  private supportedResolutions: string[] | null = null;

  // Element references
  private timeframeButtons: Map<string, HTMLButtonElement> = new Map();
  private indicatorsBtn: HTMLButtonElement | null = null;
  private layoutSelector: LayoutSelector | null = null;
  private drawingToolRailEl: HTMLElement | null = null;
  private drawingToolRailCleanup: Array<() => void> = [];
  private drawingToolRailAnimationFrame: number | null = null;
  private drawingToolRailAnimationDirection: 'collapse' | 'expand' | null = null;
  private drawingRailTooltipEl: HTMLElement | null = null;
  private drawingFavoritesBarEl: HTMLElement | null = null;
  private drawingFavoritesBarCleanup: Array<() => void> = [];
  private intervalDropdownEl: HTMLElement | null = null;
  private intervalDropdownOutsideHandler: ((event: PointerEvent) => void) | null = null;
  private uiPreferencesUnsubscribe: (() => void) | null = null;
  private pinnedDrawingToolCategoryId: string | null = null;
  private recentDrawingToolsByCategory: Record<string, UserDrawingTool | undefined> = {};
  private selectedActionSurfaceEl: HTMLElement | null = null;
  private selectedActionSurfaceCleanup: Array<() => void> = [];
  private selectedActionPopoverGroupId: string | null = null;
  private selectedActionPopoverDrawingId: string | null = null;

  constructor(options: ChartTopBarOptions) {
    super('div', {
      interval: '60' as ResolutionString,
      hoveredTimeframe: null,
      intervalDropdownOpen: false,
      indicatorsHovered: false,
    });

    this.options = options;
    this.chartStore = getChartStore(options.chartKey);

    // Set initial interval from store
    this.state.interval = this.chartStore.settings.get().interval as ResolutionString;

    // Apply container styles
    Object.assign(this.el.style, styles.container);
    this.applyContainerLayout();

    // Apply CSS vars if provided
    if (options.cssVars) {
      this.setCssVars(options.cssVars);
    }
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  protected onMount(): void {
    // NOTE: Do NOT subscribe to chartStore.settings for interval changes here.
    // The interval is pushed by the widget via setInterval(). Subscribing to the
    // shared store would cause cross-widget contamination when multiple widgets
    // share the same chartKey.
    this.uiPreferencesUnsubscribe = this.chartStore.uiPreferences.listen(() => {
      this.pinnedDrawingToolCategoryId = null;
      this.render();
    });
    this.render();
  }

  protected onUnmount(): void {
    this.uiPreferencesUnsubscribe?.();
    this.uiPreferencesUnsubscribe = null;
    this.removeDrawingToolRail();
    this.removeDrawingFavoritesBar();
    this.removeIntervalDropdown();
    this.removeSelectedActionSurface();
    this.layoutSelector?.dispose();
    this.layoutSelector = null;
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  protected render(): void {
    this.el.innerHTML = '';
    this.removeDrawingToolRail();
    this.removeDrawingFavoritesBar();
    this.removeIntervalDropdown();
    this.removeSelectedActionSurface();
    this.timeframeButtons.clear();
    this.applyContainerLayout();

    // Symbol section
    const hasSymbolClick = typeof this.options.onSymbolClick === 'function';
    const symbolSection = this.createElement(hasSymbolClick ? 'button' : 'div', {
      style: hasSymbolClick ? styles.symbolButton : styles.symbolSection,
    });
    if (hasSymbolClick) {
      (symbolSection as HTMLButtonElement).type = 'button';
      symbolSection.setAttribute('aria-label', 'Change symbol');
      symbolSection.addEventListener('click', (event) => {
        event.preventDefault();
        this.options.onSymbolClick?.();
      });
    }

    const symbolSpan = this.createElement('span', {
      style: styles.symbol,
      textContent: this.options.symbol,
    });
    symbolSection.appendChild(symbolSpan);

    if (this.options.exchangeName) {
      const exchangeSpan = this.createElement('span', {
        style: styles.exchange,
        textContent: this.options.exchangeName,
      });
      symbolSection.appendChild(exchangeSpan);
    }

    if (hasSymbolClick) {
      symbolSection.appendChild(
        this.createElement('span', {
          style: styles.symbolCaret,
        }),
      );
    }

    this.el.appendChild(symbolSection);

    // Divider
    this.el.appendChild(this.createElement('div', { style: styles.divider }));

    // Timeframe selector
    const tfGroup = this.createElement('div', { style: styles.timeframeGroup });

    const timeframes = this.getSupportedTimeframes();
    const toolbarTimeframes = this.getToolbarTimeframes(timeframes);

    for (const tf of toolbarTimeframes) {
      const isActive = this.state.interval === tf.value;

      const btn = this.createElement('button', {
        style: {
          ...styles.timeframeButton,
          ...(isActive ? styles.timeframeButtonActive : {}),
        },
        textContent: tf.shortLabel,
      });

      // Add event listeners directly for reliable handling (no re-render on hover)
      btn.addEventListener('click', () => this.handleTimeframeClick(tf.value as ResolutionString));
      btn.addEventListener('mouseenter', () => {
        if (this.state.interval !== tf.value) {
          Object.assign(btn.style, styles.timeframeButtonHover);
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (this.state.interval !== tf.value) {
          btn.style.backgroundColor = 'transparent';
        }
      });

      tfGroup.appendChild(btn);
      this.timeframeButtons.set(tf.value, btn);
    }

    const dropdownBtn = this.createElement('button', {
      style: {
        ...styles.timeframeDropdownTrigger,
        ...(this.state.intervalDropdownOpen ? styles.timeframeDropdownTriggerOpen : {}),
      },
      textContent: '⌃',
    });
    dropdownBtn.type = 'button';
    dropdownBtn.setAttribute('aria-label', 'Select interval');
    dropdownBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.toggleIntervalDropdown();
    });
    dropdownBtn.addEventListener('mouseenter', () => {
      Object.assign(dropdownBtn.style, styles.timeframeDropdownTriggerOpen);
    });
    dropdownBtn.addEventListener('mouseleave', () => {
      if (!this.state.intervalDropdownOpen) {
        dropdownBtn.style.backgroundColor = 'transparent';
        dropdownBtn.style.color = 'var(--tc-text2, #787b86)';
      }
    });
    tfGroup.appendChild(dropdownBtn);

    this.el.appendChild(tfGroup);

    if (this.state.intervalDropdownOpen) {
      this.renderIntervalDropdown(dropdownBtn, timeframes);
    }

    // Divider
    this.el.appendChild(this.createElement('div', { style: styles.divider }));

    // Indicators button
    this.indicatorsBtn = this.createElement('button', {
      style: styles.indicatorsButton,
    });

    // Add event listeners directly for reliable handling
    this.indicatorsBtn.addEventListener('click', () => {
      this.options.onIndicatorsClick?.();
    });
    this.indicatorsBtn.addEventListener('mouseenter', () => {
      Object.assign(this.indicatorsBtn!.style, styles.indicatorsButtonHover);
    });
    this.indicatorsBtn.addEventListener('mouseleave', () => {
      this.indicatorsBtn!.style.backgroundColor = 'transparent';
      this.indicatorsBtn!.style.color = 'var(--tc-text2, #787b86)';
    });

    const iconSpan = this.createElement('span', {
      style: styles.indicatorsIcon,
      textContent: 'ƒ',
    });
    this.indicatorsBtn.appendChild(iconSpan);

    const labelSpan = this.createElement('span', {
      textContent: 'Indicators',
    });
    this.indicatorsBtn.appendChild(labelSpan);

    this.el.appendChild(this.indicatorsBtn);

    if (this.options.userDrawingState) {
      this.el.appendChild(this.createElement('div', { style: styles.divider }));
      this.el.appendChild(this.renderDrawingToolbar());
      this.renderSelectedActionSurface();
      this.renderDrawingFavoritesBar();
    }

    // Spacer
    this.el.appendChild(this.createElement('div', { style: styles.spacer }));

    // Layout selector (after spacer so it's right-aligned)
    if (this.options.layoutCallbacks) {
      // Divider before layout selector
      this.el.appendChild(this.createElement('div', { style: styles.divider }));

      if (!this.layoutSelector) {
        this.layoutSelector = new LayoutSelector(this.options.layoutCallbacks);
      }
      this.el.appendChild(this.layoutSelector.getElement());
    }
  }

  private isDrawingToolRailCollapsed(): boolean {
    return this.chartStore.uiPreferences.get().leftToolRailCollapsed;
  }

  private getLeftToolRailMetrics(): ChartChromeMetrics {
    return resolveLeftToolRailMetrics(WEB_CHART_CHROME_METRICS, this.isDrawingToolRailCollapsed());
  }

  private applyContainerLayout(): void {
    // Animated so the bar closes the gap with the rail rather than snapping to
    // it a frame later.
    this.el.style.transition = `margin-left ${LEFT_TOOL_RAIL_ANIMATION_DURATION_MS}ms ${LEFT_TOOL_RAIL_ANIMATION_EASING}`;
    this.el.style.marginLeft = `${this.getLeftToolRailMetrics().leftToolRailWidth}px`;
  }

  private setDrawingToolRailCollapsed(collapsed: boolean): void {
    if (collapsed === this.isDrawingToolRailCollapsed()) return;
    this.pinnedDrawingToolCategoryId = null;
    this.hideRailTooltip();
    this.drawingToolRailAnimationDirection = collapsed ? 'collapse' : 'expand';
    this.chartStore.uiPreferences.setKey('leftToolRailCollapsed', collapsed);
  }

  private removeDrawingToolRail(): void {
    if (this.drawingToolRailAnimationFrame !== null) {
      window.cancelAnimationFrame(this.drawingToolRailAnimationFrame);
      this.drawingToolRailAnimationFrame = null;
    }
    for (const cleanup of this.drawingToolRailCleanup) {
      cleanup();
    }
    this.drawingToolRailCleanup = [];
    this.drawingToolRailEl?.remove();
    this.drawingToolRailEl = null;
    this.drawingRailTooltipEl?.remove();
    this.drawingRailTooltipEl = null;
  }

  private resolveDrawingToolRailCollapsedTransform(): string {
    const distance = WEB_CHART_CHROME_METRICS.leftToolRailWidth - DRAWING_RAIL_COLLAPSE_TAB_VISIBLE_WIDTH;
    return `translateX(-${distance}px)`;
  }

  private getDrawingToolRailInitialTransform(collapsed: boolean): string {
    if (this.drawingToolRailAnimationDirection === 'collapse') return 'translateX(0px)';
    if (this.drawingToolRailAnimationDirection === 'expand') return this.resolveDrawingToolRailCollapsedTransform();
    return collapsed ? this.resolveDrawingToolRailCollapsedTransform() : 'translateX(0px)';
  }

  private animateDrawingToolRailToState(rail: HTMLElement, collapsed: boolean): void {
    if (!this.drawingToolRailAnimationDirection) return;
    this.drawingToolRailAnimationDirection = null;
    rail.style.willChange = 'transform';
    this.drawingToolRailAnimationFrame = window.requestAnimationFrame(() => {
      rail.style.transform = collapsed ? this.resolveDrawingToolRailCollapsedTransform() : 'translateX(0px)';
      this.drawingToolRailAnimationFrame = null;
      window.setTimeout(() => {
        if (this.drawingToolRailEl === rail) rail.style.willChange = '';
      }, DRAWING_RAIL_ANIMATION_DURATION_MS);
    });
  }

  private showRailTooltip(anchor: HTMLElement, label: string): void {
    const tooltip = this.drawingRailTooltipEl;
    const parent = tooltip?.parentElement;
    if (!tooltip || !parent) return;
    tooltip.textContent = label;
    tooltip.style.display = 'block';
    const anchorRect = anchor.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    tooltip.style.left = `${anchorRect.right - parentRect.left + 8}px`;
    tooltip.style.top = `${anchorRect.top - parentRect.top + (anchorRect.height - tooltip.offsetHeight) / 2}px`;
  }

  private hideRailTooltip(): void {
    if (this.drawingRailTooltipEl) this.drawingRailTooltipEl.style.display = 'none';
  }

  private renderDrawingRailToggles(rail: HTMLElement, state?: UserDrawingState): void {
    const toggles = this.createElement('div', { style: styles.drawingRailToggleGroup });

    // Measure + zoom, promoted from the top bar into the rail to match TradingView.
    toggles.appendChild(this.createElement('div', { style: styles.drawingRailToggleDivider }));

    const measureActive = state?.measureMode === 'on';
    const measureEnabled = state
      ? isUserDrawingToolbarActionEnabled(state, 'measure', this.options.userDrawingCommandAvailability)
      : false;
    toggles.appendChild(
      this.createDrawingRailToggleButton(
        'ruler',
        'Measure date and price range',
        measureActive,
        () => this.options.onUserDrawingMeasureModeChange?.(state?.measureMode !== 'on'),
        measureEnabled,
      ),
    );

    const zoomEnabled = state
      ? isUserDrawingToolbarActionEnabled(state, 'zoomIn', this.options.userDrawingCommandAvailability)
      : false;
    toggles.appendChild(
      this.createDrawingRailToggleButton(
        'zoomIn',
        'Zoom in',
        false,
        () => this.options.onUserDrawingZoomIn?.(),
        zoomEnabled,
      ),
    );

    // Magnet + draw-mode + lock + hide + link form one TradingView-style utility group.
    toggles.appendChild(this.createElement('div', { style: styles.drawingRailToggleDivider }));

    const magnetActive = (state?.magnetMode ?? 'off') !== 'off';
    toggles.appendChild(
      this.createDrawingRailToggleButton(
        'magnet',
        magnetActive ? 'Magnet snap on' : 'Magnet snap off',
        magnetActive,
        () => this.options.onUserDrawingMagnetModeChange?.(magnetActive ? 'off' : 'strong'),
        true,
        true,
      ),
    );

    const stayActive = state?.stayInDrawingMode === true;
    toggles.appendChild(
      this.createDrawingRailToggleButton(
        'drawLock',
        stayActive ? 'Keep drawing mode on' : 'Keep drawing mode off',
        stayActive,
        () => this.options.onUserDrawingStayInDrawingModeChange?.(!stayActive),
        true,
        true,
      ),
    );

    this.appendDrawingRailActionButtons(toggles, state);

    rail.appendChild(toggles);
  }

  private appendDrawingRailActionButtons(toggles: HTMLElement, state?: UserDrawingState): void {
    const drawings = state?.drawings ?? [];
    const hasDrawings = drawings.length > 0;
    const someUnlocked = drawings.some((drawing) => !drawing.locked);
    const allLocked = hasDrawings && !someUnlocked;
    const someVisible = drawings.some((drawing) => drawing.visible !== false);
    const allHidden = hasDrawings && !someVisible;
    const allOptions = state ? getUserDrawingAllDrawingsUpdateOptions(state) : { drawingIds: [] };
    const allOptionsIncludingLocked = state
      ? getUserDrawingAllDrawingsUpdateOptions(state, { includeLocked: true })
      : { drawingIds: [], includeLocked: true };

    // magnet + draw-mode + lock + eye form one TradingView-style utility group.
    toggles.appendChild(
      this.createDrawingRailToggleButton(
        allLocked ? 'lock' : 'unlock',
        allLocked ? 'Unlock all drawings' : 'Lock all drawings',
        allLocked,
        () =>
          this.options.onUserDrawingLockedChange?.(someUnlocked, someUnlocked ? allOptions : allOptionsIncludingLocked),
        hasDrawings,
      ),
    );

    toggles.appendChild(
      this.createDrawingRailToggleButton(
        allHidden ? 'eyeOff' : 'eye',
        allHidden ? 'Show all drawings' : 'Hide all drawings',
        allHidden,
        () => this.options.onUserDrawingVisibilityChange?.(!someVisible, allOptionsIncludingLocked),
        hasDrawings,
      ),
    );

    toggles.appendChild(
      this.createDrawingRailToggleButton('link', 'Objects tree', false, () =>
        this.options.onUserDrawingObjectTreeOpen?.(),
      ),
    );

    // Destructive action is isolated in its own group, like TradingView.
    toggles.appendChild(this.createElement('div', { style: styles.drawingRailToggleDivider }));

    toggles.appendChild(
      this.createDrawingRailToggleButton(
        'trash',
        'Clear all drawings',
        false,
        () => {
          if (confirm('Clear all drawings? This cannot be undone.')) this.options.onUserDrawingClearAll?.();
        },
        hasDrawings,
      ),
    );
  }

  private createDrawingRailToggleButton(
    iconName: string,
    label: string,
    active: boolean,
    onClick: () => void,
    enabled = true,
    strongActive = false,
  ): HTMLButtonElement {
    const activeStyle = strongActive ? styles.drawingButtonToggleActive : styles.drawingButtonActive;
    const btn = this.createElement('button', {
      style: {
        ...styles.drawingToolCategoryButton,
        ...(active ? activeStyle : {}),
        opacity: enabled ? '1' : '0.35',
        cursor: enabled ? 'pointer' : 'default',
      },
      attributes: {
        type: 'button',
        'aria-label': label,
        'aria-pressed': active ? 'true' : 'false',
      },
    });
    this.setDrawingIconContent(btn, iconName, '', 20);
    btn.disabled = !enabled;
    if (!enabled) return btn;
    btn.addEventListener('click', onClick);
    btn.addEventListener('mouseenter', () => {
      if (!active) Object.assign(btn.style, styles.drawingButtonHover);
      this.showRailTooltip(btn, label);
    });
    btn.addEventListener('mouseleave', () => {
      if (!active) {
        btn.style.backgroundColor = 'transparent';
        btn.style.color = 'var(--tc-text2, #b2b5be)';
      }
      this.hideRailTooltip();
    });
    return btn;
  }

  private removeDrawingFavoritesBar(): void {
    for (const cleanup of this.drawingFavoritesBarCleanup) {
      cleanup();
    }
    this.drawingFavoritesBarCleanup = [];
    this.drawingFavoritesBarEl?.remove();
    this.drawingFavoritesBarEl = null;
  }

  private renderDrawingFavoritesBar(): void {
    const state = this.options.userDrawingState;
    const favoriteTools = getUserDrawingFavoriteTools(state);
    if (favoriteTools.length === 0) return;

    const activeTool = state?.activeTool ?? 'select';
    const parent = this.options.drawingOverlayParent ?? this.el.parentElement ?? this.el;
    const bar = this.createElement('div', {
      style: styles.drawingFavoritesBar,
      attributes: { 'aria-label': 'Favorite drawing tools' },
    });

    const handle = this.createElement('div', {
      style: styles.drawingFavoritesBarHandle,
      textContent: '⠿',
      attributes: { 'aria-label': 'Drag favorites toolbar', title: 'Drag to move' },
    });
    bar.appendChild(handle);

    for (const tool of favoriteTools) {
      const descriptor = getUserDrawingToolDescriptor(tool);
      const isActive = activeTool === tool;
      const btn = this.createElement('button', {
        style: {
          ...styles.drawingFavoritesBarButton,
          ...(isActive ? styles.drawingButtonActive : {}),
        },
        attributes: {
          type: 'button',
          title: drawingToolTitleWithHotkey(tool, descriptor.label),
          'aria-label': descriptor.label,
          'aria-pressed': isActive ? 'true' : 'false',
        },
      });
      this.setDrawingIconContent(btn, resolveDrawingToolIconName(tool), descriptor.icon, 18);
      btn.addEventListener('click', () => this.options.onUserDrawingToolSelect?.(tool));
      btn.addEventListener('mouseenter', () => {
        if (!isActive) Object.assign(btn.style, styles.drawingButtonHover);
      });
      btn.addEventListener('mouseleave', () => {
        if (!isActive) {
          btn.style.backgroundColor = 'transparent';
          btn.style.color = 'var(--tc-text, #d1d4dc)';
        }
      });
      bar.appendChild(btn);
    }

    parent.appendChild(bar);
    this.drawingFavoritesBarEl = bar;
    this.positionDrawingFavoritesBar(bar, parent, state?.favoriteToolbarPosition ?? null);
    this.attachDrawingFavoritesBarDrag(bar, handle, parent);
  }

  private positionDrawingFavoritesBar(
    bar: HTMLElement,
    parent: HTMLElement,
    position: UserDrawingFavoriteToolbarPosition | null,
  ): void {
    const parentRect = parent.getBoundingClientRect();
    const viewportWidth = parentRect.width || window.innerWidth;
    const viewportHeight = parentRect.height || window.innerHeight;
    const barWidth = bar.offsetWidth || 0;
    const barHeight = bar.offsetHeight || 0;
    const railMetrics = this.getLeftToolRailMetrics();
    const defaultLeft = railMetrics.leftToolRailInset + railMetrics.leftToolRailWidth + 16;
    const defaultTop = WEB_CHART_CHROME_METRICS.topBarHeight + 38;
    const maxLeft = Math.max(0, viewportWidth - barWidth - 8);
    const maxTop = Math.max(0, viewportHeight - barHeight - 8);
    const left = Math.min(Math.max(0, position?.x ?? defaultLeft), maxLeft);
    const top = Math.min(Math.max(0, position?.y ?? defaultTop), maxTop);
    bar.style.left = `${left}px`;
    bar.style.top = `${top}px`;
  }

  private attachDrawingFavoritesBarDrag(bar: HTMLElement, handle: HTMLElement, parent: HTMLElement): void {
    const onPointerDown = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const startLeft = bar.offsetLeft;
      const startTop = bar.offsetTop;
      const startX = event.clientX;
      const startY = event.clientY;
      handle.style.cursor = 'grabbing';

      const onMove = (moveEvent: MouseEvent) => {
        const parentRect = parent.getBoundingClientRect();
        const barWidth = bar.offsetWidth;
        const barHeight = bar.offsetHeight;
        const maxLeft = Math.max(0, (parentRect.width || window.innerWidth) - barWidth - 8);
        const maxTop = Math.max(0, (parentRect.height || window.innerHeight) - barHeight - 8);
        const left = Math.min(Math.max(0, startLeft + (moveEvent.clientX - startX)), maxLeft);
        const top = Math.min(Math.max(0, startTop + (moveEvent.clientY - startY)), maxTop);
        bar.style.left = `${left}px`;
        bar.style.top = `${top}px`;
      };
      const onUp = () => {
        handle.style.cursor = 'grab';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        this.options.onUserDrawingFavoriteToolbarMove?.({ x: bar.offsetLeft, y: bar.offsetTop });
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    handle.addEventListener('mousedown', onPointerDown);
    this.drawingFavoritesBarCleanup.push(() => handle.removeEventListener('mousedown', onPointerDown));
  }

  private removeSelectedActionSurface(): void {
    for (const cleanup of this.selectedActionSurfaceCleanup) {
      cleanup();
    }
    this.selectedActionSurfaceCleanup = [];
    this.selectedActionSurfaceEl?.remove();
    this.selectedActionSurfaceEl = null;
  }

  private handleSelectedActionSurfaceItemClick(
    item: ReturnType<typeof resolveUserDrawingSelectedActionSurface>['groups'][number]['items'][number],
  ): void {
    if (item.command.type === 'openProperties') {
      this.options.onUserDrawingPropertiesOpen?.();
      return;
    }

    if (item.command.type === 'openObjectTree') {
      this.options.onUserDrawingObjectTreeOpen?.();
      return;
    }

    if (item.command.type === 'editText') {
      this.options.onUserDrawingTextEditOpen?.(item.command.drawingId);
      return;
    }

    if (item.command.type === 'copySelected') {
      this.options.onUserDrawingCopySelected?.();
      return;
    }

    if (item.command.type === 'setDuplicateEditDrag') {
      this.options.onUserDrawingDuplicateEditDragChange?.(item.command.duplicate);
      return;
    }

    if (item.command.type === 'saveSelectedStyleAsDefault') {
      this.options.onUserDrawingSaveSelectedStyleAsDefault?.();
      return;
    }

    if (item.command.type === 'styleAction') {
      if (item.command.visible !== undefined) {
        this.options.onUserDrawingVisibilityChange?.(item.command.visible);
      }
      if (item.command.locked !== undefined) {
        this.options.onUserDrawingLockedChange?.(
          item.command.locked,
          item.command.includeLocked === undefined ? undefined : { includeLocked: item.command.includeLocked },
        );
      }
      return;
    }

    if (item.command.type === 'updateStyle') {
      this.options.onUserDrawingStyleChange?.(item.command.style);
      return;
    }

    if (item.command.type === 'setTextAlign') {
      this.options.onUserDrawingTextAlignChange?.(item.command.textAlign);
      return;
    }

    if (item.command.type === 'setTrendLineExtend') {
      this.options.onUserDrawingTrendLineExtendChange?.(item.command.extend);
      return;
    }

    if (item.command.type === 'setIconName') {
      this.options.onUserDrawingIconNameChange?.(item.command.iconName);
      return;
    }

    if (item.command.action === 'duplicateSelected') this.options.onUserDrawingDuplicateSelected?.();
    if (item.command.action === 'deleteSelected') this.options.onUserDrawingDeleteSelected?.();
    if (
      item.command.action === 'bringForward' ||
      item.command.action === 'sendBackward' ||
      item.command.action === 'bringToFront' ||
      item.command.action === 'sendToBack'
    ) {
      this.options.onUserDrawingZOrderChange?.(item.command.action);
    }
  }

  private renderSelectedActionSurface(): void {
    this.removeSelectedActionSurface();
    const state = this.options.userDrawingState;
    const anchor = this.options.userDrawingSelectionActionAnchor;
    const editDragActive = this.options.userDrawingEditDragActive === true;
    if (!state || !anchor || !shouldRenderUserDrawingSelectedActionSurface(state, anchor, { editDragActive })) {
      this.selectedActionPopoverGroupId = null;
      this.selectedActionPopoverDrawingId = null;
      return;
    }

    const surface = resolveUserDrawingSelectedActionSurface(state, {
      duplicateEditDragEnabled: this.options.userDrawingDuplicateEditDragEnabled,
    });
    const selectedDrawingId = surface.selectedDrawing?.id ?? null;
    if (this.selectedActionPopoverDrawingId !== selectedDrawingId) {
      this.selectedActionPopoverGroupId = null;
      this.selectedActionPopoverDrawingId = selectedDrawingId;
    }
    const activePopoverGroup = surface.groups.find((group) => group.id === this.selectedActionPopoverGroupId);
    const activePopoverHeight =
      activePopoverGroup?.presentation?.type === 'popover'
        ? SELECTED_ACTION_SURFACE_POPOVER_OFFSET_Y +
          Math.max(SELECTED_ACTION_SURFACE_ESTIMATED_HEIGHT, SELECTED_ACTION_SURFACE_POPOVER_ESTIMATED_HEIGHT)
        : SELECTED_ACTION_SURFACE_ESTIMATED_HEIGHT;
    const parent = this.options.drawingOverlayParent ?? this.el.parentElement ?? this.el;
    const parentRect = parent.getBoundingClientRect();
    const viewport = {
      width: parentRect.width || window.innerWidth,
      height: parentRect.height || window.innerHeight,
    };
    const railMetrics = this.getLeftToolRailMetrics();
    const legendRect = computeTopLeftLegendRect(
      railMetrics,
      { x: 0, y: 0, width: viewport.width, height: viewport.height },
      0,
      // The rail runs full height, so the legend clears it — match that in the avoid-rect.
      { avoidLeftTools: true },
    );
    const position = resolveUserDrawingActionSurfacePosition({
      anchor: anchor.anchor,
      viewport,
      surface: {
        width: SELECTED_ACTION_SURFACE_ESTIMATED_WIDTH,
        height: activePopoverHeight,
      },
      inset: {
        left: computeLeftToolRailAvoidanceInset(railMetrics, viewport.width, SELECTED_ACTION_SURFACE_ESTIMATED_WIDTH),
        right: 8,
        top: WEB_CHART_CHROME_METRICS.topBarHeight + 6,
        bottom: 8,
      },
      avoidRects: legendRect ? [legendRect] : undefined,
      selectionBounds: anchor.bounds,
    });

    const el = this.createElement('div', {
      style: {
        ...styles.selectedActionSurface,
        left: `${position.left}px`,
        top: `${position.top}px`,
      },
      attributes: {
        'aria-label': 'Selected drawing actions',
      },
    });
    el.addEventListener('mousedown', (event) => event.stopPropagation());
    el.addEventListener('mouseup', (event) => event.stopPropagation());
    el.addEventListener('click', (event) => event.stopPropagation());

    for (let groupIndex = 0; groupIndex < surface.groups.length; groupIndex += 1) {
      const group = surface.groups[groupIndex]!;
      const groupEl = this.createElement('div', {
        style: {
          ...styles.selectedActionSurfaceGroup,
          ...(group.presentation?.type === 'popover' ? { position: 'relative' } : {}),
          ...(groupIndex > 0 ? styles.selectedActionSurfaceGroupSeparated : {}),
        },
      });

      if (group.presentation?.type === 'popover') {
        const trigger = this.createElement('button', {
          style: {
            ...styles.drawingButton,
            backgroundColor: this.selectedActionPopoverGroupId === group.id ? 'rgba(41, 98, 255, 0.18)' : 'transparent',
            color:
              this.selectedActionPopoverGroupId === group.id ? 'var(--tc-accent, #5b8cff)' : 'var(--tc-text2, #787b86)',
          },
          textContent: group.presentation.triggerIcon ?? '⋯',
          attributes: {
            type: 'button',
            title: group.presentation.triggerLabel ?? group.label,
            'aria-label': group.presentation.triggerLabel ?? group.label,
            'aria-expanded': this.selectedActionPopoverGroupId === group.id ? 'true' : 'false',
          },
        });
        trigger.addEventListener('click', () => {
          this.selectedActionPopoverGroupId = this.selectedActionPopoverGroupId === group.id ? null : group.id;
          this.renderSelectedActionSurface();
        });
        trigger.addEventListener('mouseenter', () => Object.assign(trigger.style, styles.drawingButtonHover));
        trigger.addEventListener('mouseleave', () => {
          trigger.style.backgroundColor =
            this.selectedActionPopoverGroupId === group.id ? 'rgba(41, 98, 255, 0.18)' : 'transparent';
          trigger.style.color =
            this.selectedActionPopoverGroupId === group.id ? 'var(--tc-accent, #5b8cff)' : 'var(--tc-text2, #787b86)';
        });
        groupEl.appendChild(trigger);

        if (this.selectedActionPopoverGroupId === group.id) {
          const popover = this.createElement('div', {
            style: {
              ...styles.selectedActionSurfacePopover,
              top: `${SELECTED_ACTION_SURFACE_POPOVER_OFFSET_Y}px`,
              width: `${Math.min(group.presentation.popoverWidth ?? 296, SELECTED_ACTION_SURFACE_ESTIMATED_WIDTH - 8)}px`,
            },
            attributes: {
              'aria-label': group.presentation.popoverLabel ?? group.label,
            },
          });
          for (const item of group.items) {
            popover.appendChild(this.createSelectedActionSurfaceButton(item, { keepPopoverOpen: true }));
          }
          el.appendChild(popover);
        }

        el.appendChild(groupEl);
        continue;
      }

      for (const item of group.items) {
        groupEl.appendChild(this.createSelectedActionSurfaceButton(item));
      }
      el.appendChild(groupEl);
    }

    this.selectedActionSurfaceEl = el;
    parent.appendChild(el);

    const closeActivePopover = () => {
      if (!this.selectedActionPopoverGroupId) return;
      this.selectedActionPopoverGroupId = null;
      this.renderSelectedActionSurface();
    };
    const closePopoverOnOutsidePointer = (event: MouseEvent | TouchEvent) => {
      if (!this.selectedActionPopoverGroupId) return;
      const target = event.target;
      if (target instanceof Node && el.contains(target)) return;
      closeActivePopover();
    };
    const closePopoverOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeActivePopover();
      }
    };
    document.addEventListener('mousedown', closePopoverOnOutsidePointer);
    document.addEventListener('touchstart', closePopoverOnOutsidePointer);
    document.addEventListener('keydown', closePopoverOnEscape);
    this.selectedActionSurfaceCleanup.push(
      () => document.removeEventListener('mousedown', closePopoverOnOutsidePointer),
      () => document.removeEventListener('touchstart', closePopoverOnOutsidePointer),
      () => document.removeEventListener('keydown', closePopoverOnEscape),
    );
  }

  private createSelectedActionSurfaceButton(
    item: ReturnType<typeof resolveUserDrawingSelectedActionSurface>['groups'][number]['items'][number],
    options: { keepPopoverOpen?: boolean } = {},
  ): HTMLButtonElement {
    const btn = this.createElement('button', {
      style: {
        ...styles.drawingButton,
        ...(item.selected ? styles.drawingButtonActive : {}),
        ...(item.swatchColor ? styles.drawingSwatch : {}),
        ...(item.swatchColor ? { backgroundColor: item.swatchColor } : {}),
        opacity: item.enabled ? '1' : '0.35',
        cursor: item.enabled ? 'pointer' : 'default',
      },
      attributes: {
        type: 'button',
        title: item.label,
        'aria-label': item.label,
        ...(item.selected !== undefined ? { 'aria-pressed': item.selected ? 'true' : 'false' } : {}),
      },
    });
    this.setDrawingIconContent(
      btn,
      resolveDrawingSelectedActionIconName(item.command, item.swatchColor),
      item.icon,
      18,
    );
    btn.disabled = !item.enabled;
    if (item.enabled) {
      btn.addEventListener('click', () => {
        this.handleSelectedActionSurfaceItemClick(item);
        if (!options.keepPopoverOpen) {
          this.selectedActionPopoverGroupId = null;
          this.renderSelectedActionSurface();
        }
      });
      btn.addEventListener('mouseenter', () => Object.assign(btn.style, styles.drawingButtonHover));
      btn.addEventListener('mouseleave', () => {
        btn.style.backgroundColor =
          item.swatchColor ?? (item.selected ? 'var(--tc-accent-bg, rgba(41, 98, 255, 0.2))' : 'transparent');
        btn.style.color = item.selected ? 'var(--tc-accent, #2962ff)' : 'var(--tc-text2, #787b86)';
      });
    }
    return btn;
  }

  /**
   * Populate an element with a tool/action icon: the shared SVG when authored,
   * otherwise the descriptor's glyph fallback.
   */
  private setDrawingIconContent(el: HTMLElement, iconName: string | undefined, glyph: string, size: number): void {
    el.textContent = '';
    const iconEl = iconName ? renderDrawingIcon(iconName, { size }) : null;
    if (iconEl) {
      el.appendChild(iconEl);
    } else {
      el.textContent = glyph;
    }
  }

  private createDrawingRailCollapseButton(collapsed: boolean): HTMLButtonElement {
    const label = collapsed ? 'Expand drawing toolbar' : 'Collapse drawing toolbar';
    const btn = this.createElement('button', {
      style: styles.drawingRailCollapseTab,
      attributes: {
        type: 'button',
        title: label,
        'aria-label': label,
        'aria-pressed': collapsed ? 'true' : 'false',
      },
    });
    this.setDrawingIconContent(btn, collapsed ? 'arrowMarkRight' : 'arrowMarkLeft', collapsed ? '>' : '<', 12);
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.setDrawingToolRailCollapsed(!collapsed);
    });
    btn.addEventListener('mouseenter', () => {
      btn.style.filter = 'brightness(1.08)';
      this.showRailTooltip(btn, label);
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.filter = '';
      this.hideRailTooltip();
    });
    return btn;
  }

  private renderDrawingToolRail(activeTool: UserDrawingTool): void {
    const drawingState = this.options.userDrawingState;
    const collapsed = this.isDrawingToolRailCollapsed();
    const railVisualWidth = WEB_CHART_CHROME_METRICS.leftToolRailWidth;
    const rail = this.createElement('div', {
      style: {
        ...styles.drawingToolRail,
        transform: this.getDrawingToolRailInitialTransform(collapsed),
        width: `${railVisualWidth}px`,
      },
      attributes: {
        'aria-label': 'Drawing tool categories',
        'aria-expanded': collapsed ? 'false' : 'true',
      },
    });
    rail.appendChild(this.createDrawingRailCollapseButton(collapsed));

    this.drawingToolRailEl = rail;
    const overlayParent = this.options.drawingOverlayParent ?? this.el.parentElement ?? this.el;
    overlayParent.appendChild(rail);

    const tooltip = this.createElement('div', { style: styles.drawingToolTooltip });
    this.drawingRailTooltipEl = tooltip;
    overlayParent.appendChild(tooltip);
    this.animateDrawingToolRailToState(rail, collapsed);

    if (collapsed) {
      return;
    }

    const railList = this.createElement('div', {
      style: styles.drawingToolRailList,
      attributes: {
        'aria-label': 'Drawing tool category list',
      },
    });
    let activeFlyout: {
      id: string;
      button: HTMLButtonElement;
      flyout: HTMLElement;
      pinButton: HTMLButtonElement;
    } | null = null;
    const updatePinButton = (pinButton: HTMLButtonElement, categoryId: string) => {
      const pinned = this.pinnedDrawingToolCategoryId === categoryId;
      pinButton.textContent = pinned ? '●' : '○';
      pinButton.title = pinned ? 'Unpin drawing tools' : 'Pin drawing tools';
      pinButton.setAttribute('aria-label', pinned ? 'Unpin drawing tools' : 'Pin drawing tools');
      pinButton.setAttribute('aria-pressed', pinned ? 'true' : 'false');
      Object.assign(pinButton.style, pinned ? styles.drawingButtonActive : styles.drawingToolPinButton);
    };
    const closeActiveFlyout = () => {
      if (!activeFlyout) return;
      activeFlyout.flyout.style.display = 'none';
      activeFlyout.button.setAttribute('aria-expanded', 'false');
      updatePinButton(activeFlyout.pinButton, activeFlyout.id);
      activeFlyout = null;
    };

    for (const category of USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS) {
      const activeCategory = category.tools.includes(activeTool);
      if (activeCategory) {
        this.recentDrawingToolsByCategory[category.id] = activeTool;
      }
      const categoryTool = resolveUserDrawingToolCategoryButtonTool(
        category,
        activeTool,
        this.recentDrawingToolsByCategory,
      );
      const categoryToolDescriptor = getUserDrawingToolDescriptor(categoryTool);
      const flyoutId = `tealchart-drawing-tools-${category.id}`;
      const railItem = this.createElement('div', {
        style: styles.drawingToolRailItem,
      });
      const categoryButton = this.createElement('button', {
        style: {
          ...styles.drawingToolCategoryButton,
          ...(activeCategory ? styles.drawingButtonActive : {}),
        },
        attributes: {
          type: 'button',
          'aria-label': `${category.label} drawing tools`,
          'aria-expanded': 'false',
          'aria-haspopup': 'menu',
          'aria-controls': flyoutId,
          'aria-pressed': activeCategory ? 'true' : 'false',
        },
      });
      categoryButton.addEventListener('mouseenter', () => {
        if (!category.tools.includes(activeTool)) Object.assign(categoryButton.style, styles.drawingButtonHover);
      });
      categoryButton.addEventListener('mouseleave', () => {
        if (!category.tools.includes(activeTool)) {
          categoryButton.style.backgroundColor = 'transparent';
          categoryButton.style.color = 'var(--tc-text2, #b2b5be)';
        }
      });
      this.setDrawingIconContent(
        categoryButton,
        resolveDrawingToolIconName(categoryTool),
        categoryToolDescriptor.icon,
        20,
      );
      const flyout = this.createElement('div', {
        style: {
          ...styles.drawingToolFlyout,
          left: `${railVisualWidth}px`,
        },
        attributes: {
          id: flyoutId,
          role: 'menu',
          'aria-label': `${category.label} tools`,
        },
      });
      const pinButton = this.createElement('button', {
        style: styles.drawingToolPinButton,
        attributes: {
          type: 'button',
        },
      });
      updatePinButton(pinButton, category.id);
      const flyoutHeader = this.createElement('div', { style: styles.drawingToolFlyoutHeader });
      flyoutHeader.appendChild(
        this.createElement('div', {
          style: { ...styles.drawingToolFlyoutTitle, marginBottom: '0' },
          textContent: category.label,
        }),
      );
      flyoutHeader.appendChild(pinButton);
      flyout.appendChild(flyoutHeader);
      const showFlyout = () => {
        if (activeFlyout?.id === category.id) return;
        if (activeFlyout && this.pinnedDrawingToolCategoryId === activeFlyout.id) {
          this.pinnedDrawingToolCategoryId = null;
        }
        closeActiveFlyout();
        const railRect = rail.getBoundingClientRect();
        const buttonRect = categoryButton.getBoundingClientRect();
        const railHeight = railRect.height || Math.max(160, window.innerHeight - TIME_AXIS_HEIGHT);
        const rawFlyoutTop = Math.max(0, buttonRect.top - railRect.top);
        const remainingHeight = Math.max(0, railHeight - rawFlyoutTop);
        const flyoutTop = remainingHeight > 0 && remainingHeight < 160 ? Math.max(0, railHeight - 160) : rawFlyoutTop;
        const flyoutHeight = Math.max(120, railHeight - flyoutTop);
        flyout.style.top = `${flyoutTop}px`;
        flyout.style.maxHeight = `${flyoutHeight}px`;
        flyout.style.display = 'block';
        categoryButton.setAttribute('aria-expanded', 'true');
        updatePinButton(pinButton, category.id);
        activeFlyout = { id: category.id, button: categoryButton, flyout, pinButton };
      };
      const hideFlyout = () => {
        if (activeFlyout?.id !== category.id) return;
        if (this.pinnedDrawingToolCategoryId === category.id) return;
        flyout.style.display = 'none';
        categoryButton.setAttribute('aria-expanded', 'false');
        updatePinButton(pinButton, category.id);
        activeFlyout = null;
      };
      pinButton.addEventListener('click', (event) => {
        event.stopPropagation();
        this.pinnedDrawingToolCategoryId = this.pinnedDrawingToolCategoryId === category.id ? null : category.id;
        updatePinButton(pinButton, category.id);
      });
      const toggleFlyout = () => {
        if (flyout.style.display === 'block' && this.pinnedDrawingToolCategoryId !== category.id) hideFlyout();
        else showFlyout();
      };
      categoryButton.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleFlyout();
      });
      const isMultiTool = category.tools.length > 1;
      const caret = isMultiTool
        ? this.createElement('button', {
            style: styles.drawingToolCategoryCaret,
            attributes: { type: 'button', tabindex: '-1', 'aria-label': `${category.label} menu` },
          })
        : null;
      if (caret) {
        caret.appendChild(this.createElement('span', { style: styles.drawingToolCategoryCaretGlyph }));
        // The caret is its own button — clicking it always opens the menu.
        caret.addEventListener('click', (event) => {
          event.stopPropagation();
          toggleFlyout();
        });
      }
      railItem.addEventListener('mouseenter', () => {
        if (caret) caret.style.opacity = '1';
        this.showRailTooltip(categoryButton, category.label);
      });
      railItem.addEventListener('mouseleave', () => {
        if (caret) caret.style.opacity = '0';
        this.hideRailTooltip();
      });

      for (const tool of category.tools) {
        const descriptor = getUserDrawingToolDescriptor(tool);
        const isActive = activeTool === descriptor.tool;
        const row = this.createElement('div', { style: styles.drawingToolFlyoutRow });
        const btn = this.createElement('button', {
          style: {
            ...styles.drawingToolFlyoutButton,
            ...(isActive ? styles.drawingButtonActive : {}),
            flex: '1 1 auto',
            minWidth: '0',
            width: 'auto',
          },
          attributes: {
            type: 'button',
            title: drawingToolTitleWithHotkey(descriptor.tool, descriptor.label),
            'aria-label': descriptor.label,
            'aria-pressed': isActive ? 'true' : 'false',
          },
        });
        const flyoutIcon = this.createElement('span', { style: styles.drawingToolFlyoutIcon });
        this.setDrawingIconContent(flyoutIcon, resolveDrawingToolIconName(descriptor.tool), descriptor.icon, 18);
        btn.appendChild(flyoutIcon);
        btn.appendChild(
          this.createElement('span', { style: styles.drawingToolFlyoutLabel, textContent: descriptor.label }),
        );
        btn.addEventListener('click', () => {
          const selectedCategory = getUserDrawingToolCategoryDescriptorForTool(descriptor.tool);
          if (selectedCategory) {
            this.recentDrawingToolsByCategory[selectedCategory.id] = descriptor.tool;
          }
          this.options.onUserDrawingToolSelect?.(descriptor.tool);
          if (this.pinnedDrawingToolCategoryId !== category.id) closeActiveFlyout();
        });
        btn.addEventListener('mouseenter', () => {
          if (!isActive) Object.assign(btn.style, styles.drawingButtonHover);
        });
        btn.addEventListener('mouseleave', () => {
          if (!isActive) {
            btn.style.backgroundColor = 'transparent';
            btn.style.color = 'var(--tc-text, #d1d4dc)';
          }
        });
        row.appendChild(btn);

        const isFavorite = isUserDrawingToolFavorite(descriptor.tool, drawingState);
        const starButton = this.createElement('button', {
          style: {
            ...styles.drawingToolFlyoutStar,
            ...(isFavorite ? styles.drawingToolFlyoutStarActive : {}),
          },
          attributes: {
            type: 'button',
            title: isFavorite ? 'Remove from favorites' : 'Add to favorites',
            'aria-label': isFavorite
              ? `Remove ${descriptor.label} from favorites`
              : `Add ${descriptor.label} to favorites`,
            'aria-pressed': isFavorite ? 'true' : 'false',
          },
        });
        this.setDrawingIconContent(starButton, isFavorite ? 'star' : 'starOutline', isFavorite ? '★' : '☆', 16);
        starButton.addEventListener('click', (event) => {
          event.stopPropagation();
          this.options.onUserDrawingToggleFavoriteTool?.(descriptor.tool);
        });
        row.appendChild(starButton);
        flyout.appendChild(row);
      }

      railItem.appendChild(categoryButton);
      if (caret) railItem.appendChild(caret);
      railList.appendChild(railItem);
      rail.appendChild(flyout);
    }

    rail.appendChild(railList);
    this.renderDrawingRailToggles(rail, drawingState);

    const closeOnOutsidePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (target instanceof Node && rail.contains(target)) return;
      if (activeFlyout && this.pinnedDrawingToolCategoryId === activeFlyout.id) return;
      closeActiveFlyout();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.pinnedDrawingToolCategoryId = null;
        closeActiveFlyout();
      }
    };
    document.addEventListener('mousedown', closeOnOutsidePointer);
    document.addEventListener('touchstart', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    this.drawingToolRailCleanup.push(
      () => document.removeEventListener('mousedown', closeOnOutsidePointer),
      () => document.removeEventListener('touchstart', closeOnOutsidePointer),
      () => document.removeEventListener('keydown', closeOnEscape),
    );

    if (this.pinnedDrawingToolCategoryId) {
      const pinnedCategoryButton = rail.querySelector<HTMLButtonElement>(
        `button[aria-controls="tealchart-drawing-tools-${this.pinnedDrawingToolCategoryId}"]`,
      );
      pinnedCategoryButton?.click();
    }
  }

  private renderDrawingToolbar(): HTMLElement {
    const group = this.createElement('div', { style: styles.drawingGroup });
    const state = this.options.userDrawingState;
    const activeTool = state?.activeTool ?? 'select';

    this.renderDrawingToolRail(activeTool);
    group.appendChild(this.createElement('div', { style: styles.divider }));

    const globalActionDescriptors = USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS.filter(
      (descriptor) =>
        isUserDrawingGlobalToolbarAction(descriptor.action) &&
        // Rail actions (measure, zoom, lock, hide, clear) render in the vertical rail.
        !isUserDrawingRailToolbarAction(descriptor.action),
    );
    for (const item of globalActionDescriptors.map((descriptor) => ({
      ...descriptor,
      id: descriptor.action,
      enabled: state
        ? isUserDrawingToolbarActionEnabled(state, descriptor.action, this.options.userDrawingCommandAvailability)
        : false,
      command: { type: 'toolbarAction' as const, action: descriptor.action },
    }))) {
      const enabled = item.enabled;
      // Only stateless actions (undo, redo, cancelDraft) remain here — measure and
      // zoom moved to the rail — so these buttons never carry an active state.
      const btn = this.createElement('button', {
        style: {
          ...styles.drawingButton,
          opacity: enabled ? '1' : '0.35',
          cursor: enabled ? 'pointer' : 'default',
        },
        attributes: {
          type: 'button',
          title: item.label,
          'aria-label': item.label,
        },
      });
      this.setDrawingIconContent(btn, resolveDrawingToolbarActionIconName(item.command.action), item.icon, 18);
      btn.disabled = !enabled;
      if (enabled) {
        btn.addEventListener('click', () => {
          if (item.command.type !== 'toolbarAction') return;
          if (item.command.action === 'undo') this.options.onUserDrawingUndo?.();
          if (item.command.action === 'redo') this.options.onUserDrawingRedo?.();
          if (item.command.action === 'cancelDraft') this.options.onUserDrawingCancelDraft?.();
        });
        btn.addEventListener('mouseenter', () => {
          Object.assign(btn.style, styles.drawingButtonHover);
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.backgroundColor = 'transparent';
          btn.style.color = 'var(--tc-text2, #b2b5be)';
        });
      }
      group.appendChild(btn);
    }

    return group;
  }

  // ============================================================================
  // Timeframe Selector
  // ============================================================================

  private getSupportedTimeframes(): TimeframeOption[] {
    return filterTimeframesBySupportedResolutions(this.supportedResolutions);
  }

  private getFavoriteTimeframeValues(timeframes: readonly TimeframeOption[]): ResolutionString[] {
    const supportedValues = new Set(timeframes.map((timeframe) => timeframe.value));
    const storedFavorites = this.chartStore.uiPreferences
      .get()
      .favoriteTimeframeValues.filter((timeframe) => supportedValues.has(timeframe));
    const favoriteValues =
      storedFavorites.length > 0 ? storedFavorites : getDefaultFavoriteTimeframeValues(this.supportedResolutions);

    if (supportedValues.has(this.state.interval) && !favoriteValues.includes(this.state.interval)) {
      return [...favoriteValues, this.state.interval];
    }

    return favoriteValues;
  }

  private getToolbarTimeframes(timeframes: readonly TimeframeOption[]): TimeframeOption[] {
    const timeframesByValue = new Map(timeframes.map((timeframe) => [timeframe.value, timeframe]));
    return this.getFavoriteTimeframeValues(timeframes)
      .map((value) => timeframesByValue.get(value))
      .filter((timeframe): timeframe is TimeframeOption => timeframe != null);
  }

  private toggleFavoriteTimeframe(value: ResolutionString, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const current = this.chartStore.uiPreferences.get().favoriteTimeframeValues;
    const next = current.includes(value) ? current.filter((timeframe) => timeframe !== value) : [...current, value];
    this.chartStore.uiPreferences.setKey('favoriteTimeframeValues', next);
  }

  private toggleIntervalDropdown(): void {
    this.setState({ intervalDropdownOpen: !this.state.intervalDropdownOpen });
  }

  private closeIntervalDropdown(options: { render?: boolean } = {}): void {
    if (!this.state.intervalDropdownOpen) return;
    this.state.intervalDropdownOpen = false;
    this.removeIntervalDropdown();
    if (options.render !== false) this.render();
  }

  private removeIntervalDropdown(options: { keepOutsideHandler?: boolean } = {}): void {
    this.intervalDropdownEl?.remove();
    this.intervalDropdownEl = null;

    if (!options.keepOutsideHandler && this.intervalDropdownOutsideHandler) {
      document.removeEventListener('pointerdown', this.intervalDropdownOutsideHandler, true);
      this.intervalDropdownOutsideHandler = null;
    }
  }

  private renderIntervalDropdown(anchorEl: HTMLElement, timeframes: readonly TimeframeOption[]): void {
    this.removeIntervalDropdown({ keepOutsideHandler: true });

    const dropdown = this.createElement('div', {
      style: styles.timeframeDropdown,
      attributes: { role: 'menu' },
    });
    if (this.options.cssVars) {
      for (const [name, value] of Object.entries(this.options.cssVars)) {
        dropdown.style.setProperty(name, value);
      }
    }

    const addCustomItem = this.createElement('button', {
      style: styles.timeframeDropdownAdd,
      attributes: { type: 'button', disabled: 'true' },
    });
    addCustomItem.appendChild(
      this.createElement('span', {
        style: styles.timeframeDropdownAddIcon,
        textContent: '+',
      }),
    );
    addCustomItem.appendChild(
      this.createElement('span', {
        textContent: 'Add custom interval...',
      }),
    );
    dropdown.appendChild(addCustomItem);

    const favoriteValues = this.chartStore.uiPreferences.get().favoriteTimeframeValues;

    for (const group of TIMEFRAME_GROUPS) {
      const groupTimeframes = timeframes.filter((timeframe) => timeframe.group === group.value);
      if (groupTimeframes.length === 0) continue;

      dropdown.appendChild(
        this.createElement('div', {
          style: styles.timeframeDropdownGroupLabel,
          textContent: group.label,
        }),
      );

      for (const timeframe of groupTimeframes) {
        const isActive = timeframe.value === this.state.interval;
        const isFavorite = favoriteValues.includes(timeframe.value);
        const item = this.createElement('div', {
          style: {
            ...styles.timeframeDropdownItem,
            ...(isActive ? styles.timeframeDropdownItemActive : {}),
          },
          attributes: { role: 'menuitemradio', 'aria-checked': String(isActive), tabindex: '0' },
        });
        item.addEventListener('click', () => this.handleTimeframeClick(timeframe.value));
        item.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          this.handleTimeframeClick(timeframe.value);
        });
        item.addEventListener('mouseenter', () => {
          if (!isActive) item.style.backgroundColor = 'var(--tc-hover-bg, rgba(255, 255, 255, 0.05))';
        });
        item.addEventListener('mouseleave', () => {
          if (!isActive) item.style.backgroundColor = 'transparent';
        });
        item.appendChild(
          this.createElement('span', {
            textContent: timeframe.label,
          }),
        );

        const favoriteButton = this.createElement('button', {
          style: {
            ...styles.timeframeFavoriteButton,
            opacity: isFavorite ? '1' : '0.45',
          },
          textContent: isFavorite ? '★' : '☆',
          attributes: {
            type: 'button',
            'aria-label': `${isFavorite ? 'Remove' : 'Add'} ${timeframe.label} favorite`,
          },
        });
        favoriteButton.addEventListener('click', (event) => this.toggleFavoriteTimeframe(timeframe.value, event));
        item.appendChild(favoriteButton);
        dropdown.appendChild(item);
      }
    }

    mountWebFloatingElement(dropdown);
    this.intervalDropdownEl = dropdown;
    this.positionIntervalDropdown(anchorEl, dropdown);

    if (!this.intervalDropdownOutsideHandler) {
      this.intervalDropdownOutsideHandler = (event: PointerEvent) => {
        const target = event.target as Node | null;
        if (!target || this.el.contains(target) || dropdown.contains(target)) return;
        this.closeIntervalDropdown();
      };
      document.addEventListener('pointerdown', this.intervalDropdownOutsideHandler, true);
    }
  }

  private positionIntervalDropdown(anchorEl: HTMLElement, dropdown: HTMLElement): void {
    const anchorRect = anchorEl.getBoundingClientRect();
    const dropdownWidth = dropdown.offsetWidth || 260;
    const dropdownHeight = dropdown.offsetHeight || 0;

    positionFixedFloatingElement(dropdown, {
      desiredLeft: anchorRect.left,
      desiredTop: anchorRect.bottom + 4,
      fallbackWidth: dropdownWidth,
      fallbackHeight: dropdownHeight,
      margin: 8,
    });
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private handleTimeframeClick(interval: ResolutionString): void {
    // Update store
    this.chartStore.settings.setKey('interval', interval);

    this.state.interval = interval;
    this.state.intervalDropdownOpen = false;
    this.removeIntervalDropdown();
    this.render();

    // Notify parent
    this.options.onIntervalChange?.(interval);
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Update the active interval (highlights the correct timeframe button)
   */
  setInterval(interval: ResolutionString): void {
    if (interval === this.state.interval) {
      return; // No change
    }
    const previousInterval = this.state.interval;
    this.state.interval = interval;
    if (!this.timeframeButtons.has(interval)) {
      this.render();
      return;
    }

    // Update button styles directly (no full re-render needed)
    const previousBtn = this.timeframeButtons.get(previousInterval);
    const newBtn = this.timeframeButtons.get(interval);

    if (previousBtn) {
      previousBtn.style.backgroundColor = 'transparent';
      previousBtn.style.color = 'var(--tc-text2, #787b86)';
    }
    if (newBtn) {
      Object.assign(newBtn.style, styles.timeframeButtonActive);
    }
  }

  /**
   * Update the displayed symbol
   */
  setSymbol(symbol: string, exchangeName?: string): void {
    if (symbol === this.options.symbol && (exchangeName === undefined || exchangeName === this.options.exchangeName)) {
      return; // No change
    }
    this.options.symbol = symbol;
    if (exchangeName !== undefined) {
      this.options.exchangeName = exchangeName;
    }
    this.render();
  }

  /**
   * Update the supported resolutions (filters timeframe buttons)
   * Pass null to show all timeframes (backward compat).
   */
  setSupportedResolutions(resolutions: string[] | null): void {
    this.supportedResolutions = resolutions;
    this.render();
  }

  setUserDrawingState(state: UserDrawingState, options: { render?: boolean } = {}): void {
    this.options.userDrawingState = state;
    if (options.render !== false) this.render();
  }

  setUserDrawingCommandAvailability(
    availability: UserDrawingCommandAvailability,
    options: { render?: boolean } = {},
  ): void {
    this.options.userDrawingCommandAvailability = availability;
    if (options.render !== false) this.render();
  }

  setUserDrawingDuplicateEditDragEnabled(enabled: boolean): void {
    this.options.userDrawingDuplicateEditDragEnabled = enabled;
    this.renderSelectedActionSurface();
  }

  setUserDrawingSelectionActionAnchor(anchor: UserDrawingSelectionActionAnchor | null): void {
    this.options.userDrawingSelectionActionAnchor = anchor;
    this.renderSelectedActionSurface();
  }

  setUserDrawingEditDragActive(active: boolean): void {
    if (this.options.userDrawingEditDragActive === active) return;
    this.options.userDrawingEditDragActive = active;
    this.renderSelectedActionSurface();
  }

  /**
   * Update the current layout shown in the layout selector
   */
  setCurrentLayout(layoutId: string | number | null, layoutName: string | null): void {
    this.layoutSelector?.setCurrentLayout(layoutId, layoutName);
  }

  /**
   * Get the layout selector (for mounting its modal to the chart root)
   */
  getLayoutSelector(): LayoutSelector | null {
    return this.layoutSelector;
  }

  /**
   * Update CSS variables
   */
  updateCssVars(vars: Record<string, string>): void {
    this.setCssVars(vars);
  }
}
