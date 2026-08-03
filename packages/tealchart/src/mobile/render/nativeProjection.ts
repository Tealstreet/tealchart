import type { Viewport } from '../../types';
import { getNativePaneFrame, type NativeChartFrame, type NativePaneFrame } from './nativeChartFrame';

export interface NativeProjectionViewport {
  startTime: number;
  endTime: number;
}

export interface NativeProjectionRange {
  yMin: number;
  yMax: number;
}

export interface NativePaneProjection extends NativePaneFrame {
  pricePerPixel: number;
  priceToY: (price: number) => number;
  yToPrice: (y: number) => number;
}

export interface NativeChartProjection {
  viewport: Viewport;
  frame: NativeChartFrame;
  panes: readonly NativePaneProjection[];
  mainPane: NativePaneProjection;
  timePerPixel: number;
  timeToX: (time: number) => number;
  xToTime: (x: number) => number;
  getPricePerPixel: (paneId?: string) => number;
  priceToY: (price: number, paneId?: string) => number;
  yToPrice: (y: number, paneId?: string) => number;
  getPaneProjection: (paneId: string) => NativePaneProjection | null;
}

export interface CreateNativeChartProjectionOptions {
  viewport: Viewport;
  frame: NativeChartFrame;
  paneRanges?: Readonly<Record<string, NativeProjectionRange>>;
}

function assertFiniteProjectionNumber(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`NativeChartProjection requires finite ${name}`);
  }
}

function assertFiniteRange(range: NativeProjectionRange, name: string): void {
  assertFiniteProjectionNumber(range.yMin, `${name}.yMin`);
  assertFiniteProjectionNumber(range.yMax, `${name}.yMax`);
}

function assertFinitePaneGeometry(pane: Pick<NativePaneFrame, 'top' | 'height'>, name: string): void {
  assertFiniteProjectionNumber(pane.top, `${name}.top`);
  assertFiniteProjectionNumber(pane.height, `${name}.height`);
}

function assertFiniteTimeGeometry(frame: Pick<NativeChartFrame, 'contentLeft' | 'contentWidth'>): void {
  assertFiniteProjectionNumber(frame.contentLeft, 'frame.contentLeft');
  assertFiniteProjectionNumber(frame.contentWidth, 'frame.contentWidth');
}

export function getNativeTimePerPixel(viewport: NativeProjectionViewport, frame: NativeChartFrame): number {
  assertFiniteProjectionNumber(viewport.startTime, 'viewport.startTime');
  assertFiniteProjectionNumber(viewport.endTime, 'viewport.endTime');
  assertFiniteTimeGeometry(frame);
  const timeRange = viewport.endTime - viewport.startTime;
  assertFiniteProjectionNumber(timeRange, 'viewport time range');
  if (frame.contentWidth <= 0) return 0;
  return timeRange / frame.contentWidth;
}

export function getNativePricePerPixel(pane: NativeProjectionRange & Pick<NativePaneFrame, 'height'>): number {
  assertFiniteRange(pane, 'pane');
  assertFiniteProjectionNumber(pane.height, 'pane.height');
  const priceRange = pane.yMax - pane.yMin;
  assertFiniteProjectionNumber(priceRange, 'pane price range');
  if (pane.height <= 0) return 0;
  return priceRange / pane.height;
}

export function priceToNativeY(price: number, pane: NativeProjectionRange & Pick<NativePaneFrame, 'top' | 'height'>): number {
  assertFiniteProjectionNumber(price, 'price');
  assertFiniteRange(pane, 'pane');
  assertFinitePaneGeometry(pane, 'pane');
  const priceRange = pane.yMax - pane.yMin;
  if (priceRange === 0) return pane.top + pane.height / 2;

  const ratio = (pane.yMax - price) / priceRange;
  return pane.top + ratio * pane.height;
}

export function nativeYToPrice(y: number, pane: NativeProjectionRange & Pick<NativePaneFrame, 'top' | 'height'>): number {
  assertFiniteProjectionNumber(y, 'y');
  assertFiniteRange(pane, 'pane');
  assertFinitePaneGeometry(pane, 'pane');
  if (pane.height === 0) return (pane.yMin + pane.yMax) / 2;

  const priceRange = pane.yMax - pane.yMin;
  const ratio = (y - pane.top) / pane.height;
  return pane.yMax - ratio * priceRange;
}

