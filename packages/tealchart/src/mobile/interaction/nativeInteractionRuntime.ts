import type { Viewport } from '../../types';

export type NativeInteractionOwner =
  | 'chartPan'
  | 'chartPinch'
  | 'priceScale'
  | 'timeScale'
  | 'orderDrag'
  | 'positionDrag'
  | 'drawingDrag';

export interface NativeInteractionPoint {
  x: number;
  y: number;
}

export interface NativeInteractionDelta {
  x: number;
  y: number;
}

export interface NativeInteractionSnapshot {
  owner: NativeInteractionOwner | 'none';
  startPoint: NativeInteractionPoint | null;
  startViewport: Viewport;
  liveViewport: Viewport;
  committedViewport: Viewport;
  sequence: number;
}

export interface NativeInteractionUpdate {
  delta: NativeInteractionDelta;
  viewport?: Viewport;
}

export interface NativeChartPanTransform {
  delta: NativeInteractionDelta;
  timePerPixel: number;
  pricePerPixel?: number;
}

export interface NativeChartAxisPinchTransform {
  scaleX: number;
  scaleY: number;
  anchorTime: number;
  anchorPrice: number;
  focalTimeRatio: number;
  focalPriceRatio: number;
}

export interface NativePriceScaleTransform {
  deltaY: number;
  sensitivity?: number;
  anchorPrice?: number;
}

export interface NativeTimeScaleTransform {
  deltaX: number;
  sensitivity?: number;
  anchorTime?: number;
}

const DEFAULT_SCALE_SENSITIVITY = 0.005;

function cloneViewport(viewport: Viewport): Viewport {
  'worklet';
  return {
    startTime: viewport.startTime,
    endTime: viewport.endTime,
    priceMin: viewport.priceMin,
    priceMax: viewport.priceMax,
  };
}

function assertValidViewport(viewport: Viewport): void {
  'worklet';
  if (
    !Number.isFinite(viewport.startTime) ||
    !Number.isFinite(viewport.endTime) ||
    !Number.isFinite(viewport.priceMin) ||
    !Number.isFinite(viewport.priceMax)
  ) {
    throw new Error('NativeInteractionRuntime requires finite viewport values');
  }
  if (viewport.endTime <= viewport.startTime) {
    throw new Error('NativeInteractionRuntime requires endTime to be greater than startTime');
  }
  if (viewport.priceMax <= viewport.priceMin) {
    throw new Error('NativeInteractionRuntime requires priceMax to be greater than priceMin');
  }
}

function assertFiniteNumber(value: number, name: string): void {
  'worklet';
  if (!Number.isFinite(value)) {
    throw new Error(`NativeInteractionRuntime requires finite ${name}`);
  }
}

function clampUnit(value: number): number {
  'worklet';
  return Math.min(1, Math.max(0, value));
}

export function panViewport(viewport: Viewport, transform: NativeChartPanTransform): Viewport {
  'worklet';
  assertValidViewport(viewport);
  assertFiniteNumber(transform.delta.x, 'chart pan delta.x');
  assertFiniteNumber(transform.delta.y, 'chart pan delta.y');
  assertFiniteNumber(transform.timePerPixel, 'chart pan timePerPixel');
  assertFiniteNumber(transform.pricePerPixel ?? 0, 'chart pan pricePerPixel');
  const timeDelta = transform.delta.x * transform.timePerPixel;
  const priceDelta = transform.delta.y * (transform.pricePerPixel ?? 0);

  const nextViewport = {
    startTime: viewport.startTime - timeDelta,
    endTime: viewport.endTime - timeDelta,
    priceMin: viewport.priceMin + priceDelta,
    priceMax: viewport.priceMax + priceDelta,
  };
  assertValidViewport(nextViewport);
  return nextViewport;
}

