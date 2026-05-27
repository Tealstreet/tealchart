/**
 * Default English translations for tealchart
 *
 * These are used when no translations are provided,
 * allowing the package to work standalone
 */

import type { ChartTranslations } from './types';

export const DEFAULT_TRANSLATIONS: ChartTranslations = {
  // ChartTopBar / IndicatorsModal
  indicators: 'Indicators',
  searchIndicators: 'Search indicators...',
  noIndicatorsFound: 'No indicators found',

  // LayoutSelector
  layouts: 'Layouts',
  searchLayouts: 'Search layouts...',
  noLayoutsFound: 'No layouts found',
  saveCurrentLayout: 'Save current layout',
  saving: 'Saving...',
  saved: 'Saved',
  saveFailed: 'Save failed',
  unsavedChanges: 'Unsaved changes',
  duplicate: 'Duplicate',
  delete: 'Delete',

  // Indicator controls
  hideIndicator: 'Hide indicator',
  showIndicator: 'Show indicator',
  indicatorSettings: 'Indicator settings',
  removeIndicator: 'Remove indicator',
  close: 'Close',
  toggleVisibility: 'Toggle visibility',
  clickToEditStyle: 'Click to edit style',

  // Indicator settings modal
  inputs: 'Inputs',
  style: 'Style',
  noConfigurableInputs: 'No configurable inputs',
  noStyleOptions: 'No style options available',
  cancel: 'Cancel',
  apply: 'Apply',
  thickness: 'Thickness',
  lineStyle: 'Line style',

  // Chart controls
  resetView: 'Reset view',

  // Indicator categories
  categoryTealstreet: 'TEALSTREET SCRIPTS',
  categoryTrend: 'TREND',
  categoryMomentum: 'MOMENTUM',
  categoryVolatility: 'VOLATILITY',
  categoryVolume: 'VOLUME',
  categoryOther: 'OTHER',

  // Built-in indicator names
  indicatorMA: 'Moving Average',
  indicatorEMA: 'Moving Average Exponential',
  indicatorMACross: 'MA Cross',
  indicatorEMARibbon: 'EMA Ribbon',
  indicatorVWAP: 'VWAP',
  indicatorRSI: 'Relative Strength Index',
  indicatorMACD: 'MACD',
  indicatorStochastic: 'Stochastic',
  indicatorMomentum: 'Momentum',
  indicatorCCI: 'Commodity Channel Index',
  indicatorBollingerBands: 'Bollinger Bands',
  indicatorATR: 'Average True Range',
  indicatorKeltnerChannels: 'Keltner Channels',
  indicatorDonchianChannels: 'Donchian Channels',
  indicatorOBV: 'On Balance Volume',
  indicatorVolume: 'Volume',
};
