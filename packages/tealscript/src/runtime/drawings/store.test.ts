import { describe, expect, it } from 'vitest';

import { DrawingStore } from './store';
import type { BoxDrawingOutput, LabelDrawingOutput, LineDrawingOutput } from './types';

function label(overrides: Partial<LabelDrawingOutput> = {}): LabelDrawingOutput {
  return {
    id: 'label_0',
    type: 'label',
    barIndex: 0,
    x: 0,
    y: 10,
    text: 'label',
    xloc: 'bar_index',
    yloc: 'price',
    style: 'label_down',
    color: '#000000',
    textColor: '#ffffff',
    size: 'normal',
    ...overrides,
  };
}

function line(overrides: Partial<LineDrawingOutput> = {}): LineDrawingOutput {
  return {
    id: 'line_0',
    type: 'line',
    barIndex: 0,
    x1: 0,
    y1: 10,
    x2: 1,
    y2: 11,
    xloc: 'bar_index',
    extend: 'none',
    color: '#000000',
    style: 'solid',
    width: 1,
    ...overrides,
  };
}

function box(overrides: Partial<BoxDrawingOutput> = {}): BoxDrawingOutput {
  return {
    id: 'box_0',
    type: 'box',
    barIndex: 0,
    left: 0,
    top: 11,
    right: 1,
    bottom: 10,
    xloc: 'bar_index',
    extend: 'none',
    borderColor: '#000000',
    borderWidth: 1,
    borderStyle: 'solid',
    bgcolor: '#ffffff',
    text: '',
    textColor: '#000000',
    textSize: 'normal',
    ...overrides,
  };
}

describe('DrawingStore', () => {
  it('adds, gets, lists, and deletes drawings', () => {
    const store = new DrawingStore();
    const first = label();
    const second = line();

    store.add(first);
    store.add(second);

    expect(store.count()).toBe(2);
    expect(store.get(first.id)).toBe(first);
    expect(store.all()).toEqual([first, second]);

    store.delete(first.id);

    expect(store.count()).toBe(1);
    expect(store.get(first.id)).toBeUndefined();
    expect(store.all()).toEqual([second]);
  });

  it('marks drawings from an index onward as persistent', () => {
    const store = new DrawingStore();
    const first = label({ id: 'label_0' });
    const second = label({ id: 'label_1' });
    const third = label({ id: 'label_2' });

    store.add(first);
    store.add(second);
    store.add(third);
    store.markPersistentFrom(1);

    expect(first.persistent).toBeUndefined();
    expect(second.persistent).toBe(true);
    expect(third.persistent).toBe(true);
  });

  it('copies drawings with a new id and current bar index', () => {
    const store = new DrawingStore();
    store.add(label({ id: 'label_0', barIndex: 1, persistent: true }));
    store.add(line({ id: 'line_0', barIndex: 1, persistent: true }));
    store.add(box({ id: 'box_0', barIndex: 1, persistent: true }));

    const labelCopy = store.copyLabel('label_0', 'label_1', 7);
    const lineCopy = store.copyLine('line_0', 'line_1', 8);
    const boxCopy = store.copyBox('box_0', 'box_1', 9);

    expect(labelCopy).toMatchObject({ id: 'label_1', type: 'label', barIndex: 7, persistent: false });
    expect(lineCopy).toMatchObject({ id: 'line_1', type: 'line', barIndex: 8, persistent: false });
    expect(boxCopy).toMatchObject({ id: 'box_1', type: 'box', barIndex: 9, persistent: false });
    expect(store.count()).toBe(6);
  });

  it('does not copy missing, mismatched, or duplicate drawing ids', () => {
    const store = new DrawingStore();
    store.add(label({ id: 'label_0' }));
    store.add(line({ id: 'line_0' }));

    expect(store.copyLabel('missing', 'label_1', 1)).toBeUndefined();
    expect(store.copyLabel('line_0', 'label_1', 1)).toBeUndefined();
    expect(store.copyLine('line_0', 'label_0', 1)).toBeUndefined();
    expect(store.count()).toBe(2);
  });

  it('truncates from a bar index while preserving persistent tail drawings', () => {
    const store = new DrawingStore();
    const first = label({ id: 'label_0', barIndex: 0 });
    const removed = label({ id: 'label_1', barIndex: 1 });
    const persistent = label({ id: 'label_2', barIndex: 2, persistent: true });

    store.add(first);
    store.add(removed);
    store.add(persistent);
    store.truncateFromBarIndex(1);

    expect(store.all()).toEqual([first, persistent]);
  });

  it('clears all drawings', () => {
    const store = new DrawingStore();
    store.add(label());

    store.clear();

    expect(store.count()).toBe(0);
    expect(store.all()).toEqual([]);
  });
});
