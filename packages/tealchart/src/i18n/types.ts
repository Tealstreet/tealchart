/**
 * Translation strings for tealchart components
 *
 * This allows the package to be used independently while also
 * supporting integration with i18n systems like react-i18next
 */

export interface ChartTranslations {
  // ChartTopBar / IndicatorsModal
  indicators: string;
  searchIndicators: string;
  noIndicatorsFound: string;

  // LayoutSelector
  layouts: string;
  searchLayouts: string;
  noLayoutsFound: string;
  saveCurrentLayout: string;
  saving: string;
  saved: string;
  saveFailed: string;
  unsavedChanges: string;
  duplicate: string;
  delete: string;

  // Indicator controls
  hideIndicator: string;
  showIndicator: string;
  indicatorSettings: string;
  removeIndicator: string;
  close: string;
  toggleVisibility: string;
  clickToEditStyle: string;

  // Indicator settings modal
  inputs: string;
  style: string;
  noConfigurableInputs: string;
  noStyleOptions: string;
  cancel: string;
  apply: string;
  thickness: string;
  lineStyle: string;

  // Chart controls
  resetView: string;

  // Indicator categories
  categoryTealstreet: string;
  categoryTrend: string;
  categoryMomentum: string;
  categoryVolatility: string;
  categoryVolume: string;
  categoryOther: string;

  // Built-in indicator names (optional - indicators can provide their own names)
  indicatorMA?: string;
  indicatorEMA?: string;
  indicatorMACross?: string;
  indicatorEMARibbon?: string;
  indicatorVWAP?: string;
  indicatorRSI?: string;
  indicatorMACD?: string;
  indicatorStochastic?: string;
  indicatorMomentum?: string;
  indicatorCCI?: string;
  indicatorBollingerBands?: string;
  indicatorATR?: string;
  indicatorKeltnerChannels?: string;
  indicatorDonchianChannels?: string;
  indicatorOBV?: string;
  indicatorVolume?: string;
}

/**
 * Partial translations - allows providing only some translations
 * with the rest falling back to defaults
 */
export type PartialChartTranslations = Partial<ChartTranslations>;
