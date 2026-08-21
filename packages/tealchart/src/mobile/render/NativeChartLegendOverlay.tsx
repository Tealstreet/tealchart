import type { LayoutChangeEvent, LayoutRectangle } from 'react-native';
import type { Bar } from '../../types';
import type { NativeOverlayActionHitTarget } from '../interaction/nativeOverlayActionGestures';
import type { NativeLeftToolRailLayout } from '../utils/leftToolRailLayout';
import type { NativeChartFrame } from './nativeChartFrame';

import React from 'react';

import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';

import {
  LOADING_DOT_COUNT,
  LOADING_DOT_MAX_OPACITY,
  LOADING_DOT_MIN_OPACITY,
  LOADING_DOT_PERIOD_MS,
  LOADING_DOT_STAGGER_MS,
} from '../../constants';
import { formatNativeTradeLinePrice } from '../utils/tradeLineLayout';
import { NativeDrawingIcon } from './NativeDrawingIcon';
import { isNativeMainPaneVisible } from './nativeSharedViewport';

export interface NativeLegendIndicator {
  id: string;
  inputs: Record<string, unknown>;
  isVisible: boolean;
  name: string;
}

export interface NativeLegendIndicatorPaneInfo {
  inputs?: Record<string, unknown>;
  name?: string;
  overlay: boolean;
  paneId?: string;
}

export type NativeLegendActionType = 'removeIndicator' | 'toggleIndicator';

export interface NativeLegendActionCommand {
  indicatorId: string;
  type: NativeLegendActionType;
}

export type NativeLegendActionHitTarget = NativeOverlayActionHitTarget<NativeLegendActionCommand>;

export interface NativeChartLegendOverlayProps {
  activeIndicators?: readonly NativeLegendIndicator[];
  bars: readonly Bar[];
  downColor: string;
  frame: NativeChartFrame;
  gridColor?: string;
  indicatorPaneInfo?: Readonly<Record<string, NativeLegendIndicatorPaneInfo>>;
  interval: string;
  isLoading: boolean;
  leftToolRailLayout: NativeLeftToolRailLayout | null;
  mutedTextColor: string;
  onActionTargetsChange?: (targets: readonly NativeLegendActionHitTarget[]) => void;
  onRemoveIndicator?: (indicatorId: string) => void;
  onToggleIndicator?: (indicatorId: string) => void;
  pricePrecision: number;
  symbol: string;
  textColor: string;
  upColor: string;
}

const LEGEND_ACTION_HIT_SLOP = { left: 6, right: 6, top: 6, bottom: 6 };

function formatNativeLegendInterval(interval: string): string {
  if (interval === '60') return '1h';
  if (/^\d+$/.test(interval)) return `${interval}m`;
  return interval;
}

function formatNativeLegendPrice(value: number, pricePrecision: number): string {
  return formatNativeTradeLinePrice(value, pricePrecision);
}

function formatNativeLegendInputValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
  return String(value);
}

function formatNativeLegendInputs(inputs: Record<string, unknown> | undefined): string {
  if (!inputs) return '';

  return Object.values(inputs)
    .map(formatNativeLegendInputValue)
    .filter((value): value is string => Boolean(value))
    .slice(0, 4)
    .join(' · ');
}

function getNativeLegendLeft(frame: NativeChartFrame, leftToolRailLayout: NativeLeftToolRailLayout | null): number {
  return Math.max(
    frame.contentLeft + 6,
    leftToolRailLayout?.collapsed ? 12 : (leftToolRailLayout?.railRect.width ?? 0) + 8,
  );
}

function isOverlayLegendIndicator(
  indicator: NativeLegendIndicator,
  paneInfo: Readonly<Record<string, NativeLegendIndicatorPaneInfo>>,
): boolean {
  return paneInfo[indicator.id]?.overlay !== false;
}

interface NativeIndicatorLegendRowProps {
  actionKeyPrefix: string;
  indicator: NativeLegendIndicator;
  mutedTextColor: string;
  onActionButtonLayout: (
    key: string,
    action: NativeLegendActionType,
    indicatorId: string,
    event: LayoutChangeEvent,
  ) => void;
  onRemoveIndicator?: (indicatorId: string) => void;
  onRowLayout: (key: string, event: LayoutChangeEvent) => void;
  onToggleIndicator?: (indicatorId: string) => void;
  paneInfo?: NativeLegendIndicatorPaneInfo;
  textColor: string;
}

