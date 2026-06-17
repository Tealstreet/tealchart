import type {
  UpdateUserDrawingOptions,
  UserDrawingFavoriteToolbarPosition,
  UserDrawingIconName,
  UserDrawingMagnetMode,
  UserDrawingCommandAvailability,
  UserDrawingSelectionActionAnchor,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTextAlign,
  UserDrawingTool,
  UserDrawingTrendLineExtend,
  UserDrawingZOrderAction,
} from '../drawings';
import type { ChartStore } from '../state/chartState';
import type { ResolutionString } from '../types';
import type { ComponentOptions } from './Component';
import type { LayoutSelectorCallbacks } from './LayoutSelector';

import {
  getUserDrawingAllDrawingsUpdateOptions,
  getUserDrawingToolCategoryDescriptorForTool,
  getUserDrawingToolDescriptor,
  getUserDrawingFavoriteTools,
  isUserDrawingGlobalToolbarAction,
  isUserDrawingRailToolbarAction,
  isUserDrawingToolbarActionEnabled,
  isUserDrawingToolFavorite,
  resolveDrawingSelectedActionIconName,
  resolveDrawingToolIconName,
  resolveDrawingToolbarActionIconName,
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
  computeLeftToolRailTop,
  computeTopLeftLegendRect,
  WEB_CHART_CHROME_METRICS,
} from '../layout/chartGeometry';
import { AVAILABLE_TIMEFRAMES, getChartStore } from '../state/chartState';
import { TIME_AXIS_HEIGHT } from '../types';
import { Component } from './Component';
import { renderDrawingIcon } from './dom';
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
  indicatorsHovered: boolean;
}

// ============================================================================
// Styles
// ============================================================================

