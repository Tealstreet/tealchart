/**
 * ChartTopBar - Vanilla DOM toolbar for the chart
 *
 * Contains symbol info, timeframe selector, and indicators button.
 */

import { Component, type ComponentOptions } from './Component';
import { getChartStore, AVAILABLE_TIMEFRAMES, type ChartStore } from '../state/chartState';
import type { ResolutionString } from '../types';

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
  private unsubscribe: (() => void) | null = null;

  // Element references
  private timeframeButtons: Map<string, HTMLButtonElement> = new Map();
  private indicatorsBtn: HTMLButtonElement | null = null;

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
    // Subscribe to store changes
    this.unsubscribe = this.chartStore.settings.subscribe((settings) => {
      if (settings.interval !== this.state.interval) {
        this.setState({ interval: settings.interval as ResolutionString });
      }
    });

    this.render();
  }

  protected onUnmount(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
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

    for (const tf of AVAILABLE_TIMEFRAMES) {
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

    // Spacer (for future layout selector placement)
    this.el.appendChild(this.createElement('div', { style: styles.spacer }));
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
   * Update the displayed symbol
   */
  setSymbol(symbol: string, exchangeName?: string): void {
    this.options.symbol = symbol;
    if (exchangeName !== undefined) {
      this.options.exchangeName = exchangeName;
    }
    this.render();
  }

  /**
   * Update CSS variables
   */
  updateCssVars(vars: Record<string, string>): void {
    this.setCssVars(vars);
  }
}
