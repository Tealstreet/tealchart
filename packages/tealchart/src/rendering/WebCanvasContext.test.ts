import { describe, expect, it } from 'vitest';

import { WebCanvasContext } from './WebCanvasContext';

describe('WebCanvasContext', () => {
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
