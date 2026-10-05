import { describe, expect, it, vi } from 'vitest';

import {
  captureVaripReference,
  cloneIntrabarFields,
  createPineUdtFactory,
  createPineUdtObject,
  getUdtField,
  restoreVaripReference,
  setUdtField,
} from './objects';

describe('UDT intrabar registration', () => {
  it('does not allocate WeakMap entries for ordinary or prepared construction', () => {
    const create = createPineUdtFactory('Vector', ['x', 'y'], []);
    const register = vi.spyOn(WeakMap.prototype, 'set');
    let registrations;
    try {
      for (let i = 0; i < 128; i++) {
        create([i, i + 1]);
        createPineUdtObject('Vector', [['x', i], ['y', i + 1]]);
      }
      registrations = register.mock.calls.length;
    } finally {
      register.mockRestore();
    }
    expect(registrations).toBe(0);
  });

  it('keeps registration state out of enumerable host copies', () => {
    const object = createPineUdtFactory('Vector', ['x'], [])([7]);
    const hostCopy = { ...object };
    expect(Object.keys(object)).toEqual(['__tealscriptUdt', 'typeName', 'varipFields', 'fields']);
    expect(Object.getOwnPropertySymbols(hostCopy)).toEqual([]);
    expect(Object.getOwnPropertySymbols(object).every((key) =>
      Object.getOwnPropertyDescriptor(object, key)?.enumerable === false)).toBe(true);
  });

  it('clones rollback values independently while retaining live varip fields', () => {
    const create = createPineUdtFactory('Counter', ['ordinary', 'ticks'], ['ticks']);
    const source = create([10, 1]);
    captureVaripReference(source, 100, true);
    setUdtField(source, 'ordinary', 20);
    const target = create([30, 2]);
    cloneIntrabarFields(source, target, (value) => Number(value) + 100);
    setUdtField(target, 'ordinary', 40);
    restoreVaripReference(target);
    restoreVaripReference(source);
    expect(getUdtField(source, 'ordinary')).toBe(10);
    expect(getUdtField(target, 'ordinary')).toBe(110);
    expect(getUdtField(target, 'ticks')).toBe(2);
  });
});
