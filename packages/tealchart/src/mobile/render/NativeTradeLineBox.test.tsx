import { describe, expect, it, vi } from 'vitest';

import { createNativeTradeLineBoxPath } from './NativeTradeLineBox';

describe('NativeTradeLineBox path layout', () => {
  it('rounds both outside edges for standalone trade-line boxes', () => {
    vi.clearAllMocks();
    const path = createNativeTradeLineBoxPath(10, 20, 40, 18, 'all');

    expect(path.moveTo).toHaveBeenCalledWith(12, 20);
    expect(path.lineTo).toHaveBeenNthCalledWith(1, 48, 20);
    expect(path.quadTo).toHaveBeenNthCalledWith(1, 50, 20, 50, 22);
    expect(path.quadTo).toHaveBeenNthCalledWith(2, 50, 38, 48, 38);
    expect(path.quadTo).toHaveBeenNthCalledWith(3, 10, 38, 10, 36);
    expect(path.quadTo).toHaveBeenNthCalledWith(4, 10, 20, 12, 20);
    expect(path.close).toHaveBeenCalledOnce();
  });

  it('keeps interior edges square for joined trade-line segments', () => {
    vi.clearAllMocks();
    const left = createNativeTradeLineBoxPath(10, 20, 40, 18, 'left');

    expect(left.quadTo).toHaveBeenCalledTimes(2);
    expect(left.lineTo).toHaveBeenNthCalledWith(1, 50, 20);
    expect(left.quadTo).toHaveBeenNthCalledWith(1, 10, 38, 10, 36);
    expect(left.quadTo).toHaveBeenNthCalledWith(2, 10, 20, 12, 20);

    vi.clearAllMocks();
    const middle = createNativeTradeLineBoxPath(10, 20, 40, 18, 'none');

    expect(middle.quadTo).not.toHaveBeenCalled();
    expect(middle.moveTo).toHaveBeenCalledWith(10, 20);
    expect(middle.lineTo).toHaveBeenNthCalledWith(1, 50, 20);
    expect(middle.lineTo).toHaveBeenNthCalledWith(2, 50, 38);
    expect(middle.lineTo).toHaveBeenNthCalledWith(4, 10, 20);

    vi.clearAllMocks();
    const right = createNativeTradeLineBoxPath(10, 20, 40, 18, 'right');

    expect(right.quadTo).toHaveBeenCalledTimes(2);
    expect(right.moveTo).toHaveBeenCalledWith(10, 20);
    expect(right.quadTo).toHaveBeenNthCalledWith(1, 50, 20, 50, 22);
    expect(right.quadTo).toHaveBeenNthCalledWith(2, 50, 38, 48, 38);
  });
});
