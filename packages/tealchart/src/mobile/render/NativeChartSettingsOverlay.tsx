/**
 * Chart settings sheet — the native half of the bottom-right gear.
 *
 * Like the web modal, this holds no per-setting knowledge: rows come from the
 * shared control registry, so adding a setting is one entry in
 * settings/chartSettingsControls.ts and neither platform's UI changes.
 */

import type { LayoutRectangle } from 'react-native';
import type { ChartSettingControl, ChartSettingsControlContext } from '../../settings/chartSettingsControls';
import type { NativeOverlayActionHitTarget } from '../interaction/nativeOverlayActionGestures';

import React, { useState } from 'react';

import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { NativeDrawingIcon } from './NativeDrawingIcon';

import { getChartSettingsControlsForTab, getPopulatedChartSettingsTabs } from '../../settings/chartSettingsControls';

export interface NativeChartSettingsOverlayProps {
  activeBackgroundColor: string;
  backgroundColor: string;
  context: ChartSettingsControlContext;
  gridColor: string;
  mutedTextColor: string;
  onClose: () => void;
  textColor: string;
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 80,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '80%',
    minWidth: 260,
    overflow: 'hidden',
    width: '84%',
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  title: { fontSize: 15, fontWeight: '600' },
  closeLabel: { fontSize: 15, paddingHorizontal: 6 },
  tabs: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
  },
  tab: { paddingHorizontal: 14, paddingVertical: 10 },
  tabLabel: { fontSize: 13 },
  body: { paddingHorizontal: 14, paddingVertical: 6 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowLabel: { fontSize: 14 },
  swatch: { borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, height: 22, width: 32 },
  empty: { fontSize: 13, paddingVertical: 14 },
});

/**
 * Pure view. State is lifted to props so the sheet can be asserted by calling it
 * directly, matching the other native overlays in this directory.
 */
export interface NativeChartSettingsOverlayViewProps extends NativeChartSettingsOverlayProps {
  activeTabId: string;
  onActiveTabIdChange: (tabId: string) => void;
  onControlWritten: () => void;
}

