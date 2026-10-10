import type { CanvasContext } from './CanvasContext';

import { describe, expect, it, vi } from 'vitest';

import { drawJailbreakTooltipGroups } from './jailbreakTooltips';

function context() {
  const text: Array<{ text: string; x: number; y: number; color: unknown; font: string }> = [];
  const ctx = {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    lineWidth: 1,
    measureText: vi.fn((value: string) => ({ width: value.length * 10 })),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    strokeRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillText: (value: string, x: number, y: number) =>
      text.push({ text: value, x, y, color: ctx.fillStyle, font: ctx.font }),
  };
  return { ctx, canvas: ctx as unknown as CanvasContext, text };
}
const options = { cursorX: 150, cursorY: 100, chartWidth: 500, rightMargin: 50, font: 'Arial' };

describe('shared existing jailbreak tooltips', () => {
  it('retains left/right grouping, exact row and separator geometry, colors, and font', () => {
    const { canvas, ctx, text } = context();
    drawJailbreakTooltipGroups(
      canvas,
      [[{ text: 'ABC', color: '#f00', position: 'right' }, { text: 'DE' }], [{ text: 'FG' }]],
      { ...options, backgroundColor: '#111', textColor: '#aaa' },
    );
    // Three rows plus the original 0.2-row padding on either side of one separator.
    expect(ctx.roundRect).toHaveBeenCalledWith(20, 72, 40, 56, 3);
    expect(ctx.strokeRect).toHaveBeenCalledWith(20, 72, 40, 56);
    expect(ctx.moveTo).toHaveBeenCalledWith(20, 107.5);
    expect(ctx.lineTo).toHaveBeenCalledWith(60, 107.5);
    expect(text).toEqual([
      { text: 'ABC', x: 25, y: 72 + 5 / 1.2, color: '#f00', font: '12px Arial' },
      { text: 'DE', x: 25, y: 87 + 5 / 1.2, color: '#aaa', font: '12px Arial' },
      { text: 'FG', x: 25, y: 108 + 5 / 1.2, color: '#aaa', font: '12px Arial' },
    ]);
    expect(ctx.globalAlpha).toBe(1);
    expect(ctx.lineWidth).toBe(0.5);
  });

  it('keeps hover groups separate and flips them at the existing price-axis margin boundary', () => {
    const { canvas, ctx } = context();
    const groups = [[{ text: 'ABC' }], [{ text: 'DE', position: 'hover' as const }]];
    drawJailbreakTooltipGroups(canvas, groups, options);
    expect(ctx.roundRect.mock.calls).toEqual([
      [20, 90, 40, 20, 3],
      [165, 90, 30, 20, 3],
    ]);
    ctx.roundRect.mockClear();
    // Equality with the margin boundary does not fit on the right in the original renderer.
    drawJailbreakTooltipGroups(canvas, [groups[1]], { ...options, cursorX: 405 });
    expect(ctx.roundRect).toHaveBeenCalledWith(360, 90, 30, 20, 3);
  });

  it('draws nothing for empty groups', () => {
    const { canvas, ctx } = context();
    drawJailbreakTooltipGroups(canvas, [], options);
    drawJailbreakTooltipGroups(canvas, [[]], options);
    expect(ctx.measureText).not.toHaveBeenCalled();
    expect(ctx.roundRect).not.toHaveBeenCalled();
  });

  it('starts left tooltips clear of the drawing rail when the host gives a left bound', () => {
    const { canvas, ctx, text } = context();
    // The web rail ends at inset 8 + width 50; trade labels start at 58.
    drawJailbreakTooltipGroups(canvas, [[{ text: 'Absorption bearish' }]], { ...options, leftMinX: 58 });
    expect(ctx.roundRect.mock.calls[0][0]).toBe(66);
    expect(text[0].x).toBe(71);
  });

  it('keeps the original 20px when there is no rail or the bound is left of it', () => {
    for (const leftMinX of [undefined, 0, 5]) {
      const { canvas, ctx } = context();
      drawJailbreakTooltipGroups(canvas, [[{ text: 'A' }]], { ...options, leftMinX });
      expect(ctx.roundRect.mock.calls[0][0]).toBe(20);
    }
  });

  it('never moves hover tooltips for the rail bound', () => {
    const { canvas, ctx } = context();
    drawJailbreakTooltipGroups(canvas, [[{ text: 'DE', position: 'hover' as const }]], { ...options, leftMinX: 58 });
    expect(ctx.roundRect.mock.calls[0][0]).toBe(165);
  });
});
