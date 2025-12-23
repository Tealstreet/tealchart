/**
 * ChartLegend - Vanilla DOM legend overlay
 *
 * Shows symbol info, OHLC values, and active indicators list.
 * Positioned in the top-left corner below the top bar.
 */

import { Component, type ComponentOptions } from './Component';
import { div, span, button, icons } from './dom';
import type { Bar, ResolutionString } from '../types';
import type { PlotStyleOverride } from '../state/chartState';

// ============================================================================
// Types
// ============================================================================

export interface ActiveIndicator {
  id: string;
  name: string;
  isVisible: boolean;
  inputs: Record<string, unknown>;
  styleOverrides?: PlotStyleOverride[];
}

export interface IndicatorPaneInfo {
  overlay: boolean;
  yAxisRange?: { min: number; max: number };
  name?: string;
  inputs?: Record<string, unknown>;
}

export interface ChartLegendOptions extends ComponentOptions {
  symbol: string;
  interval: ResolutionString;
  exchangeName?: string;
  onToggleIndicator?: (indicatorId: string) => void;
  onSettingsIndicator?: (indicatorId: string) => void;
  onRemoveIndicator?: (indicatorId: string) => void;
}

interface ChartLegendState {
  latestBar: Bar | null;
  previousBar: Bar | null;
  activeIndicators: ActiveIndicator[];
  indicatorPaneInfo: Record<string, IndicatorPaneInfo>;
  isExpanded: boolean;
  hoveredIndicatorId: string | null;
}

// Cached OHLC element references for fast updates (avoid DOM rebuild)
interface OHLCElements {
  open: HTMLElement | null;
  high: HTMLElement | null;
  low: HTMLElement | null;
  close: HTMLElement | null;
  change: HTMLElement | null;
}

// Cached indicator list elements for efficient updates
interface IndicatorListElements {
  container: HTMLElement | null;
  toggle: HTMLElement | null;
  chevron: HTMLElement | null;
  toggleLabel: HTMLElement | null;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: {
    position: 'absolute',
    top: '40px',
    left: '12px',
    zIndex: '4',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '12px',
    userSelect: 'none',
  } as Partial<CSSStyleDeclaration>,

  mainRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '2px',
  } as Partial<CSSStyleDeclaration>,

  symbolInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: 'var(--text, #d1d4dc)',
    fontWeight: '500',
  } as Partial<CSSStyleDeclaration>,

  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--buy-color, #26a69a)',
    marginLeft: '4px',
  } as Partial<CSSStyleDeclaration>,

  ohlcGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  } as Partial<CSSStyleDeclaration>,

  ohlcItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  } as Partial<CSSStyleDeclaration>,

  ohlcLabel: {
    color: 'var(--text3, #5d606b)',
    fontSize: '11px',
  } as Partial<CSSStyleDeclaration>,

  ohlcValue: {
    color: 'var(--text, #d1d4dc)',
    fontFamily: 'monospace',
    fontSize: '11px',
  } as Partial<CSSStyleDeclaration>,

  indicatorToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 0',
    cursor: 'pointer',
    color: 'var(--text2, #787b86)',
    fontSize: '11px',
  } as Partial<CSSStyleDeclaration>,

  indicatorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 0',
    fontSize: '11px',
    color: 'var(--text, #d1d4dc)',
  } as Partial<CSSStyleDeclaration>,

  indicatorName: {
    fontWeight: '500',
  } as Partial<CSSStyleDeclaration>,

  indicatorInputs: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: '6px',
    color: 'var(--text2, #787b86)',
    fontSize: '11px',
  } as Partial<CSSStyleDeclaration>,

  indicatorActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    opacity: '0',
    transition: 'opacity 0.15s',
  } as Partial<CSSStyleDeclaration>,

  iconButton: {
    background: 'none',
    border: 'none',
    padding: '2px',
    cursor: 'pointer',
    color: 'var(--text2, #787b86)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '2px',
  } as Partial<CSSStyleDeclaration>,
};

// ============================================================================
// ChartLegend Class
// ============================================================================

export class ChartLegend extends Component<ChartLegendState> {
  private options: ChartLegendOptions;

  // Cached OHLC elements for fast bar updates (no DOM rebuild)
  private ohlcElements: OHLCElements = {
    open: null,
    high: null,
    low: null,
    close: null,
    change: null,
  };

