/**
 * IndicatorSettingsModal - Vanilla DOM modal for configuring indicator settings
 *
 * Provides form inputs based on Tealscript InputDefinition schema,
 * plus style configuration for plot appearance.
 */

import type { InputDefinition, PlotOutput } from '@tealstreet/tealscript';
import type { LineStyle, PlotStyleOverride } from '../state/chartState';

import { Component } from './Component';

// ============================================================================
// Types
// ============================================================================

export interface ActiveIndicator {
  id: string;
  name: string;
  inputs: Record<string, unknown>;
  styleOverrides?: PlotStyleOverride[];
}

export interface IndicatorSettingsModalOptions {
  /** Translation strings */
  translations?: {
    inputs?: string;
    style?: string;
    close?: string;
    cancel?: string;
    apply?: string;
    noConfigurableInputs?: string;
    noStyleOptions?: string;
    toggleVisibility?: string;
    clickToEditStyle?: string;
    thickness?: string;
    lineStyle?: string;
  };
}

interface IndicatorSettingsModalState {
  isOpen: boolean;
  activeTab: 'inputs' | 'style';
  values: Record<string, unknown>;
  styleOverrides: PlotStyleOverride[];
  openPopoverId: string | null;
}

// Source options for 'source' type inputs
const SOURCE_OPTIONS = [
  { value: 'close', label: 'Close' },
  { value: 'open', label: 'Open' },
  { value: 'high', label: 'High' },
  { value: 'low', label: 'Low' },
  { value: 'hl2', label: 'HL2' },
  { value: 'hlc3', label: 'HLC3' },
  { value: 'ohlc4', label: 'OHLC4' },
  { value: 'hlcc4', label: 'HLCC4' },
];

// Line thickness options
const LINE_THICKNESS_OPTIONS = [1, 2, 3, 4];

// Line style options
const LINE_STYLE_OPTIONS: { value: LineStyle; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];

// ============================================================================
// Styles
// ============================================================================

