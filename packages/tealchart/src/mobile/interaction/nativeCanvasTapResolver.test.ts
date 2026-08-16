import type { SharedValue } from 'react-native-reanimated';
import type { Viewport } from '../../types';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';
import type { NativeTradeLineActionZone } from '../utils/tradeLineLayout';
import type { NativeCanvasTapContext } from './nativeCanvasTapResolver';

import { describe, expect, it } from 'vitest';

import { createNativeChartFrameFromPanes } from '../render/nativeChartFrame';
import { resolveNativeCanvasTap } from './nativeCanvasTapResolver';

function shared<T>(value: T): SharedValue<T> {
  return { value } as SharedValue<T>;
}

const frame = createNativeChartFrameFromPanes({
  dimensions: { width: 220, height: 180, margins: { top: 0, right: 50, bottom: 40, left: 20 } },
  panes: [{ id: 'main', type: 'main', top: 36, height: 104, yMin: 62_000, yMax: 64_000 }],
});

const viewportValue: Viewport = { startTime: 1_000, endTime: 2_000, priceMin: 62_000, priceMax: 64_000 };

function sharedViewport(): NativeViewportSharedValues {
  return {
    startTime: shared(viewportValue.startTime),
    endTime: shared(viewportValue.endTime),
    priceMin: shared(viewportValue.priceMin),
    priceMax: shared(viewportValue.priceMax),
  };
}

const CENTER_Y = 88;
const priceAt = (y: number) =>
  viewportValue.priceMax -
  ((y - frame.mainPane.top) / frame.mainPane.height) * (viewportValue.priceMax - viewportValue.priceMin);

const cancelZone = (): NativeTradeLineActionZone => ({
  objectType: 'order',
  objectId: 'order-1',
  actionType: 'cancel',
  price: priceAt(CENTER_Y),
  entryPrice: priceAt(CENTER_Y),
  partialEnabled: false,
  positionNotional: 0,
  positionIsLong: true,
  color: '#00a8d8',
  lineColor: '#00a8d8',
  x1: 130,
  x2: 156,
});

function context(overrides: Partial<NativeCanvasTapContext> = {}): NativeCanvasTapContext {
  return {
    bracketDragActive: false,
    chartInteractionEnabled: true,
    controlZones: [],
    crosshairVisible: false,
    crosshairY: CENTER_Y,
    drawingTapEnabled: false,
    frame,
    hasContextMenu: false,
    orderDragZones: [],
    pricePrecision: 2,
    sharedViewport: sharedViewport(),
    tradeLabelHeight: 18,
    tradeLineActionZones: [],
    tradeLineRows: [],
    ...overrides,
  };
}

// Above the reset-view reveal strip, which is a full-width band across the
// bottom of the frame that the crosshair has always yielded to.
const EMPTY_PLOT = { x: 60, y: 50 };
const ON_CANCEL = { x: 140, y: CENTER_Y };

describe('resolveNativeCanvasTap', () => {
  // The bug this replaced: five tap gestures raced, each filtering inside its
  // own onEnd, so a tap on an order's cancel button fired the cancel AND
  // toggled the crosshair. Claiming was opt-in and only drawings ever claimed.
  it('gives a cancel button tap to the order, and not also to the crosshair', () => {
    const outcome = resolveNativeCanvasTap(
      ON_CANCEL,
      context({
        tradeLineActionZones: [cancelZone()],
        tradeLineRows: [{ objectType: 'order', objectId: 'order-1', price: priceAt(CENTER_Y) }],
      }),
    );

    expect(outcome).toEqual({
      kind: 'tradeLineAction',
      objectType: 'order',
      objectId: 'order-1',
      actionType: 'cancel',
    });
  });

  it('gives empty plot space to the crosshair', () => {
    expect(resolveNativeCanvasTap(EMPTY_PLOT, context()).kind).toBe('crosshair');
  });

  it('gives chrome nothing at all', () => {
    const outcome = resolveNativeCanvasTap(
      EMPTY_PLOT,
      context({ controlZones: [{ x1: 0, x2: 220, y1: 0, y2: 180 }] }),
    );
    expect(outcome.kind).toBe('none');
  });

  // Chrome is checked before everything, so a button under a bar belongs to the
  // bar. Without this the resolver would fire trade actions through the top bar.
  it('prefers chrome over a trade-line action underneath it', () => {
    const outcome = resolveNativeCanvasTap(
      ON_CANCEL,
      context({
        controlZones: [{ x1: 120, x2: 200, y1: CENTER_Y - 20, y2: CENTER_Y + 20 }],
        tradeLineActionZones: [cancelZone()],
        tradeLineRows: [{ objectType: 'order', objectId: 'order-1', price: priceAt(CENTER_Y) }],
      }),
    );
    expect(outcome.kind).toBe('none');
  });

  it('leaves action buttons alone mid bracket drag', () => {
    const outcome = resolveNativeCanvasTap(
      ON_CANCEL,
      context({
        bracketDragActive: true,
        tradeLineActionZones: [cancelZone()],
        tradeLineRows: [{ objectType: 'order', objectId: 'order-1', price: priceAt(CENTER_Y) }],
      }),
    );
    expect(outcome.kind).not.toBe('tradeLineAction');
  });

  // A tap that lands on the line itself but misses the button belongs to that
  // line, so the crosshair must not swallow it.
  it('does not toggle the crosshair on a trade-line row', () => {
    const outcome = resolveNativeCanvasTap(
      { x: 60, y: CENTER_Y },
      context({
        orderDragZones: [{ objectId: 'order-1', price: priceAt(CENTER_Y), x1: 40, x2: 120 }],
        tradeLineRows: [{ objectType: 'order', objectId: 'order-1', price: priceAt(CENTER_Y) }],
      }),
    );
    expect(outcome.kind).toBe('none');
  });

  it('offers the tap to drawings before the crosshair, and never both', () => {
    const outcome = resolveNativeCanvasTap(EMPTY_PLOT, context({ drawingTapEnabled: true }));
    expect(outcome.kind).toBe('drawingThenCrosshair');
  });

  // Placing a drawing suspends the crosshair, its context menu and trade-line
  // actions - previously expressed as three separate nulled-out frames.
  it('suspends chart interaction while a drawing is being placed', () => {
    const ctx = context({
      chartInteractionEnabled: false,
      tradeLineActionZones: [cancelZone()],
      tradeLineRows: [{ objectType: 'order', objectId: 'order-1', price: priceAt(CENTER_Y) }],
    });
    expect(resolveNativeCanvasTap(ON_CANCEL, ctx).kind).toBe('none');
    expect(resolveNativeCanvasTap(EMPTY_PLOT, ctx).kind).toBe('none');
  });

  it('still routes drawing taps while chart interaction is suspended', () => {
    const outcome = resolveNativeCanvasTap(
      EMPTY_PLOT,
      context({ chartInteractionEnabled: false, drawingTapEnabled: true }),
    );
    expect(outcome.kind).toBe('drawingThenCrosshair');
  });

  it('returns exactly one outcome for any point', () => {
    const ctx = context({
      tradeLineActionZones: [cancelZone()],
      tradeLineRows: [{ objectType: 'order', objectId: 'order-1', price: priceAt(CENTER_Y) }],
      orderDragZones: [{ objectId: 'order-1', price: priceAt(CENTER_Y), x1: 40, x2: 120 }],
    });
    for (const point of [ON_CANCEL, EMPTY_PLOT, { x: 60, y: CENTER_Y }, { x: 0, y: 0 }]) {
      const outcome = resolveNativeCanvasTap(point, ctx);
      expect(typeof outcome.kind).toBe('string');
    }
  });
});