  // Cached indicator list elements (avoid rebuilding on every setIndicators call)
  private indicatorListElements: IndicatorListElements = {
    container: null,
    toggle: null,
    chevron: null,
    toggleLabel: null,
  };

  // Track last indicator signature to avoid unnecessary rebuilds
  private lastIndicatorSignature: string = '';

  constructor(options: ChartLegendOptions) {
    super('div', {
      latestBar: null,
      previousBar: null,
      activeIndicators: [],
      indicatorPaneInfo: {},
      isExpanded: true,
      hoveredIndicatorId: null,
    });

    this.options = options;
    Object.assign(this.el.style, styles.container);
  }

  // ============================================================================
  // Public API
  // ============================================================================

  setSymbol(symbol: string, exchangeName?: string): void {
    this.options.symbol = symbol;
    if (exchangeName !== undefined) {
      this.options.exchangeName = exchangeName;
    }
    this.render();
  }

  setInterval(interval: ResolutionString): void {
    this.options.interval = interval;
    this.render();
  }

  setBars(latestBar: Bar | null, previousBar: Bar | null): void {
    this.state.latestBar = latestBar;
    this.state.previousBar = previousBar;

    // Fast path: if OHLC elements exist, just update text content (no DOM rebuild!)
    if (this.ohlcElements.open && latestBar) {
      this.updateOHLCValues(latestBar, previousBar);
    } else {
      // Full rebuild needed (first render or structure change)
      this.render();
    }
  }

  /**
   * Fast OHLC update - just changes text content, no DOM manipulation
   */
  private updateOHLCValues(bar: Bar, prevBar: Bar | null): void {
    const isUp = bar.close >= bar.open;

    if (this.ohlcElements.open) {
      this.ohlcElements.open.textContent = this.formatPrice(bar.open);
    }
    if (this.ohlcElements.high) {
      this.ohlcElements.high.textContent = this.formatPrice(bar.high);
    }
    if (this.ohlcElements.low) {
      this.ohlcElements.low.textContent = this.formatPrice(bar.low);
    }
    if (this.ohlcElements.close) {
      this.ohlcElements.close.textContent = this.formatPrice(bar.close);
      this.ohlcElements.close.style.color = isUp
        ? 'var(--buy-color, #26a69a)'
        : 'var(--sell-color, #ef5350)';
    }
    if (this.ohlcElements.change && prevBar) {
      const change = bar.close - prevBar.close;
      const changePercent = (change / prevBar.close) * 100;
      const changeUp = change >= 0;
      this.ohlcElements.change.textContent = `${changeUp ? '+' : ''}${change.toFixed(1)} (${changePercent.toFixed(2)}%)`;
      this.ohlcElements.change.style.color = changeUp
        ? 'var(--buy-color, #26a69a)'
        : 'var(--sell-color, #ef5350)';
    }
  }

  setIndicators(
    indicators: ActiveIndicator[],
    paneInfo: Record<string, IndicatorPaneInfo>
  ): void {
    // Compute signature to detect actual changes (avoid unnecessary re-renders)
    const overlayIndicators = indicators.filter(ind => {
      const info = paneInfo[ind.id];
      return info?.overlay !== false;
    });
    const signature = overlayIndicators.map(i => `${i.id}:${i.name}:${i.isVisible}`).join('|');

    // Only update if indicators actually changed
    if (signature !== this.lastIndicatorSignature) {
      this.lastIndicatorSignature = signature;
      this.state.activeIndicators = indicators;
      this.state.indicatorPaneInfo = paneInfo;
      this.updateIndicatorList(overlayIndicators);
    }
  }

