import type { ChartMargins, ComputedPane } from '../../types';

export interface NativeChartDimensions {
  width: number;
  height: number;
  margins: ChartMargins;
}

export interface NativePaneFrame {
  id: string;
  type: 'main' | 'indicator';
  top: number;
  bottom: number;
  height: number;
  yMin: number;
  yMax: number;
}

export interface NativeChartFrame {
  dimensions: NativeChartDimensions;
  panes: NativePaneFrame[];
  mainPane: NativePaneFrame;
  mainPaneId: 'main';
  contentLeft: number;
  contentRight: number;
  contentWidth: number;
  timeAxisTop: number;
  timeAxisBottom: number;
  priceAxisLeft: number;
  priceAxisHitLeft: number;
  priceAxisRight: number;
}

export interface NativeChartPaneInput {
  id: string;
  type: 'main' | 'indicator';
  top: number;
  height: number;
  bottom?: number;
  yMin: number;
  yMax: number;
}

export interface CreateNativeChartFrameOptions {
  dimensions: NativeChartDimensions;
  panes: NativeChartPaneInput[];
  priceAxisHitWidth?: number;
}

export function toNativePaneFrame(pane: NativeChartPaneInput | ComputedPane): NativePaneFrame {
  return {
    id: pane.id,
    type: pane.type,
    top: pane.top,
    bottom: pane.bottom ?? pane.top + pane.height,
    height: pane.height,
    yMin: pane.yMin,
    yMax: pane.yMax,
  };
}

export function createNativeChartFrameFromPanes(options: CreateNativeChartFrameOptions): NativeChartFrame {
  const { dimensions } = options;
  const panes = options.panes.map(toNativePaneFrame);
  const mainPane = panes.find((pane) => pane.id === 'main' && pane.type === 'main') ?? panes[0];

  if (!mainPane) {
    throw new Error('NativeChartFrame requires at least one pane');
  }

  const contentLeft = dimensions.margins.left;
  const contentRight = Math.max(contentLeft, dimensions.width);
  const priceAxisLeft = Math.max(contentLeft, dimensions.width - dimensions.margins.right);
  const priceAxisRight = dimensions.width;
  const priceAxisHitWidth = options.priceAxisHitWidth ?? dimensions.margins.right;
  const priceAxisHitLeft = Math.max(contentLeft, priceAxisRight - priceAxisHitWidth);
  const contentWidth = Math.max(0, contentRight - contentLeft);

  return {
    dimensions,
    panes,
    mainPane,
    mainPaneId: 'main',
    contentLeft,
    contentRight,
    contentWidth,
    timeAxisTop: Math.max(0, dimensions.height - dimensions.margins.bottom),
    timeAxisBottom: dimensions.height,
    priceAxisLeft,
    priceAxisHitLeft,
    priceAxisRight,
  };
}

export function getNativePaneFrame(frame: NativeChartFrame, paneId: string): NativePaneFrame | null {
  return frame.panes.find((pane) => pane.id === paneId) ?? null;
}

export function isPointInNativePriceAxis(frame: NativeChartFrame, x: number, y: number): boolean {
  return x >= frame.priceAxisHitLeft && x <= frame.priceAxisRight && y >= frame.mainPane.top && y <= frame.mainPane.bottom;
}

/**
 * The pane a vertical position falls in, main or indicator. Zero-height panes
 * are skipped: maximising one collapses the rest, and the seam would otherwise
 * resolve to whichever collapsed pane happens to sit on it.
 */
export function getNativePaneAtY(frame: NativeChartFrame, y: number): NativePaneFrame | null {
  'worklet';
  return frame.panes.find((pane) => pane.height > 0 && y >= pane.top && y <= pane.bottom) ?? null;
}

export function isPointInNativePlot(frame: NativeChartFrame, x: number, y: number): boolean {
  'worklet';
  return x >= frame.contentLeft && x < frame.priceAxisHitLeft && getNativePaneAtY(frame, y) !== null;
}

/**
 * The pane whose price-axis band a point falls in. The axis runs the full height
 * of the plot area, so which pane an axis drag scales is decided by where it
 * started vertically.
 */
export function getNativePriceAxisPaneAt(frame: NativeChartFrame, x: number, y: number): NativePaneFrame | null {
  'worklet';
  if (x < frame.priceAxisHitLeft || x > frame.priceAxisRight) return null;
  return getNativePaneAtY(frame, y);
}

export function isPointInNativeTimeAxis(frame: NativeChartFrame, x: number, y: number): boolean {
  return x >= frame.contentLeft && x <= frame.contentRight && y >= frame.timeAxisTop && y <= frame.timeAxisBottom;
}
