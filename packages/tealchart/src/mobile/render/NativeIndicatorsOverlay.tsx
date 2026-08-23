import type { BuiltinIndicator } from '../../indicators/builtinIndicators';

import React, { useMemo, useState } from 'react';

import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BUILTIN_INDICATORS } from '../../indicators/builtinIndicators';
import { NativeFloatingOverlay } from './NativeFloatingOverlay';

type NativeIndicatorCategory = BuiltinIndicator['category'];

const CATEGORY_LABELS: Record<NativeIndicatorCategory, string> = {
  tealstreet: 'Tealstreet',
  trend: 'Trend',
  momentum: 'Momentum',
  volatility: 'Volatility',
  volume: 'Volume',
  other: 'Other',
};

export interface NativeIndicatorGroup {
  indicators: BuiltinIndicator[];
  label: string;
  value: NativeIndicatorCategory;
}

function isNativeAddableIndicator(indicator: BuiltinIndicator): boolean {
  return indicator.code.trim().length > 0;
}

export function resolveNativeIndicatorGroups(query: string): NativeIndicatorGroup[] {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = BUILTIN_INDICATORS.filter((indicator) => {
    if (!isNativeAddableIndicator(indicator)) return false;
    if (!normalizedQuery) return true;
    return (
      indicator.name.toLowerCase().includes(normalizedQuery) ||
      indicator.description?.toLowerCase().includes(normalizedQuery)
    );
  });

  return (Object.keys(CATEGORY_LABELS) as NativeIndicatorCategory[])
    .map((category) => ({
      value: category,
      label: CATEGORY_LABELS[category],
      indicators: filtered.filter((indicator) => indicator.category === category),
    }))
    .filter((group) => group.indicators.length > 0);
}

export interface NativeIndicatorsOverlayProps {
  activeBackgroundColor: string;
  backgroundColor: string;
  gridColor: string;
  mutedTextColor: string;
  onClose: () => void;
  onSelect: (indicator: BuiltinIndicator) => void;
  textColor: string;
}

export function NativeIndicatorsOverlayImpl({
  activeBackgroundColor,
  backgroundColor,
  gridColor,
  mutedTextColor,
  onClose,
  onSelect,
  textColor,
}: NativeIndicatorsOverlayProps) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => resolveNativeIndicatorGroups(query), [query]);

  return (
    <NativeFloatingOverlay backdropColor="rgba(0, 0, 0, 0.48)" onRequestClose={onClose} visible>
      <View pointerEvents="auto" style={styles.root}>
        <View style={[styles.sheet, { backgroundColor, borderColor: gridColor }]}>
          <View style={[styles.header, { borderBottomColor: gridColor }]}>
            <Text style={[styles.title, { color: textColor }]}>Indicators</Text>
            <Pressable accessibilityLabel="Close indicators" accessibilityRole="button" onPress={onClose}>
              <Text style={[styles.closeText, { color: mutedTextColor }]}>x</Text>
            </Pressable>
          </View>

          <View style={[styles.searchWrap, { borderBottomColor: gridColor }]}>
            <TextInput
              accessibilityLabel="Search indicators"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor={mutedTextColor}
              style={[styles.searchInput, { backgroundColor: activeBackgroundColor, color: textColor }]}
              value={query}
            />
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={styles.list}>
            {groups.map((group) => (
              <View key={group.value}>
                <Text style={[styles.groupLabel, { color: mutedTextColor }]}>{group.label}</Text>
                {group.indicators.map((indicator) => (
                  <Pressable
                    accessibilityLabel={`Add ${indicator.name}`}
                    accessibilityRole="button"
                    key={indicator.id}
                    onPress={() => {
                      onSelect(indicator);
                      onClose();
                    }}
                    style={({ pressed }) => [
                      styles.indicatorRow,
                      { borderBottomColor: gridColor },
                      pressed ? { backgroundColor: activeBackgroundColor } : null,
                    ]}
                  >
                    <View style={styles.indicatorText}>
                      <Text numberOfLines={1} style={[styles.indicatorName, { color: textColor }]}>
                        {indicator.name}
                      </Text>
                      {indicator.description ? (
                        <Text numberOfLines={1} style={[styles.indicatorDescription, { color: mutedTextColor }]}>
                          {indicator.description}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.overlayBadge, { color: mutedTextColor }]}>
                      {indicator.overlay ? 'Overlay' : 'Pane'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
            {groups.length === 0 ? (
              <Text style={[styles.emptyText, { color: mutedTextColor }]}>No indicators found</Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </NativeFloatingOverlay>
  );
}

export const NativeIndicatorsOverlay = React.memo(NativeIndicatorsOverlayImpl);
NativeIndicatorsOverlay.displayName = 'NativeIndicatorsOverlay';

const styles = StyleSheet.create({
  closeText: {
    fontSize: 20,
    lineHeight: 20,
    paddingHorizontal: 6,
  },
  emptyText: {
    fontSize: 13,
    padding: 16,
    textAlign: 'center',
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingBottom: 4,
    paddingHorizontal: 14,
    paddingTop: 12,
    textTransform: 'uppercase',
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  indicatorDescription: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  indicatorName: {
    fontSize: 14,
    fontWeight: '600',
  },
  indicatorRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  indicatorText: {
    flex: 1,
    minWidth: 0,
  },
  list: {
    maxHeight: 420,
  },
  overlayBadge: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  root: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    paddingHorizontal: 20,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  searchInput: {
    borderRadius: 7,
    fontSize: 14,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sheet: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '82%',
    overflow: 'hidden',
    width: '88%',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
});