export function axisPinchViewport(viewport: Viewport, transform: NativeChartAxisPinchTransform): Viewport {
  'worklet';
  assertValidViewport(viewport);
  assertFiniteNumber(transform.scaleX, 'chart pinch scaleX');
  assertFiniteNumber(transform.scaleY, 'chart pinch scaleY');
  assertFiniteNumber(transform.anchorTime, 'chart pinch anchorTime');
  assertFiniteNumber(transform.anchorPrice, 'chart pinch anchorPrice');
  assertFiniteNumber(transform.focalTimeRatio, 'chart pinch focalTimeRatio');
  assertFiniteNumber(transform.focalPriceRatio, 'chart pinch focalPriceRatio');

  const safeScaleX = Math.max(Number.EPSILON, transform.scaleX);
  const safeScaleY = Math.max(Number.EPSILON, transform.scaleY);
  const timeRange = viewport.endTime - viewport.startTime;
  const priceRange = viewport.priceMax - viewport.priceMin;
  const nextTimeRange = Math.max(Number.EPSILON, timeRange / safeScaleX);
  const nextPriceRange = Math.max(Number.EPSILON, priceRange / safeScaleY);
  const focalTimeRatio = clampUnit(transform.focalTimeRatio);
  const focalPriceRatio = clampUnit(transform.focalPriceRatio);

  const nextViewport = {
    startTime: transform.anchorTime - nextTimeRange * focalTimeRatio,
    endTime: transform.anchorTime + nextTimeRange * (1 - focalTimeRatio),
    priceMin: transform.anchorPrice - nextPriceRange * (1 - focalPriceRatio),
    priceMax: transform.anchorPrice + nextPriceRange * focalPriceRatio,
  };
  assertValidViewport(nextViewport);
  return nextViewport;
}

export function scaleViewportPrices(viewport: Viewport, transform: NativePriceScaleTransform): Viewport {
  'worklet';
  assertValidViewport(viewport);
  assertFiniteNumber(transform.deltaY, 'price scale deltaY');
  assertFiniteNumber(transform.sensitivity ?? DEFAULT_SCALE_SENSITIVITY, 'price scale sensitivity');
  if (transform.anchorPrice !== undefined) assertFiniteNumber(transform.anchorPrice, 'price scale anchorPrice');
  const sensitivity = transform.sensitivity ?? DEFAULT_SCALE_SENSITIVITY;
  const scale = Math.exp(transform.deltaY * sensitivity);
  if (!Number.isFinite(scale)) {
    throw new Error('NativeInteractionRuntime price scale transform produced a non-finite range');
  }
  const range = viewport.priceMax - viewport.priceMin;
  const nextRange = Math.max(Number.EPSILON, range * scale);
  if (!Number.isFinite(nextRange)) {
    throw new Error('NativeInteractionRuntime price scale transform produced a non-finite range');
  }
  const anchorPrice = transform.anchorPrice ?? (viewport.priceMin + viewport.priceMax) / 2;
  const anchorRatio = (anchorPrice - viewport.priceMin) / range;

  const nextViewport = {
    ...viewport,
    priceMin: anchorPrice - nextRange * anchorRatio,
    priceMax: anchorPrice + nextRange * (1 - anchorRatio),
  };
  assertValidViewport(nextViewport);
  return nextViewport;
}

export function scaleViewportTime(viewport: Viewport, transform: NativeTimeScaleTransform): Viewport {
  'worklet';
  assertValidViewport(viewport);
  assertFiniteNumber(transform.deltaX, 'time scale deltaX');
  assertFiniteNumber(transform.sensitivity ?? DEFAULT_SCALE_SENSITIVITY, 'time scale sensitivity');
  if (transform.anchorTime !== undefined) assertFiniteNumber(transform.anchorTime, 'time scale anchorTime');
  const sensitivity = transform.sensitivity ?? DEFAULT_SCALE_SENSITIVITY;
  const scale = Math.exp(transform.deltaX * sensitivity);
  if (!Number.isFinite(scale)) {
    throw new Error('NativeInteractionRuntime time scale transform produced a non-finite range');
  }
  const range = viewport.endTime - viewport.startTime;
  const nextRange = Math.max(Number.EPSILON, range * scale);
  if (!Number.isFinite(nextRange)) {
    throw new Error('NativeInteractionRuntime time scale transform produced a non-finite range');
  }
  const anchorTime = transform.anchorTime ?? (viewport.startTime + viewport.endTime) / 2;
  const anchorRatio = (anchorTime - viewport.startTime) / range;

  const nextViewport = {
    ...viewport,
    startTime: anchorTime - nextRange * anchorRatio,
    endTime: anchorTime + nextRange * (1 - anchorRatio),
  };
  assertValidViewport(nextViewport);
  return nextViewport;
}

