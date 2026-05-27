/**
 * Translation context for tealchart components
 *
 * Provides translations throughout the component tree.
 * Falls back to English defaults if no translations provided.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { ChartTranslations, PartialChartTranslations } from './types';
import { DEFAULT_TRANSLATIONS } from './defaults';

const TranslationContext = createContext<ChartTranslations>(DEFAULT_TRANSLATIONS);

export interface TranslationProviderProps {
  /** Partial or full translations - missing keys fall back to English */
  translations?: PartialChartTranslations;
  children: React.ReactNode;
}

/**
 * Provider component for chart translations
 */
export function TranslationProvider({ translations, children }: TranslationProviderProps) {
  const mergedTranslations = useMemo(() => {
    if (!translations) {
      return DEFAULT_TRANSLATIONS;
    }
    return { ...DEFAULT_TRANSLATIONS, ...translations };
  }, [translations]);

  return (
    <TranslationContext.Provider value={mergedTranslations}>
      {children}
    </TranslationContext.Provider>
  );
}

/**
 * Hook to access chart translations
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const t = useChartTranslations();
 *   return <button>{t.indicators}</button>;
 * }
 * ```
 */
export function useChartTranslations(): ChartTranslations {
  return useContext(TranslationContext);
}

/**
 * Get a translation value by key (for non-React code)
 * Returns the key itself if not found
 */
export function getTranslation(
  translations: ChartTranslations | undefined,
  key: keyof ChartTranslations
): string {
  if (translations && key in translations) {
    return translations[key] as string;
  }
  return DEFAULT_TRANSLATIONS[key] ?? key;
}
