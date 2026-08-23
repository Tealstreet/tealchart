import { describe, expect, it } from 'vitest';

import { resolveTradingLineRowHitRect } from './tradingLineHitGeometry';

describe('trading line hit geometry', () => {
  it('covers the visible label height, not only the one-pixel connector line', () => {
    expect(
      resolveTradingLineRowHitRect({
        chartLabelWidth: 120,
        chartLabelX: 240,
        labelHeight: 18,
        lineStartX: 80,
        lineY: 100,
        rightLineEndX: 500,
      }),
    ).toEqual({ x: 80, y: 91, width: 420, height: 18 });
  });

  it('does not produce negative width when the label is collapsed against the axis', () => {
    expect(
      resolveTradingLineRowHitRect({
        chartLabelWidth: 0,
        chartLabelX: 300,
        labelHeight: 18,
        lineStartX: 300,
        lineY: 100,
        rightLineEndX: 280,
      }),
    ).toEqual({ x: 300, y: 91, width: 0, height: 18 });
  });
});

