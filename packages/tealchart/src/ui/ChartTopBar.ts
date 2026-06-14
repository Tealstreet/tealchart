import type { ChartStore } from '../state/chartState';
import type { ResolutionString } from '../types';
import type {
  UserDrawingIconName,
  UserDrawingSelectionActionAnchor,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTextAlign,
  UserDrawingTrendLineExtend,
  UserDrawingTool,
  UserDrawingZOrderAction,
} from '../drawings';
import type { ComponentOptions } from './Component';
import type { LayoutSelectorCallbacks } from './LayoutSelector';

import { AVAILABLE_TIMEFRAMES, getChartStore } from '../state/chartState';
import {
  getSelectedUserDrawing,
  isUserDrawingToolbarActionEnabled,
  isUserDrawingFillToolbarEnabled,
  isUserDrawingFillVisibilityToolbarEnabled,
  isUserDrawingIconToolbarEnabled,
  isUserDrawingStyleToolbarEnabled,
  isUserDrawingTextToolbarEnabled,
  isUserDrawingTextAnnotation,
  resolveUserDrawingActionSurfacePosition,
  resolveUserDrawingSelectedActionSurface,
  shouldRenderUserDrawingSelectedActionSurface,
  getUserDrawingToolDescriptor,
  supportsUserDrawingFillColorControls,
  supportsUserDrawingFillVisibilityControls,
  supportsUserDrawingIconControls,
  supportsUserDrawingRichTextControls,
  supportsUserDrawingTextAlignControls,
  supportsUserDrawingTextAppearanceControls,
  supportsUserDrawingTextWrapControls,
  supportsUserDrawingTrendLineExtendControls,
  USER_DRAWING_FILL_COLOR_DESCRIPTORS,
  USER_DRAWING_FONT_FAMILY_DESCRIPTORS,
  USER_DRAWING_FONT_SIZE_DESCRIPTORS,
  USER_DRAWING_FONT_STYLE_DESCRIPTORS,
  USER_DRAWING_FONT_WEIGHT_DESCRIPTORS,
  USER_DRAWING_ICON_NAME_DESCRIPTORS,
  USER_DRAWING_LINE_COLOR_DESCRIPTORS,
  USER_DRAWING_LINE_STYLE_DESCRIPTORS,
  USER_DRAWING_LINE_WIDTH_DESCRIPTORS,
  USER_DRAWING_OPACITY_DESCRIPTORS,
  USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS,
  USER_DRAWING_TEXT_ALIGN_DESCRIPTORS,
  USER_DRAWING_TEXT_COLOR_DESCRIPTORS,
  USER_DRAWING_TEXT_DECORATION_DESCRIPTORS,
  USER_DRAWING_TEXT_MAX_WIDTH_DESCRIPTORS,
  USER_DRAWING_TEXT_WRAP_DESCRIPTORS,
  USER_DRAWING_TREND_LINE_EXTEND_DESCRIPTORS,
  USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS,
  USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS,
} from '../drawings';
import { computeLeftToolRailTop, WEB_CHART_CHROME_METRICS } from '../layout/chartGeometry';
import { Component } from './Component';
import { LayoutSelector } from './LayoutSelector';

