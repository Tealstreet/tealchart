import type { LayoutChangeEvent, LayoutRectangle } from 'react-native';
import type { NativeOverlayActionHitTarget } from '../interaction/nativeOverlayActionGestures';
import type { NativeTopBarActionCommand, NativeTopBarButtonGeometry, NativeTopBarLayout } from '../utils/topBarLayout';

import React from 'react';

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NativeDrawingIcon } from './NativeDrawingIcon';

export type NativeTopBarActionHitTarget = NativeOverlayActionHitTarget<NativeTopBarActionCommand>;

export interface NativeTopBarOverlayProps {
  backgroundColor: string;
  gridColor: string;
  mutedTextColor: string;
  onActionTargetsChange?: (targets: readonly NativeTopBarActionHitTarget[]) => void;
  textColor: string;
  topBarLayout: NativeTopBarLayout;
}

interface NativeTopBarOverlayImplProps extends NativeTopBarOverlayProps {
  onButtonLayout?: (key: string, command: NativeTopBarActionCommand, event: LayoutChangeEvent) => void;
  onSymbolLayout?: (event: LayoutChangeEvent) => void;
}

interface NativeTopBarActionOrigin {
  command: NativeTopBarActionCommand;
  enabled: boolean;
  key: string;
  left: number;
  top: number;
}

interface NativeTopBarActionLayout {
  command: NativeTopBarActionCommand;
  layout: LayoutRectangle;
}

const TOP_BAR_ACTION_HIT_SLOP = { left: 3, right: 3, top: 4, bottom: 4 };
const SYMBOL_ACTION_HIT_SLOP = { left: 0, right: 4, top: 0, bottom: 4 };

const ignoreNativeTopBarButtonLayout = () => undefined;
const ignoreNativeTopBarSymbolLayout = () => undefined;

