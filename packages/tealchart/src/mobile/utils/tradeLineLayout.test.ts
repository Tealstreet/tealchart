import { describe, expect, it } from 'vitest';

import {
  formatNativeTradeLinePrice,
  getNativeTradeLinePriceDecimals,
  layoutNativeTradeLine,
  measureNativeTradeLineLabelWidth,
  nativeTradeLineBorderStyle,
  nativeTradeLineDashArray,
} from './tradeLineLayout';

describe('native trade line layout', () => {
  it('maps TradingView line style values used by OEMS lines', () => {
    expect(nativeTradeLineBorderStyle(0)).toBe('solid');
    expect(nativeTradeLineBorderStyle(1)).toBe('dotted');
    expect(nativeTradeLineBorderStyle(2)).toBe('dashed');
    expect(nativeTradeLineBorderStyle(3)).toBe('dashed');
    expect(nativeTradeLineBorderStyle(4)).toBe('dashed');
    expect(nativeTradeLineDashArray(0)).toBeUndefined();
    expect(nativeTradeLineDashArray(1)).toEqual([1, 5]);
    expect(nativeTradeLineDashArray(2)).toEqual([4, 4]);
    expect(nativeTradeLineDashArray(3)).toEqual([4, 4]);
    expect(nativeTradeLineDashArray(4)).toEqual([6, 3]);
  });

  it('formats price labels with grouping and native decimal-count precision', () => {
    expect(getNativeTradeLinePriceDecimals(1)).toBe(1);
    expect(getNativeTradeLinePriceDecimals(0.01)).toBe(2);
    expect(formatNativeTradeLinePrice(63777, 1)).toBe('63,777.0');
    expect(formatNativeTradeLinePrice(60424, 0)).toBe('60,424');
    expect(formatNativeTradeLinePrice(Number.NaN, 2)).toBe('0.00');
  });

  it('measures optional controls as part of label width', () => {
    const base = measureNativeTradeLineLabelWidth({
      segmentHorizontalPadding: 7,
      texts: ['Long', '0.0034', '+$5.33 (+0.49%)'],
    });
    const withControls = measureNativeTradeLineLabelWidth({
      actionButtonCount: 2,
      bracketButtonCount: 2,
      bracketGap: 4,
      segmentHorizontalPadding: 7,
      texts: ['Long', '0.0034', '+$5.33 (+0.49%)'],
    });

    expect(withControls).toBeGreaterThan(base);
  });

  it('keeps long labels and price labels separated on phone-sized charts', () => {
    const dimensions = {
      height: 480,
      margins: { bottom: 32, left: 8, right: 52, top: 20 },
      width: 390,
    };
    const labelWidth = measureNativeTradeLineLabelWidth({
      actionButtonCount: 2,
      bracketButtonCount: 2,
      bracketGap: 4,
      segmentHorizontalPadding: 7,
      texts: ['Long', '0.0034', '+$5.33 (+0.49%)'],
    });
    const layout = layoutNativeTradeLine({
      dimensions,
      formattedPrice: '63777',
      labelWidth,
      lineLength: 0,
    });

    expect(layout.labelWidth).toBeLessThan(labelWidth);
    expect(layout.maxLabelWidth).toBeGreaterThan(0);
    expect(layout.labelX + layout.labelWidth).toBeLessThanOrEqual(layout.priceLabelLeft - 2);
    expect(layout.rightLineLeft + layout.rightLineWidth).toBeLessThanOrEqual(layout.priceLabelLeft - 2);
    expect(layout.priceLabelLeft + layout.priceLabelWidth).toBeLessThanOrEqual(dimensions.width - 4);
  });

  it('treats pixel line length as the right connector length', () => {
    const dimensions = {
      height: 480,
      margins: { bottom: 32, left: 8, right: 52, top: 20 },
      width: 390,
    };
    const layout = layoutNativeTradeLine({
      dimensions,
      formattedPrice: '63777',
      labelWidth: 120,
      lineLength: 36,
      lineLengthUnit: 'pixel',
    });

    expect(layout.rightLineWidth).toBe(36);
  });
});
