import { afterEach, describe, expect, it, vi } from 'vitest';

import { RMA } from './ta-classes';

afterEach(() => vi.unstubAllGlobals());

describe('RMA seed snapshot storage', () => {
  it('reuses accessor targets while each snapshot retains independent seed state', () => {
    const rma = new RMA(3);
    rma.compute(2);
    const snapshots = Array.from({ length: 64 }, () => rma.save());
    const descriptors = snapshots.map((snapshot) => Object.getOwnPropertyDescriptor(snapshot, 'seedBuf')!);
    expect(new Set(descriptors.map((descriptor) => descriptor.get)).size).toBe(1);
    expect(new Set(descriptors.map((descriptor) => descriptor.set)).size).toBe(1);
    rma.compute(4);
    snapshots[0].seedBuf[0] = 100;
    expect(snapshots[1].seedBuf).toEqual(new Float64Array([2, 0, 0]));
  });

  it('does not materialize seed buffers for mature steps or unread snapshots', () => {
    const rma = new RMA(4);
    [2, 4, 6, 8].forEach((value) => rma.compute(value));
    const construct = vi.fn((target: typeof Float64Array, args: ConstructorParameters<typeof Float64Array>) =>
      Reflect.construct(target, args, target),
    );
    vi.stubGlobal('Float64Array', new Proxy(Float64Array, { construct }));
    const snapshots = Array.from({ length: 64 }, (_, index) => {
      rma.compute(index + 10);
      rma.recompute(index + 20);
      return rma.save();
    });
    expect(construct.mock.calls.length).toBe(0);
    vi.unstubAllGlobals();
    expect(snapshots[0].seedBuf).toEqual(new Float64Array([2, 4, 6, 8]));
    expect(snapshots.at(-1)!.seedBuf).not.toBe(snapshots[0].seedBuf);
  });

  it('retains an unread snapshot across later seed mutations', () => {
    const rma = new RMA(3);
    rma.compute(2);
    const before = rma.save();
    rma.compute(4);
    expect(rma.compute(6)).toBe(4);
    expect(before.seedBuf).toEqual(new Float64Array([2, 0, 0]));
    expect(before.seedCount).toBe(1);
    expect(before.value).toBeNaN();
  });

  it('retains the partial-bar snapshot when recompute replaces or removes its sample', () => {
    const rma = new RMA(3);
    rma.compute(2);
    rma.compute(4);
    const prefix = rma.save();
    rma.compute(90);
    const partial = rma.save();
    expect(rma.recompute(6)).toBe(4);
    expect(rma.recompute(NaN)).toBeNaN();
    const missingPartial = rma.save();
    expect(rma.recompute(12)).toBe(6);
    expect(prefix.seedBuf).toEqual(new Float64Array([2, 4, 0]));
    expect(partial.seedBuf).toEqual(new Float64Array([2, 4, 90]));
    expect(missingPartial.seedBuf).toEqual(new Float64Array([2, 4, 0]));
    expect(partial.value).toBe(32);
  });

  it('keeps multiple unread snapshots independent across restore and reseeding', () => {
    const rma = new RMA(3);
    rma.compute(2);
    const first = rma.save();
    rma.compute(4);
    const second = rma.save();
    rma.compute(6);
    const third = rma.save();
    rma.restore(second);
    expect(rma.compute(12)).toBe(6);
    expect(first.seedBuf).toEqual(new Float64Array([2, 0, 0]));
    expect(second.seedBuf).toEqual(new Float64Array([2, 4, 0]));
    expect(third.seedBuf).toEqual(new Float64Array([2, 4, 6]));
    first.seedBuf[0] = 100;
    expect(second.seedBuf[0]).toBe(2);
    expect(third.seedBuf[0]).toBe(2);
  });

  it('preserves both the restored snapshot and a new unread snapshot before mutation', () => {
    const rma = new RMA(3);
    rma.compute(2);
    const original = rma.save();
    rma.compute(4);
    rma.restore(original);
    const restored = rma.save();
    rma.compute(12);
    expect(original.seedBuf).toEqual(new Float64Array([2, 0, 0]));
    expect(restored.seedBuf).toEqual(new Float64Array([2, 0, 0]));
    expect(restored.seedBuf).not.toBe(original.seedBuf);
    expect(rma.compute(10)).toBe(8);
  });

  it('retains mutable and assignable independent public snapshot buffers', () => {
    const rma = new RMA(3);
    [2, 4, 6].forEach((value) => rma.compute(value));
    const left = rma.save();
    const right = rma.save();
    left.seedBuf = new Float64Array([10, 20, 30]);
    left.seedCount = 2;
    left.value = NaN;
    rma.restore(left);
    expect(rma.compute(6)).toBe(12);
    expect(right.seedBuf).toEqual(new Float64Array([2, 4, 6]));
    expect(Object.keys(right)).toEqual(['value', 'seedBuf', 'seedCount']);
    expect(right.seedBuf).toBeInstanceOf(Float64Array);
    expect(right.seedBuf).toBe(right.seedBuf);
  });

  it('retains the existing tail when an assigned snapshot buffer is short', () => {
    const rma = new RMA(3);
    [2, 4, 6].forEach((value) => rma.compute(value));
    const before = rma.save();
    const short = rma.save();
    short.seedBuf = new Float64Array([10]);
    rma.restore(short);
    expect(rma.save().seedBuf).toEqual(new Float64Array([10, 4, 6]));
    expect(before.seedBuf).toEqual(new Float64Array([2, 4, 6]));
  });

  it('retains the typed-array refusal for oversized assigned snapshot buffers', () => {
    const rma = new RMA(3);
    const oversized = rma.save();
    oversized.seedBuf = new Float64Array(4);
    expect(() => rma.restore(oversized)).toThrow(RangeError);
  });
});