export class NativeInteractionRuntime {
  private owner: NativeInteractionOwner | 'none' = 'none';
  private startPoint: NativeInteractionPoint | null = null;
  private startViewport: Viewport;
  private liveViewport: Viewport;
  private committedViewport: Viewport;
  private sequence = 0;

  constructor(initialViewport: Viewport) {
    assertValidViewport(initialViewport);
    this.startViewport = cloneViewport(initialViewport);
    this.liveViewport = cloneViewport(initialViewport);
    this.committedViewport = cloneViewport(initialViewport);
  }

  getSnapshot(): NativeInteractionSnapshot {
    return {
      owner: this.owner,
      startPoint: this.startPoint ? { ...this.startPoint } : null,
      startViewport: cloneViewport(this.startViewport),
      liveViewport: cloneViewport(this.liveViewport),
      committedViewport: cloneViewport(this.committedViewport),
      sequence: this.sequence,
    };
  }

  getRenderViewport(): Viewport {
    return cloneViewport(this.liveViewport);
  }

  getCommittedViewport(): Viewport {
    return cloneViewport(this.committedViewport);
  }

  isActive(): boolean {
    return this.owner !== 'none';
  }

  begin(owner: NativeInteractionOwner, startPoint: NativeInteractionPoint, viewport = this.committedViewport): boolean {
    assertValidViewport(viewport);
    if (this.owner !== 'none') return false;

    this.owner = owner;
    this.startPoint = { ...startPoint };
    this.startViewport = cloneViewport(viewport);
    this.liveViewport = cloneViewport(viewport);
    this.committedViewport = cloneViewport(viewport);
    this.sequence += 1;
    return true;
  }

  update(owner: NativeInteractionOwner, update: NativeInteractionUpdate): boolean {
    if (this.owner !== owner) return false;
    const nextViewport = update.viewport ?? this.liveViewport;
    assertValidViewport(nextViewport);
    this.liveViewport = cloneViewport(nextViewport);
    return true;
  }

  updateChartPan(transform: NativeChartPanTransform): boolean {
    return this.update('chartPan', {
      delta: transform.delta,
      viewport: panViewport(this.startViewport, transform),
    });
  }

  updateChartAxisPinch(transform: NativeChartAxisPinchTransform): boolean {
    return this.update('chartPinch', {
      delta: { x: 0, y: 0 },
      viewport: axisPinchViewport(this.startViewport, transform),
    });
  }

  updatePriceScale(transform: NativePriceScaleTransform): boolean {
    return this.update('priceScale', {
      delta: { x: 0, y: transform.deltaY },
      viewport: scaleViewportPrices(this.startViewport, transform),
    });
  }

  updateTimeScale(transform: NativeTimeScaleTransform): boolean {
    return this.update('timeScale', {
      delta: { x: transform.deltaX, y: 0 },
      viewport: scaleViewportTime(this.startViewport, transform),
    });
  }

  commit(owner: NativeInteractionOwner): Viewport | null {
    if (this.owner !== owner) return null;
    const committed = cloneViewport(this.liveViewport);
    this.owner = 'none';
    this.startPoint = null;
    this.startViewport = cloneViewport(committed);
    this.liveViewport = cloneViewport(committed);
    this.committedViewport = cloneViewport(committed);
    this.sequence += 1;
    return committed;
  }

  cancel(owner: NativeInteractionOwner): Viewport | null {
    if (this.owner !== owner) return null;
    const reverted = cloneViewport(this.startViewport);
    this.owner = 'none';
    this.startPoint = null;
    this.liveViewport = cloneViewport(reverted);
    this.committedViewport = cloneViewport(reverted);
    this.sequence += 1;
    return reverted;
  }

  reset(viewport: Viewport): void {
    assertValidViewport(viewport);
    this.owner = 'none';
    this.startPoint = null;
    this.startViewport = cloneViewport(viewport);
    this.liveViewport = cloneViewport(viewport);
    this.committedViewport = cloneViewport(viewport);
    this.sequence += 1;
  }
}
