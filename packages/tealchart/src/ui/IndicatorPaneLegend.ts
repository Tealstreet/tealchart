/**
 * IndicatorPaneLegend - DOM overlay for indicator pane legends
 *
 * Shows indicator name, inputs, and action buttons (eye, settings, trash)
 * for non-overlay indicators in their dedicated panes.
 */

import { Component } from './Component';
import { div, span, button, icons } from './dom';
import type { ActiveIndicator, IndicatorPaneInfo } from './ChartLegend';

// ============================================================================
// Types
// ============================================================================

export interface IndicatorPaneLegendOptions {
  /** Pane ID */
  paneId: string;
  /** Top position of the pane */
  top: number;
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
    left: '12px',
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

// ============================================================================
// IndicatorPaneLegend Class
// ============================================================================

export class IndicatorPaneLegend extends Component<IndicatorPaneLegendState> {
  private options: IndicatorPaneLegendOptions;

  constructor(options: IndicatorPaneLegendOptions) {
    super('div', {
      indicators: [],
      indicatorPaneInfo: {},
      hoveredIndicatorId: null,
    });

    this.options = options;
    Object.assign(this.el.style, styles.container);
    this.el.style.top = `${options.top + 4}px`;
  }

  // ============================================================================
  // Public API
  // ============================================================================

  setPosition(top: number): void {
    this.options.top = top;
    this.el.style.top = `${top + 4}px`;
  }

  setIndicators(
    indicators: ActiveIndicator[],
    paneInfo: Record<string, IndicatorPaneInfo>
  ): void {
    this.state.indicators = indicators;
    this.state.indicatorPaneInfo = paneInfo;
    this.render();
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  protected render(): void {
    this.el.innerHTML = '';

    for (const indicator of this.state.indicators) {
      this.el.appendChild(this.createIndicatorRow(indicator));
    }
  }

  private createIndicatorRow(indicator: ActiveIndicator): HTMLElement {
    const isHovered = this.state.hoveredIndicatorId === indicator.id;
    const info = this.state.indicatorPaneInfo[indicator.id];

    const row = div({
      style: {
        ...styles.indicatorRow,
        opacity: indicator.isVisible ? '1' : '0.5',
      },
      onMouseEnter: () => {
        this.state.hoveredIndicatorId = indicator.id;
        this.render();
      },
      onMouseLeave: () => {
        this.state.hoveredIndicatorId = null;
        this.render();
      },
    });

    // Name
    row.appendChild(span({
      text: info?.name || indicator.name,
      style: styles.indicatorName,
    }));

    // Input values
    const inputs = Object.values(indicator.inputs);
    if (inputs.length > 0) {
      const inputText = inputs
        .filter(v => v !== undefined && v !== null)
        .map(v => {
          if (typeof v === 'number') return v.toString();
          if (typeof v === 'boolean') return v ? 'Yes' : 'No';
          return String(v);
        })
        .join(' · ');

      if (inputText) {
        row.appendChild(span({
          text: inputText,
          style: styles.indicatorInputs,
        }));
      }
    }

    // Action buttons
    const actions = div({
      style: {
        ...styles.indicatorActions,
        opacity: isHovered ? '1' : '0',
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
      onMouseEnter: (e) => {
        (e.target as HTMLElement).style.color = 'var(--text, #d1d4dc)';
      },
      onMouseLeave: (e) => {
        (e.target as HTMLElement).style.color = 'var(--text2, #787b86)';
      },
    });

    btn.appendChild(icon);
    return btn;
  }
}
