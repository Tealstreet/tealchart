import { describe, expect, it, vi } from 'vitest';

import {
  captureVaripReference,
  copyUdtObject,
  createPineUdtFactory,
  getUdtField,
  restoreVaripReference,
  setUdtField,
} from './objects';

describe('UDT constructor initial fields', () => {
  it('does not iterate each factory field Map to duplicate initial values', () => {
    const create = createPineUdtFactory('Level', ['price', 'index', 'live'], ['live']);
    const iterator = vi.spyOn(Map.prototype, Symbol.iterator);
    let distinct = true;
    let previous;
    try {
      for (let i = 0; i < 256; i++) {
        const object = create([i + 0.5, i, false]);
        distinct &&= object.fields !== previous;
        previous = object.fields;
      }
      expect(iterator).not.toHaveBeenCalled();
      expect(distinct).toBe(true);
    } finally {
      iterator.mockRestore();
    }
  });

  it('retains constructor values for a replacement varip reference', () => {
    const create = createPineUdtFactory('Counter', ['ticks', 'ordinary'], ['ticks']);
    const argumentsAtCreation = [50, 20];
    const object = create(argumentsAtCreation);
    argumentsAtCreation[1] = 900;
    setUdtField(object, 'ticks', 51);
    setUdtField(object, 'ordinary', 21);
    captureVaripReference(object, 100, false);
    restoreVaripReference(object);
    expect(getUdtField(object, 'ticks')).toBe(51);
    expect(getUdtField(object, 'ordinary')).toBe(20);
  });

  it('captures the live fields at the start of the next bar', () => {
    const create = createPineUdtFactory('Counter', ['ticks', 'ordinary'], ['ticks']);
    const object = create([2, 20]);
    setUdtField(object, 'ordinary', 30);
    captureVaripReference(object, 100, true);
    setUdtField(object, 'ordinary', 31);
    setUdtField(object, 'ticks', 3);
    restoreVaripReference(object);
    expect(getUdtField(object, 'ordinary')).toBe(30);
    expect(getUdtField(object, 'ticks')).toBe(3);
    setUdtField(object, 'ordinary', 40);
    captureVaripReference(object, 200, true);
    setUdtField(object, 'ordinary', 41);
    restoreVaripReference(object);
    expect(getUdtField(object, 'ordinary')).toBe(40);
  });

  it('keeps copies independent while preserving shallow reference fields and persistence', () => {
    const child = { value: 7 };
    const create = createPineUdtFactory('Owner', ['child', 'ordinary'], []);
    const object = create([child, 20]);
    object.persistent = true;
    const copy = copyUdtObject(object);
    setUdtField(copy, 'ordinary', 99);
    captureVaripReference(copy, 100, false);
    restoreVaripReference(copy);
    expect(copy).not.toBe(object);
    expect(copy.fields).not.toBe(object.fields);
    expect(copy.varipFields).not.toBe(object.varipFields);
    expect(copy.persistent).toBe(true);
    expect(getUdtField(copy, 'child')).toBe(child);
    expect(getUdtField(copy, 'ordinary')).toBe(20);
    expect(getUdtField(object, 'ordinary')).toBe(20);
  });
});
