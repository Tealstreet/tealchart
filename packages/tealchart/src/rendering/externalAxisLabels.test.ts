import type { CanvasContext } from './CanvasContext';
import type { ExternalAxisLabelLayout } from './externalAxisLabels';

import { describe, expect, it, vi } from 'vitest';

import { renderExternalAxisLabels } from './externalAxisLabels';

const label: ExternalAxisLabelLayout = {
  id: 'last-trade',
  axisId: 'axis',
  layer: 'last-trade',
  x: 10,
  y: 23,
  valueY: 23,
  width: 59,
  height: 26,
  font: '11px Inter',
  fontSize: 11,
  textLines: ['86,649.5', '50:30'],
  color: '#00b9dc',
  borderColor: '#00b9dc',
  backgroundColor: '#23232f',
};

function context() {
  const ctx = new Proxy({ textBaseline: 'middle', fillText: vi.fn() } as any, {
    get(target, key) {
      return target[key] ?? (target[key] = vi.fn());
    },
  });
  ctx.measureText = vi.fn(() => {
    expect(ctx.textBaseline).toBe('alphabetic');
    return { width: 10, fontBoundingBoxAscent: 11, fontBoundingBoxDescent: 3 };
  });
  return ctx;
}

describe('last-trade text placement', () => {
  it('matches Konva alphabetic glyph baselines and row spacing, restoring ordinary native text placement', () => {
    const ctx = context();
    const positions: unknown[][] = [];
    ctx.fillText.mockImplementation((...args: unknown[]) => positions.push([...args, ctx.textBaseline]));
    renderExternalAxisLabels(ctx as CanvasContext, [label, { ...label, layer: 'static', textLines: ['native'] }]);
    expect(positions).toEqual([
      ['86,649.5', 39.5, 21.5, 'alphabetic'],
      ['50:30', 39.5, 32.5, 'alphabetic'],
      ['native', 39.5, 23, 'middle'],
    ]);
    expect(ctx.measureText).toHaveBeenCalledTimes(1);
  });

  it('centers a single line and supports contexts exposing only actual glyph metrics', () => {
    const ctx = context();
    ctx.measureText.mockImplementation(() => ({ width: 10, actualBoundingBoxAscent: 7, actualBoundingBoxDescent: 1 }));
    renderExternalAxisLabels(ctx as CanvasContext, [{ ...label, textLines: ['86,649.5'], height: 20 }]);
    expect(ctx.fillText).toHaveBeenLastCalledWith('86,649.5', 39.5, 26);
  });
});
