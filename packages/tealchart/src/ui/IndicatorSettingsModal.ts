/**
 * IndicatorSettingsModal - Modal for configuring indicator settings
 *
 * Provides form inputs based on Tealscript InputDefinition schema,
 * plus style configuration for plot appearance.
 * Extends the Modal base class for overlay, header, tabs, footer, escape, click-outside.
 */

import type { InputDefinition, PlotOutput } from '@tealstreet/tealscript';
import type { LineStyle, PlotStyleOverride } from '../state/chartState';
import type { ModalOptions } from './Modal';

import { Modal } from './Modal';

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
// Styles (content-specific — overlay/header/tabs/footer from base)
// ============================================================================

const contentStyles = {
  body: {
    padding: '16px',
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
    backgroundColor: 'var(--bg, #131722)',
    border: '1px solid var(--border, #363a45)',
    borderRadius: '4px',
    padding: '6px 10px',
    color: 'var(--text, #d1d4dc)',
    fontSize: '12px',
    width: '120px',
    outline: 'none',
  } as Partial<CSSStyleDeclaration>,

  select: {
    backgroundColor: 'var(--bg, #131722)',
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

  disabled: {
    opacity: '0.45',
    cursor: 'not-allowed',
  } as Partial<CSSStyleDeclaration>,

  colorInput: {
    width: '60px',
    height: '28px',
    padding: '2px',
    border: '1px solid var(--border, #363a45)',
    borderRadius: '4px',
    backgroundColor: 'var(--bg, #131722)',
    cursor: 'pointer',
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
    backgroundColor: 'var(--bg, #131722)',
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
    backgroundColor: 'var(--modal-bg, #1e222d)',
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
    backgroundColor: 'var(--bg, #131722)',
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

export class IndicatorSettingsModal extends Modal {
  private settingsOptions: IndicatorSettingsModalOptions;

  // Current indicator data
  private indicator: ActiveIndicator | null = null;
  private inputDefinitions: InputDefinition[] = [];
  private plots: PlotOutput[] = [];
  private onSaveCallback: ((inputs: Record<string, unknown>, styleOverrides?: PlotStyleOverride[]) => void) | null =
    null;

  // Form state (managed directly, not via setState to avoid full rebuilds)
  private values: Record<string, unknown> = {};
  private styleOverrides: PlotStyleOverride[] = [];
  private openPopoverId: string | null = null;

  constructor(options: IndicatorSettingsModalOptions = {}) {
    const modalOptions: ModalOptions = {
      title: 'Indicator Settings',
      showCloseButton: true,
      closeOnOverlayClick: true,
      closeOnEscape: true,
      position: 'absolute',
      align: 'center',
      modalBackground: 'var(--modal-bg, #1e222d)',
      border: '1px solid var(--border, #363a45)',
      maxHeight: 'min(80vh, calc(100% - 40px))',
      tabs: [
        { id: 'inputs', label: options.translations?.inputs || 'Inputs' },
        { id: 'style', label: options.translations?.style || 'Style' },
      ],
      showFooter: true,
      footerLabels: {
        cancel: options.translations?.cancel || 'Cancel',
        apply: options.translations?.apply || 'Apply',
      },
    };

    super(modalOptions);

    this.settingsOptions = options;

    // Set modal width constraints
    this.modalEl.style.minWidth = '320px';
    this.modalEl.style.maxWidth = '480px';

    // Content area styling
    this.contentEl.style.padding = '16px';
    this.contentEl.style.overflowY = 'auto';
    this.contentEl.style.minHeight = '120px';
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Open the modal with indicator data
   */
  openWith(
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
    this.onSaveCallback = onSave;

    // Initialize values from indicator inputs
    const initialValues: Record<string, unknown> = {};
    for (const def of inputDefinitions) {
      initialValues[def.id] = indicator.inputs[def.id] ?? def.defval;
    }
    this.values = initialValues;

    // Initialize style overrides
    if (styleOverrides && styleOverrides.length > 0) {
      this.styleOverrides = [...styleOverrides];
    } else if (plots) {
      this.styleOverrides = plots.map((plot) => {
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
    } else {
      this.styleOverrides = [];
    }

    this.openPopoverId = null;

    // Set title to indicator name
    this.setTitle(indicator.name || 'Indicator Settings');

    // Reset to inputs tab
    this.setActiveTab('inputs');

    // Open the modal (this sets state.isOpen and shows overlay)
    this.open();
  }

  /**
   * Update translations
   */
  setTranslations(translations: IndicatorSettingsModalOptions['translations']): void {
    this.settingsOptions.translations = translations;
    if (this.state.isOpen) {
      this.renderBody();
    }
  }

  // ============================================================================
  // Overrides
  // ============================================================================

  protected onOpen(): void {
    this.renderBody();
  }

  protected onClose(): void {
    // Clear references
    this.indicator = null;
    this.inputDefinitions = [];
    this.plots = [];
    this.onSaveCallback = null;
    this.openPopoverId = null;
  }

  protected onTabChange(_tabId: string): void {
    this.openPopoverId = null;
    this.renderBody();
  }

  protected handleApply(): void {
    if (this.onSaveCallback) {
      const overrides = this.styleOverrides.length > 0 ? this.styleOverrides : undefined;
      this.onSaveCallback(this.values, overrides);
    }
    this.close();
  }

  /**
   * Custom escape handling: close popover first, then modal
   */
  protected handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (this.openPopoverId) {
        this.openPopoverId = null;
        this.renderBody();
      } else {
        this.close();
      }
    }
  }

  protected render(): void {
    if (this.state.isOpen) {
      this.renderBody();
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  private renderBody(): void {
    this.contentEl.innerHTML = '';

    if (this.state.activeTab === 'inputs') {
      this.renderInputsTab();
    } else {
      this.renderStyleTab();
    }
  }

  private renderInputsTab(): void {
    if (this.inputDefinitions.length === 0) {
      const empty = this.createElement('div', {
        style: contentStyles.emptyState,
        textContent: this.getTranslation('noConfigurableInputs', 'No configurable inputs'),
      });
      this.contentEl.appendChild(empty);
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
      const groupEl = this.createElement('div', { style: contentStyles.group });

      if (groups.size > 1) {
        const groupTitle = this.createElement('div', {
          style: contentStyles.groupTitle,
          textContent: groupName,
        });
        groupEl.appendChild(groupTitle);
      }

      for (const def of inputs) {
        const row = this.renderFormInput(def);
        groupEl.appendChild(row);
      }

      this.contentEl.appendChild(groupEl);
    }
  }

  private isInputActive(def: InputDefinition): boolean {
    return def.active === undefined ? true : Boolean(def.active);
  }

  private applyDisabledState(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, active: boolean): void {
    element.disabled = !active;
    if (!active) {
      Object.assign(element.style, contentStyles.disabled);
    }
  }

  private renderOptionsSelect(def: InputDefinition, currentValue: unknown, active: boolean): HTMLSelectElement {
    const select = document.createElement('select');
    Object.assign(select.style, contentStyles.select);
    this.applyDisabledState(select, active);

    for (const opt of def.options ?? []) {
      const option = document.createElement('option');
      const optionValue = String(opt);
      option.value = optionValue;
      option.textContent = optionValue;
      option.selected = optionValue === String(currentValue);
      select.appendChild(option);
    }

    select.addEventListener('change', (e) => {
      const selectedValue = (e.target as HTMLSelectElement).value;
      const selectedOption = def.options?.find((opt) => String(opt) === selectedValue);
      this.updateValue(def.id, selectedOption ?? selectedValue);
    });

    return select;
  }

  private renderFormInput(def: InputDefinition): HTMLElement {
    const row = this.createElement('div', { style: contentStyles.formRow });
    const active = this.isInputActive(def);

    // Label
    const labelContainer = document.createElement('div');
    const label = this.createElement('div', {
      style: contentStyles.label,
      textContent: def.title,
    });
    labelContainer.appendChild(label);

    if (def.tooltip) {
      const tooltip = this.createElement('div', {
        style: contentStyles.tooltip,
        textContent: def.tooltip,
      });
      labelContainer.appendChild(tooltip);
    }
    row.appendChild(labelContainer);

    // Input
    const currentValue = this.values[def.id] ?? def.defval;

    switch (def.type) {
      case 'int':
      case 'float': {
        if (def.options && def.options.length > 0) {
          row.appendChild(this.renderOptionsSelect(def, currentValue, active));
          break;
        }

        const input = document.createElement('input');
        input.type = 'number';
        Object.assign(input.style, contentStyles.input);
        this.applyDisabledState(input, active);
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
        Object.assign(checkbox.style, contentStyles.checkbox);
        this.applyDisabledState(checkbox, active);
        checkbox.checked = Boolean(currentValue);
        checkbox.addEventListener('change', (e) => {
          this.updateValue(def.id, (e.target as HTMLInputElement).checked);
        });
        row.appendChild(checkbox);
        break;
      }

      case 'string': {
        if (def.options && def.options.length > 0) {
          row.appendChild(this.renderOptionsSelect(def, currentValue, active));
        } else {
          const input = document.createElement('input');
          input.type = 'text';
          Object.assign(input.style, contentStyles.input);
          this.applyDisabledState(input, active);
          input.value = String(currentValue);
          input.addEventListener('change', (e) => {
            this.updateValue(def.id, (e.target as HTMLInputElement).value);
          });
          row.appendChild(input);
        }
        break;
      }

      case 'timeframe':
      case 'symbol':
      case 'session': {
        if (def.options && def.options.length > 0) {
          row.appendChild(this.renderOptionsSelect(def, currentValue, active));
          break;
        }

        const input = document.createElement('input');
        input.type = 'text';
        Object.assign(input.style, contentStyles.input);
        this.applyDisabledState(input, active);
        input.value = String(currentValue);
        input.addEventListener('change', (e) => {
          this.updateValue(def.id, (e.target as HTMLInputElement).value);
        });
        row.appendChild(input);
        break;
      }

      case 'price': {
        const input = document.createElement('input');
        input.type = 'number';
        Object.assign(input.style, contentStyles.input);
        this.applyDisabledState(input, active);
        input.value = String(currentValue);
        input.step = String(def.step ?? 0.01);
        input.addEventListener('change', (e) => {
          const val = parseFloat((e.target as HTMLInputElement).value);
          this.updateValue(def.id, isNaN(val) ? def.defval : val);
        });
        row.appendChild(input);
        break;
      }

      case 'time': {
        const input = document.createElement('input');
        input.type = 'datetime-local';
        Object.assign(input.style, contentStyles.input, { width: '180px' });
        this.applyDisabledState(input, active);
        input.value = this.formatTimestampInput(currentValue);
        input.addEventListener('change', (e) => {
          const value = (e.target as HTMLInputElement).value;
          const timestamp = value ? new Date(value).getTime() : Number.NaN;
          this.updateValue(def.id, Number.isNaN(timestamp) ? def.defval : timestamp);
        });
        row.appendChild(input);
        break;
      }

      case 'text_area': {
        const input = document.createElement('textarea');
        Object.assign(input.style, contentStyles.input, { minHeight: '64px', resize: 'vertical', width: '180px' });
        this.applyDisabledState(input, active);
        input.value = String(currentValue);
        input.addEventListener('change', (e) => {
          this.updateValue(def.id, (e.target as HTMLTextAreaElement).value);
        });
        row.appendChild(input);
        break;
      }

      case 'source': {
        const select = document.createElement('select');
        Object.assign(select.style, contentStyles.select);
        this.applyDisabledState(select, active);
        const selectedValue = typeof currentValue === 'string' ? currentValue : this.sourceNameFromDefault(def.defval);
        for (const opt of SOURCE_OPTIONS) {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          option.selected = opt.value === selectedValue;
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
        Object.assign(colorInput.style, contentStyles.colorInput);
        this.applyDisabledState(colorInput, active);
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
        Object.assign(input.style, contentStyles.input);
        this.applyDisabledState(input, active);
        input.value = String(currentValue);
        input.addEventListener('change', (e) => {
          this.updateValue(def.id, (e.target as HTMLInputElement).value);
        });
        row.appendChild(input);
      }
    }

    return row;
  }

  private formatTimestampInput(value: unknown): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '';
    const date = new Date(value);
    const pad = (part: number) => String(part).padStart(2, '0');
    return [
      date.getFullYear(),
      '-',
      pad(date.getMonth() + 1),
      '-',
      pad(date.getDate()),
      'T',
      pad(date.getHours()),
      ':',
      pad(date.getMinutes()),
    ].join('');
  }

  private sourceNameFromDefault(defval: unknown): string {
    const close = SOURCE_OPTIONS.find((option) => option.value === 'close')?.value ?? 'close';
    return typeof defval === 'string' ? defval : close;
  }

  private renderStyleTab(): void {
    if (!this.plots || this.plots.length === 0) {
      const empty = this.createElement('div', {
        style: contentStyles.emptyState,
        textContent: this.getTranslation('noStyleOptions', 'No style options available'),
      });
      this.contentEl.appendChild(empty);
      return;
    }

    for (let i = 0; i < this.plots.length; i++) {
      const plot = this.plots[i];
      const isLast = i === this.plots.length - 1;
      const row = this.renderPlotStyleRow(plot, isLast);
      this.contentEl.appendChild(row);
    }
  }

  private renderPlotStyleRow(plot: PlotOutput, isLast: boolean): HTMLElement {
    const override = this.styleOverrides.find((o) => o.plotId === plot.id);

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

    const row = this.createElement('div', {
      style: {
        ...contentStyles.plotRow,
        ...(isLast ? contentStyles.plotRowLast : {}),
        position: 'relative',
      },
    });

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    Object.assign(checkbox.style, contentStyles.plotCheckbox);
    checkbox.checked = true;
    checkbox.readOnly = true;
    checkbox.title = this.getTranslation('toggleVisibility', 'Toggle visibility');
    row.appendChild(checkbox);

    // Plot name
    const name = this.createElement('span', {
      style: contentStyles.plotName,
      textContent: plot.title || plot.id,
    });
    row.appendChild(name);

    // Color swatch + line preview
    const preview = this.createElement('div', {
      style: contentStyles.plotPreview,
      onClick: () => {
        this.openPopoverId = this.openPopoverId === plot.id ? null : plot.id;
        this.renderBody();
      },
    });
    preview.title = this.getTranslation('clickToEditStyle', 'Click to edit style');

    const colorSwatch = this.createElement('div', {
      style: { ...contentStyles.colorSwatch, backgroundColor: currentColor },
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
    if (this.openPopoverId === plot.id) {
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
      style: contentStyles.popoverOverlay,
      onClick: () => {
        this.openPopoverId = null;
        this.renderBody();
      },
    });
    container.appendChild(overlay);

    // Popover
    const popover = this.createElement('div', { style: contentStyles.popover });
    popover.addEventListener('click', (e) => e.stopPropagation());

    // Color picker
    const colorRow = this.createElement('div', { style: { ...contentStyles.controlRow, marginBottom: '12px' } });
    const colorLabel = this.createElement('span', {
      style: contentStyles.controlLabel,
      textContent: 'Color',
    });
    colorRow.appendChild(colorLabel);

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = color;
    Object.assign(colorInput.style, contentStyles.colorInput);
    colorInput.addEventListener('change', (e) => {
      this.updateStyleOverride(plotId, 'color', (e.target as HTMLInputElement).value);
    });
    colorRow.appendChild(colorInput);
    popover.appendChild(colorRow);

    // Line thickness
    const thicknessRow = this.createElement('div', { style: contentStyles.controlRow });
    const thicknessLabel = this.createElement('span', {
      style: contentStyles.controlLabel,
      textContent: this.getTranslation('thickness', 'Thickness'),
    });
    thicknessRow.appendChild(thicknessLabel);

    const thicknessGroup = this.createElement('div', { style: contentStyles.buttonGroup });
    for (const thickness of LINE_THICKNESS_OPTIONS) {
      const btn = this.createElement('button', {
        style: {
          ...contentStyles.optionButton,
          ...(linewidth === thickness ? contentStyles.optionButtonActive : {}),
        },
        onClick: () => this.updateStyleOverride(plotId, 'linewidth', thickness),
      });
      btn.title = `${thickness}px`;

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '20');
      svg.setAttribute('height', '12');
      svg.setAttribute('viewBox', '0 0 20 12');
      const svgLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      svgLine.setAttribute('x1', '2');
      svgLine.setAttribute('y1', '6');
      svgLine.setAttribute('x2', '18');
      svgLine.setAttribute('y2', '6');
      svgLine.setAttribute('stroke', linewidth === thickness ? '#131722' : '#787b86');
      svgLine.setAttribute('stroke-width', String(thickness));
      svg.appendChild(svgLine);
      btn.appendChild(svg);

      thicknessGroup.appendChild(btn);
    }
    thicknessRow.appendChild(thicknessGroup);
    popover.appendChild(thicknessRow);

    // Line style
    const styleRow = this.createElement('div', { style: { ...contentStyles.controlRow, marginBottom: '0' } });
    const styleLabel = this.createElement('span', {
      style: contentStyles.controlLabel,
      textContent: this.getTranslation('lineStyle', 'Line Style'),
    });
    styleRow.appendChild(styleLabel);

    const styleGroup = this.createElement('div', { style: contentStyles.buttonGroup });
    for (const opt of LINE_STYLE_OPTIONS) {
      const btn = this.createElement('button', {
        style: {
          ...contentStyles.optionButton,
          width: '40px',
          ...(lineStyle === opt.value ? contentStyles.optionButtonActive : {}),
        },
        onClick: () => this.updateStyleOverride(plotId, 'lineStyle', opt.value),
      });
      btn.title = opt.label;

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '24');
      svg.setAttribute('height', '12');
      svg.setAttribute('viewBox', '0 0 24 12');
      const svgLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      svgLine.setAttribute('x1', '2');
      svgLine.setAttribute('y1', '6');
      svgLine.setAttribute('x2', '22');
      svgLine.setAttribute('y2', '6');
      svgLine.setAttribute('stroke', lineStyle === opt.value ? '#131722' : '#787b86');
      svgLine.setAttribute('stroke-width', '2');
      svgLine.setAttribute('stroke-dasharray', this.getDashArray(opt.value));
      svg.appendChild(svgLine);
      btn.appendChild(svg);

      styleGroup.appendChild(btn);
    }
    styleRow.appendChild(styleGroup);
    popover.appendChild(styleRow);

    container.appendChild(popover);
    return container;
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private getTranslation(key: string, fallback: string): string {
    const translations = this.settingsOptions.translations as Record<string, string> | undefined;
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
    this.values = { ...this.values, [id]: value };
  }

  private updateStyleOverride(plotId: string, key: keyof PlotStyleOverride, value: string | number | LineStyle): void {
    const existing = this.styleOverrides.find((o) => o.plotId === plotId);
    if (existing) {
      this.styleOverrides = this.styleOverrides.map((o) => (o.plotId === plotId ? { ...o, [key]: value } : o));
    } else {
      this.styleOverrides = [...this.styleOverrides, { plotId, [key]: value }];
    }
    // Re-render the style tab
    this.renderBody();
  }
}
