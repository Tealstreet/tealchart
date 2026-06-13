import { describe, expect, it } from 'vitest';

import { chartTradingLineId, chartTradingStateToRenderData } from './renderData';
import type { ChartTradingIntent, ChartTradingState } from './types';

describe('chartTradingStateToRenderData', () => {
  it('maps chart trading state to mobile render data', () => {
    const state: ChartTradingState = {
      orders: [
        {
          kind: 'order',
          id: 'order-1',
          orderId: 'exchange-order-1',
          side: 'buy',
          price: 42000,
          quantity: '0.5 BTC',
          editable: true,
          cancellable: true,
          brackets: {
            takeProfit: 43000,
            stopLoss: 41000,
          },
          actions: [
            { id: 'cancel', label: 'Cancel' },
            { id: 'details', label: 'Details', icon: 'D' },
          ],
        },
      ],
      positions: [
        {
          kind: 'position',
          id: 'position-1',
          positionId: 'exchange-position-1',
          side: 'short',
          price: 42500,
          quantity: '1 BTC',
          notional: 42500,
          closeable: true,
          reversible: true,
          profitState: 'negative',
          label: {
            primary: 'Short BTC',
            secondary: 'S BTC',
            pnl: '-$120',
          },
        },
      ],
      executions: [
        {
          kind: 'execution',
          id: 'execution-1',
          price: 42100,
          time: 1_700_000_000,
          direction: 'sell',
          label: {
            primary: 'Sell',
            secondary: 'Filled sell',
          },
        },
      ],
    };

    const renderData = chartTradingStateToRenderData(state);

    expect(renderData.orderLines).toMatchObject([
      {
        id: chartTradingLineId('order', 'order-1'),
        orderId: 'exchange-order-1',
        price: 42000,
        quantity: '0.5 BTC',
        editable: true,
        cancellable: true,
        lineColor: '#22c55e',
        brackets: {
          takeProfit: 43000,
          stopLoss: 41000,
        },
        actions: [
          {
            actionId: 'details',
            icon: 'D',
          },
        ],
      },
    ]);
    expect(renderData.positionLines).toMatchObject([
      {
        id: chartTradingLineId('position', 'position-1'),
        positionId: 'exchange-position-1',
        price: 42500,
        quantity: '1 BTC',
        text: 'Short BTC',
        textShort: 'S BTC',
        pnl: '-$120',
        profitState: 'negative',
        lineColor: '#ef4444',
        positionData: {
          entryPrice: 42500,
          notional: 42500,
          isLong: false,
        },
      },
    ]);
    expect(renderData.executionLines).toEqual([
      {
        id: chartTradingLineId('execution', 'execution-1'),
        price: 42100,
        time: 1_700_000_000,
        direction: 'sell',
        text: 'Sell',
        tooltip: 'Filled sell',
        arrowHeight: 20,
        arrowSpacing: 20,
        font: '11px sans-serif',
        textColor: '#ffffff',
        arrowColor: '#ef4444',
      },
    ]);
  });

  it('emits native-line intents from generated callbacks', () => {
    const intents: ChartTradingIntent[] = [];
    const renderData = chartTradingStateToRenderData(
      {
        orders: [
          {
            kind: 'order',
            id: 'order-1',
            price: 42000,
            editable: true,
            cancellable: true,
            brackets: {
              takeProfit: 43000,
              stopLoss: 41000,
            },
          },
        ],
        positions: [
          {
            kind: 'position',
            id: 'position-1',
            price: 42500,
            closeable: true,
            reversible: true,
            brackets: {
              takeProfit: 41500,
            },
          },
        ],
      },
      (intent) => intents.push(intent),
    );

    renderData.orderLines[0].callbacks?.onMove?.(42100);
    renderData.orderLines[0].callbacks?.onCancel?.();
    renderData.orderLines[0].callbacks?.onTPMove?.(43100, 50);
    renderData.orderLines[0].callbacks?.onTPMoveEnd?.(43200, 50);
    renderData.orderLines[0].callbacks?.onSLClick?.();
    renderData.positionLines[0].callbacks?.onClose?.();
    renderData.positionLines[0].callbacks?.onReverse?.();
    renderData.positionLines[0].callbacks?.onSLMove?.(42600);
    renderData.positionLines[0].callbacks?.onSLMoveEnd?.(42700);

    expect(intents).toEqual([
      {
        type: 'order.move.commit',
        orderId: 'order-1',
        lineId: chartTradingLineId('order', 'order-1'),
        price: 42100,
        source: 'native-line',
      },
      {
        type: 'order.cancel',
        orderId: 'order-1',
        lineId: chartTradingLineId('order', 'order-1'),
        source: 'native-line',
      },
      {
        type: 'bracket.tp.preview',
        ownerType: 'order',
        ownerId: 'order-1',
        lineId: chartTradingLineId('order', 'order-1'),
        price: 43100,
        partialPercent: 50,
        source: 'native-line',
      },
      {
        type: 'bracket.tp.commit',
        ownerType: 'order',
        ownerId: 'order-1',
        lineId: chartTradingLineId('order', 'order-1'),
        price: 43200,
        partialPercent: 50,
        source: 'native-line',
      },
      {
        type: 'bracket.sl.click',
        ownerType: 'order',
        ownerId: 'order-1',
        lineId: chartTradingLineId('order', 'order-1'),
        source: 'native-line',
      },
      {
        type: 'position.close',
        positionId: 'position-1',
        lineId: chartTradingLineId('position', 'position-1'),
        source: 'native-line',
      },
      {
        type: 'position.reverse',
        positionId: 'position-1',
        lineId: chartTradingLineId('position', 'position-1'),
        source: 'native-line',
      },
      {
        type: 'bracket.sl.preview',
        ownerType: 'position',
        ownerId: 'position-1',
        lineId: chartTradingLineId('position', 'position-1'),
        price: 42600,
        partialPercent: 100,
        source: 'native-line',
      },
      {
        type: 'bracket.sl.commit',
        ownerType: 'position',
        ownerId: 'position-1',
        lineId: chartTradingLineId('position', 'position-1'),
        price: 42700,
        source: 'native-line',
      },
    ]);
  });
});
