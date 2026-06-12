import type { ChartStore } from '../state/chartState';
import type { ResolutionString } from '../types';
import type {
  UserDrawingIconName,
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
  isUserDrawingToolbarActionEnabled,
  getUserDrawingZOrderAction,
  getSelectedUserDrawing,
  isUserDrawingFillToolbarEnabled,
  isUserDrawingFillVisibilityToolbarEnabled,
  isUserDrawingIconToolbarEnabled,
  isUserDrawingStyleToolbarEnabled,
  isUserDrawingTextToolbarEnabled,
  isUserDrawingTextAnnotation,
  resolveUserDrawingStyleToolbarAction,
  supportsUserDrawingFillColorControls,
  supportsUserDrawingFillVisibilityControls,
  supportsUserDrawingIconControls,
  supportsUserDrawingTextAlignControls,
  supportsUserDrawingTextStyleControls,
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
  USER_DRAWING_STYLE_TOOLBAR_ACTION_DESCRIPTORS,
  USER_DRAWING_TEXT_ALIGN_DESCRIPTORS,
  USER_DRAWING_TEXT_COLOR_DESCRIPTORS,
  USER_DRAWING_TEXT_DECORATION_DESCRIPTORS,
  USER_DRAWING_TEXT_MAX_WIDTH_DESCRIPTORS,
  USER_DRAWING_TEXT_WRAP_DESCRIPTORS,
  USER_DRAWING_TREND_LINE_EXTEND_DESCRIPTORS,
  USER_DRAWING_TOOL_DESCRIPTORS,
  USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS,
} from '../drawings';
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
  /** CSS variables for theming */
  cssVars?: Record<string, string>;
}

interface ChartTopBarState {
  interval: ResolutionString;
  hoveredTimeframe: string | null;
  indicatorsHovered: boolean;
}

// ============================================================================
// Styles
// ============================================================================

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

  drawingGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    flexShrink: '0',
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
    this.layoutSelector?.dispose();
    this.layoutSelector = null;
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  protected render(): void {
    this.el.innerHTML = '';
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

  private renderDrawingToolbar(): HTMLElement {
    const group = this.createElement('div', { style: styles.drawingGroup });
    const state = this.options.userDrawingState;
    const activeTool = state?.activeTool ?? 'select';

    for (const descriptor of USER_DRAWING_TOOL_DESCRIPTORS) {
      const isActive = activeTool === descriptor.tool;
      const btn = this.createElement('button', {
        style: {
          ...styles.drawingButton,
          ...(isActive ? styles.drawingButtonActive : {}),
        },
        textContent: descriptor.icon,
        attributes: {
          type: 'button',
          title: descriptor.label,
          'aria-label': descriptor.label,
          'aria-pressed': isActive ? 'true' : 'false',
        },
      });
      btn.addEventListener('click', () => this.options.onUserDrawingToolSelect?.(descriptor.tool));
      btn.addEventListener('mouseenter', () => {
        if (!isActive) Object.assign(btn.style, styles.drawingButtonHover);
      });
      btn.addEventListener('mouseleave', () => {
        if (!isActive) {
          btn.style.backgroundColor = 'transparent';
          btn.style.color = 'var(--text2, #787b86)';
        }
      });
      group.appendChild(btn);
    }

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
    const textStyleSupported = selectedDrawing ? supportsUserDrawingTextStyleControls(selectedDrawing) : false;
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

      if (textStyleSupported) {
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
          const isActive = isUnderline ? !!selectedDrawing.style.textUnderline : !!selectedDrawing.style.textLineThrough;
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

      for (const descriptor of USER_DRAWING_STYLE_TOOLBAR_ACTION_DESCRIPTORS) {
        const actionState = resolveUserDrawingStyleToolbarAction(state!, descriptor.action);
        const enabled = actionState.enabled;
        const btn = this.createElement('button', {
          style: {
            ...styles.drawingButton,
            opacity: enabled ? '1' : '0.35',
            cursor: enabled ? 'pointer' : 'default',
          },
          textContent: descriptor.icon,
          attributes: {
            type: 'button',
            title: descriptor.label,
            'aria-label': descriptor.label,
          },
        });
        btn.disabled = !enabled;
        if (enabled) {
          btn.addEventListener('click', () => {
            if (actionState.visible !== undefined) {
              this.options.onUserDrawingVisibilityChange?.(actionState.visible);
            }
            if (actionState.locked !== undefined) {
              this.options.onUserDrawingLockedChange?.(actionState.locked, actionState.includeLocked);
            }
          });
          btn.addEventListener('mouseenter', () => Object.assign(btn.style, styles.drawingButtonHover));
          btn.addEventListener('mouseleave', () => {
            btn.style.backgroundColor = 'transparent';
            btn.style.color = 'var(--text2, #787b86)';
          });
        }
        group.appendChild(btn);
      }

      group.appendChild(this.createElement('div', { style: styles.divider }));
    }

    for (const descriptor of USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS) {
      const enabled = state ? isUserDrawingToolbarActionEnabled(state, descriptor.action) : false;
      const btn = this.createElement('button', {
        style: {
          ...styles.drawingButton,
          opacity: enabled ? '1' : '0.35',
          cursor: enabled ? 'pointer' : 'default',
        },
        textContent: descriptor.icon,
        attributes: {
          type: 'button',
          title: descriptor.label,
          'aria-label': descriptor.label,
        },
      });
      btn.disabled = !enabled;
      if (enabled) {
        btn.addEventListener('click', () => {
          if (descriptor.action === 'duplicateSelected') this.options.onUserDrawingDuplicateSelected?.();
          if (descriptor.action === 'deleteSelected') this.options.onUserDrawingDeleteSelected?.();
          const zOrderAction = getUserDrawingZOrderAction(descriptor.action);
          if (zOrderAction) this.options.onUserDrawingZOrderChange?.(zOrderAction);
          if (descriptor.action === 'cancelDraft') this.options.onUserDrawingCancelDraft?.();
          if (descriptor.action === 'clearAll') this.options.onUserDrawingClearAll?.();
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

  setUserDrawingState(state: UserDrawingState): void {
    this.options.userDrawingState = state;
    this.render();
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
