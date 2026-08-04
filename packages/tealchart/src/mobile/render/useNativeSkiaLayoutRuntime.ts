import type { LayoutChangeEvent } from 'react-native';
import type { ChartThemeInput } from '../../theme';
import type { ChartMargins, RenderOptions, UnifiedPaneLayout } from '../../types';
import type { NativeChartFrame } from './nativeChartFrame';

import { useCallback, useMemo, useState } from 'react';

import {
  computePaneGeometry,
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
  paneLayout?: UnifiedPaneLayout;
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

export interface NativeSkiaDimensions {
  height: number;
  width: number;
}

export function resolveNativeSkiaDimensions({
  measuredDimensions,
  propHeight,
  propWidth,
}: Pick<NativeSkiaLayoutRuntimeInput, 'propHeight' | 'propWidth'> & {
  measuredDimensions: NativeSkiaDimensions;
}): NativeSkiaDimensions {
  if (typeof propWidth === 'number' && typeof propHeight === 'number') {
    return { width: propWidth, height: propHeight };
  }

  return measuredDimensions;
}

export function createNativeSkiaChartMargins({
  marginsProp,
  priceAxisWidth,
  pricePrecision,
  showTopBar,
  topBarHeight,
}: Pick<
  NativeSkiaLayoutRuntimeInput,
  'marginsProp' | 'priceAxisWidth' | 'pricePrecision' | 'showTopBar' | 'topBarHeight'
>): ChartMargins {
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
  paneLayout,
  priceAxisWidth,
  pricePrecision,
  propHeight,
  propWidth,
  renderOptions,
  showTopBar,
  theme,
  topBarHeight,
}: NativeSkiaLayoutRuntimeInput): NativeSkiaLayoutRuntime {
  const [measuredDimensions, setMeasuredDimensions] = useState({ width: propWidth ?? 0, height: propHeight ?? 0 });
  const hasExplicitDimensions = typeof propWidth === 'number' && typeof propHeight === 'number';
  const dimensions = useMemo(
    () => resolveNativeSkiaDimensions({ measuredDimensions, propHeight, propWidth }),
    [measuredDimensions, propHeight, propWidth],
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (hasExplicitDimensions) return;
      const { width, height } = event.nativeEvent.layout;
      setMeasuredDimensions((current) =>
        current.width === width && current.height === height ? current : { width, height },
      );
    },
    [hasExplicitDimensions],
  );

  const themedRenderOptions = useMemo(
    () => mergeChartThemeRenderOptions(imperativeTheme ?? theme, renderOptions),
    [imperativeTheme, renderOptions, theme],
  );
  const margins = useMemo<ChartMargins>(
    () =>
      createNativeSkiaChartMargins({
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
  const paneLayoutPanes = paneLayout?.panes;
  const paneLayoutSignature =
    (paneLayoutPanes ?? [])
      .map((pane) =>
        [
          pane.id,
          pane.type,
          pane.heightRatio,
          pane.yMin,
          pane.yMax,
          pane.fixedRange ? 'fixed' : 'auto',
          pane.indicatorIds?.join(',') ?? '',
        ].join(':'),
      )
      .join('|') || 'main';

  const frame = useMemo<NativeChartFrame | null>(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0) return null;
    const resolvedPaneLayout: UnifiedPaneLayout = {
      panes: paneLayoutPanes?.length
        ? paneLayoutPanes
        : [
            {
              id: 'main',
              type: 'main',
              heightRatio: 1,
              yMin: 0,
              yMax: 1,
              fixedRange: false,
            },
          ],
      timeAxisHeight: margins.bottom,
    };
    const panes = computePaneGeometry({
      paneLayout: resolvedPaneLayout,
      height: dimensions.height,
      topOffset: margins.top,
    });

    return createNativeChartFrameFromPanes({
      dimensions: {
        width: dimensions.width,
        height: dimensions.height,
        margins,
      },
      panes,
    });
  }, [dimensions.height, dimensions.width, margins, paneLayoutPanes, paneLayoutSignature]);

  return {
    frame,
    margins,
    onLayout,
    options,
  };
}
