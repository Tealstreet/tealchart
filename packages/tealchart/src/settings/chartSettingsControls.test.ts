import type { ChartSettings } from '../state/chartState';
import type { ChartSettingsControlContext } from './chartSettingsControls';

import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_CHART_SETTINGS } from '../state/chartState';
import {
  CHART_SETTINGS_CONTROLS,
  SHOW_INDICATOR_OUTPUT_AXIS_LABELS_CONTROL_ID,
  SHOW_VOLUME_CONTROL_ID,
  createChartPropertyControl,
  getChartSettingsControlsForTab,
  getPopulatedChartSettingsTabs,
} from './chartSettingsControls';

function createContext(overrides: Partial<ChartSettings> = {}) {
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
  return { context, markLayoutDirty, getSettings: () => settings };
}

function getControl(id: string) {
  const control = CHART_SETTINGS_CONTROLS.find((entry) => entry.id === id);
  if (!control) throw new Error(`missing control ${id}`);
  return control;
}

describe('chart settings controls', () => {
  it('reads volume from settings rather than a chart property path', () => {
    // TradingView models volume as a Volume study source in the layout, so it
    // must not be stored as a volumeProperties-style override path.
    const { context } = createContext({ showVolume: false });
    expect(getControl(SHOW_VOLUME_CONTROL_ID).read(context)).toBe(false);
    expect(context.getSettings().chartProperties).toBeUndefined();
  });

  it('writes volume through the injected setter and marks the layout dirty', () => {
    const { context, markLayoutDirty, getSettings } = createContext({ showVolume: true });

    getControl(SHOW_VOLUME_CONTROL_ID).write(context, false);

    expect(getSettings().showVolume).toBe(false);
    // Without this the change never autosaves.
    expect(markLayoutDirty).toHaveBeenCalledTimes(1);
  });

  it('writes indicator axis labels through the injected setter and marks the layout dirty', () => {
    const { context, markLayoutDirty, getSettings } = createContext({ showIndicatorOutputAxisLabels: true });

    getControl(SHOW_INDICATOR_OUTPUT_AXIS_LABELS_CONTROL_ID).write(context, false);

    expect(getSettings().showIndicatorOutputAxisLabels).toBe(false);
    expect(markLayoutDirty).toHaveBeenCalledTimes(1);
  });

  it('backs property controls with the sparse chart property map', () => {
    const control = createChartPropertyControl({
      id: 'background',
      tabId: 'appearance',
      label: 'Background',
      kind: 'color',
      path: 'paneProperties.background',
      fallback: () => '#16171a',
    });
    const { context, markLayoutDirty, getSettings } = createContext();

    expect(control.read(context)).toBe('#16171a');

    control.write(context, '#101418');

    expect(getSettings().chartProperties).toEqual({ 'paneProperties.background': '#101418' });
    expect(markLayoutDirty).toHaveBeenCalledTimes(1);
    expect(control.read(context)).toBe('#101418');
  });

  it('keeps other chart properties when one is written', () => {
    const { context, getSettings } = createContext({
      chartProperties: { 'scalesProperties.textColor': '#eef2f8' },
    });
    const control = createChartPropertyControl({
      id: 'background',
      tabId: 'appearance',
      label: 'Background',
      kind: 'color',
      path: 'paneProperties.background',
      fallback: () => '#16171a',
    });

    control.write(context, '#101418');

    expect(getSettings().chartProperties).toEqual({
      'scalesProperties.textColor': '#eef2f8',
      'paneProperties.background': '#101418',
    });
  });

  it('groups controls into tabs and hides empty ones', () => {
    expect(getChartSettingsControlsForTab('symbol').map((control) => control.id)).toContain(SHOW_VOLUME_CONTROL_ID);
    const tabs = getPopulatedChartSettingsTabs().map((tab) => tab.id);
    expect(tabs).toContain('symbol');
    expect(tabs).toContain('scales');
  });

  it('gives every control a unique id', () => {
    const ids = CHART_SETTINGS_CONTROLS.map((control) => control.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
