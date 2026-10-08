import type { OrderLineRenderData, PositionLineRenderData, PriceLine } from '../types';

import { resolveOrderTradeLineLabel, resolvePositionTradeLineLabel } from './tradeLineLabel';

export function orderLineToPriceLine(
  order: OrderLineRenderData,
  formatPrice: (price: number) => string,
  positiveColor: string,
): PriceLine {
  const lineStyleMap: Record<number, 'solid' | 'dashed' | 'dotted'> = {
    0: 'solid',
    1: 'dotted',
    2: 'dashed',
    3: 'dashed',
    4: 'dashed',
  };
  const chartLabel = resolveOrderTradeLineLabel(order, positiveColor);

  return {
    id: order.id,
    price: order.price,
    lineStyle: lineStyleMap[order.lineStyle] || 'dashed',
    color: order.lineColor,
    type: 'order',
    lineLength: order.lineLength,
    lineLengthUnit: order.lineLengthUnit,
    extendLeft: order.extendLeft,
    lineWidth: order.lineWidth,
    priority: order.cancelAsSubmit ? 60 : 50,
    draggable: order.editable,
    label: {
      primaryText: formatPrice(order.price),
      backgroundColor: order.bodyBackgroundColor,
      textColor: order.bodyTextColor,
    },
    chartLabel,
    orderId: order.orderId,
    partialEnabled: order.partialEnabled,
    brackets: order.brackets,
    actionState: order.actionState,
    callbacks: order.callbacks,
  };
}

/**
 * Convert PositionLineRenderData to PriceLine
 */
export function positionLineToPriceLine(
  position: PositionLineRenderData,
  formatPrice: (price: number) => string,
  positiveColor: string,
  negativeColor: string,
): PriceLine {
  const lineStyleMap: Record<number, 'solid' | 'dashed' | 'dotted'> = {
    0: 'solid',
    1: 'dotted',
    2: 'dashed',
    3: 'dashed',
    4: 'dashed',
  };

  const chartLabel = resolvePositionTradeLineLabel(position, positiveColor, negativeColor);

  return {
    id: position.id,
    price: position.price,
    lineStyle: lineStyleMap[position.lineStyle] || 'solid',
    color: position.lineColor,
    type: 'position',
    lineLength: position.lineLength,
    lineLengthUnit: position.lineLengthUnit,
    extendLeft: position.extendLeft,
    lineWidth: position.lineWidth,
    priority: 75,
    draggable: false,
    label: {
      primaryText: formatPrice(position.price),
      backgroundColor: position.bodyBackgroundColor,
      textColor: position.bodyTextColor,
    },
    chartLabel,
    positionId: position.positionId,
    partialEnabled: position.partialEnabled,
    positionData: position.positionData ?? undefined,
    brackets: position.brackets,
    actionState: position.actionState,
    callbacks: position.callbacks,
  };
}
