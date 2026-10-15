import { describe, expect, it, vi } from 'vitest';

import { readDevicePixelRatio, watchDevicePixelRatio } from './devicePixelRatio';

function createOwner(ratio: number, withMedia = true) {
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const queries: Array<{
    media: string;
    target: EventTarget;
    add: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  }> = [];
  const owner = Object.assign(new EventTarget(), {
    devicePixelRatio: ratio,
    document,
    matchMedia: withMedia
      ? vi.fn((media: string) => {
          const target = new EventTarget();
          const add = vi.fn(target.addEventListener.bind(target));
          const remove = vi.fn(target.removeEventListener.bind(target));
          queries.push({ media, target, add, remove });
          return { addEventListener: add, removeEventListener: remove };
        })
      : undefined,
  });
  return { owner, queries, target: owner as unknown as Window };
}

describe('device pixel ratio ownership', () => {
  it('normalizes invalid ratios without rounding fractional display scales', () => {
    const { owner, target } = createOwner(1.25);
    expect(readDevicePixelRatio(target)).toBe(1.25);
    for (const ratio of [NaN, Infinity, -Infinity, 0, -1]) {
      owner.devicePixelRatio = ratio;
      expect(readDevicePixelRatio(target)).toBe(1);
    }
  });

  it('rearms for fractional and reverse changes and ignores unchanged signals', () => {
    const { owner, target, queries } = createOwner(2);
    const changed = vi.fn();
    const stop = watchDevicePixelRatio(target, changed);
    expect(changed).not.toHaveBeenCalled();
    expect(queries[0].media).toBe('(resolution: 2dppx)');

    for (const [index, ratio] of [1.25, 1, 2].entries()) {
      owner.devicePixelRatio = ratio;
      queries[index].target.dispatchEvent(new Event('change'));
      expect(changed).toHaveBeenLastCalledWith(ratio);
      expect(queries[index + 1].media).toBe(`(resolution: ${ratio}dppx)`);
      expect(queries[index].remove).toHaveBeenCalledWith('change', expect.any(Function));
      owner.dispatchEvent(new Event('resize'));
      owner.dispatchEvent(new Event('focus'));
      owner.dispatchEvent(new Event('pageshow'));
      expect(changed).toHaveBeenCalledTimes(index + 1);
    }
    stop();
  });

  it('uses the owner document and rearms after a fallback detects a missed media event', () => {
    const { owner, target, queries } = createOwner(1.5);
    const changed = vi.fn();
    const stop = watchDevicePixelRatio(target, changed);
    owner.document.visibilityState = 'hidden';
    owner.devicePixelRatio = 2;
    owner.document.dispatchEvent(new Event('visibilitychange'));
    expect(changed).not.toHaveBeenCalled();
    owner.document.visibilityState = 'visible';
    owner.document.dispatchEvent(new Event('visibilitychange'));
    expect(changed).toHaveBeenCalledExactlyOnceWith(2);
    expect(queries[1].media).toBe('(resolution: 2dppx)');

    owner.devicePixelRatio = 1.25;
    owner.dispatchEvent(new Event('pageshow'));
    expect(changed).toHaveBeenLastCalledWith(1.25);
    expect(queries[2].media).toBe('(resolution: 1.25dppx)');
    stop();
  });

  it('keeps fallback detection when matchMedia is unavailable', () => {
    const { owner, target } = createOwner(1, false);
    const changed = vi.fn();
    const stop = watchDevicePixelRatio(target, changed);
    owner.devicePixelRatio = 2;
    owner.dispatchEvent(new Event('resize'));
    owner.devicePixelRatio = 1.5;
    owner.dispatchEvent(new Event('focus'));
    expect(changed.mock.calls).toEqual([[2], [1.5]]);
    stop();
  });

  it('keeps fallback detection when media queries lack EventTarget methods', () => {
    const { owner, target } = createOwner(1, false);
    Object.assign(owner, { matchMedia: () => ({ addListener: vi.fn(), removeListener: vi.fn() }) });
    const changed = vi.fn();
    const stop = watchDevicePixelRatio(target, changed);
    owner.devicePixelRatio = 2;
    owner.dispatchEvent(new Event('focus'));
    expect(changed).toHaveBeenCalledExactlyOnceWith(2);
    stop();
  });

  it('reads the live owner ratio in queued old callbacks and makes disposal inert', () => {
    const { owner, target, queries } = createOwner(1);
    const changed = vi.fn();
    const stop = watchDevicePixelRatio(target, changed);
    const oldCallback = queries[0].add.mock.calls[0][1] as () => void;
    owner.devicePixelRatio = 2;
    owner.dispatchEvent(new Event('resize'));
    oldCallback();
    expect(changed).toHaveBeenCalledExactlyOnceWith(2);

    const lastCallback = queries[1].add.mock.calls[0][1] as () => void;
    stop();
    stop();
    owner.devicePixelRatio = 3;
    oldCallback();
    lastCallback();
    owner.dispatchEvent(new Event('resize'));
    owner.dispatchEvent(new Event('focus'));
    owner.dispatchEvent(new Event('pageshow'));
    owner.document.dispatchEvent(new Event('visibilitychange'));
    expect(changed).toHaveBeenCalledTimes(1);
    expect(queries).toHaveLength(2);
  });
});
