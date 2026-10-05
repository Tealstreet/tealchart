import type { SkCanvas } from '@shopify/react-native-skia';

import { Skia } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

import { createNativeDrawingContext } from './nativeDrawingContext';

// Canvas2D outlines stroke the glyphs at the same origin before filling them.
// Native must provide that operation rather than drawing eight offset copies.
describe('native drawing text strokes', () => {
  it.each(['left', 'center', 'right'] as const)('keeps %s outlined glyphs aligned with their fill', (textAlign) => {
    const drawText = vi.fn();
    const ctx = createNativeDrawingContext({ drawText } as unknown as SkCanvas, {
      '12px sans-serif': Skia.Font(null, 12),
    });
    ctx.textAlign = textAlign;
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#12345680';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    expect(ctx.strokeText).toBeTypeOf('function');
    ctx.strokeText!('Hi', 30, 40);
    ctx.fillText('Hi', 30, 40);
    const x = textAlign === 'left' ? 30 : textAlign === 'center' ? 23 : 16;
    expect(drawText.mock.calls.map((call) => call.slice(0, 3))).toEqual([
      ['Hi', x, 43],
      ['Hi', x, 43],
    ]);
    const stroke = drawText.mock.calls[0]![3];
    const fill = drawText.mock.calls[1]![3];
    expect(stroke.setStyle).toHaveBeenCalledWith(1);
    expect(stroke.setColor).toHaveBeenCalledWith('#12345680');
    expect(stroke.setStrokeWidth).toHaveBeenCalledWith(2);
    expect(stroke.setStrokeJoin).toHaveBeenCalledWith(1);
    expect(fill.setStyle).toHaveBeenCalledWith(0);
    expect(fill.setColor).toHaveBeenCalledWith('#ffffff');
  });
});