  /**
   * Update indicator list without full re-render
   */
  private updateIndicatorList(overlayIndicators: ActiveIndicator[]): void {
    // Remove old indicator list if it exists
    if (this.indicatorListElements.container) {
      this.indicatorListElements.container.remove();
      this.indicatorListElements.container = null;
    }
    if (this.indicatorListElements.toggle) {
      this.indicatorListElements.toggle.remove();
      this.indicatorListElements.toggle = null;
    }

    // Create new indicator list if there are overlay indicators
    if (overlayIndicators.length > 0) {
      // Indicator list container
      const indicatorList = div({
        style: {
          marginTop: '2px',
          display: this.state.isExpanded ? 'block' : 'none',
        },
      });

      for (const indicator of overlayIndicators) {
        indicatorList.appendChild(this.createIndicatorRow(indicator));
      }

      this.el.appendChild(indicatorList);
      this.indicatorListElements.container = indicatorList;

      // Collapse toggle
      const toggle = div({
        style: styles.indicatorToggle,
      });

      const chevron = span({
        text: '▼',
        style: {
          fontSize: '10px',
          transform: this.state.isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s',
          display: 'inline-block',
        },
      });
      toggle.appendChild(chevron);

      const toggleLabel = span({
        text: `${overlayIndicators.length} indicator${overlayIndicators.length !== 1 ? 's' : ''}`,
      });
      toggle.appendChild(toggleLabel);

      // Click handler for toggle
      toggle.addEventListener('click', () => {
        this.state.isExpanded = !this.state.isExpanded;
        indicatorList.style.display = this.state.isExpanded ? 'block' : 'none';
        chevron.style.transform = this.state.isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
      });

      this.el.appendChild(toggle);
      this.indicatorListElements.toggle = toggle;
      this.indicatorListElements.chevron = chevron;
      this.indicatorListElements.toggleLabel = toggleLabel;
    }
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  protected render(): void {
    this.el.innerHTML = '';

    // Clear cached OHLC elements (will be rebuilt below)
    this.ohlcElements = { open: null, high: null, low: null, close: null, change: null };

    // Clear cached indicator elements (will be rebuilt via setIndicators)
    this.indicatorListElements = { container: null, toggle: null, chevron: null, toggleLabel: null };
    this.lastIndicatorSignature = '';

    // Main row
    const mainRow = div({ style: styles.mainRow });

    // Symbol info
    const symbolSection = div({ style: styles.symbolInfo });
    symbolSection.appendChild(span({ text: this.options.symbol }));
    symbolSection.appendChild(span({ text: '·', style: { color: 'var(--text3, #5d606b)' } }));
    symbolSection.appendChild(span({ text: this.formatInterval(this.options.interval) }));

    if (this.options.exchangeName) {
      symbolSection.appendChild(span({ text: '·', style: { color: 'var(--text3, #5d606b)' } }));
      symbolSection.appendChild(span({
        text: this.options.exchangeName,
        style: { color: 'var(--text2, #787b86)' },
      }));
    }

    // Status dot
    symbolSection.appendChild(div({ style: styles.dot }));
    mainRow.appendChild(symbolSection);

    // OHLC values
    if (this.state.latestBar) {
      const ohlcGroup = div({ style: styles.ohlcGroup });
      const bar = this.state.latestBar;
      const isUp = bar.close >= bar.open;

      // Create OHLC items and cache the value elements for fast updates
      const { container: openContainer, valueEl: openEl } = this.createOHLCItemWithRef('O', this.formatPrice(bar.open));
      const { container: highContainer, valueEl: highEl } = this.createOHLCItemWithRef('H', this.formatPrice(bar.high));
      const { container: lowContainer, valueEl: lowEl } = this.createOHLCItemWithRef('L', this.formatPrice(bar.low));
      const { container: closeContainer, valueEl: closeEl } = this.createOHLCItemWithRef('C', this.formatPrice(bar.close), isUp);

      ohlcGroup.appendChild(openContainer);
      ohlcGroup.appendChild(highContainer);
      ohlcGroup.appendChild(lowContainer);
      ohlcGroup.appendChild(closeContainer);

      // Cache references for fast updates
      this.ohlcElements.open = openEl;
      this.ohlcElements.high = highEl;
      this.ohlcElements.low = lowEl;
      this.ohlcElements.close = closeEl;

      // Price change
      if (this.state.previousBar) {
        const prev = this.state.previousBar;
        const change = bar.close - prev.close;
        const changePercent = (change / prev.close) * 100;
        const changeUp = change >= 0;

        const changeEl = span({
          text: `${changeUp ? '+' : ''}${change.toFixed(1)} (${changePercent.toFixed(2)}%)`,
          style: {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: changeUp ? 'var(--buy-color, #26a69a)' : 'var(--sell-color, #ef5350)',
          },
        });
        ohlcGroup.appendChild(changeEl);
        this.ohlcElements.change = changeEl;
      }

      mainRow.appendChild(ohlcGroup);
    }

    this.el.appendChild(mainRow);

    // Note: Indicator list is rendered separately via updateIndicatorList()
    // which is called from setIndicators() when indicators change.
    // This avoids re-rendering the indicator list on every bar update.
  }

  private createOHLCItem(label: string, value: string, isUp?: boolean): HTMLElement {
    const item = div({ style: styles.ohlcItem });
    item.appendChild(span({ text: label, style: styles.ohlcLabel }));

    const valueStyle: Partial<CSSStyleDeclaration> = { ...styles.ohlcValue };
    if (isUp !== undefined) {
      valueStyle.color = isUp ? 'var(--buy-color, #26a69a)' : 'var(--sell-color, #ef5350)';
    }
    item.appendChild(span({ text: value, style: valueStyle }));

    return item;
  }

  /**
   * Create OHLC item and return both container and value element reference
   * Used for caching value elements for fast updates
   */
  private createOHLCItemWithRef(label: string, value: string, isUp?: boolean): { container: HTMLElement; valueEl: HTMLElement } {
    const container = div({ style: styles.ohlcItem });
    container.appendChild(span({ text: label, style: styles.ohlcLabel }));

    const valueStyle: Partial<CSSStyleDeclaration> = { ...styles.ohlcValue };
    if (isUp !== undefined) {
      valueStyle.color = isUp ? 'var(--buy-color, #26a69a)' : 'var(--sell-color, #ef5350)';
    }
    const valueEl = span({ text: value, style: valueStyle });
    container.appendChild(valueEl);

    return { container, valueEl };
  }

  private createIndicatorRow(indicator: ActiveIndicator): HTMLElement {
    const row = div({
      style: {
        ...styles.indicatorRow,
        opacity: indicator.isVisible ? '1' : '0.5',
      },
    });

    // Name
    row.appendChild(span({ text: indicator.name, style: styles.indicatorName }));

    // Input values
    const inputs = Object.values(indicator.inputs);
    if (inputs.length > 0) {
      const inputsDiv = div({ style: styles.indicatorInputs });
      inputs.forEach((value, idx) => {
        if (idx > 0) {
          inputsDiv.appendChild(span({ text: '·', style: { marginRight: '4px' } }));
        }
        inputsDiv.appendChild(span({ text: this.formatInput(value) }));
      });
      row.appendChild(inputsDiv);
    }

    // Action buttons (initially hidden)
    const actions = div({
      style: {
        ...styles.indicatorActions,
        opacity: '0',
      },
    });

    // Eye toggle
    actions.appendChild(this.createIconButton(
      indicator.isVisible ? icons.eye(14) : icons.eyeOff(14),
      indicator.isVisible ? 'Hide indicator' : 'Show indicator',
      () => this.options.onToggleIndicator?.(indicator.id)
    ));

    // Settings
    actions.appendChild(this.createIconButton(
      icons.gear(14),
      'Indicator settings',
      () => this.options.onSettingsIndicator?.(indicator.id)
    ));

    // Remove
    actions.appendChild(this.createIconButton(
      icons.trash(14),
      'Remove indicator',
      () => this.options.onRemoveIndicator?.(indicator.id)
    ));

    row.appendChild(actions);

    // Add hover handlers that update styles directly (no re-render!)
    row.addEventListener('mouseenter', () => {
      this.state.hoveredIndicatorId = indicator.id;
      actions.style.opacity = '1';
    });

    row.addEventListener('mouseleave', () => {
      this.state.hoveredIndicatorId = null;
      actions.style.opacity = '0';
    });

    return row;
  }

  private createIconButton(
    icon: SVGElement,
    title: string,
    onClick: () => void
  ): HTMLElement {
    const btn = button({
      style: styles.iconButton,
      attrs: { title },
      onClick: (e) => {
        e.stopPropagation();
        onClick();
      },
    });

    // Use direct event listeners instead of props to ensure correct element targeting
    btn.addEventListener('mouseenter', () => {
      btn.style.color = 'var(--text, #d1d4dc)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.color = 'var(--text2, #787b86)';
    });

    btn.appendChild(icon);
    return btn;
  }

  // ============================================================================
  // Formatters
  // ============================================================================

  private formatPrice(price: number): string {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    if (price >= 1) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  }

  private formatInterval(interval: ResolutionString): string {
    if (interval === '1D' || interval === 'D') return '1D';
    if (interval === '1W' || interval === 'W') return '1W';
    const num = parseInt(interval, 10);
    if (!isNaN(num)) {
      if (num >= 60) return `${num / 60}h`;
      return `${num}m`;
    }
    return interval;
  }

  private formatInput(value: unknown): string {
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }
}