interface NativeLegendActionOrigin {
  action: NativeLegendActionType;
  indicatorId: string;
  key: string;
  left: number;
  top: number;
}

interface NativeLegendActionLayout {
  action: NativeLegendActionType;
  button?: LayoutRectangle;
  indicatorId: string;
  rowKey: string;
}

interface NativeIndicatorPaneLegend {
  indicators: NativeLegendIndicator[];
  pane: NativeChartFrame['panes'][number];
}

const ignoreNativeLegendRowLayout = () => undefined;
const ignoreNativeLegendActionButtonLayout = () => undefined;

function areNativeLayoutRectanglesEqual(a: LayoutRectangle | undefined, b: LayoutRectangle): boolean {
  return a?.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

export function areNativeLegendActionTargetsEqual(
  a: readonly NativeLegendActionHitTarget[],
  b: readonly NativeLegendActionHitTarget[],
): boolean {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index];
    const right = b[index];
    if (
      left.command.indicatorId !== right.command.indicatorId ||
      left.command.type !== right.command.type ||
      left.enabled !== right.enabled ||
      left.x1 !== right.x1 ||
      left.x2 !== right.x2 ||
      left.y1 !== right.y1 ||
      left.y2 !== right.y2
    ) {
      return false;
    }
  }
  return true;
}

export function resolveNativeLegendActionTargets({
  actionLayouts,
  actionOrigins,
  rowLayouts,
}: {
  actionLayouts: Readonly<Record<string, NativeLegendActionLayout>>;
  actionOrigins: readonly NativeLegendActionOrigin[];
  rowLayouts: Readonly<Record<string, LayoutRectangle>>;
}): NativeLegendActionHitTarget[] {
  const targets: NativeLegendActionHitTarget[] = [];

  for (const origin of actionOrigins) {
    const actionLayout = actionLayouts[origin.key];
    const rowLayout = rowLayouts[actionLayout?.rowKey ?? ''];
    const buttonLayout = actionLayout?.button;
    if (!actionLayout || !rowLayout || !buttonLayout) continue;

    targets.push({
      command: {
        indicatorId: actionLayout.indicatorId,
        type: actionLayout.action,
      },
      enabled: true,
      x1: origin.left + rowLayout.x + buttonLayout.x - LEGEND_ACTION_HIT_SLOP.left,
      x2: origin.left + rowLayout.x + buttonLayout.x + buttonLayout.width + LEGEND_ACTION_HIT_SLOP.right,
      y1: origin.top + rowLayout.y + buttonLayout.y - LEGEND_ACTION_HIT_SLOP.top,
      y2: origin.top + rowLayout.y + buttonLayout.y + buttonLayout.height + LEGEND_ACTION_HIT_SLOP.bottom,
    });
  }

  return targets;
}