const SELECTED_ACTION_SURFACE_ESTIMATED_WIDTH = 304;
const SELECTED_ACTION_SURFACE_ESTIMATED_HEIGHT = 70;
const SELECTED_ACTION_SURFACE_POPOVER_OFFSET_Y = 34;
const SELECTED_ACTION_SURFACE_POPOVER_ESTIMATED_HEIGHT = 74;

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    height: '32px',
    padding: '0 8px',
    backgroundColor: 'transparent',
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
    color: 'var(--text, #d1d4dc)',
    fontSize: '13px',
    flexShrink: '0',
    whiteSpace: 'nowrap',
  } as Partial<CSSStyleDeclaration>,

  exchange: {
    color: 'var(--text2, #787b86)',
    fontSize: '11px',
    marginLeft: '4px',
  } as Partial<CSSStyleDeclaration>,

  divider: {
    width: '1px',
    height: '16px',
    backgroundColor: 'var(--border, #363a45)',
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
    color: 'var(--text2, #787b86)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'background-color 0.15s, color 0.15s',
  } as Partial<CSSStyleDeclaration>,

  timeframeButtonActive: {
    backgroundColor: 'var(--accent-bg, rgba(41, 98, 255, 0.2))',
    color: 'var(--accent, #2962ff)',
  } as Partial<CSSStyleDeclaration>,

  timeframeButtonHover: {
    backgroundColor: 'var(--hover-bg, rgba(255, 255, 255, 0.05))',
  } as Partial<CSSStyleDeclaration>,

  indicatorsButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--text2, #787b86)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'background-color 0.15s, color 0.15s',
    flexShrink: '0',
    whiteSpace: 'nowrap',
  } as Partial<CSSStyleDeclaration>,

  indicatorsButtonHover: {
    backgroundColor: 'var(--hover-bg, rgba(255, 255, 255, 0.05))',
    color: 'var(--text, #d1d4dc)',
  } as Partial<CSSStyleDeclaration>,

  indicatorsIcon: {
    fontSize: '14px',
    fontStyle: 'italic',
    fontWeight: '700',
  } as Partial<CSSStyleDeclaration>,

  drawingToolRail: {
    position: 'absolute',
    top: `${computeLeftToolRailTop(WEB_CHART_CHROME_METRICS)}px`,
    left: `${WEB_CHART_CHROME_METRICS.leftToolRailInset}px`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '6px 4px',
    boxSizing: 'border-box',
    border: '1px solid var(--border, #363a45)',
    borderRadius: '6px',
    backgroundColor: 'var(--bg, rgba(19, 23, 34, 0.96))',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
    zIndex: '7',
    pointerEvents: 'auto',
    overflow: 'visible',
  } as Partial<CSSStyleDeclaration>,

  drawingToolRailList: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    maxHeight: `calc(100vh - ${
      computeLeftToolRailTop(WEB_CHART_CHROME_METRICS) + TIME_AXIS_HEIGHT + WEB_CHART_CHROME_METRICS.leftToolRailTopGap
    }px)`,
    overflowY: 'auto',
    overflowX: 'hidden',
    scrollbarWidth: 'none',
  } as Partial<CSSStyleDeclaration>,

  drawingToolRailItem: {
    position: 'relative',
  } as Partial<CSSStyleDeclaration>,

  drawingRailToggleGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    marginTop: '4px',
  } as Partial<CSSStyleDeclaration>,

  drawingRailToggleDivider: {
    width: '24px',
    height: '1px',
    backgroundColor: 'var(--border, #2a2e39)',
    margin: '2px 0',
  } as Partial<CSSStyleDeclaration>,

  drawingToolCategoryButton: {
    width: '32px',
    height: '32px',
    border: 'none',
    borderRadius: '5px',
    backgroundColor: 'transparent',
    color: 'var(--text2, #787b86)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: '32px',
    padding: '0',
    textAlign: 'center',
    transition: 'background-color 0.15s, color 0.15s',
  } as Partial<CSSStyleDeclaration>,

  drawingToolFlyout: {
    position: 'absolute',
    top: '0',
    left: '40px',
    display: 'none',
    minWidth: '240px',
    maxHeight: `calc(100vh - ${
      computeLeftToolRailTop(WEB_CHART_CHROME_METRICS) + TIME_AXIS_HEIGHT + WEB_CHART_CHROME_METRICS.leftToolRailTopGap
    }px)`,
    overflowY: 'auto',
    padding: '10px',
    boxSizing: 'border-box',
    border: '1px solid var(--border, #363a45)',
    borderRadius: '6px',
    backgroundColor: 'var(--bg, rgba(19, 23, 34, 0.98))',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.32)',
    zIndex: '2',
  } as Partial<CSSStyleDeclaration>,

  drawingToolFlyoutTitle: {
    color: 'var(--text2, #787b86)',
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
    color: 'var(--text2, #787b86)',
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
    color: 'var(--text, #d1d4dc)',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '4px 8px',
    textAlign: 'left',
  } as Partial<CSSStyleDeclaration>,

  drawingToolFlyoutIcon: {
    color: 'var(--text2, #787b86)',
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
    color: 'var(--text2, #787b86)',
    cursor: 'pointer',
    opacity: '0.5',
  } as Partial<CSSStyleDeclaration>,

  drawingToolFlyoutStarActive: {
    color: 'var(--accent, #f5c518)',
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
    backgroundColor: 'var(--bg, #1e222d)',
    border: '1px solid var(--border, #2a2e39)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
  } as Partial<CSSStyleDeclaration>,

  drawingFavoritesBarHandle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    alignSelf: 'stretch',
    color: 'var(--text2, #787b86)',
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
    color: 'var(--text, #d1d4dc)',
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
    border: '1px solid var(--border, #363a45)',
    borderRadius: '6px',
    backgroundColor: 'var(--bg, rgba(19, 23, 34, 0.98))',
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
    borderLeft: '1px solid var(--border, #363a45)',
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
    border: '1px solid var(--border, #363a45)',
    borderRadius: '6px',
    backgroundColor: 'var(--bg, rgba(19, 23, 34, 0.98))',
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
    color: 'var(--text2, #787b86)',
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
    color: 'var(--text2, #787b86)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    lineHeight: '24px',
    padding: '0',
    textAlign: 'center',
    transition: 'background-color 0.15s, color 0.15s, opacity 0.15s',
  } as Partial<CSSStyleDeclaration>,

  drawingButtonActive: {
    backgroundColor: 'var(--accent-bg, rgba(41, 98, 255, 0.2))',
    color: 'var(--accent, #2962ff)',
  } as Partial<CSSStyleDeclaration>,

  drawingButtonHover: {
    backgroundColor: 'var(--hover-bg, rgba(255, 255, 255, 0.05))',
    color: 'var(--text, #d1d4dc)',
  } as Partial<CSSStyleDeclaration>,

  drawingSwatch: {
    width: '18px',
    height: '18px',
    border: '1px solid var(--border, #363a45)',
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
  private drawingFavoritesBarEl: HTMLElement | null = null;
  private drawingFavoritesBarCleanup: Array<() => void> = [];
  private pinnedDrawingToolCategoryId: string | null = null;
  private recentDrawingToolsByCategory: Record<string, UserDrawingTool | undefined> = {};
  private selectedActionSurfaceEl: HTMLElement | null = null;
  private selectedActionSurfaceCleanup: Array<() => void> = [];
  private selectedActionPopoverGroupId: string | null = null;
  private selectedActionPopoverDrawingId: string | null = null;

  constructor(options: ChartTopBarOptions) {
    super('div', {
      interval: '1h' as ResolutionString,
      hoveredTimeframe: null,
      indicatorsHovered: false,
    });

    this.options = options;
    this.chartStore = getChartStore(options.chartKey);

    // Set initial interval from store
    this.state.interval = this.chartStore.settings.get().interval as ResolutionString;

    // Apply container styles
    Object.assign(this.el.style, styles.container);

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
    this.render();
  }

  protected onUnmount(): void {
    this.removeDrawingToolRail();
    this.removeDrawingFavoritesBar();
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
    this.removeSelectedActionSurface();
    this.timeframeButtons.clear();

    // Symbol section
    const symbolSection = this.createElement('div', {
      style: { flexShrink: '0', whiteSpace: 'nowrap' },
    });

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

    this.el.appendChild(symbolSection);

    // Divider
    this.el.appendChild(this.createElement('div', { style: styles.divider }));

    // Timeframe selector
    const tfGroup = this.createElement('div', { style: styles.timeframeGroup });

    // Filter timeframes by supported resolutions (if set by datafeed)
    const filteredTimeframes =
      this.supportedResolutions && this.supportedResolutions.length > 0
        ? AVAILABLE_TIMEFRAMES.filter((tf) => this.supportedResolutions!.includes(tf.value))
        : AVAILABLE_TIMEFRAMES;
    // Fall back to full list if filtering removes everything
    const timeframes = filteredTimeframes.length > 0 ? filteredTimeframes : AVAILABLE_TIMEFRAMES;

    for (const tf of timeframes) {
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

    this.el.appendChild(tfGroup);

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
      this.indicatorsBtn!.style.color = 'var(--text2, #787b86)';
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

  private removeDrawingToolRail(): void {
    for (const cleanup of this.drawingToolRailCleanup) {
      cleanup();
    }
    this.drawingToolRailCleanup = [];
    this.drawingToolRailEl?.remove();
    this.drawingToolRailEl = null;
  }

  private renderDrawingRailToggles(rail: HTMLElement, state?: UserDrawingState): void {
    const toggles = this.createElement('div', { style: styles.drawingRailToggleGroup });
    toggles.appendChild(this.createElement('div', { style: styles.drawingRailToggleDivider }));

    const magnetActive = (state?.magnetMode ?? 'off') !== 'off';
    toggles.appendChild(
      this.createDrawingRailToggleButton('magnet', magnetActive ? 'Magnet snap on' : 'Magnet snap off', magnetActive, () =>
        this.options.onUserDrawingMagnetModeChange?.(magnetActive ? 'off' : 'strong'),
      ),
    );

    const stayActive = state?.stayInDrawingMode === true;
    toggles.appendChild(
      this.createDrawingRailToggleButton(
        'pencil',
        stayActive ? 'Keep drawing mode on' : 'Keep drawing mode off',
        stayActive,
        () => this.options.onUserDrawingStayInDrawingModeChange?.(!stayActive),
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

    toggles.appendChild(this.createElement('div', { style: styles.drawingRailToggleDivider }));

    toggles.appendChild(
      this.createDrawingRailToggleButton(
        allLocked ? 'lock' : 'unlock',
        allLocked ? 'Unlock all drawings' : 'Lock all drawings',
        allLocked,
        () => this.options.onUserDrawingLockedChange?.(someUnlocked, someUnlocked ? allOptions : allOptionsIncludingLocked),
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
  ): HTMLButtonElement {
    const btn = this.createElement('button', {
      style: {
        ...styles.drawingToolCategoryButton,
        ...(active ? styles.drawingButtonActive : {}),
        opacity: enabled ? '1' : '0.35',
        cursor: enabled ? 'pointer' : 'default',
      },
      attributes: {
        type: 'button',
        title: label,
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
    });
    btn.addEventListener('mouseleave', () => {
      if (!active) {
        btn.style.backgroundColor = 'transparent';
        btn.style.color = 'var(--text2, #787b86)';
      }
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
          btn.style.color = 'var(--text, #d1d4dc)';
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
    const defaultLeft =
      WEB_CHART_CHROME_METRICS.leftToolRailInset + WEB_CHART_CHROME_METRICS.leftToolRailWidth + 16;
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
    if (!state || !anchor || !shouldRenderUserDrawingSelectedActionSurface(state, anchor)) {
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
    const legendRect = computeTopLeftLegendRect(
      WEB_CHART_CHROME_METRICS,
      { x: 0, y: 0, width: viewport.width, height: viewport.height },
    );
    const position = resolveUserDrawingActionSurfacePosition({
      anchor: anchor.anchor,
      viewport,
      surface: {
        width: SELECTED_ACTION_SURFACE_ESTIMATED_WIDTH,
        height: activePopoverHeight,
      },
      inset: {
        left: computeLeftToolRailAvoidanceInset(
          WEB_CHART_CHROME_METRICS,
          viewport.width,
          SELECTED_ACTION_SURFACE_ESTIMATED_WIDTH,
        ),
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
            color: this.selectedActionPopoverGroupId === group.id ? 'var(--accent, #5b8cff)' : 'var(--text2, #787b86)',
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
            this.selectedActionPopoverGroupId === group.id ? 'var(--accent, #5b8cff)' : 'var(--text2, #787b86)';
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
    this.setDrawingIconContent(btn, resolveDrawingSelectedActionIconName(item.command, item.swatchColor), item.icon, 18);
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
          item.swatchColor ?? (item.selected ? 'var(--accent-bg, rgba(41, 98, 255, 0.2))' : 'transparent');
        btn.style.color = item.selected ? 'var(--accent, #2962ff)' : 'var(--text2, #787b86)';
      });
    }
    return btn;
  }

  /**
   * Populate an element with a tool/action icon: the shared SVG when authored,
   * otherwise the descriptor's glyph fallback.
   */
  private setDrawingIconContent(
    el: HTMLElement,
    iconName: string | undefined,
    glyph: string,
    size: number,
  ): void {
    el.textContent = '';
    const iconEl = iconName ? renderDrawingIcon(iconName, { size }) : null;
    if (iconEl) {
      el.appendChild(iconEl);
    } else {
      el.textContent = glyph;
    }
  }

  private renderDrawingToolRail(activeTool: UserDrawingTool): void {
    const drawingState = this.options.userDrawingState;
    const rail = this.createElement('div', {
      style: styles.drawingToolRail,
      attributes: {
        'aria-label': 'Drawing tool categories',
      },
    });
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
          title: category.label,
          'aria-label': `${category.label} drawing tools`,
          'aria-expanded': 'false',
          'aria-haspopup': 'menu',
          'aria-controls': flyoutId,
          'aria-pressed': activeCategory ? 'true' : 'false',
        },
      });
      this.setDrawingIconContent(
        categoryButton,
        resolveDrawingToolIconName(categoryTool),
        categoryToolDescriptor.icon,
        20,
      );
      const flyout = this.createElement('div', {
        style: styles.drawingToolFlyout,
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
        const railHeight =
          railRect.height ||
          Math.max(160, window.innerHeight - computeLeftToolRailTop(WEB_CHART_CHROME_METRICS) - TIME_AXIS_HEIGHT);
        const rawFlyoutTop = Math.max(0, buttonRect.top - railRect.top);
        const remainingHeight = Math.max(0, railHeight - rawFlyoutTop);
        const flyoutTop =
          remainingHeight > 0 && remainingHeight < 160 ? Math.max(0, railHeight - 160) : rawFlyoutTop;
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
      categoryButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (flyout.style.display === 'block' && this.pinnedDrawingToolCategoryId !== category.id) hideFlyout();
        else showFlyout();
      });
      railItem.addEventListener('mouseenter', showFlyout);

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
            btn.style.color = 'var(--text, #d1d4dc)';
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
            'aria-label': isFavorite ? `Remove ${descriptor.label} from favorites` : `Add ${descriptor.label} to favorites`,
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
      railList.appendChild(railItem);
      rail.appendChild(flyout);
    }

    rail.appendChild(railList);
    this.renderDrawingRailToggles(rail, drawingState);
    this.drawingToolRailEl = rail;
    (this.options.drawingOverlayParent ?? this.el.parentElement ?? this.el).appendChild(rail);

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
      const active = item.command.action === 'measure' && state?.measureMode === 'on';
      const btn = this.createElement('button', {
        style: {
          ...styles.drawingButton,
          ...(active ? styles.drawingButtonActive : {}),
          opacity: enabled ? '1' : '0.35',
          cursor: enabled ? 'pointer' : 'default',
        },
        attributes: {
          type: 'button',
          title: item.label,
          'aria-label': item.label,
          'aria-pressed': active ? 'true' : 'false',
        },
      });
      this.setDrawingIconContent(btn, resolveDrawingToolbarActionIconName(item.command.action), item.icon, 18);
      btn.disabled = !enabled;
      if (enabled) {
        btn.addEventListener('click', () => {
          if (item.command.type !== 'toolbarAction') return;
          if (item.command.action === 'undo') this.options.onUserDrawingUndo?.();
          if (item.command.action === 'redo') this.options.onUserDrawingRedo?.();
          if (item.command.action === 'measure') this.options.onUserDrawingMeasureModeChange?.(state?.measureMode !== 'on');
          if (item.command.action === 'zoomIn') this.options.onUserDrawingZoomIn?.();
          if (item.command.action === 'cancelDraft') this.options.onUserDrawingCancelDraft?.();
        });
        btn.addEventListener('mouseenter', () => {
          if (!active) Object.assign(btn.style, styles.drawingButtonHover);
        });
        btn.addEventListener('mouseleave', () => {
          if (active) {
            Object.assign(btn.style, styles.drawingButtonActive);
            return;
          }
          btn.style.backgroundColor = 'transparent';
          btn.style.color = 'var(--text2, #787b86)';
        });
      }
      group.appendChild(btn);
    }

    return group;
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private handleTimeframeClick(interval: ResolutionString): void {
    const previousInterval = this.state.interval;

    // Update store
    this.chartStore.settings.setKey('interval', interval);

    // Update local state (don't use setState to avoid re-render)
    this.state.interval = interval;

    // Update button styles directly
    const previousBtn = this.timeframeButtons.get(previousInterval);
    const newBtn = this.timeframeButtons.get(interval);

    if (previousBtn) {
      previousBtn.style.backgroundColor = 'transparent';
      previousBtn.style.color = 'var(--text2, #787b86)';
    }
    if (newBtn) {
      Object.assign(newBtn.style, styles.timeframeButtonActive);
    }

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

    // Update button styles directly (no full re-render needed)
    const previousBtn = this.timeframeButtons.get(previousInterval);
    const newBtn = this.timeframeButtons.get(interval);

    if (previousBtn) {
      previousBtn.style.backgroundColor = 'transparent';
      previousBtn.style.color = 'var(--text2, #787b86)';
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

  setUserDrawingCommandAvailability(availability: UserDrawingCommandAvailability, options: { render?: boolean } = {}): void {
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
