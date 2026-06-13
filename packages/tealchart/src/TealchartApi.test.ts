import type { ChartTradingIntent } from './trading';
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
});
