import type { LayoutChangeEvent } from 'react-native';
import type {
  AnalysisRequestIntent,
  AnalysisSelectionFrame,
  AnalysisSelectionState,
} from '../../analysis/analysisSelection';
import type { NativeGestureControlZone } from '../interaction/nativeGestureControlZones';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Canvas, Rect } from '@shopify/react-native-skia';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAnimatedReaction, useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';

import {
  AnalysisSelection,
  analysisSelectionTimeAtX,
  analysisSelectionXAtTime,
} from '../../analysis/analysisSelection';
import { NativeDrawingIcon } from './NativeDrawingIcon';

export interface NativeAnalysisSelectorHandle {
  start: () => boolean;
  cancel: () => void;
  setHandler: (handler: ((intent: AnalysisRequestIntent) => void) | undefined) => void;
}

export interface NativeAnalysisSelectorOverlayProps {
  frame: AnalysisSelectionFrame | null;
  canStart: () => boolean;
  onAnalysisRequest?: (intent: AnalysisRequestIntent) => void;
  onActiveChange: (active: boolean) => void;
  onControlZonesChange: (zones: readonly NativeGestureControlZone[]) => void;
  liveViewport: NativeViewportSharedValues;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

export const NativeAnalysisSelectorOverlay = forwardRef<
  NativeAnalysisSelectorHandle,
  NativeAnalysisSelectorOverlayProps
>(function NativeAnalysisSelectorOverlay(
  {
    frame,
    canStart,
    onAnalysisRequest,
    onActiveChange,
    onControlZonesChange,
    liveViewport,
    backgroundColor,
    textColor,
    borderColor,
  },
  ref,
) {
  const [state, setState] = useState<AnalysisSelectionState>({ active: false });
  const [enabled, setEnabled] = useState(Boolean(onAnalysisRequest));
  const [controlsHeight, setControlsHeight] = useState(30);
  const mounted = useRef(true);
  const handler = useRef(onAnalysisRequest);
  const callbackRef = useRef({ canStart, onActiveChange });
  callbackRef.current = { canStart, onActiveChange };
  const managerRef = useRef<AnalysisSelection | null>(null);
  if (!managerRef.current)
    managerRef.current = new AnalysisSelection((next) => {
      setState(next);
      callbackRef.current.onActiveChange(next.active);
    });
  const manager = managerRef.current;
  const generation = useSharedValue(0);
  const selectionGeneration = useRef(0);
  const startX = useSharedValue(0);
  const endX = useSharedValue(0);
  const hasPreview = useSharedValue(false);
  const gestureCompleted = useSharedValue(false);
  const gestureToken = useSharedValue(0);
  const gestureEpoch = useSharedValue(0);
  const latestGestureEpoch = useRef(0);
  const currentFrame = manager.getFrame();
  const plot = currentFrame?.plot ?? frame?.plot;

  const cancel = useCallback(
    (message?: string) => {
      generation.value++;
      selectionGeneration.current = generation.value;
      hasPreview.value = false;
      manager.cancel(message);
    },
    [generation, hasPreview, manager],
  );
  const start = useCallback(() => {
    if (!mounted.current || !handler.current) return false;
    if (!callbackRef.current.canStart()) {
      cancel('Finish the current chart gesture before selecting a pattern.');
      return false;
    }
    generation.value++;
    selectionGeneration.current = generation.value;
    hasPreview.value = false;
    return manager.start();
  }, [cancel, generation, hasPreview, manager]);
  useImperativeHandle(
    ref,
    () => ({
      start,
      cancel: () => cancel(),
      setHandler: (next) => {
        handler.current = next;
        setEnabled(Boolean(next));
        if (!next) cancel();
      },
    }),
    [cancel, start],
  );
  useLayoutEffect(() => {
    handler.current = onAnalysisRequest;
    setEnabled(Boolean(onAnalysisRequest));
    if (!onAnalysisRequest) cancel();
  }, [cancel, onAnalysisRequest]);
  useLayoutEffect(() => {
    manager.updateFrame(frame);
    if (!manager.getState().active) hasPreview.value = false;
  }, [frame, hasPreview, manager]);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active' && manager.getState().active) cancel('Selection cancelled because the chart lost focus.');
    });
    return () => {
      mounted.current = false;
      subscription.remove();
      onControlZonesChange([]);
      callbackRef.current.onActiveChange(false);
    };
  }, [cancel, manager, onControlZonesChange]);
  useEffect(() => {
    if (!enabled) onControlZonesChange([]);
  }, [enabled, onControlZonesChange]);

  const cancelChangedViewport = useCallback(
    (token: number) => {
      if (mounted.current && selectionGeneration.current === token && manager.getState().active)
        cancel('Selection cancelled because the chart changed. Select the pattern again.');
    },
    [cancel, manager],
  );
  useAnimatedReaction(
    () => {
      if (!state.active || !currentFrame) return false;
      return (
        liveViewport.startTime.value !== currentFrame.timeRange.from ||
        liveViewport.endTime.value !== currentFrame.timeRange.to ||
        (currentFrame.priceRange &&
          (liveViewport.priceMin.value !== currentFrame.priceRange.from ||
            liveViewport.priceMax.value !== currentFrame.priceRange.to))
      );
    },
    (changed) => {
      if (changed) runOnJS(cancelChangedViewport)(generation.value);
    },
    [currentFrame, state.active],
  );

  const begin = useCallback(
    (x: number, y: number, token: number, epoch: number) => {
      if (
        !mounted.current ||
        selectionGeneration.current !== token ||
        epoch < latestGestureEpoch.current ||
        !manager.getState().active
      )
        return;
      latestGestureEpoch.current = epoch;
      const frozen = manager.getFrame();
      if (frozen) manager.begin(frozen.plot.left + x, frozen.plot.top + y);
    },
    [manager],
  );
  const complete = useCallback(
    (from: number, to: number, token: number, epoch: number) => {
      if (
        !mounted.current ||
        selectionGeneration.current !== token ||
        latestGestureEpoch.current !== epoch ||
        !manager.getState().active
      )
        return;
      manager.selectRange({ from: Math.min(from, to), to: Math.max(from, to) });
    },
    [manager],
  );
  const interrupted = useCallback(
    (token: number, epoch: number) => {
      if (
        mounted.current &&
        selectionGeneration.current === token &&
        latestGestureEpoch.current === epoch &&
        manager.getState().active
      )
        cancel('Pattern selection was interrupted. Select the pattern again.');
    },
    [cancel, manager],
  );
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(state.active && Boolean(currentFrame))
        .minDistance(0)
        .maxPointers(1)
        .onBegin((event) => {
          'worklet';
          gestureToken.value = generation.value;
          gestureEpoch.value++;
          startX.value = event.x;
          endX.value = event.x;
          hasPreview.value = true;
          gestureCompleted.value = false;
          runOnJS(begin)(event.x, event.y, gestureToken.value, gestureEpoch.value);
        })
        .onUpdate((event) => {
          'worklet';
          if (!currentFrame) return;
          endX.value = Math.max(0, Math.min(currentFrame.plot.width, event.x));
        })
        .onEnd((event, success) => {
          'worklet';
          if (!currentFrame || !success) return;
          gestureCompleted.value = true;
          const from = analysisSelectionTimeAtX(currentFrame, currentFrame.plot.left + startX.value);
          const to = analysisSelectionTimeAtX(currentFrame, currentFrame.plot.left + event.x);
          runOnJS(complete)(from, to, gestureToken.value, gestureEpoch.value);
        })
        .onFinalize(() => {
          'worklet';
          if (!gestureCompleted.value) runOnJS(interrupted)(gestureToken.value, gestureEpoch.value);
        }),
    [
      complete,
      begin,
      currentFrame,
      endX,
      generation,
      gestureCompleted,
      gestureToken,
      gestureEpoch,
      hasPreview,
      interrupted,
      startX,
      state.active,
    ],
  );
  const passiveLeft =
    currentFrame && state.range
      ? Math.max(
          0,
          Math.min(
            currentFrame.plot.width,
            analysisSelectionXAtTime(currentFrame, state.range.from) - currentFrame.plot.left,
          ),
        )
      : 0;
  const passiveRight =
    currentFrame && state.range
      ? Math.max(
          0,
          Math.min(
            currentFrame.plot.width,
            analysisSelectionXAtTime(currentFrame, state.range.to) - currentFrame.plot.left,
          ),
        )
      : 0;
  const previewX = useDerivedValue(() => (state.active ? Math.min(startX.value, endX.value) : passiveLeft));
  const previewWidth = useDerivedValue(() =>
    state.active ? (hasPreview.value ? Math.abs(endX.value - startX.value) : 0) : passiveRight - passiveLeft,
  );
  const controlsTop = plot ? Math.max(plot.top + 6, plot.top + plot.height - controlsHeight - 6) : 6;
  const controlsLeft = (plot?.left ?? 0) + 6;
  const measureControls = (event: LayoutChangeEvent) => {
    const rect = event.nativeEvent.layout;
    setControlsHeight(rect.height);
    onControlZonesChange(
      enabled
        ? [{ x1: controlsLeft, y1: controlsTop, x2: controlsLeft + rect.width, y2: controlsTop + rect.height }]
        : [],
    );
  };
  const request = (action: AnalysisRequestIntent['action'], selected = false) => {
    if (!mounted.current || !handler.current) return;
    manager.updateFrame(frame);
    const selectedRange = manager.getState().range;
    if (selected && (!manager.getState().active || !selectedRange)) return;
    if (selected) manager.finish();
    else manager.cancel();
    handler.current?.({ action, ...(selectedRange && selected ? { range: { ...selectedRange } } : {}) });
  };
  const control = (label: string, action: () => void, disabled = false, icon = false) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={action}
      style={[styles.button, { backgroundColor, borderColor, opacity: disabled ? 0.5 : 1 }]}
    >
      {icon && <NativeDrawingIcon name="analysisWand" color={textColor} size={14} />}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
  if (!enabled) return null;
  return (
    <View pointerEvents="box-none" style={styles.root}>
      {(state.active || state.range) && plot && (
        <GestureDetector gesture={gesture}>
          <View
            accessibilityLabel="Select chart pattern"
            pointerEvents={state.active ? 'auto' : 'none'}
            style={[styles.surface, { left: plot.left, top: plot.top, width: plot.width, height: plot.height }]}
          >
            <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
              <Rect x={previewX} y={0} width={previewWidth} height={plot.height} color="rgba(52,180,172,0.18)" />
              <Rect
                x={previewX}
                y={0}
                width={previewWidth}
                height={plot.height}
                color="#34b4ac"
                style="stroke"
                strokeWidth={1}
              />
            </Canvas>
          </View>
        </GestureDetector>
      )}
      <ScrollView
        onLayout={measureControls}
        style={[
          styles.controls,
          {
            top: controlsTop,
            left: controlsLeft,
            width: Math.max(0, (plot?.width ?? 320) - 12),
            maxHeight: Math.max(0, (plot?.height ?? 120) - 12),
          },
        ]}
        contentContainerStyle={styles.controlsContent}
        keyboardShouldPersistTaps="handled"
      >
        {state.active ? (
          <>
            {control('Describe this TA pattern', () => request('describe', true), !state.range)}
            {control('Find similar TA', () => request('similar', true), !state.range)}
            {control('Cancel', () => cancel())}
          </>
        ) : (
          <>
            {control('Analyze chart', () => request('describe'))}
            {control('Select pattern', start, false, true)}
          </>
        )}
      </ScrollView>
      {(state.message || (state.active && !state.range)) && (
        <Text
          accessibilityRole="alert"
          pointerEvents="none"
          style={[
            styles.message,
            {
              color: textColor,
              backgroundColor,
              left: controlsLeft,
              top: Math.max(plot?.top ?? 6, controlsTop - 42),
              maxWidth: Math.max(0, (plot?.width ?? 320) - 12),
            },
          ]}
        >
          {state.message ?? 'Drag across a pattern on the main chart.'}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 72 },
  surface: { position: 'absolute' },
  controls: { position: 'absolute' },
  controlsContent: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 7,
    paddingVertical: 5,
    maxWidth: '100%',
    flexShrink: 1,
  },
  label: { fontSize: 11, flexShrink: 1 },
  message: { position: 'absolute', padding: 6, borderRadius: 4, fontSize: 11 },
});
