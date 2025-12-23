// ⚠️ AUTO-GENERATED FILE - DO NOT EDIT MANUALLY ⚠️
// This file was copied from tealstreet-next by copy-and-patch.js
// To re-sync from the web repository, run: yarn sync
// 
// To make this file mobile-specific (prevent it from being overwritten on sync):
// 1. Modify the file as needed for mobile
// 2. Add to patch-config.json "permanentFiles" array:
//    - For single file: "web/path/to/this/file.ts"
//    - For directory: "web/path/to/directory/**/*"
// 3. Add exception to .gitignore: !src/web/path/to/this/file.ts
// 4. Force-add to git: git add -f src/web/path/to/this/file.ts
// 5. Commit your changes
// 6. IMPORTANT: Replace this header with the MOBILE-PATCHED header (see existing patched files for example)
//
// The patch-config.json controls:
// - permanentFiles: Files that are never overwritten during sync
// - excludeFromCopy: Files excluded from initial copy
// - importReplacements: Auto-replace imports with mobile shims
//
// See README.md section "Git Configuration for Patched Files" for full details

/**
 * SkiaTealchart - React Native Skia implementation of Tealchart
 *
 * Uses the same TealchartRenderer as web, but with SkiaCanvasContext
 * instead of WebCanvasContext. All grid, axis, and candle rendering
 * logic is shared - only the canvas context implementation differs.
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, LayoutChangeEvent, Text } from 'react-native';
import { Canvas, Picture, Skia, createPicture } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';

import { TealchartRenderer } from './TealchartRenderer';
import { SkiaCanvasContext, CollectedTextItem } from './rendering/SkiaCanvasContext';
import type {
  Bar,
  Viewport,
  RenderOptions,
  ChartMargins,
  PriceLine,
  OrderLineRenderData,
  PositionLineRenderData,
  PaneLayout,
  UnifiedPaneLayout,
  ContextMenuItem,
} from './types';
import { DEFAULT_MARGINS } from './types';
import type { PlotOutput, PlotStyleOverride } from './state/chartState';

// Indicator pane info type (matches web)
interface IndicatorPaneInfo {
  name: string;
  inputs?: Record<string, unknown>;
}

export interface SkiaTealchartProps {
  width?: number;
  height?: number;
  bars: Bar[];
  /** Render options for colors and styling */
  renderOptions?: Partial<Omit<RenderOptions, 'width' | 'height' | 'devicePixelRatio'>>;
  /** Custom margins to override defaults */
  margins?: Partial<ChartMargins>;
  /** Price lines to render (last trade, orders, positions, etc.) */
  priceLines?: PriceLine[];
  /** Order lines to render (limit orders, stops, etc.) */
  orderLines?: OrderLineRenderData[];
  /** Position lines to render (open positions with PnL) */
  positionLines?: PositionLineRenderData[];
  /** Tealscript indicator plot outputs */
  plots?: PlotOutput[];
  /** Pane layout for multi-pane indicator rendering */
  paneLayout?: PaneLayout;
  /** Unified pane layout - preferred over paneLayout */
  unifiedPaneLayout?: UnifiedPaneLayout;
  /** Map from study ID to indicator pane info */
  indicatorPaneInfo?: Record<string, IndicatorPaneInfo>;
  /** Map from plotId to style overrides */
  plotStyleOverrides?: Map<string, PlotStyleOverride>;
  /** Called when viewport changes */
  onViewportChange?: (viewport: Viewport) => void;
  /** Called when more bars are needed */
  onRequestMoreBars?: (direction: 'left' | 'right') => void;
  /** Context menu callback */
  onContextMenu?: (unixTime: number, price: number) => ContextMenuItem[];
  /** Called when crosshair position changes */
  onCrossHairMoved?: (price: number, time: number) => void;
  /** Called when gesture blocks/unblocks parent scroll */
  onSwipeBlockChange?: (blocked: boolean) => void;
}

