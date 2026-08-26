/**
 * Declarative registry of chart settings controls, shared by the web modal and
 * the native settings overlay.
 *
 * Adding a setting should be a data entry here, not new UI code on two
 * platforms. Each control owns where its value lives and how to write it; the
 * UI layers only know how to render a `kind`.
 *
 * Two backing stores sit behind one interface, because TradingView itself keeps
 * them apart:
 * - Top-level ChartSettings fields, for things TradingView models structurally
 *   rather than as properties. Volume is the example: it is a Volume study
 *   source in a layout, not a `volumeProperties.*` path.
 * - chartProperties entries, keyed by canonical TradingView override paths.
 *
 * Writes go through an injected context rather than returning a patch, because
 * a patch cannot mark the layout dirty and cannot reach the web widget's
 * private render options — and each platform marks dirty its own way.
 */

import type { ChartSettings } from '../state/chartState';
import type { ChartProperties, ChartPropertyKey } from '../types';

/**
 * Control value kinds, matching the vocabulary the indicator settings modal
 * already renders so both surfaces speak one language.
 */
export type ChartSettingControlKind = 'bool' | 'color' | 'float';

export type ChartSettingControlValue = boolean | string | number;

/**
 * What a platform must provide for controls to read and write.
 *
 * `markLayoutDirty` is separate from `setSetting` on purpose: web marks dirty
 * through the widget's private scheduler, native through a React callback into
 * layout persistence, and neither is reachable from a returned object.
 */
export interface ChartSettingsControlContext {
  getSettings: () => ChartSettings;
  /** Persist one top-level settings field. */
  setSetting: <K extends keyof ChartSettings>(key: K, value: ChartSettings[K]) => void;
  /** Persist the sparse chart property map. */
  setChartProperties: (properties: ChartProperties | undefined) => void;
  /** Tell the host the layout changed so autosave runs. */
  markLayoutDirty: () => void;
}

export interface ChartSettingControl {
  /** Stable id, also used as a test/accessibility handle. */
  id: string;
  /** Modal tab this belongs to. A plain string so new tabs are not a breaking union. */
  tabId: string;
  label: string;
  kind: ChartSettingControlKind;
  read: (context: ChartSettingsControlContext) => ChartSettingControlValue;
  write: (context: ChartSettingsControlContext, value: ChartSettingControlValue) => void;
}

export interface ChartSettingsTab {
  id: string;
  label: string;
}

/**
 * Tabs mirror TradingView's own settings dialog. Only the ones we have controls
 * for are listed; 'Status Line' is deliberately absent because it does not
 * appear anywhere in the shipped charting library bundle.
 */
export const CHART_SETTINGS_TABS: readonly ChartSettingsTab[] = [
  { id: 'symbol', label: 'Symbol' },
  { id: 'scales', label: 'Scales' },
  { id: 'appearance', label: 'Appearance' },
];

/** Build a control backed by a canonical TradingView chart property path. */
export function createChartPropertyControl(options: {
  id: string;
  tabId: string;
  label: string;
  kind: ChartSettingControlKind;
  path: ChartPropertyKey;
  fallback: () => ChartSettingControlValue;
}): ChartSettingControl {
  return {
    id: options.id,
    tabId: options.tabId,
    label: options.label,
    kind: options.kind,
    read: (context) => context.getSettings().chartProperties?.[options.path] ?? options.fallback(),
    write: (context, value) => {
      const current = context.getSettings().chartProperties;
      const next: ChartProperties = { ...current, [options.path]: String(value) };
      context.setChartProperties(next);
      context.markLayoutDirty();
    },
  };
}

export const SHOW_VOLUME_CONTROL_ID = 'showVolume';
export const SHOW_INDICATOR_OUTPUT_AXIS_LABELS_CONTROL_ID = 'showIndicatorOutputAxisLabels';

/**
 * The registry. Volume is first; everything after it should be an entry here
 * rather than a change to either platform's UI.
 */
export const CHART_SETTINGS_CONTROLS: readonly ChartSettingControl[] = [
  {
    id: SHOW_VOLUME_CONTROL_ID,
    tabId: 'symbol',
    label: 'Volume',
    kind: 'bool',
    // Not a chartProperties path: TradingView represents volume as a Volume
    // study source in the layout, so showVolume stays a structural setting.
    read: (context) => context.getSettings().showVolume,
    write: (context, value) => {
      context.setSetting('showVolume', Boolean(value));
      context.markLayoutDirty();
    },
  },
  {
    id: SHOW_INDICATOR_OUTPUT_AXIS_LABELS_CONTROL_ID,
    tabId: 'scales',
    label: 'Indicator axis labels',
    kind: 'bool',
    read: (context) => context.getSettings().showIndicatorOutputAxisLabels,
    write: (context, value) => {
      context.setSetting('showIndicatorOutputAxisLabels', Boolean(value));
      context.markLayoutDirty();
    },
  },
];

export function getChartSettingsControlsForTab(tabId: string): ChartSettingControl[] {
  return CHART_SETTINGS_CONTROLS.filter((control) => control.tabId === tabId);
}

/** Tabs that currently have at least one control, in registry order. */
export function getPopulatedChartSettingsTabs(): ChartSettingsTab[] {
  return CHART_SETTINGS_TABS.filter((tab) => CHART_SETTINGS_CONTROLS.some((control) => control.tabId === tab.id));
}
