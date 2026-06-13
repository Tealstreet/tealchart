import type { ChartTradingIntent, ChartTradingState } from './trading';
import type { FullOrderLineAdapter, FullPositionLineAdapter } from './types';

import { describe, expect, it, vi } from 'vitest';

import { TealchartApi } from './TealchartApi';

describe('TealchartApi trading intents', () => {
  function collectTradingIntents(api: TealchartApi): ChartTradingIntent[] {
    const intents: ChartTradingIntent[] = [];
    api.onTradingIntent().subscribe(null, (intent) => intents.push(intent));
    return intents;
  }

  it('emits order move and cancel intents while preserving adapter callbacks', async () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const intents = collectTradingIntents(api);
    const onMove = vi.fn();
    const onCancel = vi.fn();

    const line = (await api.createOrderLine({ price: 50_000 })) as FullOrderLineAdapter;
    line.setOrderId('order-1').onMove(onMove).onCancel(onCancel);
    const lineId = api.getOrderLinesRenderData()[0].id;

    api.triggerOrderMove(lineId, 51_000);
    api.triggerOrderCancel(lineId);

    expect(intents).toEqual([
      {
        type: 'order.move.commit',
        orderId: 'order-1',
        lineId,
        price: 51_000,
        source: 'native-line',
      },
      {
        type: 'order.cancel',
        orderId: 'order-1',
        lineId,
        source: 'native-line',
      },
    ]);
    expect(onMove).toHaveBeenCalledWith(51_000);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('emits order cancel intents from render data callbacks', async () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const intents = collectTradingIntents(api);
    const onCancel = vi.fn();

    const line = (await api.createOrderLine({ price: 50_000 })) as FullOrderLineAdapter;
    line.setOrderId('order-1').onCancel(onCancel);
    const renderData = api.getOrderLinesRenderData()[0];

    renderData.callbacks?.onCancel?.();

    expect(intents).toEqual([
      {
        type: 'order.cancel',
        orderId: 'order-1',
        lineId: renderData.id,
        source: 'native-line',
      },
    ]);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('emits position close and reverse intents while preserving adapter callbacks', async () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const intents = collectTradingIntents(api);
    const onClose = vi.fn();
    const onReverse = vi.fn();

    const line = (await api.createPositionLine({ price: 50_000 })) as FullPositionLineAdapter;
    line.setPositionId('BTCUSDT:long').onClose(onClose).onReverse(onReverse);
    const lineId = api.getPositionLinesRenderData()[0].id;

    api.triggerPositionClose(lineId);
    api.triggerPositionReverse(lineId);

    expect(intents).toEqual([
      {
        type: 'position.close',
        positionId: 'BTCUSDT:long',
        lineId,
        source: 'native-line',
      },
      {
        type: 'position.reverse',
        positionId: 'BTCUSDT:long',
        lineId,
        source: 'native-line',
      },
    ]);
    expect(onClose).toHaveBeenCalledOnce();
    expect(onReverse).toHaveBeenCalledOnce();
  });

  it('emits position close and reverse intents from render data callbacks', async () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const intents = collectTradingIntents(api);
    const onClose = vi.fn();
    const onReverse = vi.fn();

    const line = (await api.createPositionLine({ price: 50_000 })) as FullPositionLineAdapter;
    line.setPositionId('BTCUSDT:long').onClose(onClose).onReverse(onReverse);
    const renderData = api.getPositionLinesRenderData()[0];

    renderData.callbacks?.onClose?.();
    renderData.callbacks?.onReverse?.();

    expect(intents).toEqual([
      {
        type: 'position.close',
        positionId: 'BTCUSDT:long',
        lineId: renderData.id,
        source: 'native-line',
      },
      {
        type: 'position.reverse',
        positionId: 'BTCUSDT:long',
        lineId: renderData.id,
        source: 'native-line',
      },
    ]);
    expect(onClose).toHaveBeenCalledOnce();
    expect(onReverse).toHaveBeenCalledOnce();
  });

  it('emits order bracket intents while preserving TP and SL callbacks', async () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const intents = collectTradingIntents(api);
    const onTPMove = vi.fn();
    const onSLMoveEnd = vi.fn();

    const line = (await api.createOrderLine({ price: 50_000 })) as FullOrderLineAdapter;
    line.setOrderId('order-1');
    line.onTPMove?.(onTPMove);
    line.onSLMoveEnd?.(onSLMoveEnd);
    const renderData = api.getOrderLinesRenderData()[0];

    renderData.callbacks?.onTPMove?.(52_000, 75);
    renderData.callbacks?.onSLMoveEnd?.(49_000, 50);

    expect(intents).toEqual([
      {
        type: 'bracket.tp.preview',
        ownerType: 'order',
        ownerId: 'order-1',
        lineId: renderData.id,
        price: 52_000,
        partialPercent: 75,
        source: 'native-line',
      },
      {
        type: 'bracket.sl.commit',
        ownerType: 'order',
        ownerId: 'order-1',
        lineId: renderData.id,
        price: 49_000,
        partialPercent: 50,
        source: 'native-line',
      },
    ]);
    expect(onTPMove).toHaveBeenCalledWith(52_000, 75);
    expect(onSLMoveEnd).toHaveBeenCalledWith(49_000, 50);
  });

  it('emits position bracket intents while preserving TP and SL callbacks', async () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const intents = collectTradingIntents(api);
    const onTPClick = vi.fn();
    const onSLMoveEnd = vi.fn();

    const line = (await api.createPositionLine({ price: 50_000 })) as FullPositionLineAdapter;
    line.setPositionId('BTCUSDT:long');
    line.onTPClick?.(onTPClick);
    line.onSLMoveEnd?.(onSLMoveEnd);
    const renderData = api.getPositionLinesRenderData()[0];

    renderData.callbacks?.onTPClick?.();
    renderData.callbacks?.onSLMoveEnd?.(48_000, 25);

    expect(intents).toEqual([
      {
        type: 'bracket.tp.click',
        ownerType: 'position',
        ownerId: 'BTCUSDT:long',
        lineId: renderData.id,
        source: 'native-line',
      },
      {
        type: 'bracket.sl.commit',
        ownerType: 'position',
        ownerId: 'BTCUSDT:long',
        lineId: renderData.id,
        price: 48_000,
        partialPercent: 25,
        source: 'native-line',
      },
    ]);
    expect(onTPClick).toHaveBeenCalledOnce();
    expect(onSLMoveEnd).toHaveBeenCalledWith(48_000, 25);
  });

  it('clears trading intent listeners on dispose', () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const onIntent = vi.fn();

    api.onTradingIntent().subscribe(null, onIntent);
    api.dispose();
    api.emitTradingIntent({
      type: 'order.cancel',
      orderId: 'order-1',
      source: 'programmatic',
    });

    expect(onIntent).not.toHaveBeenCalled();
  });

  it('subscribes to intents through the trading facade', () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const onIntent = vi.fn();
    const unsubscribe = api.trading().onIntent(onIntent);

    api.emitTradingIntent({ type: 'order.cancel', orderId: 'order-1', source: 'programmatic' });
    unsubscribe();
    api.emitTradingIntent({ type: 'order.cancel', orderId: 'order-2', source: 'programmatic' });

    expect(onIntent).toHaveBeenCalledOnce();
    expect(onIntent).toHaveBeenCalledWith({ type: 'order.cancel', orderId: 'order-1', source: 'programmatic' });
  });

  it('renders typed trading state through native line adapters', () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const intents = collectTradingIntents(api);

    api.trading().setState({
      orders: [
        {
          kind: 'order',
          id: 'order-line-1',
          orderId: 'order-1',
          price: 50_000,
          side: 'buy',
          quantity: '0.5 BTC',
          editable: true,
          actions: [{ id: 'cancel', label: 'Cancel' }],
          brackets: { takeProfit: 52_000, stopLoss: 49_000 },
          partialEnabled: true,
          label: { primary: 'Limit', secondary: 'LMT', quantity: '0.5' },
          style: { lineColor: '#123456', lineStyle: 'dashed', lineWidth: 2, lineLength: 60, extendLeft: true },
        },
      ],
      positions: [
        {
          kind: 'position',
          id: 'position-line-1',
          positionId: 'BTCUSDT:long',
          price: 49_500,
          side: 'long',
          quantity: '1 BTC',
          notional: 49_500,
          closeable: true,
          reversible: true,
          brackets: { takeProfit: 53_000 },
          partialEnabled: true,
          profitState: 'positive',
          label: { primary: 'Long', secondary: '+120.00', quantity: '1', pnl: '+120.00' },
        },
      ],
      executions: [
        {
          kind: 'execution',
          id: 'fill-1',
          price: 49_750,
          time: 1_700_000_000,
          direction: 'buy',
          label: { primary: 'Fill', secondary: 'Filled 1 BTC' },
          style: { lineColor: '#00ff00' },
        },
      ],
    });

    const order = api.getOrderLinesRenderData()[0];
    expect(order).toMatchObject({
      id: 'chart_trading_order_order-line-1',
      orderId: 'order-1',
      price: 50_000,
      text: 'Limit',
      textShort: 'LMT',
      quantity: '0.5',
      lineColor: '#123456',
      lineStyle: 2,
      lineWidth: 2,
      lineLength: 60,
      extendLeft: true,
      editable: true,
      cancellable: true,
      brackets: { takeProfit: 52_000, stopLoss: 49_000 },
      partialEnabled: true,
    });

    const position = api.getPositionLinesRenderData()[0];
    expect(position).toMatchObject({
      id: 'chart_trading_position_position-line-1',
      positionId: 'BTCUSDT:long',
      price: 49_500,
      text: 'Long',
      textShort: '+120.00',
      quantity: '1',
      pnl: '+120.00',
      profitState: 'positive',
      closeable: true,
      reversible: true,
      brackets: { takeProfit: 53_000, stopLoss: undefined },
      partialEnabled: true,
      positionData: { entryPrice: 49_500, notional: 49_500, isLong: true },
    });

    const execution = api.getExecutionLinesRenderData()[0];
    expect(execution).toMatchObject({
      id: 'chart_trading_execution_fill-1',
      price: 49_750,
      time: 1_700_000_000,
      direction: 'buy',
      text: 'Fill',
      tooltip: 'Filled 1 BTC',
      arrowColor: '#00ff00',
    });

    order.callbacks?.onCancel?.();
    position.callbacks?.onClose?.();
    position.callbacks?.onReverse?.();

    expect(intents).toEqual([
      { type: 'order.cancel', orderId: 'order-1', lineId: order.id, source: 'native-line' },
      { type: 'position.close', positionId: 'BTCUSDT:long', lineId: position.id, source: 'native-line' },
      { type: 'position.reverse', positionId: 'BTCUSDT:long', lineId: position.id, source: 'native-line' },
    ]);
  });

  it('reconciles facade-owned trading lines without removing legacy lines', async () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const legacyLine = (await api.createOrderLine({ price: 1 })) as FullOrderLineAdapter;
    legacyLine.setOrderId('legacy-order').setText('Legacy');

    const firstState: ChartTradingState = {
      orders: [
        { kind: 'order', id: 'a', price: 10, label: { primary: 'A' } },
        { kind: 'order', id: 'b', price: 20, label: { primary: 'B' }, actions: [{ id: 'cancel', label: 'Cancel' }] },
      ],
    };
    api.setTradingState(firstState);

    expect(api.getOrderLinesRenderData().map((line) => line.id)).toEqual(['order_1', 'chart_trading_order_a', 'chart_trading_order_b']);

    api.setTradingState({
      orders: [{ kind: 'order', id: 'b', price: 25, label: { primary: 'B2' }, actions: [] }],
    });

    const orders = api.getOrderLinesRenderData();
    expect(orders.map((line) => line.id)).toEqual(['order_1', 'chart_trading_order_b']);
    expect(orders.find((line) => line.id === 'order_1')).toMatchObject({ orderId: 'legacy-order', text: 'Legacy' });
    expect(orders.find((line) => line.id === 'chart_trading_order_b')).toMatchObject({
      price: 25,
      text: 'B2',
      cancellable: false,
    });
  });

  it('toggles facade-owned position controls from state', () => {
    const api = new TealchartApi('BTCUSDT', '60');

    api.setTradingState({
      positions: [{ kind: 'position', id: 'pos', price: 10, closeable: true, reversible: true }],
    });
    expect(api.getPositionLinesRenderData()[0]).toMatchObject({ closeable: true, reversible: true });

    api.setTradingState({
      positions: [{ kind: 'position', id: 'pos', price: 10, closeable: false, reversible: false }],
    });
    const renderData = api.getPositionLinesRenderData()[0];
    expect(renderData).toMatchObject({ closeable: false, reversible: false });
    expect(renderData.callbacks?.onClose).toBeUndefined();
    expect(renderData.callbacks?.onReverse).toBeUndefined();
  });

  it('treats trading state as authoritative when style fields are removed', () => {
    const api = new TealchartApi('BTCUSDT', '60');

    api.setTradingState({
      orders: [
        {
          kind: 'order',
          id: 'order',
          price: 10,
          side: 'buy',
          style: {
            lineColor: '#111111',
            lineStyle: 'dashed',
            lineWidth: 4,
            lineLength: 70,
            extendLeft: true,
            bodyBackgroundColor: '#222222',
            actionBackgroundColor: '#333333',
          },
        },
      ],
      positions: [
        {
          kind: 'position',
          id: 'position',
          price: 20,
          side: 'short',
          style: {
            lineColor: '#444444',
            lineStyle: 'dotted',
            lineWidth: 5,
            lineLength: 40,
            extendLeft: true,
            bodyBackgroundColor: '#555555',
            actionBackgroundColor: '#666666',
          },
        },
      ],
    });

    api.setTradingState({
      orders: [{ kind: 'order', id: 'order', price: 10, side: 'buy' }],
      positions: [{ kind: 'position', id: 'position', price: 20, side: 'short' }],
    });

    expect(api.getOrderLinesRenderData()[0]).toMatchObject({
      lineColor: '#22c55e',
      lineStyle: 0,
      lineWidth: 1,
      lineLength: 50,
      extendLeft: false,
      bodyBackgroundColor: 'rgba(33, 150, 243, 0.75)',
      cancelButtonBackgroundColor: 'rgba(33, 150, 243, 0.75)',
    });
    expect(api.getPositionLinesRenderData()[0]).toMatchObject({
      lineColor: '#ef4444',
      lineStyle: 0,
      lineWidth: 2,
      lineLength: 100,
      extendLeft: false,
      bodyBackgroundColor: 'rgba(76, 175, 80, 0.75)',
      closeButtonBackgroundColor: 'rgba(244, 67, 54, 0.75)',
      reverseButtonBackgroundColor: 'rgba(76, 175, 80, 0.75)',
    });
  });

  it('clones trading state structural fields on set and get', () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const state: ChartTradingState = {
      orders: [
        {
          kind: 'order',
          id: 'order',
          price: 10,
          label: { primary: 'Original' },
          style: { lineWidth: 3 },
          actions: [{ id: 'cancel', label: 'Cancel' }],
          brackets: { takeProfit: 12 },
          meta: { owner: 'consumer' },
        },
      ],
    };

    api.setTradingState(state);
    state.orders![0].label!.primary = 'Mutated input';
    state.orders![0].style!.lineWidth = 9;
    state.orders![0].actions![0].label = 'Mutated action';
    state.orders![0].brackets!.takeProfit = 99;

    expect(api.getTradingState().orders?.[0]).toMatchObject({
      label: { primary: 'Original' },
      style: { lineWidth: 3 },
      actions: [{ id: 'cancel', label: 'Cancel' }],
      brackets: { takeProfit: 12 },
    });
    expect(api.getTradingState().orders?.[0].meta).toBe(state.orders![0].meta);

    const returned = api.getTradingState();
    returned.orders![0].label!.primary = 'Mutated output';
    returned.orders![0].style!.lineWidth = 10;
    returned.orders![0].actions![0].label = 'Mutated returned action';
    returned.orders![0].brackets!.takeProfit = 100;

    expect(api.getTradingState().orders?.[0]).toMatchObject({
      label: { primary: 'Original' },
      style: { lineWidth: 3 },
      actions: [{ id: 'cancel', label: 'Cancel' }],
      brackets: { takeProfit: 12 },
    });
  });

  it('maps custom trading actions to render buttons and line action intents', () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const intents = collectTradingIntents(api);

    api.setTradingState({
      orders: [
        {
          kind: 'order',
          id: 'order',
          price: 10,
          actions: [
            { id: 'cancel', label: 'Cancel' },
            { id: 'amend', label: 'Amend', icon: 'A', tooltip: 'Amend order' },
            { id: 'disabled-action', label: 'Disabled', disabled: true },
          ],
          style: {
            actionBackgroundColor: '#111111',
            actionIconColor: '#eeeeee',
            actionBorderColor: '#222222',
          },
        },
      ],
      positions: [
        {
          kind: 'position',
          id: 'position',
          price: 20,
          actions: [
            { id: 'close', label: 'Close' },
            { id: 'protect', label: 'Protect' },
            { id: 'disabled-position-action', label: 'Disabled', disabled: true },
          ],
        },
      ],
    });

    expect(api.getOrderLinesRenderData()[0].actions).toEqual([
      {
        type: 'action',
        actionId: 'amend',
        icon: 'A',
        backgroundColor: '#111111',
        iconColor: '#eeeeee',
        borderColor: '#222222',
        tooltip: 'Amend order',
      },
    ]);
    expect(api.getPositionLinesRenderData()[0].actions).toEqual([
      {
        type: 'action',
        actionId: 'protect',
        icon: 'PR',
        backgroundColor: 'rgba(76, 175, 80, 0.75)',
        iconColor: '#FFFFFF',
        borderColor: '#4CAF50',
        tooltip: 'Protect',
      },
    ]);

    api.triggerLineAction('chart_trading_order_order', 'amend');

    expect(intents).toEqual([
      {
        type: 'line.action',
        lineId: 'chart_trading_order_order',
        actionId: 'amend',
        source: 'native-line',
      },
    ]);
  });

  it('removes custom action render buttons when actions are omitted', () => {
    const api = new TealchartApi('BTCUSDT', '60');

    api.setTradingState({
      orders: [{ kind: 'order', id: 'order', price: 10, actions: [{ id: 'amend', label: 'Amend' }] }],
      positions: [{ kind: 'position', id: 'position', price: 20, actions: [{ id: 'protect', label: 'Protect' }] }],
    });
    expect(api.getOrderLinesRenderData()[0].actions).toHaveLength(1);
    expect(api.getPositionLinesRenderData()[0].actions).toHaveLength(1);

    api.setTradingState({
      orders: [{ kind: 'order', id: 'order', price: 10 }],
      positions: [{ kind: 'position', id: 'position', price: 20 }],
    });

    expect(api.getOrderLinesRenderData()[0].actions).toEqual([]);
    expect(api.getPositionLinesRenderData()[0].actions).toEqual([]);
  });
});