function renderNativeIndicatorLegendRow({
  actionKeyPrefix,
  indicator,
  mutedTextColor,
  onActionButtonLayout,
  onRemoveIndicator,
  onRowLayout,
  onToggleIndicator,
  paneInfo,
  textColor,
}: NativeIndicatorLegendRowProps) {
  const name = paneInfo?.name || indicator.name;
  const inputsText = formatNativeLegendInputs(paneInfo?.inputs ?? indicator.inputs);
  const rowOpacity = indicator.isVisible ? 1 : 0.52;
  const rowKey = `${actionKeyPrefix}:${indicator.id}`;
  const toggleActionKey = `${rowKey}:toggleIndicator`;
  const removeActionKey = `${rowKey}:removeIndicator`;

  return (
    <View
      key={indicator.id}
      onLayout={(event) => onRowLayout(rowKey, event)}
      pointerEvents="box-none"
      style={[styles.indicatorRow, { opacity: rowOpacity }]}
    >
      <View pointerEvents="none" style={styles.indicatorTextGroup}>
        <Text numberOfLines={1} style={[styles.indicatorName, { color: textColor }]}>
          {name}
        </Text>
        {inputsText ? (
          <Text numberOfLines={1} style={[styles.indicatorInputs, { color: mutedTextColor }]}>
            {inputsText}
          </Text>
        ) : null}
      </View>
      {onToggleIndicator ? (
        <Pressable
          accessibilityLabel={indicator.isVisible ? `Hide ${name}` : `Show ${name}`}
          accessibilityRole="button"
          hitSlop={6}
          onLayout={(event) => onActionButtonLayout(toggleActionKey, 'toggleIndicator', indicator.id, event)}
          onPress={() => onToggleIndicator?.(indicator.id)}
          style={styles.iconButton}
        >
          <NativeDrawingIcon
            color={mutedTextColor}
            name={indicator.isVisible ? 'eye' : 'eyeOff'}
            size={14}
            strokeWidth={2}
          />
        </Pressable>
      ) : null}
      {onRemoveIndicator ? (
        <Pressable
          accessibilityLabel={`Remove ${name}`}
          accessibilityRole="button"
          hitSlop={6}
          onLayout={(event) => onActionButtonLayout(removeActionKey, 'removeIndicator', indicator.id, event)}
          onPress={() => onRemoveIndicator?.(indicator.id)}
          style={styles.iconButton}
        >
          <NativeDrawingIcon color={mutedTextColor} name="trash" size={14} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  );
}

function resolveNativeOverlayLegendIndicators(
  activeIndicators: readonly NativeLegendIndicator[],
  indicatorPaneInfo: Readonly<Record<string, NativeLegendIndicatorPaneInfo>>,
): NativeLegendIndicator[] {
  return activeIndicators.filter((indicator) => isOverlayLegendIndicator(indicator, indicatorPaneInfo));
}

function resolveNativeIndicatorPaneLegends({
  activeIndicators,
  frame,
  indicatorPaneInfo,
}: {
  activeIndicators: readonly NativeLegendIndicator[];
  frame: NativeChartFrame;
  indicatorPaneInfo: Readonly<Record<string, NativeLegendIndicatorPaneInfo>>;
}): NativeIndicatorPaneLegend[] {
  return (
    frame.panes
      // Height, not just type: maximising another pane collapses this one to
      // nothing, and its legend would otherwise float over the pane that was
      // maximised - taking its action hit targets, and their reserved gesture
      // zones, along with it.
      .filter((pane) => pane.type === 'indicator' && pane.height > 0)
      .map((pane) => ({
        pane,
        indicators: activeIndicators.filter((indicator) => indicatorPaneInfo[indicator.id]?.paneId === pane.id),
      }))
      .filter((paneLegend) => paneLegend.indicators.length > 0)
  );
}

function resolveNativeLegendActionOrigins({
  indicatorPanes,
  left,
  onRemoveIndicator,
  onToggleIndicator,
  overlayIndicators,
  top,
}: {
  indicatorPanes: readonly NativeIndicatorPaneLegend[];
  left: number;
  onRemoveIndicator?: (indicatorId: string) => void;
  onToggleIndicator?: (indicatorId: string) => void;
  overlayIndicators: readonly NativeLegendIndicator[];
  top: number;
}): NativeLegendActionOrigin[] {
  const origins: NativeLegendActionOrigin[] = [];
  const appendOrigins = (indicator: NativeLegendIndicator, blockTop: number, actionKeyPrefix: string) => {
    const rowKey = `${actionKeyPrefix}:${indicator.id}`;
    if (onToggleIndicator) {
      origins.push({
        action: 'toggleIndicator',
        indicatorId: indicator.id,
        key: `${rowKey}:toggleIndicator`,
        left,
        top: blockTop,
      });
    }
    if (onRemoveIndicator) {
      origins.push({
        action: 'removeIndicator',
        indicatorId: indicator.id,
        key: `${rowKey}:removeIndicator`,
        left,
        top: blockTop,
      });
    }
  };

  for (const indicator of overlayIndicators) {
    appendOrigins(indicator, top, 'main');
  }
  for (const { pane, indicators } of indicatorPanes) {
    for (const indicator of indicators) {
      appendOrigins(indicator, pane.top + 6, pane.id);
    }
  }

  return origins;
}

interface NativeChartLegendOverlayViewProps extends NativeChartLegendOverlayProps {
  onActionButtonLayout: (
    key: string,
    action: NativeLegendActionType,
    indicatorId: string,
    event: LayoutChangeEvent,
  ) => void;
  onRowLayout: (key: string, event: LayoutChangeEvent) => void;
}

function NativeChartLegendOverlayView({
  activeIndicators = [],
  bars,
  downColor,
  frame,
  gridColor,
  indicatorPaneInfo = {},
  interval,
  isLoading,
  leftToolRailLayout,
  mutedTextColor,
  onActionButtonLayout,
  onRemoveIndicator,
  onRowLayout,
  onToggleIndicator,
  pricePrecision,
  symbol,
  textColor,
  upColor,
}: NativeChartLegendOverlayViewProps) {
  const latestBar = bars[bars.length - 1] ?? null;
  const previousBar = bars[bars.length - 2] ?? null;
  const change = latestBar && previousBar ? latestBar.close - previousBar.close : 0;
  const valueColor = change < 0 ? downColor : upColor;
  const left = getNativeLegendLeft(frame, leftToolRailLayout);
  const maxWidth = Math.max(120, frame.priceAxisHitLeft - left - 8);
  const top = frame.mainPane.top + 6;
  const ohlcItems: Array<readonly [string, number]> = latestBar
    ? ([
        ['O', latestBar.open],
        ['H', latestBar.high],
        ['L', latestBar.low],
        ['C', latestBar.close],
      ] as const)
    : [];
  const overlayIndicators = resolveNativeOverlayLegendIndicators(activeIndicators, indicatorPaneInfo);
  const indicatorPanes = resolveNativeIndicatorPaneLegends({ activeIndicators, frame, indicatorPaneInfo });

  return (
    <View pointerEvents="box-none" style={styles.root}>
      {isNativeMainPaneVisible(frame) ? (
        <View pointerEvents="box-none" style={[styles.legendBlock, { left, maxWidth, top }]}>
          <View pointerEvents="none" style={styles.row}>
            <Text numberOfLines={1} style={[styles.symbol, { color: textColor }]}>
              {symbol}
            </Text>
            <Text style={[styles.meta, { color: mutedTextColor }]}>{formatNativeLegendInterval(interval)}</Text>
          </View>
          {isLoading && <NativeLegendLoadingDots color={mutedTextColor} />}
          {ohlcItems.length > 0 && (
            <View pointerEvents="none" style={styles.row}>
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
          {overlayIndicators.map((indicator) =>
            renderNativeIndicatorLegendRow({
              actionKeyPrefix: 'main',
              indicator,
              mutedTextColor,
              onActionButtonLayout,
              onRemoveIndicator,
              onRowLayout,
              onToggleIndicator,
              paneInfo: indicatorPaneInfo[indicator.id],
              textColor,
            }),
          )}
        </View>
      ) : null}

      {indicatorPanes.map(({ pane, indicators }) => (
        <View
          key={pane.id}
          pointerEvents="box-none"
          style={[
            styles.legendBlock,
            styles.paneLegendBlock,
            { borderColor: gridColor, left, maxWidth, top: pane.top + 6 },
          ]}
        >
          {indicators.map((indicator) =>
            renderNativeIndicatorLegendRow({
              actionKeyPrefix: pane.id,
              indicator,
              mutedTextColor,
              onActionButtonLayout,
              onRemoveIndicator,
              onRowLayout,
              onToggleIndicator,
              paneInfo: indicatorPaneInfo[indicator.id],
              textColor,
            }),
          )}
        </View>
      ))}
    </View>
  );
}

export function NativeChartLegendOverlayImpl(props: NativeChartLegendOverlayProps) {
  return NativeChartLegendOverlayView({
    ...props,
    onActionButtonLayout: ignoreNativeLegendActionButtonLayout,
    onRowLayout: ignoreNativeLegendRowLayout,
  });
}

export function NativeLoadingDot({ color, index }: { color: string; index: number }) {
  const pulse = useSharedValue(LOADING_DOT_MIN_OPACITY);

  React.useEffect(() => {
    // Web runs this as a CSS keyframe: half the period each way, reversed, with
    // each dot started a stagger later so the three chase one another.
    pulse.value = withDelay(
      index * LOADING_DOT_STAGGER_MS,
      withRepeat(
        withTiming(LOADING_DOT_MAX_OPACITY, {
          duration: LOADING_DOT_PERIOD_MS / 2,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      ),
    );
  }, [index, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return <Animated.Text style={[styles.loadingDot, { color }, animatedStyle]}>•</Animated.Text>;
}

export function NativeLegendLoadingDots({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={styles.loadingDots}>
      {Array.from({ length: LOADING_DOT_COUNT }, (_, index) => (
        <NativeLoadingDot key={index} color={color} index={index} />
      ))}
    </View>
  );
}

function NativeChartLegendOverlayRuntime(props: NativeChartLegendOverlayProps) {
  const [rowLayouts, setRowLayouts] = React.useState<Record<string, LayoutRectangle>>({});
  const [actionLayouts, setActionLayouts] = React.useState<Record<string, NativeLegendActionLayout>>({});
  const lastActionTargetsRef = React.useRef<readonly NativeLegendActionHitTarget[]>([]);
  const onActionTargetsChangeRef = React.useRef(props.onActionTargetsChange);
  const left = getNativeLegendLeft(props.frame, props.leftToolRailLayout);
  const top = props.frame.mainPane.top + 6;
  const overlayIndicators = React.useMemo(
    () => resolveNativeOverlayLegendIndicators(props.activeIndicators ?? [], props.indicatorPaneInfo ?? {}),
    [props.activeIndicators, props.indicatorPaneInfo],
  );
  const indicatorPanes = React.useMemo(
    () =>
      resolveNativeIndicatorPaneLegends({
        activeIndicators: props.activeIndicators ?? [],
        frame: props.frame,
        indicatorPaneInfo: props.indicatorPaneInfo ?? {},
      }),
    [props.activeIndicators, props.frame, props.indicatorPaneInfo],
  );
  const actionOrigins = React.useMemo(
    () =>
      resolveNativeLegendActionOrigins({
        indicatorPanes,
        left,
        onRemoveIndicator: props.onRemoveIndicator,
        onToggleIndicator: props.onToggleIndicator,
        overlayIndicators,
        top,
      }),
    [indicatorPanes, left, overlayIndicators, props.onRemoveIndicator, props.onToggleIndicator, top],
  );
  const nativeLegendActionTargets = React.useMemo(
    () => resolveNativeLegendActionTargets({ actionLayouts, actionOrigins, rowLayouts }),
    [actionLayouts, actionOrigins, rowLayouts],
  );
  React.useEffect(() => {
    onActionTargetsChangeRef.current = props.onActionTargetsChange;
  }, [props.onActionTargetsChange]);
  React.useEffect(() => {
    if (areNativeLegendActionTargetsEqual(lastActionTargetsRef.current, nativeLegendActionTargets)) return;
    lastActionTargetsRef.current = nativeLegendActionTargets;
    onActionTargetsChangeRef.current?.(nativeLegendActionTargets);
  }, [nativeLegendActionTargets]);
  React.useEffect(() => {
    return () => {
      lastActionTargetsRef.current = [];
      onActionTargetsChangeRef.current?.([]);
    };
  }, []);
  const handleRowLayout = React.useCallback((key: string, event: LayoutChangeEvent) => {
    const nextLayout = event.nativeEvent.layout;
    setRowLayouts((previous) => {
      if (areNativeLayoutRectanglesEqual(previous[key], nextLayout)) return previous;
      return {
        ...previous,
        [key]: nextLayout,
      };
    });
  }, []);
  const handleActionButtonLayout = React.useCallback(
    (key: string, action: NativeLegendActionType, indicatorId: string, event: LayoutChangeEvent) => {
      const nextLayout = event.nativeEvent.layout;
      setActionLayouts((previous) => {
        const previousLayout = previous[key];
        if (previousLayout && areNativeLayoutRectanglesEqual(previousLayout.button, nextLayout)) return previous;
        return {
          ...previous,
          [key]: {
            action,
            button: nextLayout,
            indicatorId,
            rowKey: key.slice(0, key.lastIndexOf(':')),
          },
        };
      });
    },
    [],
  );

  return (
    <NativeChartLegendOverlayView
      {...props}
      onActionButtonLayout={handleActionButtonLayout}
      onRowLayout={handleRowLayout}
    />
  );
}

export const NativeChartLegendOverlay = React.memo(NativeChartLegendOverlayRuntime);
NativeChartLegendOverlay.displayName = 'NativeChartLegendOverlay';

const styles = StyleSheet.create({
  loadingDots: {
    flexDirection: 'row',
    paddingLeft: 4,
    paddingTop: 2,
  },
  loadingDot: {
    fontSize: 20,
    letterSpacing: 1,
    lineHeight: 20,
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
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  legendBlock: {
    position: 'absolute',
  },
  paneLegendBlock: {
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 1,
  },
  indicatorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 1,
  },
  indicatorTextGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
  },
  indicatorName: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '600',
    marginRight: 5,
  },
  indicatorInputs: {
    flexShrink: 1,
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '500',
    marginRight: 3,
  },
  iconButton: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    marginLeft: 1,
    width: 22,
  },
  symbol: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 6,
  },
});
