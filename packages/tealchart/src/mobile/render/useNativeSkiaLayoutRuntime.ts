import type { LayoutChangeEvent } from 'react-native';
import type { ChartThemeInput } from '../../theme';
import type { ChartMargins, RenderOptions } from '../../types';
import type { NativeChartFrame } from './nativeChartFrame';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  computeTradingLineLabelMinX,
  MOBILE_CHART_CHROME_METRICS,
  resolveLeftToolRailMetrics,
} from '../../layout/chartGeometry';
import { mergeChartThemeRenderOptions } from '../../theme';
import { DEFAULT_MARGINS, DEFAULT_RENDER_OPTIONS } from '../../types';
import { createNativePriceAxisLaneWidth } from '../utils/nativePriceAxisLane';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';

function resolveNativeLeftToolRailReservedMetrics(collapsed: boolean) {
  const metrics = resolveLeftToolRailMetrics(MOBILE_CHART_CHROME_METRICS, false);
  if (!collapsed) return metrics;

  return {
    ...metrics,
    leftToolRailInset: 0,
    leftToolRailWidth: 0,
  };
}

export interface NativeSkiaLayoutRuntimeInput {
  imperativeTheme: ChartThemeInput | null;
  leftToolRailCollapsed?: boolean;
  marginsProp?: Partial<ChartMargins>;
  priceAxisWidth?: number;
  pricePrecision: number;
  propHeight?: number;
  propWidth?: number;
  renderOptions?: Partial<RenderOptions>;
  showTopBar: boolean;
  theme: ChartThemeInput;
  topBarHeight: number;
}

export interface NativeSkiaLayoutRuntime {
  frame: NativeChartFrame | null;
  margins: ChartMargins;
  onLayout: (event: LayoutChangeEvent) => void;
  options: RenderOptions;
}

export function createNativeSkiaChartMargins({
  marginsProp,
  priceAxisWidth,
  pricePrecision,
  showTopBar,
  topBarHeight,
}: Pick<NativeSkiaLayoutRuntimeInput, 'marginsProp' | 'priceAxisWidth' | 'pricePrecision' | 'showTopBar' | 'topBarHeight'>): ChartMargins {
  const explicitTopMargin = marginsProp?.top;
  const resolvedPriceAxisWidth = priceAxisWidth ?? createNativePriceAxisLaneWidth({ pricePrecision });

  return {
    ...DEFAULT_MARGINS,
    ...marginsProp,
    top: showTopBar ? (explicitTopMargin ?? 0) + topBarHeight : (explicitTopMargin ?? DEFAULT_MARGINS.top),
    left: marginsProp?.left ?? DEFAULT_MARGINS.left,
    right: Math.max(marginsProp?.right ?? DEFAULT_MARGINS.right, resolvedPriceAxisWidth),
  };
}

export function useNativeSkiaLayoutRuntime({
  imperativeTheme,
  leftToolRailCollapsed,
  marginsProp,
  priceAxisWidth,
  pricePrecision,
  propHeight,
  propWidth,
  renderOptions,
  showTopBar,
  theme,
  topBarHeight,
}: NativeSkiaLayoutRuntimeInput): NativeSkiaLayoutRuntime {
  const [dimensions, setDimensions] = useState({ width: propWidth ?? 0, height: propHeight ?? 0 });

  useEffect(() => {
    if (propWidth && propHeight) setDimensions({ width: propWidth, height: propHeight });
  }, [propHeight, propWidth]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (propWidth && propHeight) return;
      const { width, height } = event.nativeEvent.layout;
      setDimensions({ width, height });
    },
    [propHeight, propWidth],
  );

  const themedRenderOptions = useMemo(
    () => mergeChartThemeRenderOptions(imperativeTheme ?? theme, renderOptions),
    [imperativeTheme, renderOptions, theme],
  );
  const margins = useMemo<ChartMargins>(
    () => createNativeSkiaChartMargins({
      marginsProp,
      priceAxisWidth,
      pricePrecision,
      showTopBar,
      topBarHeight,
    }),
    [marginsProp, priceAxisWidth, pricePrecision, showTopBar, topBarHeight],
  );
  const options = useMemo<RenderOptions>(
    () => ({
      ...DEFAULT_RENDER_OPTIONS,
      ...themedRenderOptions,
      width: dimensions.width,
      height: dimensions.height,
      devicePixelRatio: 1,
      margins,
      chartLabelMinX: computeTradingLineLabelMinX(
        resolveNativeLeftToolRailReservedMetrics(leftToolRailCollapsed === true),
        margins,
      ),
      pricePrecision,
    }),
    [dimensions.height, dimensions.width, leftToolRailCollapsed, margins, pricePrecision, themedRenderOptions],
  );

  const frame = useMemo<NativeChartFrame | null>(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0) return null;
    const plotTop = margins.top;
    const plotBottom = Math.max(plotTop + 1, dimensions.height - margins.bottom);
    return createNativeChartFrameFromPanes({
      dimensions: {
        width: dimensions.width,
        height: dimensions.height,
        margins,
      },
      panes: [
        {
          id: 'main',
          type: 'main',
          top: plotTop,
          height: plotBottom - plotTop,
          yMin: 0,
          yMax: 1,
        },
      ],
    });
  }, [dimensions.height, dimensions.width, margins]);

  return {
    frame,
    margins,
    onLayout,
    options,
  };
}
