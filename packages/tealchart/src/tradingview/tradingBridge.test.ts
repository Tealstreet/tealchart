import { describe, expect, it, vi } from 'vitest';
import { TradingViewTradingBridge } from './tradingBridge';
import type { TradingViewRawRenderFrame } from './types';

describe('TradingViewTradingBridge', () => {
  it('draws chart trading labels into the TradingView render frame', () => {
    const ctx = createRecordingContext();
    const bridge = new TradingViewTradingBridge({
      state: {
        orders: [
          {
            kind: 'order',
            id: 'order-1',
            price: 100,
            side: 'buy',
            quantity: 2,
            actions: [{ id: 'amend', label: 'Amend' }],
          },
        ],
      },
    });

    bridge.draw(frame(ctx));

    expect(ctx.fillText).toHaveBeenCalledWith('BUY', expect.any(Number), 100);
    expect(ctx.fillText).toHaveBeenCalledWith('2', expect.any(Number), 100);
    expect(ctx.fillText).toHaveBeenCalledWith('AM', expect.any(Number), 100);
  });

  it('emits cancel and custom action intents from label hits', () => {
    const intents: unknown[] = [];
    const bridge = new TradingViewTradingBridge({
      state: {
        orders: [
          {
            kind: 'order',
            id: 'order-1',
            orderId: 'external-order-1',
            price: 100,
            side: 'buy',
            actions: [{ id: 'amend', label: 'Amend' }],
          },
        ],
      },
      onIntent: (intent) => intents.push(intent),
    });

    bridge.draw(frame(createRecordingContext()));
    bridge.handlePointerDown({ x: 303, y: 100 });
    bridge.handlePointerDown({ x: 324, y: 100 });

    expect(intents).toEqual([
      {
        type: 'order.cancel',
        source: 'tradingview-bridge',
        orderId: 'external-order-1',
        lineId: 'order-1',
      },
      {
        type: 'line.action',
        source: 'tradingview-bridge',
        lineId: 'order-1',
        actionId: 'amend',
      },
    ]);
  });

  it('emits order move commit intents from line drags', () => {
    const onIntent = vi.fn();
    const bridge = new TradingViewTradingBridge({
      state: {
        orders: [
          {
            kind: 'order',
            id: 'order-1',
            orderId: 'external-order-1',
            price: 100,
            editable: true,
          },
        ],
      },
      onIntent,
    });

    bridge.draw(frame(createRecordingContext()));
    bridge.handlePointerDown({ x: 30, y: 100 });
    bridge.handlePointerUp({ x: 30, y: 80 });

    expect(onIntent).toHaveBeenCalledWith({
      type: 'order.move.commit',
      source: 'tradingview-bridge',
      orderId: 'external-order-1',
      lineId: 'order-1',
      price: 120,
    });
  });

  it('emits position action intents from label hits', () => {
    const intents: unknown[] = [];
    const bridge = new TradingViewTradingBridge({
      state: {
        positions: [
          {
            kind: 'position',
            id: 'position-1',
            positionId: 'external-position-1',
            price: 100,
            closeable: true,
            reversible: true,
          },
        ],
      },
      onIntent: (intent) => intents.push(intent),
    });

    bridge.draw(frame(createRecordingContext()));
    bridge.handlePointerDown({ x: 306, y: 100 });
    bridge.handlePointerDown({ x: 324, y: 100 });

    expect(intents).toEqual([
      {
        type: 'position.close',
        source: 'tradingview-bridge',
        positionId: 'external-position-1',
        lineId: 'position-1',
      },
      {
        type: 'position.reverse',
        source: 'tradingview-bridge',
        positionId: 'external-position-1',
        lineId: 'position-1',
      },
    ]);
  });
});

function frame(ctx: CanvasRenderingContext2D): TradingViewRawRenderFrame {
  return {
    ctx,
    bars: [{ time: 1, open: 99, high: 110, low: 90, close: 100, volume: 10 }],
    candleCoords: [{ top: 90, bottom: 100, center: 20, left: 16, right: 24, candleWidth: 8, high: 90, low: 110, wickWidth: 1 }],
    chartWidth: 400,
    chartHeight: 200,
    priceToCoord: (price) => 200 - price,
    coordToPrice: (coord) => 200 - coord,
  };
}

function createRecordingContext(): CanvasRenderingContext2D {
  const ctx = {
    canvas: { width: 400, height: 200 },
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 6 })),
    lineCap: 'butt',
    lineWidth: 1,
    strokeStyle: '#000000',
    fillStyle: '#000000',
    font: '11px sans-serif',
    textAlign: 'left',
    textBaseline: 'middle',
  };
  return ctx as unknown as CanvasRenderingContext2D;
}
