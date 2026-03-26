import type { ChartStore } from '../state/chartState';
import type { ResolutionString } from '../types';
import type { ComponentOptions } from './Component';
import type { LayoutSelectorCallbacks } from './LayoutSelector';

import { AVAILABLE_TIMEFRAMES, getChartStore } from '../state/chartState';
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
    // No-op (store subscription removed)
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

  /**
   * Update the current layout shown in the layout selector
   */
  setCurrentLayout(layoutId: string | number | null, layoutName: string | null): void {
    this.layoutSelector?.setCurrentLayout(layoutId, layoutName);
  }

  /**
   * Update CSS variables
   */
  updateCssVars(vars: Record<string, string>): void {
    this.setCssVars(vars);
  }
}
