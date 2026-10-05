import { describe, expect, it } from 'vitest';

import { WebCanvasContext } from './WebCanvasContext';

describe('WebCanvasContext', () => {
  it('reads restored native font state and reapplies the requested font after restore or canvas reset', () => {
    let nativeFont = '10px sans-serif';
    const stack: string[] = [];
    const nativeCtx = {
      get font() {
        return nativeFont;
      },
      set font(value: string) {
        nativeFont = value;
      },
      save: () => stack.push(nativeFont),
      restore: () => {
        nativeFont = stack.pop()!;
      },
    } as unknown as CanvasRenderingContext2D;
    const ctx = new WebCanvasContext(nativeCtx);

    ctx.save();
    ctx.font = '11px Inter';
    ctx.restore();
    expect(ctx.font).toBe('10px sans-serif');
    ctx.font = '11px Inter';
    expect(nativeCtx.font).toBe('11px Inter');

    nativeFont = '10px sans-serif';
    ctx.font = '11px Inter';
    expect(nativeCtx.font).toBe('11px Inter');
  });

  it('dedupes identical font assignments', () => {
    let nativeFont = '10px sans-serif';
    let setCount = 0;

    const nativeCtx = {
      get font() {
        return nativeFont;
      },
      set font(value: string) {
        nativeFont = value;
        setCount += 1;
      },
    } as CanvasRenderingContext2D;

    const ctx = new WebCanvasContext(nativeCtx);

    ctx.font = '11px Inter';
    ctx.font = '11px Inter';
    ctx.font = '12px Inter';

    expect(setCount).toBe(2);
    expect(ctx.font).toBe('12px Inter');
  });
});
