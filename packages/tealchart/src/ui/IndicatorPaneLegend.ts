/**
 * IndicatorPaneLegend - DOM overlay for indicator pane legends
 *
 * Shows indicator name, inputs, and action buttons (eye, settings, trash)
 * for non-overlay indicators in their dedicated panes.
 */

import type { ActiveIndicator, IndicatorPaneInfo } from './ChartLegend';

import { computeTopLeftLegendRect, rect, WEB_CHART_CHROME_METRICS } from '../layout/chartGeometry';
import { Component } from './Component';
import { button, div, icons, span } from './dom';

// ============================================================================
// Types
// ============================================================================

export interface IndicatorPaneLegendOptions {
  /** Pane ID */
  paneId: string;
  /** Top position of the pane */
  top: number;
  /** Whether the pane legend should avoid the left drawing tools rail */
  avoidLeftTools?: boolean;
  /** Callback when visibility toggle is clicked */
  onToggleIndicator?: (indicatorId: string) => void;
  /** Callback when settings button is clicked */
  onSettingsIndicator?: (indicatorId: string) => void;
  /** Callback when remove button is clicked */
  onRemoveIndicator?: (indicatorId: string) => void;
}

interface IndicatorPaneLegendState {
  indicators: ActiveIndicator[];
  indicatorPaneInfo: Record<string, IndicatorPaneInfo>;
  hoveredIndicatorId: string | null;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: {
    position: 'absolute',
    zIndex: '4',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '11px',
    userSelect: 'none',
  } as Partial<CSSStyleDeclaration>,

  indicatorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '2px 0',
    color: 'var(--text, #d1d4dc)',
  } as Partial<CSSStyleDeclaration>,

  indicatorName: {
    fontWeight: '500',
  } as Partial<CSSStyleDeclaration>,

  indicatorInputs: {
    color: 'var(--text2, #787b86)',
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

function resolvePaneLegendLeft(avoidLeftTools: boolean): string {
  const origin = computeTopLeftLegendRect(
    WEB_CHART_CHROME_METRICS,
    rect(0, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
    0,
    { avoidLeftTools },
  );
  return `${origin?.x ?? 12}px`;
}

// ============================================================================
// IndicatorPaneLegend Class
// ============================================================================

export class IndicatorPaneLegend extends Component<IndicatorPaneLegendState> {
  private options: IndicatorPaneLegendOptions;

  // Cache row elements for efficient hover updates (avoid full re-render)
  private rowElements: Map<string, { row: HTMLElement; actions: HTMLElement }> = new Map();

  // Track last indicator signature to avoid unnecessary rebuilds
  private lastIndicatorSignature: string = '';

  constructor(options: IndicatorPaneLegendOptions) {
    super('div', {
      indicators: [],
      indicatorPaneInfo: {},
      hoveredIndicatorId: null,
    });

    this.options = options;
    Object.assign(this.el.style, styles.container);
    this.el.setAttribute('data-tealchart-indicator-pane-legend', options.paneId);
    this.el.style.top = `${options.top + 4}px`;
    this.applyLeftPosition();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  setPosition(top: number): void {
    this.options.top = top;
    this.el.style.top = `${top + 4}px`;
  }

  setAvoidLeftTools(avoidLeftTools: boolean): void {
    if (avoidLeftTools === Boolean(this.options.avoidLeftTools)) return;
    this.options.avoidLeftTools = avoidLeftTools;
    this.applyLeftPosition();
  }

  setIndicators(indicators: ActiveIndicator[], paneInfo: Record<string, IndicatorPaneInfo>): void {
    // Compute signature to detect actual changes (avoid unnecessary re-renders)
    const signature = indicators.map((i) => `${i.id}:${i.name}:${i.isVisible}:${JSON.stringify(i.inputs)}`).join('|');

    // Only update if indicators actually changed
    if (signature !== this.lastIndicatorSignature) {
      this.lastIndicatorSignature = signature;
      this.state.indicators = indicators;
      this.state.indicatorPaneInfo = paneInfo;
      this.render();
    }
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  protected render(): void {
    this.el.innerHTML = '';
    this.rowElements.clear();

    for (const indicator of this.state.indicators) {
      this.el.appendChild(this.createIndicatorRow(indicator));
    }
  }

  private applyLeftPosition(): void {
    this.el.style.left = resolvePaneLegendLeft(Boolean(this.options.avoidLeftTools));
  }

  private createIndicatorRow(indicator: ActiveIndicator): HTMLElement {
    const info = this.state.indicatorPaneInfo[indicator.id];

    const row = div({
      style: {
        ...styles.indicatorRow,
        opacity: indicator.isVisible ? '1' : '0.5',
      },
    });

    // Name
    row.appendChild(
      span({
        text: info?.name || indicator.name,
        style: styles.indicatorName,
      }),
    );

    // Input values
    const inputs = Object.values(indicator.inputs);
    if (inputs.length > 0) {
      const inputText = inputs
        .filter((v) => v !== undefined && v !== null)
        .map((v) => {
          if (typeof v === 'number') return v.toString();
          if (typeof v === 'boolean') return v ? 'Yes' : 'No';
          return String(v);
        })
        .join(' · ');

      if (inputText) {
        row.appendChild(
          span({
            text: inputText,
            style: styles.indicatorInputs,
          }),
        );
      }
    }

    // Action buttons (initially hidden)
    const actions = div({
      style: {
        ...styles.indicatorActions,
        opacity: '0',
      },
    });

    // Eye toggle
    actions.appendChild(
      this.createIconButton(
        indicator.isVisible ? icons.eye(14) : icons.eyeOff(14),
        indicator.isVisible ? 'Hide indicator' : 'Show indicator',
        () => this.options.onToggleIndicator?.(indicator.id),
      ),
    );

    // Settings
    actions.appendChild(
      this.createIconButton(icons.gear(14), 'Indicator settings', () =>
        this.options.onSettingsIndicator?.(indicator.id),
      ),
    );

    // Remove
    actions.appendChild(
      this.createIconButton(icons.trash(14), 'Remove indicator', () => this.options.onRemoveIndicator?.(indicator.id)),
    );

    row.appendChild(actions);

    // Cache elements for hover updates
    this.rowElements.set(indicator.id, { row, actions });

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

  private createIconButton(icon: SVGElement, title: string, onClick: () => void): HTMLElement {
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
}
