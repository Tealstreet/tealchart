/**
 * i18n support for tealchart
 *
 * @example Using with react-i18next in the web app:
 * ```tsx
 * import { useTranslation } from 'react-i18next';
 * import { ChartContainer } from '@tealstreet/tealchart';
 *
 * function MyChart() {
 *   const { t } = useTranslation();
 *
 *   const translations = {
 *     indicators: t('trade.tealchart.indicators'),
 *     layouts: t('trade.tealchart.layouts'),
 *     // ... other keys
 *   };
 *
 *   return <ChartContainer translations={translations} ... />;
 * }
 * ```
 *
 * @example Using standalone (English defaults):
 * ```tsx
 * import { ChartContainer } from '@tealstreet/tealchart';
 *
 * // No translations prop = English defaults
 * function MyChart() {
 *   return <ChartContainer ... />;
 * }
 * ```
 */

export type { ChartTranslations, PartialChartTranslations } from './types';
export { DEFAULT_TRANSLATIONS } from './defaults';
export {
  TranslationProvider,
  useChartTranslations,
  getTranslation,
  type TranslationProviderProps,
} from './TranslationContext';
