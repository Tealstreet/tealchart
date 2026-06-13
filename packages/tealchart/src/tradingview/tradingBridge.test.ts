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
            cancellable: true,
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
        lineId: 'chart_trading_order_order-1',
      },
      {
        type: 'line.action',
        source: 'tradingview-bridge',
        lineId: 'chart_trading_order_order-1',
        actionId: 'amend',
      },
    ]);
  });

  it('does not emit built-in intents unless lines opt in', () => {
    const onIntent = vi.fn();
    const bridge = new TradingViewTradingBridge({
      state: {
        orders: [{ kind: 'order', id: 'order-1', price: 100 }],
        positions: [{ kind: 'position', id: 'position-1', price: 120 }],
      },
      onIntent,
    });

    bridge.draw(frame(createRecordingContext()));
    bridge.handlePointerDown({ x: 30, y: 100 });
    bridge.handlePointerUp({ x: 30, y: 80 });
    bridge.handlePointerDown({ x: 306, y: 80 });

    expect(onIntent).not.toHaveBeenCalled();
  });

  it('enables built-in actions from action metadata', () => {
    const intents: unknown[] = [];
    const bridge = new TradingViewTradingBridge({
      state: {
        orders: [
          {
            kind: 'order',
            id: 'order-1',
            price: 100,
            actions: [{ id: 'cancel', label: 'Cancel' }],
          },
        ],
        positions: [
          {
            kind: 'position',
            id: 'position-1',
            price: 120,
            actions: [
              { id: 'close', label: 'Close' },
              { id: 'reverse', label: 'Reverse' },
            ],
          },
        ],
      },
      onIntent: (intent) => intents.push(intent),
    });

    bridge.draw(frame(createRecordingContext()));
    bridge.handlePointerDown({ x: 326, y: 100 });
    bridge.handlePointerDown({ x: 306, y: 80 });
    bridge.handlePointerDown({ x: 324, y: 80 });

    expect(intents).toEqual([
      {
        type: 'order.cancel',
        source: 'tradingview-bridge',
        orderId: 'order-1',
        lineId: 'chart_trading_order_order-1',
      },
      {
        type: 'position.close',
        source: 'tradingview-bridge',
        positionId: 'position-1',
        lineId: 'chart_trading_position_position-1',
      },
      {
        type: 'position.reverse',
        source: 'tradingview-bridge',
        positionId: 'position-1',
        lineId: 'chart_trading_position_position-1',
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
      lineId: 'chart_trading_order_order-1',
      price: 120,
    });
  });

  it('does not emit order move commits for line clicks without a drag', () => {
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
    bridge.handlePointerUp({ x: 31, y: 101 });

    expect(onIntent).not.toHaveBeenCalled();
  });

  it('invalidates hit targets when state changes or frames cannot normalize', () => {
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
            cancellable: true,
          },
        ],
      },
      onIntent,
    });

    bridge.draw(frame(createRecordingContext()));
    bridge.setState({});
    bridge.handlePointerDown({ x: 326, y: 100 });
    bridge.handlePointerDown({ x: 30, y: 100 });
    bridge.handlePointerUp({ x: 30, y: 80 });

    bridge.setState({
      orders: [
        {
          kind: 'order',
          id: 'order-1',
          orderId: 'external-order-1',
          price: 100,
          editable: true,
          cancellable: true,
        },
      ],
    });
    bridge.draw(frame(createRecordingContext()));
    bridge.draw({ ctx: createRecordingContext(), bars: [], candleCoords: [], priceToCoord: (price) => price, coordToPrice: (coord) => coord });
    bridge.handlePointerDown({ x: 326, y: 100 });

    expect(onIntent).not.toHaveBeenCalled();
  });

  it('maps attached pointer events through the rendered canvas bounds', () => {
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
    const container = document.createElement('div');
    container.getBoundingClientRect = vi.fn(() => domRect({ left: 0, top: 0, width: 500, height: 300 }));
    const ctx = createRecordingContext(domRect({ left: 50, top: 30, width: 400, height: 200 }));

    bridge.draw(frame(ctx));
    const detach = bridge.attach(container);

    container.dispatchEvent(new MouseEvent('pointerdown', { clientX: 80, clientY: 130, bubbles: true, cancelable: true }));
    window.dispatchEvent(new MouseEvent('pointerup', { clientX: 80, clientY: 110, bubbles: true, cancelable: true }));
    detach();

    expect(onIntent).toHaveBeenCalledWith({
      type: 'order.move.commit',
      source: 'tradingview-bridge',
      orderId: 'external-order-1',
      lineId: 'chart_trading_order_order-1',
      price: 120,
    });
  });

  it('claims attached trading pointer gestures before child handlers receive them', () => {
    const onIntent = vi.fn();
    const childPointerDown = vi.fn();
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
    const container = document.createElement('div');
    const child = document.createElement('div');
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    container.appendChild(child);
    container.getBoundingClientRect = vi.fn(() => domRect({ left: 0, top: 0, width: 500, height: 300 }));
    container.setPointerCapture = setPointerCapture;
    container.releasePointerCapture = releasePointerCapture;
    child.addEventListener('pointerdown', childPointerDown);
    const ctx = createRecordingContext(domRect({ left: 50, top: 30, width: 400, height: 200 }));

    bridge.draw(frame(ctx));
    const detach = bridge.attach(container);

    child.dispatchEvent(pointerMouseEvent('pointerdown', { clientX: 80, clientY: 130, pointerId: 7 }));
    window.dispatchEvent(pointerMouseEvent('pointerup', { clientX: 80, clientY: 110, pointerId: 7 }));
    detach();

    expect(childPointerDown).not.toHaveBeenCalled();
    expect(setPointerCapture).toHaveBeenCalledWith(7);
    expect(releasePointerCapture).toHaveBeenCalledWith(7);
    expect(onIntent).toHaveBeenCalledWith({
      type: 'order.move.commit',
      source: 'tradingview-bridge',
      orderId: 'external-order-1',
      lineId: 'chart_trading_order_order-1',
      price: 120,
    });
  });

  it('commits active order drags released outside the rendered canvas bounds', () => {
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
    const container = document.createElement('div');
    container.getBoundingClientRect = vi.fn(() => domRect({ left: 0, top: 0, width: 500, height: 300 }));
    const ctx = createRecordingContext(domRect({ left: 50, top: 30, width: 400, height: 200 }));

    bridge.draw(frame(ctx));
    const detach = bridge.attach(container);

    container.dispatchEvent(pointerMouseEvent('pointerdown', { clientX: 80, clientY: 130, pointerId: 7 }));
    window.dispatchEvent(pointerMouseEvent('pointerup', { clientX: 80, clientY: 10, pointerId: 7 }));
    detach();

    expect(onIntent).toHaveBeenCalledWith({
      type: 'order.move.commit',
      source: 'tradingview-bridge',
      orderId: 'external-order-1',
      lineId: 'chart_trading_order_order-1',
      price: 220,
    });
  });

  it('clears active drags on pointer cancel without committing later pointerups', () => {
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
    const container = document.createElement('div');
    container.getBoundingClientRect = vi.fn(() => domRect({ left: 0, top: 0, width: 500, height: 300 }));
    const ctx = createRecordingContext(domRect({ left: 50, top: 30, width: 400, height: 200 }));

    bridge.draw(frame(ctx));
    const detach = bridge.attach(container);

    container.dispatchEvent(pointerMouseEvent('pointerdown', { clientX: 80, clientY: 130, pointerId: 7 }));
    container.dispatchEvent(pointerMouseEvent('pointercancel', { clientX: 80, clientY: 130, pointerId: 7 }));
    window.dispatchEvent(pointerMouseEvent('pointerup', { clientX: 80, clientY: 110, pointerId: 7 }));
    detach();

    expect(onIntent).not.toHaveBeenCalled();
  });

  it('preserves active drags through editable order state refreshes', () => {
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
    bridge.setState({
      orders: [
        {
          kind: 'order',
          id: 'order-1',
          orderId: 'updated-order-1',
          price: 100,
          editable: true,
        },
      ],
    });
    bridge.handlePointerUp({ x: 30, y: 80 });

    expect(onIntent).toHaveBeenCalledWith({
      type: 'order.move.commit',
      source: 'tradingview-bridge',
      orderId: 'updated-order-1',
      lineId: 'chart_trading_order_order-1',
      price: 120,
    });
  });

  it('emits bracket click intents for bracket clicks without a drag', () => {
    const onIntent = vi.fn();
    const bridge = new TradingViewTradingBridge({
      state: {
        orders: [
          {
            kind: 'order',
            id: 'order-1',
            orderId: 'external-order-1',
            price: 100,
            brackets: { takeProfit: 110 },
          },
        ],
      },
      onIntent,
    });

    bridge.draw(frame(createRecordingContext()));
    bridge.handlePointerDown({ x: 306, y: 100 });
    bridge.handlePointerUp({ x: 306, y: 101 });

    expect(onIntent).toHaveBeenCalledWith({
      type: 'bracket.tp.click',
      source: 'tradingview-bridge',
      ownerType: 'order',
      ownerId: 'external-order-1',
      lineId: 'chart_trading_order_order-1',
    });
  });

  it('emits missing-side bracket intents when bracket config is one-sided', () => {
    const intents: unknown[] = [];
    const bridge = new TradingViewTradingBridge({
      state: {
        orders: [
          {
            kind: 'order',
            id: 'order-1',
            orderId: 'external-order-1',
            price: 100,
            brackets: { takeProfit: 110 },
          },
        ],
        positions: [
          {
            kind: 'position',
            id: 'position-1',
            positionId: 'external-position-1',
            price: 120,
            brackets: { takeProfit: 130 },
          },
        ],
      },
      onIntent: (intent) => intents.push(intent),
    });

    bridge.draw(frame(createRecordingContext()));
    bridge.handlePointerDown({ x: 330, y: 100 });
    bridge.handlePointerUp({ x: 330, y: 101 });
    bridge.handlePointerDown({ x: 330, y: 80 });
    bridge.handlePointerUp({ x: 330, y: 70 });

    expect(intents).toEqual([
      {
        type: 'bracket.sl.click',
        source: 'tradingview-bridge',
        ownerType: 'order',
        ownerId: 'external-order-1',
        lineId: 'chart_trading_order_order-1',
      },
      {
        type: 'bracket.sl.commit',
        source: 'tradingview-bridge',
        ownerType: 'position',
        ownerId: 'external-position-1',
        lineId: 'chart_trading_position_position-1',
        price: 130,
        partialPercent: 100,
      },
    ]);
  });

  it('emits bracket preview and commit intents from bracket drags', () => {
    const intents: unknown[] = [];
    const bridge = new TradingViewTradingBridge({
      state: {
        positions: [
          {
            kind: 'position',
            id: 'position-1',
            positionId: 'external-position-1',
            price: 100,
            brackets: { stopLoss: 90 },
          },
        ],
      },
      onIntent: (intent) => intents.push(intent),
    });

    bridge.draw(frame(createRecordingContext()));
    bridge.handlePointerDown({ x: 330, y: 100 });
    bridge.handlePointerMove({ x: 320, y: 80 });
    bridge.handlePointerUp({ x: 320, y: 70 });

    expect(intents).toEqual([
      {
        type: 'bracket.sl.preview',
        source: 'tradingview-bridge',
        ownerType: 'position',
        ownerId: 'external-position-1',
        lineId: 'chart_trading_position_position-1',
        price: 120,
        partialPercent: 100,
      },
      {
        type: 'bracket.sl.commit',
        source: 'tradingview-bridge',
        ownerType: 'position',
        ownerId: 'external-position-1',
        lineId: 'chart_trading_position_position-1',
        price: 130,
        partialPercent: 100,
      },
    ]);
  });

  it('draws existing position bracket price lines', () => {
    const ctx = createRecordingContext();
    const bridge = new TradingViewTradingBridge({
      state: {
        positions: [
          {
            kind: 'position',
            id: 'position-1',
            price: 100,
            brackets: { takeProfit: 120, stopLoss: 80 },
          },
        ],
      },
    });

    bridge.draw(frame(ctx));

    expect(ctx.setLineDash).toHaveBeenCalledWith([6, 4]);
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 80);
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 120);
  });

  it('emits partial bracket percentages from horizontal bracket drags', () => {
    const intents: unknown[] = [];
    const bridge = new TradingViewTradingBridge({
      state: {
        positions: [
          {
            kind: 'position',
            id: 'position-1',
            positionId: 'external-position-1',
            price: 100,
            brackets: { stopLoss: 90 },
            partialEnabled: true,
          },
        ],
      },
      onIntent: (intent) => intents.push(intent),
    });

    bridge.draw(frame(createRecordingContext()));
    bridge.handlePointerDown({ x: 330, y: 100 });
    bridge.handlePointerMove({ x: 420, y: 80 });
    bridge.handlePointerUp({ x: 500, y: 70 });

    expect(intents).toEqual([
      {
        type: 'bracket.sl.preview',
        source: 'tradingview-bridge',
        ownerType: 'position',
        ownerId: 'external-position-1',
        lineId: 'chart_trading_position_position-1',
        price: 120,
        partialPercent: 50,
      },
      {
        type: 'bracket.sl.commit',
        source: 'tradingview-bridge',
        ownerType: 'position',
        ownerId: 'external-position-1',
        lineId: 'chart_trading_position_position-1',
        price: 130,
        partialPercent: 25,
      },
    ]);
  });

  it('rebinds active bracket drags to refreshed owner metadata', () => {
    const intents: unknown[] = [];
    const bridge = new TradingViewTradingBridge({
      state: {
        orders: [
          {
            kind: 'order',
            id: 'order-1',
            orderId: 'external-order-1',
            price: 100,
            brackets: { takeProfit: 110 },
          },
        ],
      },
      onIntent: (intent) => intents.push(intent),
    });

    bridge.draw(frame(createRecordingContext()));
    bridge.handlePointerDown({ x: 306, y: 100 });
    bridge.setState({
      orders: [
        {
          kind: 'order',
          id: 'order-1',
          orderId: 'updated-order-1',
          price: 100,
          brackets: { takeProfit: 110 },
          partialEnabled: true,
        },
      ],
    });
    bridge.handlePointerMove({ x: 420, y: 80 });
    bridge.handlePointerUp({ x: 420, y: 70 });

    expect(intents).toEqual([
      {
        type: 'bracket.tp.preview',
        source: 'tradingview-bridge',
        ownerType: 'order',
        ownerId: 'updated-order-1',
        lineId: 'chart_trading_order_order-1',
        price: 120,
        partialPercent: 50,
      },
      {
        type: 'bracket.tp.commit',
        source: 'tradingview-bridge',
        ownerType: 'order',
        ownerId: 'updated-order-1',
        lineId: 'chart_trading_order_order-1',
        price: 130,
        partialPercent: 50,
      },
    ]);
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
        lineId: 'chart_trading_position_position-1',
      },
      {
        type: 'position.reverse',
        source: 'tradingview-bridge',
        positionId: 'external-position-1',
        lineId: 'chart_trading_position_position-1',
      },
    ]);
  });

  it('interpolates execution markers only inside the visible bar range', () => {
    const insideCtx = createRecordingContext();
    const insideBridge = new TradingViewTradingBridge({
      state: {
        executions: [{ kind: 'execution', id: 'execution-1', price: 100, time: 2, direction: 'buy' }],
      },
    });

    insideBridge.draw(executionFrame(insideCtx));

    expect(insideCtx.moveTo).toHaveBeenCalledWith(30, 95);
    expect(insideCtx.fill).toHaveBeenCalledTimes(1);

    const outsideCtx = createRecordingContext();
    const outsideBridge = new TradingViewTradingBridge({
      state: {
        executions: [{ kind: 'execution', id: 'execution-1', price: 100, time: 4, direction: 'buy' }],
      },
    });

    outsideBridge.draw(executionFrame(outsideCtx));

    expect(outsideCtx.fill).not.toHaveBeenCalled();
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

function executionFrame(ctx: CanvasRenderingContext2D): TradingViewRawRenderFrame {
  return {
    ctx,
    bars: [
      { time: 1, open: 99, high: 110, low: 90, close: 100, volume: 10 },
      { time: 3, open: 99, high: 110, low: 90, close: 100, volume: 10 },
    ],
    candleCoords: [
      { top: 90, bottom: 100, center: 20, left: 16, right: 24, candleWidth: 8, high: 90, low: 110, wickWidth: 1 },
      { top: 90, bottom: 100, center: 40, left: 36, right: 44, candleWidth: 8, high: 90, low: 110, wickWidth: 1 },
    ],
    chartWidth: 400,
    chartHeight: 200,
    priceToCoord: (price) => 200 - price,
    coordToPrice: (coord) => 200 - coord,
  };
}

function createRecordingContext(canvasBounds?: DOMRect): CanvasRenderingContext2D {
  const ctx = {
    canvas: {
      width: 400,
      height: 200,
      getBoundingClientRect: vi.fn(() => canvasBounds ?? domRect({ left: 0, top: 0, width: 400, height: 200 })),
    },
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

function domRect(rect: { left: number; top: number; width: number; height: number }): DOMRect {
  return {
    ...rect,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    x: rect.left,
    y: rect.top,
    toJSON: () => rect,
  } as DOMRect;
}

function pointerMouseEvent(
  type: string,
  options: MouseEventInit & { pointerId: number },
): MouseEvent {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...options });
  Object.defineProperty(event, 'pointerId', { value: options.pointerId });
  return event;
}
