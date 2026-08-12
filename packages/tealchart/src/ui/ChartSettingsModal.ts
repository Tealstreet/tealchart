/**
 * Chart settings modal — the web half of the gear in the chart's bottom-right.
 *
 * Deliberately contains no per-setting knowledge. Rows are generated from the
 * shared control registry, so adding a setting is an entry in
 * settings/chartSettingsControls.ts and nothing here changes.
 */

import type { ChartSettingControl, ChartSettingsControlContext } from '../settings/chartSettingsControls';

import { getChartSettingsControlsForTab, getPopulatedChartSettingsTabs } from '../settings/chartSettingsControls';
import { Modal } from './Modal';

const styles = {
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '10px 4px',
  },
  label: {
    fontSize: '13px',
    opacity: '0.9',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  color: {
    width: '32px',
    height: '22px',
    padding: '0',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
  },
  number: {
    width: '72px',
    padding: '4px 6px',
    fontSize: '13px',
  },
  empty: {
    padding: '12px 4px',
    fontSize: '13px',
    opacity: '0.6',
  },
} as const;

/**
 * Two charts can share a page, so control ids must be unique per modal or the
 * duplicate DOM ids break every label/input association.
 */
let modalInstanceCount = 0;

export class ChartSettingsModal extends Modal {
  private context: ChartSettingsControlContext;
  private readonly instanceId = ++modalInstanceCount;

  constructor(context: ChartSettingsControlContext) {
    super({
      title: 'Chart settings',
      tabs: getPopulatedChartSettingsTabs().map((tab) => ({ id: tab.id, label: tab.label })),
      showCloseButton: true,
      closeOnOverlayClick: true,
      closeOnEscape: true,
      width: 340,
    });
    this.context = context;
  }

  open(): void {
    super.open();
    // Values can change from anywhere between openings (layout load, imperative
    // overrides), so rows are rebuilt from the registry each time rather than
    // trusting whatever was rendered last.
    this.renderControls();
  }

  setActiveTab(tabId: string): void {
    super.setActiveTab(tabId);
    this.renderControls();
  }

  private renderControls(): void {
    const contentEl = this.getContentElement();
    contentEl.replaceChildren();

    const tabId = this.getActiveTab() ?? getPopulatedChartSettingsTabs()[0]?.id;
    if (!tabId) return;

    const controls = getChartSettingsControlsForTab(tabId);
    if (controls.length === 0) {
      const empty = document.createElement('div');
      Object.assign(empty.style, styles.empty);
      empty.textContent = 'No settings in this section yet.';
      contentEl.appendChild(empty);
      return;
    }

    for (const control of controls) {
      contentEl.appendChild(this.renderControlRow(control));
    }
  }

  /** Stable within one modal, unique across modals on the same page. */
  getControlInputId(controlId: string): string {
    return `chart-setting-${this.instanceId}-${controlId}`;
  }

  private renderControlRow(control: ChartSettingControl): HTMLElement {
    const row = document.createElement('div');
    Object.assign(row.style, styles.row);
    row.dataset.controlId = control.id;

    const label = document.createElement('label');
    Object.assign(label.style, styles.label);
    label.textContent = control.label;
    label.htmlFor = this.getControlInputId(control.id);
    row.appendChild(label);

    const input = document.createElement('input');
    input.id = this.getControlInputId(control.id);
    const value = control.read(this.context);

    switch (control.kind) {
      case 'bool':
        input.type = 'checkbox';
        Object.assign(input.style, styles.checkbox);
        input.checked = Boolean(value);
        input.addEventListener('change', () => {
          control.write(this.context, input.checked);
        });
        break;
      case 'color':
        input.type = 'color';
        Object.assign(input.style, styles.color);
        input.value = String(value);
        input.addEventListener('change', () => {
          control.write(this.context, input.value);
        });
        break;
      case 'float':
        input.type = 'number';
        input.step = '0.01';
        Object.assign(input.style, styles.number);
        input.value = String(value);
        input.addEventListener('change', () => {
          const parsed = Number.parseFloat(input.value);
          if (Number.isFinite(parsed)) control.write(this.context, parsed);
        });
        break;
    }

    row.appendChild(input);
    return row;
  }
}
