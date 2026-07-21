/**
 * IndicatorsModalMobile - Modal for selecting and adding indicators to the chart
 *
 * Mobile implementation of the web's IndicatorsModal.
 * Uses ListModal for consistent styling and search functionality.
 */
import type { BuiltinIndicator } from '../../indicators/builtinIndicators';

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { AntDesign } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { BUILTIN_INDICATORS, INDICATOR_CATEGORIES, searchIndicators } from '../../indicators/builtinIndicators';
import { CategoryHeader, EmptyState, ListItem, ListModal, listModalColors } from './common/ListModal';

// =============================================================================
// Types
// =============================================================================

export interface IndicatorsModalMobileProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when an indicator is selected (always adds - same indicator can be added multiple times) */
  onSelectIndicator: (indicator: BuiltinIndicator) => void;
  /** @deprecated No longer used - same indicator can be added multiple times */
  activeIndicatorIds?: string[];
}

// Map category IDs to display names
const CATEGORY_LABELS: Record<BuiltinIndicator['category'], string> = {
  tealstreet: 'Tealstreet',
  trend: 'Trend',
  momentum: 'Momentum',
  volatility: 'Volatility',
  volume: 'Volume',
  other: 'Other',
};

// =============================================================================
// Component
// =============================================================================

export const IndicatorsModalMobile: React.FC<IndicatorsModalMobileProps> = memo(
  ({ visible, onClose, onSelectIndicator }) => {
    const [searchQuery, setSearchQuery] = useState('');

    // Clear search when modal closes
    useEffect(() => {
      if (!visible) {
        setSearchQuery('');
      }
    }, [visible]);

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

    // Handle indicator selection
    const handleIndicatorPress = useCallback(
      (indicator: BuiltinIndicator) => {
        onSelectIndicator(indicator);
        onClose();
      },
      [onSelectIndicator, onClose],
    );

    return (
      <ListModal
        visible={visible}
        onClose={onClose}
        title="Indicators"
        searchPlaceholder="Search indicators..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      >
        {filteredIndicators.length === 0 ? (
          <EmptyState message="No indicators found" />
        ) : (
          INDICATOR_CATEGORIES.map(({ id: categoryId }) => {
            const indicators = groupedIndicators.get(categoryId);
            if (!indicators || indicators.length === 0) return null;

            const categoryName = CATEGORY_LABELS[categoryId];

            return (
              <View key={categoryId}>
                <CategoryHeader label={categoryName} />
                {indicators.map((indicator) => (
                  <ListItem
                    key={indicator.id}
                    label={indicator.name}
                    sublabel={indicator.description}
                    onPress={() => handleIndicatorPress(indicator)}
                    rightElement={
                      indicator.overlay ? (
                        <View style={styles.overlayBadge}>
                          <AntDesign name="line-chart" size={12} color={listModalColors.foregroundTransparent} />
                        </View>
                      ) : (
                        <View style={styles.overlayBadge}>
                          <AntDesign name="area-chart" size={12} color={listModalColors.foregroundTransparent} />
                        </View>
                      )
                    }
                  />
                ))}
              </View>
            );
          })
        )}
      </ListModal>
    );
  },
);

IndicatorsModalMobile.displayName = 'IndicatorsModalMobile';

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  overlayBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
});

export default IndicatorsModalMobile;