/**
 * ChartTopBar - Vanilla DOM toolbar for the chart
 *
 * Contains symbol info, timeframe selector, and indicators button.
 */

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
  /** Resolved selected drawing action surface anchor in chart screen coordinates */
  userDrawingSelectionActionAnchor?: UserDrawingSelectionActionAnchor | null;
  /** Callback when a drawing tool is selected */
  onUserDrawingToolSelect?: (tool: UserDrawingTool) => void;
  /** Callback when the selected drawing should be duplicated */
  onUserDrawingDuplicateSelected?: () => void;
  /** Callback when the selected drawing should be deleted */
  onUserDrawingDeleteSelected?: () => void;
  /** Callback when the active drawing draft should be cancelled */
  onUserDrawingCancelDraft?: () => void;
  /** Callback when all user drawings should be cleared */
  onUserDrawingClearAll?: () => void;
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
  onUserDrawingVisibilityChange?: (visible: boolean) => void;
  /** Callback when selected drawing locked state should change */
  onUserDrawingLockedChange?: (locked: boolean, includeLocked?: boolean) => void;
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
    gap: '4px',
    padding: '6px 4px',
    border: '1px solid var(--border, #363a45)',
    borderRadius: '6px',
    backgroundColor: 'var(--bg, rgba(19, 23, 34, 0.96))',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
    zIndex: '7',
    pointerEvents: 'auto',
  } as Partial<CSSStyleDeclaration>,

  drawingToolRailItem: {
    position: 'relative',
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
    maxHeight: '420px',
    overflowY: 'auto',
    padding: '10px',
    border: '1px solid var(--border, #363a45)',
    borderRadius: '6px',
    backgroundColor: 'var(--bg, rgba(19, 23, 34, 0.98))',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.32)',
  } as Partial<CSSStyleDeclaration>,

  drawingToolFlyoutTitle: {
    color: 'var(--text2, #787b86)',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0',
    textTransform: 'uppercase',
    marginBottom: '6px',
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
  private selectedActionSurfaceEl: HTMLElement | null = null;
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

  private removeSelectedActionSurface(): void {
    this.selectedActionSurfaceEl?.remove();
    this.selectedActionSurfaceEl = null;
  }

  private handleSelectedActionSurfaceItemClick(item: ReturnType<typeof resolveUserDrawingSelectedActionSurface>['groups'][number]['items'][number]): void {
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

    if (item.command.type === 'styleAction') {
      if (item.command.visible !== undefined) {
        this.options.onUserDrawingVisibilityChange?.(item.command.visible);
      }
      if (item.command.locked !== undefined) {
        this.options.onUserDrawingLockedChange?.(item.command.locked, item.command.includeLocked);
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

    const surface = resolveUserDrawingSelectedActionSurface(state);
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
    const position = resolveUserDrawingActionSurfacePosition({
      anchor: anchor.anchor,
      viewport: {
        width: parentRect.width || window.innerWidth,
        height: parentRect.height || window.innerHeight,
      },
      surface: {
        width: SELECTED_ACTION_SURFACE_ESTIMATED_WIDTH,
        height: activePopoverHeight,
      },
      inset: {
        left: 8,
        right: 8,
        top: WEB_CHART_CHROME_METRICS.topBarHeight + 6,
        bottom: 8,
      },
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
  }

  private createSelectedActionSurfaceButton(
    item: ReturnType<typeof resolveUserDrawingSelectedActionSurface>['groups'][number]['items'][number],
    options: { keepPopoverOpen?: boolean } = {},
  ): HTMLButtonElement {
    const btn = this.createElement('button', {
      style: {
        ...styles.drawingButton,
        ...(item.swatchColor ? styles.drawingSwatch : {}),
        ...(item.swatchColor ? { backgroundColor: item.swatchColor } : {}),
        opacity: item.enabled ? '1' : '0.35',
        cursor: item.enabled ? 'pointer' : 'default',
      },
      textContent: item.icon,
      attributes: {
        type: 'button',
        title: item.label,
        'aria-label': item.label,
      },
    });
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
        btn.style.backgroundColor = item.swatchColor ?? 'transparent';
        btn.style.color = 'var(--text2, #787b86)';
      });
    }
    return btn;
  }

  private renderDrawingToolRail(activeTool: UserDrawingTool): void {
    const rail = this.createElement('div', {
      style: styles.drawingToolRail,
      attributes: {
        'aria-label': 'Drawing tool categories',
      },
    });
    let activeFlyout:
      | {
          id: string;
          button: HTMLButtonElement;
          flyout: HTMLElement;
        }
      | null = null;
    const closeActiveFlyout = () => {
      if (!activeFlyout) return;
      activeFlyout.flyout.style.display = 'none';
      activeFlyout.button.setAttribute('aria-expanded', 'false');
      activeFlyout = null;
    };

    for (const category of USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS) {
      const activeCategory = category.tools.includes(activeTool);
      const categoryTool = activeCategory ? activeTool : category.tools[0]!;
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
        textContent: categoryToolDescriptor.icon,
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
      const flyout = this.createElement('div', {
        style: styles.drawingToolFlyout,
        attributes: {
          id: flyoutId,
          role: 'menu',
          'aria-label': `${category.label} tools`,
        },
      });
      flyout.appendChild(this.createElement('div', { style: styles.drawingToolFlyoutTitle, textContent: category.label }));
      const showFlyout = () => {
        if (activeFlyout?.id === category.id) return;
        closeActiveFlyout();
        flyout.style.display = 'block';
        categoryButton.setAttribute('aria-expanded', 'true');
        activeFlyout = { id: category.id, button: categoryButton, flyout };
      };
      const hideFlyout = () => {
        if (activeFlyout?.id !== category.id) return;
        flyout.style.display = 'none';
        categoryButton.setAttribute('aria-expanded', 'false');
        activeFlyout = null;
      };
      categoryButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (flyout.style.display === 'block') hideFlyout();
        else showFlyout();
      });
      railItem.addEventListener('mouseenter', showFlyout);

      for (const tool of category.tools) {
        const descriptor = getUserDrawingToolDescriptor(tool);
        const isActive = activeTool === descriptor.tool;
        const btn = this.createElement('button', {
          style: {
            ...styles.drawingToolFlyoutButton,
            ...(isActive ? styles.drawingButtonActive : {}),
          },
          attributes: {
            type: 'button',
            title: descriptor.label,
            'aria-label': descriptor.label,
            'aria-pressed': isActive ? 'true' : 'false',
          },
        });
        btn.appendChild(this.createElement('span', { style: styles.drawingToolFlyoutIcon, textContent: descriptor.icon }));
        btn.appendChild(this.createElement('span', { style: styles.drawingToolFlyoutLabel, textContent: descriptor.label }));
        btn.addEventListener('click', () => {
          this.options.onUserDrawingToolSelect?.(descriptor.tool);
          closeActiveFlyout();
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
        flyout.appendChild(btn);
      }

      railItem.appendChild(categoryButton);
      railItem.appendChild(flyout);
      rail.appendChild(railItem);
    }

    this.drawingToolRailEl = rail;
    (this.options.drawingOverlayParent ?? this.el.parentElement ?? this.el).appendChild(rail);

    const closeOnOutsidePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (target instanceof Node && rail.contains(target)) return;
      closeActiveFlyout();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeActiveFlyout();
    };
    document.addEventListener('mousedown', closeOnOutsidePointer);
    document.addEventListener('touchstart', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    this.drawingToolRailCleanup.push(
      () => document.removeEventListener('mousedown', closeOnOutsidePointer),
      () => document.removeEventListener('touchstart', closeOnOutsidePointer),
      () => document.removeEventListener('keydown', closeOnEscape),
    );
  }

  private renderDrawingToolbar(): HTMLElement {
    const group = this.createElement('div', { style: styles.drawingGroup });
    const state = this.options.userDrawingState;
    const activeTool = state?.activeTool ?? 'select';

    this.renderDrawingToolRail(activeTool);
    group.appendChild(this.createElement('div', { style: styles.divider }));

    const selectedDrawing = state ? getSelectedUserDrawing(state) : null;
    const styleEnabled = state ? isUserDrawingStyleToolbarEnabled(state) : false;
    const fillColorEnabled = state ? isUserDrawingFillToolbarEnabled(state) : false;
    const fillVisibilityEnabled = state ? isUserDrawingFillVisibilityToolbarEnabled(state) : false;
    const iconEnabled = state ? isUserDrawingIconToolbarEnabled(state) : false;
    const textEnabled = state ? isUserDrawingTextToolbarEnabled(state) : false;
    const fillColorSupported = selectedDrawing ? supportsUserDrawingFillColorControls(selectedDrawing) : false;
    const fillVisibilitySupported = selectedDrawing ? supportsUserDrawingFillVisibilityControls(selectedDrawing) : false;
    const iconSupported = selectedDrawing ? supportsUserDrawingIconControls(selectedDrawing) : false;
    const textAppearanceSupported = selectedDrawing ? supportsUserDrawingTextAppearanceControls(selectedDrawing) : false;
    const richTextSupported = selectedDrawing ? supportsUserDrawingRichTextControls(selectedDrawing) : false;
    const textAlignSupported = selectedDrawing ? supportsUserDrawingTextAlignControls(selectedDrawing) : false;
    const textWrapSupported = selectedDrawing ? supportsUserDrawingTextWrapControls(selectedDrawing) : false;
    const trendLineExtendSupported = selectedDrawing
      ? supportsUserDrawingTrendLineExtendControls(selectedDrawing)
      : false;

    if (selectedDrawing) {
      for (const descriptor of USER_DRAWING_LINE_COLOR_DESCRIPTORS) {
        const isActive = selectedDrawing.style.lineColor.toLowerCase() === descriptor.color.toLowerCase();
        const btn = this.createElement('button', {
          style: {
            ...styles.drawingButton,
            ...styles.drawingSwatch,
            backgroundColor: descriptor.color,
            opacity: styleEnabled ? '1' : '0.35',
            cursor: styleEnabled ? 'pointer' : 'default',
            outline: isActive ? '2px solid var(--accent, #2962ff)' : 'none',
          },
          attributes: {
            type: 'button',
            title: descriptor.label,
            'aria-label': descriptor.label,
            'aria-pressed': isActive ? 'true' : 'false',
          },
        });
        btn.disabled = !styleEnabled;
        if (styleEnabled) {
          btn.addEventListener('click', () => this.options.onUserDrawingStyleChange?.({ lineColor: descriptor.color }));
        }
        group.appendChild(btn);
      }

      group.appendChild(this.createElement('div', { style: styles.divider }));

      for (const descriptor of USER_DRAWING_LINE_WIDTH_DESCRIPTORS) {
        const isActive = selectedDrawing.style.lineWidth === descriptor.width;
        const btn = this.createElement('button', {
          style: {
            ...styles.drawingButton,
            ...(isActive ? styles.drawingButtonActive : {}),
            opacity: styleEnabled ? '1' : '0.35',
            cursor: styleEnabled ? 'pointer' : 'default',
            fontSize: `${10 + descriptor.width}px`,
          },
          textContent: '━',
          attributes: {
            type: 'button',
            title: descriptor.label,
            'aria-label': descriptor.label,
            'aria-pressed': isActive ? 'true' : 'false',
          },
        });
        btn.disabled = !styleEnabled;
        if (styleEnabled) {
          btn.addEventListener('click', () => this.options.onUserDrawingStyleChange?.({ lineWidth: descriptor.width }));
          btn.addEventListener('mouseenter', () => {
            if (!isActive) Object.assign(btn.style, styles.drawingButtonHover);
          });
          btn.addEventListener('mouseleave', () => {
            if (!isActive) {
              btn.style.backgroundColor = 'transparent';
              btn.style.color = 'var(--text2, #787b86)';
            }
          });
        }
        group.appendChild(btn);
      }

      for (const descriptor of USER_DRAWING_LINE_STYLE_DESCRIPTORS) {
        const isActive = selectedDrawing.style.lineStyle === descriptor.lineStyle;
        const btn = this.createElement('button', {
          style: {
            ...styles.drawingButton,
            ...(isActive ? styles.drawingButtonActive : {}),
            opacity: styleEnabled ? '1' : '0.35',
            cursor: styleEnabled ? 'pointer' : 'default',
          },
          textContent: descriptor.icon,
          attributes: {
            type: 'button',
            title: descriptor.label,
            'aria-label': descriptor.label,
            'aria-pressed': isActive ? 'true' : 'false',
          },
        });
        btn.disabled = !styleEnabled;
        if (styleEnabled) {
          btn.addEventListener('click', () =>
            this.options.onUserDrawingStyleChange?.({ lineStyle: descriptor.lineStyle }),
          );
          btn.addEventListener('mouseenter', () => {
            if (!isActive) Object.assign(btn.style, styles.drawingButtonHover);
          });
          btn.addEventListener('mouseleave', () => {
            if (!isActive) {
              btn.style.backgroundColor = 'transparent';
              btn.style.color = 'var(--text2, #787b86)';
            }
          });
        }
        group.appendChild(btn);
      }

      if (trendLineExtendSupported && selectedDrawing.kind === 'trendLine') {
        for (const descriptor of USER_DRAWING_TREND_LINE_EXTEND_DESCRIPTORS) {
          const isActive = selectedDrawing.extend === descriptor.extend;
          const btn = this.createElement('button', {
            style: {
              ...styles.drawingButton,
              ...(isActive ? styles.drawingButtonActive : {}),
              opacity: styleEnabled ? '1' : '0.35',
              cursor: styleEnabled ? 'pointer' : 'default',
            },
            textContent: descriptor.icon,
            attributes: {
              type: 'button',
              title: descriptor.label,
              'aria-label': descriptor.label,
              'aria-pressed': isActive ? 'true' : 'false',
            },
          });
          btn.disabled = !styleEnabled;
          if (styleEnabled) {
            btn.addEventListener('click', () =>
              this.options.onUserDrawingTrendLineExtendChange?.(descriptor.extend),
            );
            btn.addEventListener('mouseenter', () => {
              if (!isActive) Object.assign(btn.style, styles.drawingButtonHover);
            });
            btn.addEventListener('mouseleave', () => {
              if (!isActive) {
                btn.style.backgroundColor = 'transparent';
                btn.style.color = 'var(--text2, #787b86)';
              }
            });
          }
          group.appendChild(btn);
        }
      }

      for (const descriptor of USER_DRAWING_OPACITY_DESCRIPTORS) {
        const isActive = (selectedDrawing.style.opacity ?? 1) === descriptor.opacity;
        const btn = this.createElement('button', {
          style: {
            ...styles.drawingButton,
            ...(isActive ? styles.drawingButtonActive : {}),
            opacity: styleEnabled ? '1' : '0.35',
            cursor: styleEnabled ? 'pointer' : 'default',
            fontSize: '10px',
          },
          textContent: String(Math.round(descriptor.opacity * 100)),
          attributes: {
            type: 'button',
            title: descriptor.label,
            'aria-label': descriptor.label,
            'aria-pressed': isActive ? 'true' : 'false',
          },
        });
        btn.disabled = !styleEnabled;
        if (styleEnabled) {
          btn.addEventListener('click', () => this.options.onUserDrawingStyleChange?.({ opacity: descriptor.opacity }));
          btn.addEventListener('mouseenter', () => {
            if (!isActive) Object.assign(btn.style, styles.drawingButtonHover);
          });
          btn.addEventListener('mouseleave', () => {
            if (!isActive) {
              btn.style.backgroundColor = 'transparent';
              btn.style.color = 'var(--text2, #787b86)';
            }
          });
        }
        group.appendChild(btn);
      }

      const borderToggle = USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS.find((descriptor) => descriptor.style === 'lineVisible')!;
      const borderVisible = selectedDrawing.style.lineVisible !== false;
      const borderBtn = this.createElement('button', {
        style: {
          ...styles.drawingButton,
          ...(borderVisible ? styles.drawingButtonActive : {}),
          opacity: styleEnabled ? '1' : '0.35',
          cursor: styleEnabled ? 'pointer' : 'default',
        },
        textContent: borderToggle.icon,
        attributes: {
          type: 'button',
          title: borderToggle.label,
          'aria-label': borderToggle.label,
          'aria-pressed': borderVisible ? 'true' : 'false',
        },
      });
      borderBtn.disabled = !styleEnabled;
      if (styleEnabled) {
        borderBtn.addEventListener('click', () =>
          this.options.onUserDrawingStyleChange?.({ lineVisible: !borderVisible }),
        );
        borderBtn.addEventListener('mouseenter', () => {
          if (!borderVisible) Object.assign(borderBtn.style, styles.drawingButtonHover);
        });
        borderBtn.addEventListener('mouseleave', () => {
          if (!borderVisible) {
            borderBtn.style.backgroundColor = 'transparent';
            borderBtn.style.color = 'var(--text2, #787b86)';
          }
        });
      }
      group.appendChild(borderBtn);

      group.appendChild(this.createElement('div', { style: styles.divider }));

      if (fillColorSupported) {
        for (const descriptor of USER_DRAWING_FILL_COLOR_DESCRIPTORS) {
          const isActive = selectedDrawing.style.fillColor?.toLowerCase() === descriptor.fillColor.toLowerCase();
          const btn = this.createElement('button', {
            style: {
              ...styles.drawingButton,
              ...styles.drawingSwatch,
              backgroundColor: descriptor.fillColor,
              opacity: fillColorEnabled ? '1' : '0.35',
              cursor: fillColorEnabled ? 'pointer' : 'default',
              outline: isActive ? '2px solid var(--accent, #2962ff)' : 'none',
            },
            attributes: {
              type: 'button',
              title: descriptor.label,
              'aria-label': descriptor.label,
              'aria-pressed': isActive ? 'true' : 'false',
            },
          });
          btn.disabled = !fillColorEnabled;
          if (fillColorEnabled) {
            btn.addEventListener('click', () =>
              this.options.onUserDrawingStyleChange?.({ fillColor: descriptor.fillColor }),
            );
          }
          group.appendChild(btn);
        }
      }

      if (fillVisibilitySupported) {
        const fillToggle = USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS.find((descriptor) => descriptor.style === 'fillVisible')!;
        const fillVisible = selectedDrawing.style.fillVisible !== false;
        const fillBtn = this.createElement('button', {
          style: {
            ...styles.drawingButton,
            ...(fillVisible ? styles.drawingButtonActive : {}),
            opacity: fillVisibilityEnabled ? '1' : '0.35',
            cursor: fillVisibilityEnabled ? 'pointer' : 'default',
          },
          textContent: fillToggle.icon,
          attributes: {
            type: 'button',
            title: fillToggle.label,
            'aria-label': fillToggle.label,
            'aria-pressed': fillVisible ? 'true' : 'false',
          },
        });
        fillBtn.disabled = !fillVisibilityEnabled;
        if (fillVisibilityEnabled) {
          fillBtn.addEventListener('click', () =>
            this.options.onUserDrawingStyleChange?.({ fillVisible: !fillVisible }),
          );
          fillBtn.addEventListener('mouseenter', () => {
            if (!fillVisible) Object.assign(fillBtn.style, styles.drawingButtonHover);
          });
          fillBtn.addEventListener('mouseleave', () => {
            if (!fillVisible) {
              fillBtn.style.backgroundColor = 'transparent';
              fillBtn.style.color = 'var(--text2, #787b86)';
            }
          });
        }
        group.appendChild(fillBtn);

        group.appendChild(this.createElement('div', { style: styles.divider }));
      }

      if (iconSupported) {
        for (const descriptor of USER_DRAWING_ICON_NAME_DESCRIPTORS) {
          const isActive = selectedDrawing.kind === 'icon' && selectedDrawing.iconName === descriptor.iconName;
          const btn = this.createElement('button', {
            style: {
              ...styles.drawingButton,
              ...(isActive ? styles.drawingButtonActive : {}),
              opacity: iconEnabled ? '1' : '0.35',
              cursor: iconEnabled ? 'pointer' : 'default',
              fontSize: '13px',
            },
            textContent: descriptor.icon,
            attributes: {
              type: 'button',
              title: descriptor.label,
              'aria-label': descriptor.label,
              'aria-pressed': isActive ? 'true' : 'false',
            },
          });
          btn.disabled = !iconEnabled;
          if (iconEnabled) {
            btn.addEventListener('click', () => this.options.onUserDrawingIconNameChange?.(descriptor.iconName));
            btn.addEventListener('mouseenter', () => {
              if (!isActive) Object.assign(btn.style, styles.drawingButtonHover);
            });
            btn.addEventListener('mouseleave', () => {
              if (!isActive) {
                btn.style.backgroundColor = 'transparent';
                btn.style.color = 'var(--text2, #787b86)';
              }
            });
          }
          group.appendChild(btn);
        }

        group.appendChild(this.createElement('div', { style: styles.divider }));
      }

      if (textAppearanceSupported) {
        for (const descriptor of USER_DRAWING_TEXT_COLOR_DESCRIPTORS) {
          const isActive = selectedDrawing.style.textColor?.toLowerCase() === descriptor.textColor.toLowerCase();
          const btn = this.createElement('button', {
            style: {
              ...styles.drawingButton,
              ...styles.drawingSwatch,
              backgroundColor: descriptor.textColor,
              opacity: textEnabled ? '1' : '0.35',
              cursor: textEnabled ? 'pointer' : 'default',
              outline: isActive ? '2px solid var(--accent, #2962ff)' : 'none',
            },
            attributes: {
              type: 'button',
              title: descriptor.label,
              'aria-label': descriptor.label,
              'aria-pressed': isActive ? 'true' : 'false',
            },
          });
          btn.disabled = !textEnabled;
          if (textEnabled) {
            btn.addEventListener('click', () =>
              this.options.onUserDrawingStyleChange?.({ textColor: descriptor.textColor }),
            );
          }
          group.appendChild(btn);
        }

        for (const descriptor of USER_DRAWING_FONT_SIZE_DESCRIPTORS) {
          const isActive = selectedDrawing.style.fontSize === descriptor.fontSize;
          const btn = this.createElement('button', {
            style: {
              ...styles.drawingButton,
              ...(isActive ? styles.drawingButtonActive : {}),
              opacity: textEnabled ? '1' : '0.35',
              cursor: textEnabled ? 'pointer' : 'default',
              fontSize: '11px',
            },
            textContent: String(descriptor.fontSize),
            attributes: {
              type: 'button',
              title: descriptor.label,
              'aria-label': descriptor.label,
              'aria-pressed': isActive ? 'true' : 'false',
            },
          });
          btn.disabled = !textEnabled;
          if (textEnabled) {
            btn.addEventListener('click', () =>
              this.options.onUserDrawingStyleChange?.({ fontSize: descriptor.fontSize }),
            );
            btn.addEventListener('mouseenter', () => {
              if (!isActive) Object.assign(btn.style, styles.drawingButtonHover);
            });
            btn.addEventListener('mouseleave', () => {
              if (!isActive) {
                btn.style.backgroundColor = 'transparent';
                btn.style.color = 'var(--text2, #787b86)';
              }
            });
          }
          group.appendChild(btn);
        }

        for (const descriptor of USER_DRAWING_FONT_FAMILY_DESCRIPTORS) {
          const isActive = (selectedDrawing.style.fontFamily ?? 'sans-serif') === descriptor.fontFamily;
          const btn = this.createElement('button', {
            style: {
              ...styles.drawingButton,
              ...(isActive ? styles.drawingButtonActive : {}),
              opacity: textEnabled ? '1' : '0.35',
              cursor: textEnabled ? 'pointer' : 'default',
              fontSize: '11px',
            },
            textContent: descriptor.icon,
            attributes: {
              type: 'button',
              title: descriptor.label,
              'aria-label': descriptor.label,
              'aria-pressed': isActive ? 'true' : 'false',
            },
          });
          btn.disabled = !textEnabled;
          if (textEnabled) {
            btn.addEventListener('click', () =>
              this.options.onUserDrawingStyleChange?.({ fontFamily: descriptor.fontFamily }),
            );
            btn.addEventListener('mouseenter', () => {
              if (!isActive) Object.assign(btn.style, styles.drawingButtonHover);
            });
            btn.addEventListener('mouseleave', () => {
              if (!isActive) {
                btn.style.backgroundColor = 'transparent';
                btn.style.color = 'var(--text2, #787b86)';
              }
            });
          }
          group.appendChild(btn);
        }

        if (richTextSupported) {
          for (const descriptor of USER_DRAWING_FONT_WEIGHT_DESCRIPTORS) {
            const isActive = (selectedDrawing.style.fontWeight ?? 'normal') === descriptor.fontWeight;
            const btn = this.createElement('button', {
              style: {
                ...styles.drawingButton,
                ...(isActive ? styles.drawingButtonActive : {}),
                opacity: textEnabled ? '1' : '0.35',
                cursor: textEnabled ? 'pointer' : 'default',
                fontWeight: descriptor.fontWeight === 'bold' ? '700' : '400',
              },
              textContent: descriptor.icon,
              attributes: {
                type: 'button',
                title: descriptor.label,
                'aria-label': descriptor.label,
                'aria-pressed': isActive ? 'true' : 'false',
              },
            });
            btn.disabled = !textEnabled;
            if (textEnabled) {
              btn.addEventListener('click', () =>
                this.options.onUserDrawingStyleChange?.({ fontWeight: descriptor.fontWeight }),
              );
              btn.addEventListener('mouseenter', () => {
                if (!isActive) Object.assign(btn.style, styles.drawingButtonHover);
              });
              btn.addEventListener('mouseleave', () => {
                if (!isActive) {
                  btn.style.backgroundColor = 'transparent';
                  btn.style.color = 'var(--text2, #787b86)';
                }
              });
            }
            group.appendChild(btn);
          }

          for (const descriptor of USER_DRAWING_FONT_STYLE_DESCRIPTORS) {
            const isActive = (selectedDrawing.style.fontStyle ?? 'normal') === descriptor.fontStyle;
            const btn = this.createElement('button', {
              style: {
                ...styles.drawingButton,
                ...(isActive ? styles.drawingButtonActive : {}),
                opacity: textEnabled ? '1' : '0.35',
                cursor: textEnabled ? 'pointer' : 'default',
                fontStyle: descriptor.fontStyle === 'italic' ? 'italic' : 'normal',
              },
              textContent: descriptor.icon,
              attributes: {
                type: 'button',
                title: descriptor.label,
                'aria-label': descriptor.label,
                'aria-pressed': isActive ? 'true' : 'false',
              },
            });
            btn.disabled = !textEnabled;
            if (textEnabled) {
              btn.addEventListener('click', () =>
                this.options.onUserDrawingStyleChange?.({ fontStyle: descriptor.fontStyle }),
              );
              btn.addEventListener('mouseenter', () => {
                if (!isActive) Object.assign(btn.style, styles.drawingButtonHover);
              });
              btn.addEventListener('mouseleave', () => {
                if (!isActive) {
                  btn.style.backgroundColor = 'transparent';
                  btn.style.color = 'var(--text2, #787b86)';
                }
              });
            }
            group.appendChild(btn);
          }

          for (const descriptor of USER_DRAWING_TEXT_DECORATION_DESCRIPTORS) {
            const isUnderline = descriptor.textUnderline === true;
            const isActive = isUnderline
              ? !!selectedDrawing.style.textUnderline
              : !!selectedDrawing.style.textLineThrough;
            const btn = this.createElement('button', {
              style: {
                ...styles.drawingButton,
                ...(isActive ? styles.drawingButtonActive : {}),
                opacity: textEnabled ? '1' : '0.35',
                cursor: textEnabled ? 'pointer' : 'default',
                textDecorationLine: isUnderline ? 'underline' : 'line-through',
              },
              textContent: descriptor.icon,
              attributes: {
                type: 'button',
                title: descriptor.label,
                'aria-label': descriptor.label,
                'aria-pressed': isActive ? 'true' : 'false',
              },
            });
            btn.disabled = !textEnabled;
            if (textEnabled) {
              btn.addEventListener('click', () =>
                this.options.onUserDrawingStyleChange?.(
                  isUnderline
                    ? { textUnderline: !selectedDrawing.style.textUnderline }
                    : { textLineThrough: !selectedDrawing.style.textLineThrough },
                ),
              );
              btn.addEventListener('mouseenter', () => {
                if (!isActive) Object.assign(btn.style, styles.drawingButtonHover);
              });
              btn.addEventListener('mouseleave', () => {
                if (!isActive) {
                  btn.style.backgroundColor = 'transparent';
                  btn.style.color = 'var(--text2, #787b86)';
                }
              });
            }
            group.appendChild(btn);
          }
        }

        if (textWrapSupported) {
          for (const descriptor of USER_DRAWING_TEXT_WRAP_DESCRIPTORS) {
            const isActive = !!selectedDrawing.style.textWrap === descriptor.textWrap;
            const btn = this.createElement('button', {
              style: {
                ...styles.drawingButton,
                ...(isActive ? styles.drawingButtonActive : {}),
                opacity: textEnabled ? '1' : '0.35',
                cursor: textEnabled ? 'pointer' : 'default',
                fontSize: '11px',
              },
              textContent: descriptor.icon,
              attributes: {
                type: 'button',
                title: descriptor.label,
                'aria-label': descriptor.label,
                'aria-pressed': isActive ? 'true' : 'false',
              },
            });
            btn.disabled = !textEnabled;
            if (textEnabled) {
              btn.addEventListener('click', () =>
                this.options.onUserDrawingStyleChange?.({
                  textWrap: descriptor.textWrap,
                  textMaxWidth: selectedDrawing.style.textMaxWidth ?? 180,
                }),
              );
              btn.addEventListener('mouseenter', () => {
                if (!isActive) Object.assign(btn.style, styles.drawingButtonHover);
              });
              btn.addEventListener('mouseleave', () => {
                if (!isActive) {
                  btn.style.backgroundColor = 'transparent';
                  btn.style.color = 'var(--text2, #787b86)';
                }
              });
            }
            group.appendChild(btn);
          }

          for (const descriptor of USER_DRAWING_TEXT_MAX_WIDTH_DESCRIPTORS) {
            const isActive = (selectedDrawing.style.textMaxWidth ?? 180) === descriptor.textMaxWidth;
            const widthEnabled = textEnabled && selectedDrawing.style.textWrap === true;
            const btn = this.createElement('button', {
              style: {
                ...styles.drawingButton,
                ...(isActive ? styles.drawingButtonActive : {}),
                opacity: widthEnabled ? '1' : '0.35',
                cursor: widthEnabled ? 'pointer' : 'default',
                fontSize: '10px',
              },
              textContent: String(descriptor.textMaxWidth),
              attributes: {
                type: 'button',
                title: descriptor.label,
                'aria-label': descriptor.label,
                'aria-pressed': isActive ? 'true' : 'false',
              },
            });
            btn.disabled = !widthEnabled;
            if (widthEnabled) {
              btn.addEventListener('click', () =>
                this.options.onUserDrawingStyleChange?.({ textMaxWidth: descriptor.textMaxWidth }),
              );
              btn.addEventListener('mouseenter', () => {
                if (!isActive) Object.assign(btn.style, styles.drawingButtonHover);
              });
              btn.addEventListener('mouseleave', () => {
                if (!isActive) {
                  btn.style.backgroundColor = 'transparent';
                  btn.style.color = 'var(--text2, #787b86)';
                }
              });
            }
            group.appendChild(btn);
          }
        }

        if (textAlignSupported) {
          for (const descriptor of USER_DRAWING_TEXT_ALIGN_DESCRIPTORS) {
            const isActive =
              (selectedDrawing.kind === 'table' || isUserDrawingTextAnnotation(selectedDrawing)) &&
              selectedDrawing.textAlign === descriptor.textAlign;
            const btn = this.createElement('button', {
              style: {
                ...styles.drawingButton,
                ...(isActive ? styles.drawingButtonActive : {}),
                opacity: textEnabled ? '1' : '0.35',
                cursor: textEnabled ? 'pointer' : 'default',
                fontSize: '11px',
              },
              textContent: descriptor.icon,
              attributes: {
                type: 'button',
                title: descriptor.label,
                'aria-label': descriptor.label,
                'aria-pressed': isActive ? 'true' : 'false',
              },
            });
            btn.disabled = !textEnabled;
            if (textEnabled) {
              btn.addEventListener('click', () => this.options.onUserDrawingTextAlignChange?.(descriptor.textAlign));
              btn.addEventListener('mouseenter', () => {
                if (!isActive) Object.assign(btn.style, styles.drawingButtonHover);
              });
              btn.addEventListener('mouseleave', () => {
                if (!isActive) {
                  btn.style.backgroundColor = 'transparent';
                  btn.style.color = 'var(--text2, #787b86)';
                }
              });
            }
            group.appendChild(btn);
          }
        }

        group.appendChild(this.createElement('div', { style: styles.divider }));
      }

    }

    const globalActionDescriptors = USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS.filter(
      (descriptor) => descriptor.action === 'cancelDraft' || descriptor.action === 'clearAll',
    );
    for (const item of globalActionDescriptors.map((descriptor) => ({
      ...descriptor,
      id: descriptor.action,
      enabled: state ? isUserDrawingToolbarActionEnabled(state, descriptor.action) : false,
      command: { type: 'toolbarAction' as const, action: descriptor.action },
    }))) {
      const enabled = item.enabled;
      const btn = this.createElement('button', {
        style: {
          ...styles.drawingButton,
          opacity: enabled ? '1' : '0.35',
          cursor: enabled ? 'pointer' : 'default',
        },
        textContent: item.icon,
        attributes: {
          type: 'button',
          title: item.label,
          'aria-label': item.label,
        },
      });
      btn.disabled = !enabled;
      if (enabled) {
        btn.addEventListener('click', () => {
          if (item.command.type !== 'toolbarAction') return;
          if (item.command.action === 'cancelDraft') this.options.onUserDrawingCancelDraft?.();
          if (item.command.action === 'clearAll') this.options.onUserDrawingClearAll?.();
        });
        btn.addEventListener('mouseenter', () => Object.assign(btn.style, styles.drawingButtonHover));
        btn.addEventListener('mouseleave', () => {
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