export const SkiaTealchart: React.FC<SkiaTealchartProps> = ({
  width: propWidth,
  height: propHeight,
  bars,
  renderOptions,
  margins: marginsProp,
  priceLines,
  orderLines,
  positionLines,
  plots,
  paneLayout,
  unifiedPaneLayout,
  indicatorPaneInfo,
  plotStyleOverrides,
  onViewportChange,
  onRequestMoreBars,
  onContextMenu,
  onCrossHairMoved,
  onSwipeBlockChange,
}) => {
  // Dimensions state (use prop or measure from container)
  const [dimensions, setDimensions] = useState({ width: propWidth || 0, height: propHeight || 0 });

  // Update dimensions when props change
  useEffect(() => {
    if (propWidth && propHeight) {
      setDimensions({ width: propWidth, height: propHeight });
    }
  }, [propWidth, propHeight]);

  // Handle container layout
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    if (!propWidth || !propHeight) {
      const { width, height } = event.nativeEvent.layout;
      setDimensions({ width, height });
    }
  }, [propWidth, propHeight]);

  // Merge margins with defaults
  const margins: ChartMargins = useMemo(() => ({
    ...DEFAULT_MARGINS,
    ...marginsProp,
  }), [marginsProp]);

  // Viewport state
  const [viewport, setViewport] = useState<Viewport | null>(() =>
    bars.length > 0 ? TealchartRenderer.calculateViewport(bars) : null
  );
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  // Keep bars ref for gesture callbacks
  const barsRef = useRef(bars);
  barsRef.current = bars;

  // Recalculate viewport when bars change significantly
  useEffect(() => {
    if (bars.length > 0 && (!viewport || bars.length !== barsRef.current.length)) {
      const newViewport = TealchartRenderer.calculateViewport(bars);
      setViewport(newViewport);
      viewportRef.current = newViewport;
      onViewportChange?.(newViewport);
    }
  }, [bars, viewport, onViewportChange]);

  // Full render options
  const fullRenderOptions: RenderOptions = useMemo(() => ({
    width: dimensions.width,
    height: dimensions.height,
    devicePixelRatio: 1, // Skia handles its own scaling
    backgroundColor: renderOptions?.backgroundColor || '#131722',
    upColor: renderOptions?.upColor || '#26a69a',
    downColor: renderOptions?.downColor || '#ef5350',
    textColor: renderOptions?.textColor || '#d1d4dc',
    gridColor: renderOptions?.gridColor || 'rgba(255, 255, 255, 0.06)',
    showVolume: renderOptions?.showVolume ?? true,
    volumeHeight: renderOptions?.volumeHeight ?? 0.15,
    minCandleWidth: renderOptions?.minCandleWidth ?? 1,
    ...renderOptions,
  }), [dimensions.width, dimensions.height, renderOptions]);

  // Gesture shared values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  // Pan gesture handler
  const updateViewportFromPan = useCallback((deltaX: number, _deltaY: number) => {
    const currentViewport = viewportRef.current;
    const currentBars = barsRef.current;
    if (!currentViewport || currentBars.length === 0 || !dimensions.width) return;

    const chartWidth = dimensions.width - margins.left - margins.right;
    const visibleBars = currentViewport.endIndex - currentViewport.startIndex;
    const pixelsPerBar = chartWidth / visibleBars;
    const barsDelta = Math.round(-deltaX / pixelsPerBar);

    // Allow scrolling past data (future space)
    const minStart = -Math.floor(visibleBars * 0.8);
    const maxStart = currentBars.length - Math.floor(visibleBars * 0.2);

    const newStartIndex = Math.max(minStart, Math.min(maxStart, currentViewport.startIndex + barsDelta));
    const newEndIndex = newStartIndex + visibleBars;

    if (newStartIndex !== currentViewport.startIndex) {
      // Calculate price range from visible bars
      const actualStart = Math.max(0, newStartIndex);
      const actualEnd = Math.min(currentBars.length, newEndIndex);

      if (actualStart < actualEnd) {
        const visibleBarsData = currentBars.slice(actualStart, actualEnd);
        const prices = visibleBarsData.flatMap(b => [b.high, b.low]);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const padding = (maxPrice - minPrice) * 0.1;

        const newViewport: Viewport = {
          startIndex: newStartIndex,
          endIndex: newEndIndex,
          startTime: currentBars[actualStart]?.time || currentViewport.startTime,
          endTime: currentBars[Math.min(actualEnd - 1, currentBars.length - 1)]?.time || currentViewport.endTime,
          priceMin: minPrice - padding,
          priceMax: maxPrice + padding,
        };

        setViewport(newViewport);
        viewportRef.current = newViewport;
        onViewportChange?.(newViewport);
      }
    }
  }, [dimensions.width, margins, onViewportChange]);

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      if (onSwipeBlockChange) {
        runOnJS(onSwipeBlockChange)(true);
      }
    })
    .onUpdate((event) => {
      const deltaX = event.translationX - savedTranslateX.value;
      savedTranslateX.value = event.translationX;
      runOnJS(updateViewportFromPan)(deltaX, 0);
    })
    .onEnd(() => {
      if (onSwipeBlockChange) {
        runOnJS(onSwipeBlockChange)(false);
      }
    });

  // Pinch gesture for zoom
  const updateViewportFromPinch = useCallback((newScale: number) => {
    const currentViewport = viewportRef.current;
    const currentBars = barsRef.current;
    if (!currentViewport || currentBars.length === 0) return;

    const visibleBars = currentViewport.endIndex - currentViewport.startIndex;
    const newVisibleBars = Math.max(10, Math.min(currentBars.length, Math.round(visibleBars / newScale)));

    if (newVisibleBars !== visibleBars) {
      const centerIndex = Math.floor((currentViewport.startIndex + currentViewport.endIndex) / 2);
      const newStartIndex = Math.max(0, centerIndex - Math.floor(newVisibleBars / 2));
      const newEndIndex = Math.min(currentBars.length, newStartIndex + newVisibleBars);

      const visibleBarsData = currentBars.slice(newStartIndex, newEndIndex);
      if (visibleBarsData.length > 0) {
        const prices = visibleBarsData.flatMap(b => [b.high, b.low]);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const padding = (maxPrice - minPrice) * 0.1;

        const newViewport: Viewport = {
          startIndex: newStartIndex,
          endIndex: newEndIndex,
          startTime: visibleBarsData[0].time,
          endTime: visibleBarsData[visibleBarsData.length - 1].time,
          priceMin: minPrice - padding,
          priceMax: maxPrice + padding,
        };

        setViewport(newViewport);
        viewportRef.current = newViewport;
        onViewportChange?.(newViewport);
      }
    }
  }, [onViewportChange]);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      const newScale = savedScale.value * event.scale;
      runOnJS(updateViewportFromPinch)(newScale);
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Create Skia Picture for rendering and collect text items
  const { picture, textItems } = useMemo(() => {
    if (!viewport || bars.length === 0 || dimensions.width === 0 || dimensions.height === 0) {
      return { picture: null, textItems: [] as CollectedTextItem[] };
    }

    let collectedText: CollectedTextItem[] = [];

    const pic = createPicture((canvas) => {
      // Create SkiaCanvasContext - text will be collected, not drawn
      const ctx = new SkiaCanvasContext(canvas, Skia);

      // Create renderer with context and options
      const renderer = new TealchartRenderer(ctx, fullRenderOptions);

      // Render the chart using the shared renderer
      if (unifiedPaneLayout) {
        renderer.renderWithLayout(
          bars,
          viewport,
          unifiedPaneLayout,
          priceLines,
          plots,
          indicatorPaneInfo,
          undefined, // crosshair
          plotStyleOverrides
        );
      } else {
        renderer.render(bars, viewport, priceLines, paneLayout);
      }

      // Collect text items for React Native rendering
      collectedText = ctx.getCollectedText();
    }, { width: dimensions.width, height: dimensions.height });

    return { picture: pic, textItems: collectedText };
  }, [bars, viewport, dimensions, fullRenderOptions, priceLines, plots, paneLayout, unifiedPaneLayout, indicatorPaneInfo, plotStyleOverrides]);

  // Don't render until we have dimensions
  if (dimensions.width === 0 || dimensions.height === 0) {
    return <View style={styles.container} onLayout={onLayout} />;
  }

  // Helper to convert textAlign/textBaseline to RN styles
  const getTextStyle = (item: CollectedTextItem) => {
    let left = item.x;
    let top = item.y;

    // Adjust for text alignment
    // Note: RN Text doesn't have textAlign per-item, we adjust position instead
    // The width estimation is rough - in production you'd measure or use a monospace font
    const estimatedWidth = item.text.length * item.fontSize * 0.6;

    if (item.textAlign === 'center') {
      left = item.x - estimatedWidth / 2;
    } else if (item.textAlign === 'right' || item.textAlign === 'end') {
      left = item.x - estimatedWidth;
    }

    // Adjust for baseline
    if (item.textBaseline === 'top') {
      // top is default in RN
    } else if (item.textBaseline === 'middle') {
      top = item.y - item.fontSize / 2;
    } else if (item.textBaseline === 'bottom') {
      top = item.y - item.fontSize;
    } else {
      // 'alphabetic' - roughly 80% of font size above baseline
      top = item.y - item.fontSize * 0.8;
    }

    return {
      position: 'absolute' as const,
      left,
      top,
      fontSize: item.fontSize,
      color: item.color,
    };
  };

  return (
    <View style={styles.container} onLayout={onLayout}>
      <GestureDetector gesture={composedGesture}>
        <View style={{ width: dimensions.width, height: dimensions.height, position: 'relative' }}>
          {/* Skia Canvas for chart graphics */}
          <Canvas style={{ position: 'absolute', width: dimensions.width, height: dimensions.height }}>
            {picture && <Picture picture={picture} />}
          </Canvas>

          {/* React Native Text overlay for labels */}
          {textItems.map((item, index) => (
            <Text
              key={`${item.text}-${item.x}-${item.y}-${index}`}
              style={getTextStyle(item)}
              numberOfLines={1}
            >
              {item.text}
            </Text>
          ))}
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SkiaTealchart;