function areNativeLayoutRectanglesEqual(a: LayoutRectangle | undefined, b: LayoutRectangle): boolean {
  return a?.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

function nativeTopBarButtonKey(button: NativeTopBarButtonGeometry): string {
  return `button:${button.type}:${button.interval ?? button.text}:${button.x}`;
}

function iconForButton(button: NativeTopBarButtonGeometry) {
  if (button.type === 'undo') return 'undo';
  if (button.type === 'redo') return 'redo';
  if (button.type === 'indicators') return 'indicators';
  return null;
}

function accessibilityLabelForButton(button: NativeTopBarButtonGeometry): string {
  if (button.type === 'timeframe') return `${button.text} timeframe`;
  if (button.type === 'indicators') return 'Indicators';
  if (button.type === 'layout') return 'Chart layouts';
  if (button.type === 'undo') return 'Undo drawing action';
  return 'Redo drawing action';
}

export function resolveNativeTopBarActionOrigins(topBarLayout: NativeTopBarLayout): NativeTopBarActionOrigin[] {
  const origins: NativeTopBarActionOrigin[] = [];

  if (topBarLayout.symbolHitRect) {
    origins.push({
      command: { type: 'symbol' },
      enabled: true,
      key: 'symbol',
      left: 0,
      top: 0,
    });
  }

  for (const button of topBarLayout.buttons) {
    origins.push({
      command: button.interval ? { type: button.type, interval: button.interval } : { type: button.type },
      enabled: button.enabled,
      key: nativeTopBarButtonKey(button),
      left: topBarLayout.scrollAreaX,
      top: 0,
    });
  }

  return origins;
}

export function resolveNativeTopBarActionTargets({
  actionLayouts,
  actionOrigins,
}: {
  actionLayouts: Readonly<Record<string, NativeTopBarActionLayout>>;
  actionOrigins: readonly NativeTopBarActionOrigin[];
}): NativeTopBarActionHitTarget[] {
  const targets: NativeTopBarActionHitTarget[] = [];

  for (const origin of actionOrigins) {
    const actionLayout = actionLayouts[origin.key];
    if (!actionLayout) continue;
    const slop = origin.key === 'symbol' ? SYMBOL_ACTION_HIT_SLOP : TOP_BAR_ACTION_HIT_SLOP;
    targets.push({
      command: actionLayout.command,
      enabled: origin.enabled,
      x1: origin.left + actionLayout.layout.x - slop.left,
      x2: origin.left + actionLayout.layout.x + actionLayout.layout.width + slop.right,
      y1: origin.top + actionLayout.layout.y - slop.top,
      y2: origin.top + actionLayout.layout.y + actionLayout.layout.height + slop.bottom,
    });
  }

  return targets;
}

export function areNativeTopBarActionTargetsEqual(
  a: readonly NativeTopBarActionHitTarget[],
  b: readonly NativeTopBarActionHitTarget[],
): boolean {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index];
    const right = b[index];
    if (
      left.command.type !== right.command.type ||
      left.command.interval !== right.command.interval ||
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

export function NativeTopBarOverlayImpl({
  backgroundColor,
  gridColor,
  mutedTextColor,
  onButtonLayout = ignoreNativeTopBarButtonLayout,
  onSymbolLayout = ignoreNativeTopBarSymbolLayout,
  textColor,
  topBarLayout,
}: NativeTopBarOverlayImplProps) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.overlay,
        {
          backgroundColor,
          borderBottomColor: gridColor,
          height: topBarLayout.height,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.symbol,
          {
            color: topBarLayout.symbol.color || textColor,
            height: topBarLayout.height,
            left: topBarLayout.symbol.x,
            lineHeight: topBarLayout.height,
          },
        ]}
      >
        {topBarLayout.symbol.text}
      </Text>
      {topBarLayout.symbolChevron && (
        <View
          pointerEvents="none"
          style={[
            styles.symbolChevron,
            {
              height: topBarLayout.height,
              left: topBarLayout.symbolChevron.x,
            },
          ]}
        >
          <NativeDrawingIcon
            name="chevronDown"
            size={13}
            color={topBarLayout.symbolChevron.color || mutedTextColor}
            strokeWidth={2.1}
          />
        </View>
      )}
      {topBarLayout.symbolHitRect && (
        <Pressable
          accessibilityLabel="Change symbol"
          accessibilityRole="button"
          onLayout={onSymbolLayout}
          style={[
            styles.symbolButton,
            {
              height: topBarLayout.symbolHitRect.height,
              left: topBarLayout.symbolHitRect.x,
              top: topBarLayout.symbolHitRect.y,
              width: topBarLayout.symbolHitRect.width,
            },
          ]}
        />
      )}

      <ScrollView
        bounces={false}
        horizontal
        keyboardShouldPersistTaps="handled"
        pointerEvents="none"
        scrollEnabled={false}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        style={[
          styles.scrollArea,
          {
            height: topBarLayout.height,
            left: topBarLayout.scrollAreaX,
          },
        ]}
      >
        <View style={{ height: topBarLayout.height, width: topBarLayout.scrollContentWidth }}>
          {topBarLayout.dividers.map((divider, index) => (
            <View
              key={`native-top-bar-divider-${index}`}
              pointerEvents="none"
              style={[
                styles.divider,
                {
                  backgroundColor: gridColor,
                  height: divider.height,
                  left: divider.x,
                  top: divider.y,
                },
              ]}
            />
          ))}

          {topBarLayout.buttons.map((button) => {
            const icon = iconForButton(button);
            const command = button.interval ? { type: button.type, interval: button.interval } : { type: button.type };
            return (
              <Pressable
                key={`native-top-bar-button-${button.type}-${button.interval ?? button.text}-${button.x}`}
                accessibilityLabel={accessibilityLabelForButton(button)}
                accessibilityRole="button"
                disabled={!button.enabled}
                onLayout={(event) => onButtonLayout(nativeTopBarButtonKey(button), command, event)}
                style={[
                  styles.button,
                  {
                    backgroundColor: button.backgroundColor ?? 'transparent',
                    height: button.height,
                    left: button.x,
                    opacity: button.enabled ? 1 : 0.45,
                    top: button.y,
                    width: button.width,
                  },
                ]}
              >
                {icon && (
                  <NativeDrawingIcon
                    name={icon}
                    size={button.type === 'indicators' ? 18 : 19}
                    color={button.textColor}
                    strokeWidth={button.type === 'indicators' ? 1.7 : 1.9}
                  />
                )}
                {button.type !== 'undo' && button.type !== 'redo' && (
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.buttonText,
                      {
                        color: button.textColor,
                      },
                      button.type === 'indicators' ? styles.indicatorsText : null,
                      button.type === 'layout' ? styles.layoutText : null,
                    ]}
                  >
                    {button.text}
                  </Text>
                )}
                {button.type === 'layout' ? (
                  <NativeDrawingIcon name="chevronDown" size={13} color={button.textColor} strokeWidth={2} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function NativeTopBarOverlayRuntime(props: NativeTopBarOverlayProps) {
  const [actionLayouts, setActionLayouts] = React.useState<Record<string, NativeTopBarActionLayout>>({});
  const lastActionTargetsRef = React.useRef<readonly NativeTopBarActionHitTarget[]>([]);
  const onActionTargetsChangeRef = React.useRef(props.onActionTargetsChange);
  const actionOrigins = React.useMemo(() => resolveNativeTopBarActionOrigins(props.topBarLayout), [props.topBarLayout]);
  const nativeTopBarActionTargets = React.useMemo(
    () => resolveNativeTopBarActionTargets({ actionLayouts, actionOrigins }),
    [actionLayouts, actionOrigins],
  );

  React.useEffect(() => {
    onActionTargetsChangeRef.current = props.onActionTargetsChange;
  }, [props.onActionTargetsChange]);
  React.useEffect(() => {
    if (areNativeTopBarActionTargetsEqual(lastActionTargetsRef.current, nativeTopBarActionTargets)) return;
    lastActionTargetsRef.current = nativeTopBarActionTargets;
    onActionTargetsChangeRef.current?.(nativeTopBarActionTargets);
  }, [nativeTopBarActionTargets]);
  React.useEffect(() => {
    return () => {
      lastActionTargetsRef.current = [];
      onActionTargetsChangeRef.current?.([]);
    };
  }, []);

  const handleSymbolLayout = React.useCallback((event: LayoutChangeEvent) => {
    const nextLayout = event.nativeEvent.layout;
    setActionLayouts((previous) => {
      if (areNativeLayoutRectanglesEqual(previous.symbol?.layout, nextLayout)) return previous;
      return {
        ...previous,
        symbol: { command: { type: 'symbol' }, layout: nextLayout },
      };
    });
  }, []);
  const handleButtonLayout = React.useCallback(
    (key: string, command: NativeTopBarActionCommand, event: LayoutChangeEvent) => {
      const nextLayout = event.nativeEvent.layout;
      setActionLayouts((previous) => {
        if (
          previous[key]?.command.type === command.type &&
          previous[key]?.command.interval === command.interval &&
          areNativeLayoutRectanglesEqual(previous[key]?.layout, nextLayout)
        ) {
          return previous;
        }
        return {
          ...previous,
          [key]: { command, layout: nextLayout },
        };
      });
    },
    [],
  );

  return <NativeTopBarOverlayImpl {...props} onButtonLayout={handleButtonLayout} onSymbolLayout={handleSymbolLayout} />;
}

export const NativeTopBarOverlay = React.memo(NativeTopBarOverlayRuntime);
NativeTopBarOverlay.displayName = 'NativeTopBarOverlay';

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'absolute',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    position: 'absolute',
    width: StyleSheet.hairlineWidth,
  },
  indicatorsText: {
    marginLeft: 4,
  },
  layoutText: {
    marginRight: 3,
  },
  overlay: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  scrollArea: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  symbol: {
    fontSize: 14,
    fontWeight: '600',
    position: 'absolute',
  },
  symbolButton: {
    position: 'absolute',
  },
  symbolChevron: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    width: 16,
  },
});
