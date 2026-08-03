import type { Bar } from '../../types';
import type { NativeLeftToolRailLayout } from '../utils/leftToolRailLayout';
import type { NativeChartFrame } from './nativeChartFrame';

import React from 'react';

import { StyleSheet, Text, View } from 'react-native';

import { formatNativeTradeLinePrice } from '../utils/tradeLineLayout';

export interface NativeChartLegendOverlayProps {
  bars: readonly Bar[];
  downColor: string;
  frame: NativeChartFrame;
  interval: string;
  isLoading: boolean;
  leftToolRailLayout: NativeLeftToolRailLayout | null;
  mutedTextColor: string;
  pricePrecision: number;
  symbol: string;
  textColor: string;
  upColor: string;
}

function formatNativeLegendInterval(interval: string): string {
  if (interval === '60') return '1h';
  if (/^\d+$/.test(interval)) return `${interval}m`;
  return interval;
}

function formatNativeLegendPrice(value: number, pricePrecision: number): string {
  return formatNativeTradeLinePrice(value, pricePrecision);
}

export function NativeChartLegendOverlayImpl({
  bars,
  downColor,
  frame,
  interval,
  isLoading,
  leftToolRailLayout,
  mutedTextColor,
  pricePrecision,
  symbol,
  textColor,
  upColor,
}: NativeChartLegendOverlayProps) {
  const latestBar = bars[bars.length - 1] ?? null;
  const previousBar = bars[bars.length - 2] ?? null;
  const change = latestBar && previousBar ? latestBar.close - previousBar.close : 0;
  const valueColor = change < 0 ? downColor : upColor;
  const left = Math.max(
    frame.contentLeft + 6,
    leftToolRailLayout?.collapsed ? 12 : (leftToolRailLayout?.railRect.width ?? 0) + 8,
  );
  const top = frame.mainPane.top + 6;
  const ohlcItems = latestBar
    ? ([
        ['O', latestBar.open],
        ['H', latestBar.high],
        ['L', latestBar.low],
        ['C', latestBar.close],
      ] as const)
    : [];

  return (
    <View pointerEvents="none" style={[styles.overlay, { left, top }]}>
      <View style={styles.row}>
        <Text numberOfLines={1} style={[styles.symbol, { color: textColor }]}>
          {symbol}
        </Text>
        <Text style={[styles.meta, { color: mutedTextColor }]}>{formatNativeLegendInterval(interval)}</Text>
        {isLoading && <Text style={[styles.loadingDots, { color: mutedTextColor }]}>...</Text>}
      </View>
      {ohlcItems.length > 0 && (
        <View style={styles.row}>
          {ohlcItems.map(([label, value]) => (
            <View key={label} style={styles.ohlcItem}>
              <Text style={[styles.ohlcLabel, { color: mutedTextColor }]}>{label}</Text>
              <Text style={[styles.ohlcValue, { color: valueColor }]}>
                {formatNativeLegendPrice(value, pricePrecision)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export const NativeChartLegendOverlay = React.memo(NativeChartLegendOverlayImpl);
NativeChartLegendOverlay.displayName = 'NativeChartLegendOverlay';

const styles = StyleSheet.create({
  loadingDots: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
  },
  meta: {
    fontSize: 11,
    fontWeight: '500',
  },
  ohlcItem: {
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: 6,
  },
  ohlcLabel: {
    fontSize: 10,
    marginRight: 2,
  },
  ohlcValue: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '500',
  },
  overlay: {
    position: 'absolute',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 1,
  },
  symbol: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 6,
  },
});