export function timeToNativeX(time: number, viewport: NativeProjectionViewport, frame: NativeChartFrame): number {
  assertFiniteProjectionNumber(time, 'time');
  assertFiniteProjectionNumber(viewport.startTime, 'viewport.startTime');
  assertFiniteProjectionNumber(viewport.endTime, 'viewport.endTime');
  assertFiniteTimeGeometry(frame);
  const timeRange = viewport.endTime - viewport.startTime;
  if (timeRange === 0) return frame.contentLeft + frame.contentWidth / 2;

  const ratio = (time - viewport.startTime) / timeRange;
  return frame.contentLeft + ratio * frame.contentWidth;
}

export function nativeXToTime(x: number, viewport: NativeProjectionViewport, frame: NativeChartFrame): number {
  assertFiniteProjectionNumber(x, 'x');
  assertFiniteProjectionNumber(viewport.startTime, 'viewport.startTime');
  assertFiniteProjectionNumber(viewport.endTime, 'viewport.endTime');
  assertFiniteTimeGeometry(frame);
  const timeRange = viewport.endTime - viewport.startTime;
  const ratio = frame.contentWidth === 0 ? 0 : (x - frame.contentLeft) / frame.contentWidth;
  return viewport.startTime + ratio * timeRange;
}

export function priceToMainPaneY(price: number, frame: NativeChartFrame): number {
  return priceToNativeY(price, frame.mainPane);
}

export function mainPaneYToPrice(y: number, frame: NativeChartFrame): number {
  return nativeYToPrice(y, frame.mainPane);
}

export function viewportToMainPaneRange(viewport: Viewport): NativeProjectionRange {
  return {
    yMin: viewport.priceMin,
    yMax: viewport.priceMax,
  };
}

function paneRangeForProjection(
  pane: NativePaneFrame,
  viewport: Viewport,
  paneRanges: Readonly<Record<string, NativeProjectionRange>> | undefined,
): NativeProjectionRange {
  const explicitRange = paneRanges?.[pane.id];
  if (explicitRange) return explicitRange;
  if (pane.id === 'main') return viewportToMainPaneRange(viewport);
  return {
    yMin: pane.yMin,
    yMax: pane.yMax,
  };
}

function createNativePaneProjection(
  pane: NativePaneFrame,
  viewport: Viewport,
  paneRanges: Readonly<Record<string, NativeProjectionRange>> | undefined,
): NativePaneProjection {
  const range = paneRangeForProjection(pane, viewport, paneRanges);
  const projectedPane: NativePaneFrame = {
    ...pane,
    yMin: range.yMin,
    yMax: range.yMax,
  };

  return {
    ...projectedPane,
    pricePerPixel: getNativePricePerPixel(projectedPane),
    priceToY: (price) => priceToNativeY(price, projectedPane),
    yToPrice: (y) => nativeYToPrice(y, projectedPane),
  };
}

export function createNativeChartProjection(options: CreateNativeChartProjectionOptions): NativeChartProjection {
  const { frame, paneRanges, viewport } = options;
  const panes = frame.panes.map((pane) => createNativePaneProjection(pane, viewport, paneRanges));
  const mainPane = panes.find((pane) => pane.id === frame.mainPaneId && pane.type === 'main') ?? panes[0];

  if (!mainPane) {
    throw new Error('NativeChartProjection requires at least one pane');
  }

  const getPaneProjection = (paneId: string): NativePaneProjection | null =>
    panes.find((pane) => pane.id === paneId) ?? null;

  const getProjectedPane = (paneId?: string): NativePaneProjection => {
    if (!paneId) return mainPane;
    return getPaneProjection(paneId) ?? mainPane;
  };
  const timePerPixel = getNativeTimePerPixel(viewport, frame);

  return {
    viewport,
    frame,
    panes,
    mainPane,
    timePerPixel,
    timeToX: (time) => timeToNativeX(time, viewport, frame),
    xToTime: (x) => nativeXToTime(x, viewport, frame),
    getPricePerPixel: (paneId) => getProjectedPane(paneId).pricePerPixel,
    priceToY: (price, paneId) => getProjectedPane(paneId).priceToY(price),
    yToPrice: (y, paneId) => getProjectedPane(paneId).yToPrice(y),
    getPaneProjection,
  };
}

export function createNativeChartProjectionForPane(
  projection: NativeChartProjection,
  paneId: string,
): NativePaneProjection | null {
  const pane = getNativePaneFrame(projection.frame, paneId);
  return pane ? projection.getPaneProjection(pane.id) : null;
}
