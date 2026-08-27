import type { Bar, PriceLine } from '../types';

import { DEFAULT_BUY_CANDLE_COLOR, DEFAULT_SELL_CANDLE_COLOR } from '../constants';
import { formatPriceWithPrecision } from '../state/chartState';
import { formatPriceByMagnitude } from './priceFormatters';
import { intervalToMs } from '../viewport/viewScale';

interface BuildLastTradePriceLineOptions {
  latestBar: Bar | null | undefined;
  interval: string;
  pricePrecision?: number;
  upColor?: string;
  downColor?: string;
  renderLineOnCanvas?: boolean;
  showAxisTag?: boolean;
}

function formatLastTradePrice(price: number, pricePrecision?: number): string {
  if (pricePrecision && pricePrecision > 0) {
    return formatPriceWithPrecision(price, pricePrecision);
  }

  return formatPriceByMagnitude(price);
}

export function buildLastTradePriceLine({
  latestBar,
  interval,
  pricePrecision,
  upColor = DEFAULT_BUY_CANDLE_COLOR,
  downColor = DEFAULT_SELL_CANDLE_COLOR,
  renderLineOnCanvas = true,
  showAxisTag,
}: BuildLastTradePriceLineOptions): PriceLine | null {
  if (!latestBar) {
    return null;
  }

  const intervalMs = intervalToMs(interval);
  const barTimeMs = latestBar.time < 1e12 ? latestBar.time * 1000 : latestBar.time;
  const barCloseTime = barTimeMs + intervalMs;

  return {
    id: 'last-trade',
    price: latestBar.close,
    lineStyle: 'dotted',
    color: latestBar.close >= latestBar.open ? upColor : downColor,
    label: {
      primaryText: formatLastTradePrice(latestBar.close, pricePrecision),
    },
    type: 'price',
    renderLineOnCanvas,
    showAxisTag,
    countdownToTime: barCloseTime,
  };
}