const styles = {
  overlay: {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '10000',
  } as Partial<CSSStyleDeclaration>,

  modal: {
    backgroundColor: 'var(--background, #1e222d)',
    borderRadius: '8px',
    border: '1px solid var(--border, #363a45)',
    minWidth: '320px',
    maxWidth: '480px',
    maxHeight: 'min(80vh, calc(100% - 40px))',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } as Partial<CSSStyleDeclaration>,

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border, #363a45)',
  } as Partial<CSSStyleDeclaration>,

  title: {
    color: 'var(--text, #d1d4dc)',
    fontSize: '14px',
    fontWeight: '600',
    margin: '0',
  } as Partial<CSSStyleDeclaration>,

  closeButton: {
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    color: 'var(--text2, #787b86)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
  } as Partial<CSSStyleDeclaration>,

  tabs: {
    display: 'flex',
    borderBottom: '1px solid var(--border, #363a45)',
  } as Partial<CSSStyleDeclaration>,

  tab: {
    padding: '10px 20px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text2, #787b86)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as Partial<CSSStyleDeclaration>,

  tabActive: {
    color: 'var(--text, #d1d4dc)',
    borderBottomColor: 'var(--text, #d1d4dc)',
  } as Partial<CSSStyleDeclaration>,

  body: {
    padding: '16px',
    overflowY: 'auto',
    flex: '1',
    minHeight: '120px',
  } as Partial<CSSStyleDeclaration>,

  group: {
    marginBottom: '16px',
  } as Partial<CSSStyleDeclaration>,

  groupTitle: {
    color: 'var(--text2, #787b86)',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  } as Partial<CSSStyleDeclaration>,

  formRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
    gap: '12px',
  } as Partial<CSSStyleDeclaration>,

  label: {
    color: 'var(--text, #d1d4dc)',
    fontSize: '12px',
    flex: '1',
  } as Partial<CSSStyleDeclaration>,

  tooltip: {
    color: 'var(--text3, #5d606b)',
    fontSize: '10px',
    marginTop: '2px',
  } as Partial<CSSStyleDeclaration>,

  input: {
    backgroundColor: 'var(--background2, #131722)',
    border: '1px solid var(--border, #363a45)',
    borderRadius: '4px',
    padding: '6px 10px',
    color: 'var(--text, #d1d4dc)',
    fontSize: '12px',
    width: '120px',
    outline: 'none',
  } as Partial<CSSStyleDeclaration>,

  select: {
    backgroundColor: 'var(--background2, #131722)',
    border: '1px solid var(--border, #363a45)',
    borderRadius: '4px',
    padding: '6px 10px',
    color: 'var(--text, #d1d4dc)',
    fontSize: '12px',
    width: '140px',
    outline: 'none',
    cursor: 'pointer',
  } as Partial<CSSStyleDeclaration>,

  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  } as Partial<CSSStyleDeclaration>,

  colorInput: {
    width: '60px',
    height: '28px',
    padding: '2px',
    border: '1px solid var(--border, #363a45)',
    borderRadius: '4px',
    backgroundColor: 'var(--background2, #131722)',
    cursor: 'pointer',
  } as Partial<CSSStyleDeclaration>,

  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid var(--border, #363a45)',
  } as Partial<CSSStyleDeclaration>,

  button: {
    padding: '8px 16px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    outline: 'none',
  } as Partial<CSSStyleDeclaration>,

  cancelButton: {
    backgroundColor: 'transparent',
    border: '1px solid var(--border, #363a45)',
    color: 'var(--text2, #787b86)',
  } as Partial<CSSStyleDeclaration>,

  applyButton: {
    backgroundColor: 'var(--buy-color, #26a69a)',
    color: '#fff',
  } as Partial<CSSStyleDeclaration>,

  // Style tab
  plotRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid var(--border, #363a45)',
    cursor: 'pointer',
  } as Partial<CSSStyleDeclaration>,

  plotRowLast: {
    borderBottom: 'none',
  } as Partial<CSSStyleDeclaration>,

  plotCheckbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  } as Partial<CSSStyleDeclaration>,

  plotName: {
    flex: '1',
    color: 'var(--text, #d1d4dc)',
    fontSize: '13px',
  } as Partial<CSSStyleDeclaration>,

  plotPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    backgroundColor: 'var(--background2, #131722)',
    borderRadius: '4px',
    border: '1px solid var(--border, #363a45)',
    cursor: 'pointer',
  } as Partial<CSSStyleDeclaration>,

  colorSwatch: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  } as Partial<CSSStyleDeclaration>,

  // Style popover
  popover: {
    position: 'absolute',
    backgroundColor: 'var(--background, #1e222d)',
    borderRadius: '8px',
    border: '1px solid var(--border, #363a45)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    padding: '16px',
    zIndex: '10002',
    right: '16px',
  } as Partial<CSSStyleDeclaration>,

  popoverOverlay: {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    zIndex: '10001',
  } as Partial<CSSStyleDeclaration>,

  controlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  } as Partial<CSSStyleDeclaration>,

  controlLabel: {
    color: 'var(--text2, #787b86)',
    fontSize: '11px',
    width: '60px',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,

  buttonGroup: {
    display: 'flex',
    gap: '3px',
  } as Partial<CSSStyleDeclaration>,

  optionButton: {
    width: '32px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--background2, #131722)',
    border: '1px solid var(--border, #363a45)',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as Partial<CSSStyleDeclaration>,

  optionButtonActive: {
    backgroundColor: 'var(--text2, #787b86)',
    borderColor: 'var(--text2, #787b86)',
  } as Partial<CSSStyleDeclaration>,

  emptyState: {
    color: 'var(--text2, #787b86)',
    fontSize: '12px',
  } as Partial<CSSStyleDeclaration>,
};

// ============================================================================
// IndicatorSettingsModal Class
// ============================================================================

export class IndicatorSettingsModal extends Component<IndicatorSettingsModalState> {
  private options: IndicatorSettingsModalOptions;
  private modalEl: HTMLElement | null = null;
  private bodyEl: HTMLElement | null = null;
  private boundKeyDown: (e: KeyboardEvent) => void;

  // Current indicator data
  private indicator: ActiveIndicator | null = null;
  private inputDefinitions: InputDefinition[] = [];
  private plots: PlotOutput[] = [];
  private onSave: ((inputs: Record<string, unknown>, styleOverrides?: PlotStyleOverride[]) => void) | null = null;

  constructor(options: IndicatorSettingsModalOptions = {}) {
    super('div', {
      isOpen: false,
      activeTab: 'inputs',
      values: {},
      styleOverrides: [],
      openPopoverId: null,
    });

    this.options = options;

    // Setup overlay
    Object.assign(this.el.style, styles.overlay);
    this.el.style.display = 'none';

    this.boundKeyDown = this.handleKeyDown.bind(this);

    // Overlay click handler
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) {
        this.close();
      }
    });
  }

  // ============================================================================
  // Build Modal Structure
  // ============================================================================

  private buildModal(): void {
    this.el.innerHTML = '';

    // Modal container
    this.modalEl = this.createElement('div', { style: styles.modal });
    this.modalEl.addEventListener('click', (e) => e.stopPropagation());
    this.el.appendChild(this.modalEl);

    // Header
    const header = this.createElement('div', { style: styles.header });

    const title = this.createElement('h3', {
      style: styles.title,
      textContent: this.indicator?.name || 'Indicator Settings',
    });
    header.appendChild(title);

    const closeBtn = this.createElement('button', {
      style: styles.closeButton,
      onClick: () => this.close(),
    });
    closeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`;
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.color = 'var(--text, #d1d4dc)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.color = 'var(--text2, #787b86)';
    });
    header.appendChild(closeBtn);

    this.modalEl.appendChild(header);

    // Tabs
    const tabs = this.createElement('div', { style: styles.tabs });

    const inputsTab = this.createElement('button', {
      style: {
        ...styles.tab,
        ...(this.state.activeTab === 'inputs' ? styles.tabActive : {}),
      },
      textContent: this.getTranslation('inputs', 'Inputs'),
      onClick: () => this.setState({ activeTab: 'inputs', openPopoverId: null }),
    });
    tabs.appendChild(inputsTab);

    const styleTab = this.createElement('button', {
      style: {
        ...styles.tab,
        ...(this.state.activeTab === 'style' ? styles.tabActive : {}),
      },
      textContent: this.getTranslation('style', 'Style'),
      onClick: () => this.setState({ activeTab: 'style', openPopoverId: null }),
    });
    tabs.appendChild(styleTab);

    this.modalEl.appendChild(tabs);

    // Body
    this.bodyEl = this.createElement('div', { style: styles.body });
    this.modalEl.appendChild(this.bodyEl);

    // Footer
    const footer = this.createElement('div', { style: styles.footer });

    const cancelBtn = this.createElement('button', {
      style: { ...styles.button, ...styles.cancelButton },
      textContent: this.getTranslation('cancel', 'Cancel'),
      onClick: () => this.close(),
    });
    footer.appendChild(cancelBtn);

    const applyBtn = this.createElement('button', {
      style: { ...styles.button, ...styles.applyButton },
      textContent: this.getTranslation('apply', 'Apply'),
      onClick: () => this.handleSave(),
    });
    footer.appendChild(applyBtn);

    this.modalEl.appendChild(footer);

    // Render body content
    this.renderBody();
  }

  // ============================================================================
  // Render
  // ============================================================================

  protected render(): void {
    if (this.state.isOpen) {
      this.buildModal();
    }
  }

  private renderBody(): void {
    if (!this.bodyEl) return;
    this.bodyEl.innerHTML = '';

    if (this.state.activeTab === 'inputs') {
      this.renderInputsTab();
    } else {
      this.renderStyleTab();
    }
  }

  private renderInputsTab(): void {
    if (!this.bodyEl) return;

    if (this.inputDefinitions.length === 0) {
      const empty = this.createElement('div', {
        style: styles.emptyState,
        textContent: this.getTranslation('noConfigurableInputs', 'No configurable inputs'),
      });
      this.bodyEl.appendChild(empty);
      return;
    }

    // Group inputs
    const groups = new Map<string, InputDefinition[]>();
    for (const def of this.inputDefinitions) {
      const group = def.group || 'Settings';
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(def);
    }

    // Render groups
    for (const [groupName, inputs] of groups) {
      const groupEl = this.createElement('div', { style: styles.group });

      if (groups.size > 1) {
        const groupTitle = this.createElement('div', {
          style: styles.groupTitle,
          textContent: groupName,
        });
        groupEl.appendChild(groupTitle);
      }

      for (const def of inputs) {
        const row = this.renderFormInput(def);
        groupEl.appendChild(row);
      }

      this.bodyEl!.appendChild(groupEl);
    }
  }

  private renderFormInput(def: InputDefinition): HTMLElement {
    const row = this.createElement('div', { style: styles.formRow });

    // Label
    const labelContainer = document.createElement('div');
    const label = this.createElement('div', {
      style: styles.label,
      textContent: def.title,
    });
    labelContainer.appendChild(label);

    if (def.tooltip) {
      const tooltip = this.createElement('div', {
        style: styles.tooltip,
        textContent: def.tooltip,
      });
      labelContainer.appendChild(tooltip);
    }
    row.appendChild(labelContainer);

    // Input
    const currentValue = this.state.values[def.id] ?? def.defval;

    switch (def.type) {
      case 'int':
      case 'float': {
        const input = document.createElement('input');
        input.type = 'number';
        Object.assign(input.style, styles.input);
        input.value = String(currentValue);
        if (def.minval !== undefined) input.min = String(def.minval);
        if (def.maxval !== undefined) input.max = String(def.maxval);
        input.step = String(def.step ?? (def.type === 'int' ? 1 : 0.1));
        input.addEventListener('change', (e) => {
          const val =
            def.type === 'int'
              ? parseInt((e.target as HTMLInputElement).value, 10)
              : parseFloat((e.target as HTMLInputElement).value);
          this.updateValue(def.id, isNaN(val) ? def.defval : val);
        });
        row.appendChild(input);
        break;
      }

      case 'bool': {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        Object.assign(checkbox.style, styles.checkbox);
        checkbox.checked = Boolean(currentValue);
        checkbox.addEventListener('change', (e) => {
          this.updateValue(def.id, (e.target as HTMLInputElement).checked);
        });
        row.appendChild(checkbox);
        break;
      }

      case 'string': {
        if (def.options && def.options.length > 0) {
          const select = document.createElement('select');
          Object.assign(select.style, styles.select);
          for (const opt of def.options) {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            option.selected = opt === currentValue;
            select.appendChild(option);
          }
          select.addEventListener('change', (e) => {
            this.updateValue(def.id, (e.target as HTMLSelectElement).value);
          });
          row.appendChild(select);
        } else {
          const input = document.createElement('input');
          input.type = 'text';
          Object.assign(input.style, styles.input);
          input.value = String(currentValue);
          input.addEventListener('change', (e) => {
            this.updateValue(def.id, (e.target as HTMLInputElement).value);
          });
          row.appendChild(input);
        }
        break;
      }

      case 'source': {
        const select = document.createElement('select');
        Object.assign(select.style, styles.select);
        for (const opt of SOURCE_OPTIONS) {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          option.selected = opt.value === currentValue;
          select.appendChild(option);
        }
        select.addEventListener('change', (e) => {
          this.updateValue(def.id, (e.target as HTMLSelectElement).value);
        });
        row.appendChild(select);
        break;
      }

      case 'color': {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        Object.assign(colorInput.style, styles.colorInput);
        colorInput.value = String(currentValue);
        colorInput.addEventListener('change', (e) => {
          this.updateValue(def.id, (e.target as HTMLInputElement).value);
        });
        row.appendChild(colorInput);
        break;
      }

      default: {
        const input = document.createElement('input');
        input.type = 'text';
        Object.assign(input.style, styles.input);
        input.value = String(currentValue);
        input.addEventListener('change', (e) => {
          this.updateValue(def.id, (e.target as HTMLInputElement).value);
        });
        row.appendChild(input);
      }
    }

    return row;
  }

  private renderStyleTab(): void {
    if (!this.bodyEl) return;

    if (!this.plots || this.plots.length === 0) {
      const empty = this.createElement('div', {
        style: styles.emptyState,
        textContent: this.getTranslation('noStyleOptions', 'No style options available'),
      });
      this.bodyEl.appendChild(empty);
      return;
    }

    for (let i = 0; i < this.plots.length; i++) {
      const plot = this.plots[i];
      const isLast = i === this.plots.length - 1;
      const row = this.renderPlotStyleRow(plot, isLast);
      this.bodyEl.appendChild(row);
    }
  }

  private renderPlotStyleRow(plot: PlotOutput, isLast: boolean): HTMLElement {
    const override = this.state.styleOverrides.find((o) => o.plotId === plot.id);

    // Get base color from plot
    let baseColor = '#2196f3';
    if (typeof plot.color === 'string') {
      baseColor = plot.color;
    } else if (Array.isArray(plot.color)) {
      const firstColor = plot.color.find((c) => c !== null);
      if (firstColor) baseColor = firstColor;
    }

    const currentColor = override?.color ?? baseColor;
    const currentLinewidth = override?.linewidth ?? plot.linewidth ?? 1;
    const currentLineStyle = override?.lineStyle ?? 'solid';
    const currentOpacity = override?.opacity ?? 100;

    const row = this.createElement('div', {
      style: {
        ...styles.plotRow,
        ...(isLast ? styles.plotRowLast : {}),
        position: 'relative',
      },
    });

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    Object.assign(checkbox.style, styles.plotCheckbox);
    checkbox.checked = true;
    checkbox.readOnly = true;
    checkbox.title = this.getTranslation('toggleVisibility', 'Toggle visibility');
    row.appendChild(checkbox);

    // Plot name
    const name = this.createElement('span', {
      style: styles.plotName,
      textContent: plot.title || plot.id,
    });
    row.appendChild(name);

    // Color swatch + line preview
    const preview = this.createElement('div', {
      style: styles.plotPreview,
      onClick: () => {
        const newPopoverId = this.state.openPopoverId === plot.id ? null : plot.id;
        this.setState({ openPopoverId: newPopoverId });
      },
    });
    preview.title = this.getTranslation('clickToEditStyle', 'Click to edit style');

    const colorSwatch = this.createElement('div', {
      style: { ...styles.colorSwatch, backgroundColor: currentColor },
    });
    preview.appendChild(colorSwatch);

    // Line preview SVG
    const linePreview = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    linePreview.setAttribute('width', '40');
    linePreview.setAttribute('height', '16');
    linePreview.setAttribute('viewBox', '0 0 40 16');

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '2');
    line.setAttribute('y1', '8');
    line.setAttribute('x2', '38');
    line.setAttribute('y2', '8');
    line.setAttribute('stroke', currentColor);
    line.setAttribute('stroke-width', String(currentLinewidth));
    line.setAttribute('stroke-dasharray', this.getDashArray(currentLineStyle));
    linePreview.appendChild(line);
    preview.appendChild(linePreview);

    row.appendChild(preview);

    // Popover (if open)
    if (this.state.openPopoverId === plot.id) {
      const popoverContainer = this.renderStylePopover(plot.id, currentColor, currentLinewidth, currentLineStyle);
      row.appendChild(popoverContainer);
    }

    return row;
  }

  private renderStylePopover(plotId: string, color: string, linewidth: number, lineStyle: LineStyle): HTMLElement {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.right = '0';
    container.style.top = '100%';
    container.style.zIndex = '10002';

    // Overlay to close on click outside
    const overlay = this.createElement('div', {
      style: styles.popoverOverlay,
      onClick: () => this.setState({ openPopoverId: null }),
    });
    container.appendChild(overlay);

    // Popover
    const popover = this.createElement('div', { style: styles.popover });
    popover.addEventListener('click', (e) => e.stopPropagation());

    // Color picker
    const colorRow = this.createElement('div', { style: { ...styles.controlRow, marginBottom: '12px' } });
    const colorLabel = this.createElement('span', {
      style: styles.controlLabel,
      textContent: 'Color',
    });
    colorRow.appendChild(colorLabel);

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = color;
    Object.assign(colorInput.style, styles.colorInput);
    colorInput.addEventListener('change', (e) => {
      this.updateStyleOverride(plotId, 'color', (e.target as HTMLInputElement).value);
    });
    colorRow.appendChild(colorInput);
    popover.appendChild(colorRow);

    // Line thickness
    const thicknessRow = this.createElement('div', { style: styles.controlRow });
    const thicknessLabel = this.createElement('span', {
      style: styles.controlLabel,
      textContent: this.getTranslation('thickness', 'Thickness'),
    });
    thicknessRow.appendChild(thicknessLabel);

    const thicknessGroup = this.createElement('div', { style: styles.buttonGroup });
    for (const thickness of LINE_THICKNESS_OPTIONS) {
      const btn = this.createElement('button', {
        style: {
          ...styles.optionButton,
          ...(linewidth === thickness ? styles.optionButtonActive : {}),
        },
        onClick: () => this.updateStyleOverride(plotId, 'linewidth', thickness),
      });
      btn.title = `${thickness}px`;

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '20');
      svg.setAttribute('height', '12');
      svg.setAttribute('viewBox', '0 0 20 12');
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '2');
      line.setAttribute('y1', '6');
      line.setAttribute('x2', '18');
      line.setAttribute('y2', '6');
      line.setAttribute('stroke', linewidth === thickness ? '#131722' : '#787b86');
      line.setAttribute('stroke-width', String(thickness));
      svg.appendChild(line);
      btn.appendChild(svg);

      thicknessGroup.appendChild(btn);
    }
    thicknessRow.appendChild(thicknessGroup);
    popover.appendChild(thicknessRow);

    // Line style
    const styleRow = this.createElement('div', { style: { ...styles.controlRow, marginBottom: '0' } });
    const styleLabel = this.createElement('span', {
      style: styles.controlLabel,
      textContent: this.getTranslation('lineStyle', 'Line Style'),
    });
    styleRow.appendChild(styleLabel);

    const styleGroup = this.createElement('div', { style: styles.buttonGroup });
    for (const opt of LINE_STYLE_OPTIONS) {
      const btn = this.createElement('button', {
        style: {
          ...styles.optionButton,
          width: '40px',
          ...(lineStyle === opt.value ? styles.optionButtonActive : {}),
        },
        onClick: () => this.updateStyleOverride(plotId, 'lineStyle', opt.value),
      });
      btn.title = opt.label;

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '24');
      svg.setAttribute('height', '12');
      svg.setAttribute('viewBox', '0 0 24 12');
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '2');
      line.setAttribute('y1', '6');
      line.setAttribute('x2', '22');
      line.setAttribute('y2', '6');
      line.setAttribute('stroke', lineStyle === opt.value ? '#131722' : '#787b86');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-dasharray', this.getDashArray(opt.value));
      svg.appendChild(line);
      btn.appendChild(svg);

      styleGroup.appendChild(btn);
    }
    styleRow.appendChild(styleGroup);
    popover.appendChild(styleRow);

    container.appendChild(popover);
    return container;
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (this.state.openPopoverId) {
        this.setState({ openPopoverId: null });
      } else {
        this.close();
      }
    }
  }

  private handleSave(): void {
    if (this.onSave) {
      const styleOverrides = this.state.styleOverrides.length > 0 ? this.state.styleOverrides : undefined;
      this.onSave(this.state.values, styleOverrides);
    }
    this.close();
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private getTranslation(key: string, fallback: string): string {
    const translations = this.options.translations as Record<string, string> | undefined;
    return translations?.[key] || fallback;
  }

  private getDashArray(lineStyle: LineStyle): string {
    switch (lineStyle) {
      case 'dashed':
        return '4,3';
      case 'dotted':
        return '1,2';
      default:
        return 'none';
    }
  }

  private updateValue(id: string, value: unknown): void {
    this.state.values = { ...this.state.values, [id]: value };
  }

  private updateStyleOverride(plotId: string, key: keyof PlotStyleOverride, value: string | number | LineStyle): void {
    const existing = this.state.styleOverrides.find((o) => o.plotId === plotId);
    if (existing) {
      this.state.styleOverrides = this.state.styleOverrides.map((o) =>
        o.plotId === plotId ? { ...o, [key]: value } : o,
      );
    } else {
      this.state.styleOverrides = [...this.state.styleOverrides, { plotId, [key]: value }];
    }
    // Re-render the style tab
    this.renderBody();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Open the modal with indicator data
   */
  open(
    indicator: ActiveIndicator,
    inputDefinitions: InputDefinition[],
    plots: PlotOutput[],
    styleOverrides: PlotStyleOverride[] | undefined,
    onSave: (inputs: Record<string, unknown>, styleOverrides?: PlotStyleOverride[]) => void,
  ): void {
    if (this.state.isOpen) return;

    this.indicator = indicator;
    this.inputDefinitions = inputDefinitions;
    this.plots = plots || [];
    this.onSave = onSave;

    // Initialize values from indicator inputs
    const initialValues: Record<string, unknown> = {};
    for (const def of inputDefinitions) {
      initialValues[def.id] = indicator.inputs[def.id] ?? def.defval;
    }

    // Initialize style overrides
    let initialStyleOverrides: PlotStyleOverride[] = [];
    if (styleOverrides && styleOverrides.length > 0) {
      initialStyleOverrides = [...styleOverrides];
    } else if (plots) {
      initialStyleOverrides = plots.map((plot) => {
        let color: string | undefined;
        if (typeof plot.color === 'string') {
          color = plot.color;
        } else if (Array.isArray(plot.color)) {
          color = plot.color.find((c) => c !== null) ?? undefined;
        }
        return {
          plotId: plot.id,
          color,
          linewidth: plot.linewidth ?? 1,
          lineStyle: 'solid' as LineStyle,
          opacity: 100,
        };
      });
    }

    this.setState({
      isOpen: true,
      activeTab: 'inputs',
      values: initialValues,
      styleOverrides: initialStyleOverrides,
      openPopoverId: null,
    });

    this.el.style.display = 'flex';
    document.addEventListener('keydown', this.boundKeyDown);
  }

  /**
   * Close the modal
   */
  close(): void {
    if (!this.state.isOpen) return;

    this.setState({ isOpen: false, openPopoverId: null });
    this.el.style.display = 'none';

    document.removeEventListener('keydown', this.boundKeyDown);

    // Clear references
    this.indicator = null;
    this.inputDefinitions = [];
    this.plots = [];
    this.onSave = null;
  }

  /**
   * Check if modal is open
   */
  isOpen(): boolean {
    return this.state.isOpen;
  }

  /**
   * Update translations
   */
  setTranslations(translations: IndicatorSettingsModalOptions['translations']): void {
    this.options.translations = translations;
    if (this.state.isOpen) {
      this.render();
    }
  }

  protected onUnmount(): void {
    document.removeEventListener('keydown', this.boundKeyDown);
  }
}
