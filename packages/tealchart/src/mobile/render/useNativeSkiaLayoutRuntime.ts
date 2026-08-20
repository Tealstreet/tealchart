import type { LayoutChangeEvent } from 'react-native';
import type { ChartThemeInput } from '../../theme';
import type { ChartMargins, RenderOptions, UnifiedPaneLayout } from '../../types';
import type { NativeChartFrame } from './nativeChartFrame';

import { useCallback, useMemo, useRef, useState } from 'react';

import {
  computePaneGeometry,
  computeTradingLineLabelMinX,
  MOBILE_CHART_CHROME_METRICS,
  resolveLeftToolRailMetrics,
} from '../../layout/chartGeometry';
import { mergeChartThemeRenderOptions } from '../../theme';
import { DEFAULT_MARGINS, DEFAULT_RENDER_OPTIONS } from '../../types';
import { createNativePaneLayoutSignature } from '../utils/nativePaneLayoutOverrides';
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
  // The same signature the consumer keys its layout memo on, so the two cannot
  // disagree about what counts as a changed layout.
  const paneLayoutSignature = createNativePaneLayoutSignature(paneLayout) || 'main';

  // Held so the frame keys off the signature alone. Consumers rebuild a pane
  // layout object per render once a divider drag has left height overrides
  // behind, and taking that identity as a dep rebuilt the frame - and with it
  // every gesture - on every render, so the gesture detector never settled.
  const paneLayoutPanesRef = useRef(paneLayoutPanes);
  const paneLayoutSignatureRef = useRef(paneLayoutSignature);
  if (paneLayoutSignatureRef.current !== paneLayoutSignature) {
    paneLayoutSignatureRef.current = paneLayoutSignature;
    paneLayoutPanesRef.current = paneLayoutPanes;
  }

  const frame = useMemo<NativeChartFrame | null>(() => {
    const stablePaneLayoutPanes = paneLayoutPanesRef.current;
    if (dimensions.width <= 0 || dimensions.height <= 0) return null;
    const resolvedPaneLayout: UnifiedPaneLayout = {
      panes: stablePaneLayoutPanes?.length
        ? stablePaneLayoutPanes
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
  }, [dimensions.height, dimensions.width, margins, paneLayoutSignature]);

  return {
    frame,
    margins,
    onLayout,
    options,
  };
}
