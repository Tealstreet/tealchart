/**
 * IndicatorsModal - Modal for selecting and adding indicators to the chart
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  BUILTIN_INDICATORS,
  INDICATOR_CATEGORIES,
  searchIndicators,
  type BuiltinIndicator,
} from '../indicators/builtinIndicators';
import { PopoverContainer, popoverStyles } from './PopoverContainer';
import { useChartTranslations, type ChartTranslations } from '../i18n';

// Map category IDs to translation keys
const CATEGORY_TRANSLATION_KEYS: Record<BuiltinIndicator['category'], keyof ChartTranslations> = {
  tealstreet: 'categoryTealstreet',
  trend: 'categoryTrend',
  momentum: 'categoryMomentum',
  volatility: 'categoryVolatility',
  volume: 'categoryVolume',
  other: 'categoryOther',
};

// ============================================================================
// Props
// ============================================================================

export interface IndicatorsModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when an indicator is selected */
  onSelectIndicator: (indicator: BuiltinIndicator) => void;
  /** IDs of currently active indicators */
  activeIndicatorIds?: string[];
}

// ============================================================================
// Component
// ============================================================================

export const IndicatorsModal: React.FC<IndicatorsModalProps> = memo(
  ({ isOpen, onClose, onSelectIndicator, activeIndicatorIds = [] }) => {
    const t = useChartTranslations();
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    // Clear search when modal closes
    useEffect(() => {
      if (!isOpen) {
        setSearchQuery('');
      }
    }, [isOpen]);

    // Filter indicators based on search
    const filteredIndicators = useMemo(() => {
      if (!searchQuery.trim()) {
        return BUILTIN_INDICATORS;
      }
      return searchIndicators(searchQuery);
    }, [searchQuery]);

    // Group indicators by category
    const groupedIndicators = useMemo(() => {
      const groups = new Map<BuiltinIndicator['category'], BuiltinIndicator[]>();

      for (const indicator of filteredIndicators) {
        const existing = groups.get(indicator.category) || [];
        groups.set(indicator.category, [...existing, indicator]);
      }

      return groups;
    }, [filteredIndicators]);

    // Handle indicator click
    const handleIndicatorClick = useCallback(
      (indicator: BuiltinIndicator) => {
        onSelectIndicator(indicator);
        onClose();
      },
      [onSelectIndicator, onClose]
    );

    const activeSet = new Set(activeIndicatorIds);

    return (
      <PopoverContainer
        isOpen={isOpen}
        onClose={onClose}
        title={t.indicators}
        searchPlaceholder={t.searchIndicators}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      >
        {filteredIndicators.length === 0 ? (
          <div style={popoverStyles.emptyState}>{t.noIndicatorsFound}</div>
        ) : (
          INDICATOR_CATEGORIES.map(({ id: categoryId }) => {
            const indicators = groupedIndicators.get(categoryId);
            if (!indicators || indicators.length === 0) return null;

            const translationKey = CATEGORY_TRANSLATION_KEYS[categoryId];
            const categoryName = t[translationKey];

            return (
              <div key={categoryId}>
                <div style={popoverStyles.categoryHeader}>{categoryName}</div>
                {indicators.map((indicator) => {
                  const isActive = activeSet.has(indicator.id);
                  const isHovered = hoveredId === indicator.id;

                  return (
                    <div
                      key={indicator.id}
                      style={{
                        ...popoverStyles.listItem,
                        ...(isActive ? popoverStyles.listItemActive : {}),
                        ...(isHovered && !isActive ? popoverStyles.listItemHover : {}),
                      }}
                      onClick={() => handleIndicatorClick(indicator)}
                      onMouseEnter={() => setHoveredId(indicator.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {indicator.name}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </PopoverContainer>
    );
  }
);

IndicatorsModal.displayName = 'IndicatorsModal';