export function NativeChartSettingsOverlayViewImpl({
  activeBackgroundColor,
  activeTabId,
  backgroundColor,
  context,
  gridColor,
  mutedTextColor,
  onActiveTabIdChange,
  onClose,
  onControlWritten,
  textColor,
}: NativeChartSettingsOverlayViewProps) {
  const tabs = getPopulatedChartSettingsTabs();
  const controls = getChartSettingsControlsForTab(activeTabId);

  const renderControl = (control: ChartSettingControl) => {
    const value = control.read(context);

    return (
      <View key={control.id} style={styles.row} accessibilityLabel={`Chart setting ${control.id}`}>
        <Text style={[styles.rowLabel, { color: textColor }]}>{control.label}</Text>
        {control.kind === 'bool' ? (
          <Switch
            accessibilityLabel={control.label}
            value={Boolean(value)}
            onValueChange={(next) => {
              control.write(context, next);
              onControlWritten();
            }}
          />
        ) : control.kind === 'color' ? (
          // Read-only until a colour control ships and a picker is chosen; an
          // inert input would imply it can be edited.
          <View style={[styles.swatch, { backgroundColor: String(value), borderColor: gridColor }]} />
        ) : (
          <Text style={[styles.rowLabel, { color: mutedTextColor }]}>{String(value)}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <Pressable accessibilityLabel="Dismiss chart settings" onPress={onClose} style={styles.scrim} />
      <View style={[styles.sheet, { backgroundColor, borderColor: gridColor }]}>
        <View style={[styles.header, { borderBottomColor: gridColor }]}>
          <Text style={[styles.title, { color: textColor }]}>Chart settings</Text>
          <Pressable accessibilityLabel="Close chart settings" onPress={onClose}>
            <Text style={[styles.closeLabel, { color: mutedTextColor }]}>✕</Text>
          </Pressable>
        </View>

        {tabs.length > 1 && (
          <View style={[styles.tabs, { borderBottomColor: gridColor }]}>
            {tabs.map((tab) => (
              <Pressable
                accessibilityLabel={`${tab.label} settings`}
                key={tab.id}
                onPress={() => onActiveTabIdChange(tab.id)}
                style={[styles.tab, tab.id === activeTabId && { backgroundColor: activeBackgroundColor }]}
              >
                <Text style={[styles.tabLabel, { color: tab.id === activeTabId ? textColor : mutedTextColor }]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <ScrollView style={styles.body} keyboardShouldPersistTaps="always">
          {controls.length === 0 ? (
            <Text style={[styles.empty, { color: mutedTextColor }]}>No settings in this section yet.</Text>
          ) : (
            controls.map(renderControl)
          )}
        </ScrollView>
      </View>
    </View>
  );
}

export function NativeChartSettingsOverlayImpl(props: NativeChartSettingsOverlayProps) {
  const firstTabId = getPopulatedChartSettingsTabs()[0]?.id ?? '';
  const [activeTabId, setActiveTabId] = useState(firstTabId);
  // Controls write straight through the context, so a write needs an explicit
  // re-read to show the new value.
  const [writeCount, setWriteCount] = useState(0);

  return (
    <NativeChartSettingsOverlayViewImpl
      {...props}
      activeTabId={activeTabId}
      key={writeCount}
      onActiveTabIdChange={setActiveTabId}
      onControlWritten={() => setWriteCount((count) => count + 1)}
    />
  );
}

export const NativeChartSettingsOverlay = React.memo(NativeChartSettingsOverlayImpl);

export interface NativeChartSettingsActionCommand {
  type: 'openChartSettings';
}

export type NativeChartSettingsActionHitTarget = NativeOverlayActionHitTarget<NativeChartSettingsActionCommand>;

export interface NativeChartSettingsButtonProps {
  backgroundColor: string;
  /** Time-axis height. The cell is square on this. */
  axisHeight: number;
  onLayoutRectChange: (layout: LayoutRectangle) => void;
  textColor: string;
}

/**
 * Corner controls are small and sit against two screen edges, so the drawn cell
 * alone is a mean target. Grown inward only — outward would push the rect off
 * the canvas, where no touch is delivered.
 */
const SETTINGS_BUTTON_HIT_SLOP = { bottom: 0, left: 10, right: 0, top: 10 };

const buttonStyles = StyleSheet.create({
  // Sits on the intersection of the time and price axis rails, not floating over
  // the candles. Square and flush to both edges so the glyph lands on the corner
  // itself: sizing the cell to the full price-axis width would centre the glyph
  // half an axis in from the edge.
  // It draws above the Skia canvas, so it also covers the last-price tag on the
  // rare frames where that tag spills down into the time-axis row.
  button: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    zIndex: 60,
  },
});

/**
 * Turn the button's own measured box into a gesture hit target.
 *
 * The rect comes from `onLayout` rather than from recomputed geometry, so the
 * tappable area is the drawn area by construction — the two cannot drift the way
 * hand-derived rects do.
 */
export function resolveNativeChartSettingsActionTargets(
  layout: LayoutRectangle | null,
): NativeChartSettingsActionHitTarget[] {
  if (!layout || layout.width <= 0 || layout.height <= 0) return [];

  return [
    {
      command: { type: 'openChartSettings' },
      enabled: true,
      x1: layout.x - SETTINGS_BUTTON_HIT_SLOP.left,
      x2: layout.x + layout.width + SETTINGS_BUTTON_HIT_SLOP.right,
      y1: layout.y - SETTINGS_BUTTON_HIT_SLOP.top,
      y2: layout.y + layout.height + SETTINGS_BUTTON_HIT_SLOP.bottom,
    },
  ];
}

/**
 * Bottom-right gear, mirroring the web chrome. The reset-view affordance is
 * bottom-centre on native, so this corner is free.
 *
 * Passive by design: it draws and reports its box, and the chart's gesture layer
 * owns the tap, exactly as the legend action buttons do. A `Pressable` here would
 * be a second, parallel hit path in a different coordinate space to every other
 * chart control.
 */
export function NativeChartSettingsButtonImpl({
  axisHeight,
  backgroundColor,
  onLayoutRectChange,
  textColor,
}: NativeChartSettingsButtonProps) {
  return (
    <View
      accessibilityLabel="Chart settings"
      accessibilityRole="button"
      onLayout={(event) => onLayoutRectChange(event.nativeEvent.layout)}
      pointerEvents="none"
      style={[buttonStyles.button, { backgroundColor, height: axisHeight, width: axisHeight }]}
    >
      {/* Same icon set as the left tool rail rather than a system emoji. */}
      <NativeDrawingIcon color={textColor} name="gear" size={16} strokeWidth={1.75} />
    </View>
  );
}

export const NativeChartSettingsButton = React.memo(NativeChartSettingsButtonImpl);
