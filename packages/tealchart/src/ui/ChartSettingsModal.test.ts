import type { ChartSettings } from '../state/chartState';
import type { ChartSettingsControlContext } from '../settings/chartSettingsControls';

import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_CHART_SETTINGS } from '../state/chartState';
import { ChartSettingsModal } from './ChartSettingsModal';

function createHarness(overrides: Partial<ChartSettings> = {}) {
  let settings: ChartSettings = { ...DEFAULT_CHART_SETTINGS, ...overrides };
  const markLayoutDirty = vi.fn();
  const context: ChartSettingsControlContext = {
    getSettings: () => settings,
    setSetting: (key, value) => {
      settings = { ...settings, [key]: value };
    },
    setChartProperties: (properties) => {
      settings = { ...settings, chartProperties: properties };
    },
    markLayoutDirty,
  };

  const host = document.createElement('div');
  document.body.appendChild(host);
  const modal = new ChartSettingsModal(context);
  modal.mount(host);

  return { modal, host, markLayoutDirty, getSettings: () => settings };
}

function getControlInput(host: HTMLElement, id: string): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>(`[data-control-id="${id}"] input`);
  if (!input) throw new Error(`missing control input ${id}`);
  return input;
}

describe('ChartSettingsModal', () => {
  it('renders a row for each registered control on the active tab', () => {
    const { modal, host } = createHarness();
    modal.open();

    expect(host.querySelector('[data-control-id="showVolume"]')).not.toBeNull();
    expect(getControlInput(host, 'showVolume').type).toBe('checkbox');
  });

  it('reflects the current value when opened', () => {
    const { modal, host } = createHarness({ showVolume: false });
    modal.open();

    expect(getControlInput(host, 'showVolume').checked).toBe(false);
  });

  it('rebuilds rows on each open so external changes are not shown stale', () => {
    // Layout loads and imperative applyOverrides both change values while the
    // modal is closed.
    const { modal, host, getSettings } = createHarness({ showVolume: true });
    modal.open();
    expect(getControlInput(host, 'showVolume').checked).toBe(true);
    modal.close();

    getControlInput(host, 'showVolume');
    const context = getSettings();
    expect(context.showVolume).toBe(true);

    modal.open();
    expect(getControlInput(host, 'showVolume').checked).toBe(true);
  });

  it('writes through the control and marks the layout dirty', () => {
    const { modal, host, markLayoutDirty, getSettings } = createHarness({ showVolume: true });
    modal.open();

    const input = getControlInput(host, 'showVolume');
    input.checked = false;
    input.dispatchEvent(new Event('change'));

    expect(getSettings().showVolume).toBe(false);
    expect(markLayoutDirty).toHaveBeenCalledTimes(1);
  });
});
