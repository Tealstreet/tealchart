import type { ChartMargins, ComputedPane, UnifiedPaneLayout } from '../types';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type ChartChromeRegion = 'topBar' | 'leftTools' | 'rightPriceAxis' | 'bottomTimeAxis';

export type ChartLayoutMode = 'overlay' | 'reserve' | 'hybrid';

export interface ChartChromeLayoutModes {
  topBar: ChartLayoutMode;
  leftTools: ChartLayoutMode;
  rightPriceAxis: ChartLayoutMode;
  bottomTimeAxis: ChartLayoutMode;
}

export interface ChartGeometryInput {
  width: number;
  height: number;
  margins: ChartMargins;
  paneLayout: UnifiedPaneLayout;
  topBarHeight?: number;
  leftToolRailWidth?: number;
  safeAreaInsets?: Partial<Insets>;
  chrome?: Partial<ChartChromeLayoutModes>;
}

export interface ChartGeometrySnapshot {
  root: Rect;
  canvas: Rect;
  drawable: Rect;
  chrome: Partial<Record<ChartChromeRegion, Rect>>;
  panes: ComputedPane[];
  avoidRects: Rect[];
}

export const DEFAULT_CHART_CHROME_LAYOUT: ChartChromeLayoutModes = {
  topBar: 'overlay',
  leftTools: 'overlay',
  rightPriceAxis: 'hybrid',
  bottomTimeAxis: 'hybrid',
};

export const EMPTY_INSETS: Insets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

export function normalizeInsets(insets: Partial<Insets> | undefined): Insets {
  return {
    top: insets?.top ?? 0,
    right: insets?.right ?? 0,
    bottom: insets?.bottom ?? 0,
    left: insets?.left ?? 0,
  };
}

export function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width: Math.max(0, width), height: Math.max(0, height) };
}

export function insetRect(input: Rect, insets: Partial<Insets>): Rect {
  const normalized = normalizeInsets(insets);
  return rect(
    input.x + normalized.left,
    input.y + normalized.top,
    input.width - normalized.left - normalized.right,
    input.height - normalized.top - normalized.bottom,
  );
}

export function rectRight(input: Rect): number {
  return input.x + input.width;
}

export function rectBottom(input: Rect): number {
  return input.y + input.height;
}

export function intersectsRect(a: Rect, b: Rect): boolean {
  return a.x < rectRight(b) && rectRight(a) > b.x && a.y < rectBottom(b) && rectBottom(a) > b.y;
}

export function clampRectToBounds(input: Rect, bounds: Rect): Rect {
  const width = Math.min(input.width, bounds.width);
  const height = Math.min(input.height, bounds.height);
  return rect(
    Math.min(Math.max(input.x, bounds.x), rectRight(bounds) - width),
    Math.min(Math.max(input.y, bounds.y), rectBottom(bounds) - height),
    width,
    height,
  );
}

export function computePaneGeometry(options: {
  paneLayout: UnifiedPaneLayout;
  height: number;
  topOffset?: number;
}): ComputedPane[] {
  const topOffset = options.topOffset ?? 0;
  const availableHeight = Math.max(0, options.height - options.paneLayout.timeAxisHeight - topOffset);
  let currentTop = topOffset;

  return options.paneLayout.panes.map((pane) => {
    const height = availableHeight * pane.heightRatio;
    const computed: ComputedPane = {
      ...pane,
      top: currentTop,
      height,
      bottom: currentTop + height,
    };
    currentTop += height;
    return computed;
  });
}

export function computeChartGeometry(input: ChartGeometryInput): ChartGeometrySnapshot {
  const root = rect(0, 0, input.width, input.height);
  const safeAreaInsets = normalizeInsets(input.safeAreaInsets);
  const safeRoot = insetRect(root, safeAreaInsets);
  const chromeModes = { ...DEFAULT_CHART_CHROME_LAYOUT, ...input.chrome };
  const topBarHeight = input.topBarHeight ?? 0;
  const leftToolRailWidth = input.leftToolRailWidth ?? 0;

  const chrome: ChartGeometrySnapshot['chrome'] = {};
  if (topBarHeight > 0) {
    chrome.topBar = rect(safeRoot.x, safeRoot.y, safeRoot.width, topBarHeight);
  }
  if (leftToolRailWidth > 0) {
    const top = chrome.topBar ? rectBottom(chrome.topBar) : safeRoot.y;
    chrome.leftTools = rect(safeRoot.x, top, leftToolRailWidth, Math.max(0, rectBottom(safeRoot) - top));
  }
  if (input.margins.right > 0) {
    chrome.rightPriceAxis = rect(rectRight(safeRoot) - input.margins.right, safeRoot.y, input.margins.right, safeRoot.height);
  }
  if (input.paneLayout.timeAxisHeight > 0) {
    chrome.bottomTimeAxis = rect(
      safeRoot.x,
      rectBottom(safeRoot) - input.paneLayout.timeAxisHeight,
      safeRoot.width,
      input.paneLayout.timeAxisHeight,
    );
  }

  const reservedInsets: Insets = {
    top: chromeModes.topBar === 'reserve' ? topBarHeight : 0,
    left: chromeModes.leftTools === 'reserve' ? leftToolRailWidth : 0,
    right: chromeModes.rightPriceAxis === 'overlay' ? 0 : input.margins.right,
    bottom: chromeModes.bottomTimeAxis === 'overlay' ? 0 : input.paneLayout.timeAxisHeight,
  };
  const drawable = insetRect(safeRoot, reservedInsets);
  const panes = computePaneGeometry({
    paneLayout: input.paneLayout,
    height: safeRoot.height,
    topOffset: input.margins.top + safeAreaInsets.top,
  });

  return {
    root,
    canvas: root,
    drawable,
    chrome,
    panes,
    avoidRects: Object.values(chrome),
  };
}
