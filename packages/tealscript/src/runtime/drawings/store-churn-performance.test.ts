import type { BoxDrawingOutput } from './types';

import { expect, it } from 'vitest';

import { DrawingStore } from './store';

const box = (id: string, barIndex: number): BoxDrawingOutput => ({
  id,
  type: 'box',
  barIndex,
  left: barIndex,
  right: barIndex + 1,
  top: 2,
  bottom: 1,
  xloc: 'bar_index',
  extend: 'none',
  borderColor: '#000000',
  borderWidth: 1,
  borderStyle: 'solid',
  bgcolor: '#ffffff',
  text: '',
  textColor: '#000000',
  textSize: 'normal',
});

it('keeps handle lookup bounded while additions evict older drawings', () => {
  const store = new DrawingStore();
  store.setLimit('box', 500);
  let found = 0;
  const start = process.cpuUsage();
  for (let i = 0; i < 100_000; i++) {
    const drawing = box(`box_${i}`, i);
    store.add(drawing);
    if (store.get(drawing.id) === drawing) found++;
  }
  const cpu = process.cpuUsage(start);
  expect(found).toBe(100_000);
  expect(store.count()).toBe(500);
  expect(store.get('box_0')).toBeUndefined();
  if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
    expect((cpu.user + cpu.system) / 1000).toBeLessThan(750);
  }
}, 30_000);

it('keeps duplicate first selection and bulk rollback coherent after churn', () => {
  const store = new DrawingStore();
  store.setLimit('box', 3);
  const first = box('same', 0),
    second = box('same', 1);
  store.add(first);
  expect(store.get('same')).toBe(first);
  store.add(second);
  expect(store.get('same')).toBe(first);
  const snapshot = store.snapshot();
  store.delete('same');
  expect(store.get('same')).toBe(second);
  store.restore(snapshot);
  expect(store.get('same')).toEqual(first);
  store.truncateFromBarIndex(1);
  expect(store.count()).toBe(1);
  store.setLimit('box', 1);
  const newest = box('new', 2);
  store.add(newest);
  expect(store.get('same')).toBeUndefined();
  expect(store.get('new')).toBe(newest);
  store.clear();
  expect(store.get('new')).toBeUndefined();
  expect(store.count()).toBe(0);
});

it('removes cascaded linefills from the warmed handle index', () => {
  const store = new DrawingStore();
  const parent = {
    id: 'line_0',
    type: 'line' as const,
    barIndex: 0,
    x1: 0,
    y1: 1,
    x2: 1,
    y2: 2,
    xloc: 'bar_index' as const,
    extend: 'none' as const,
    color: '#ffffff',
    style: 'solid' as const,
    width: 1,
  };
  store.add(parent);
  const fill = {
    id: 'fill_0',
    type: 'linefill' as const,
    barIndex: 0,
    line1: parent.id,
    line2: parent.id,
    color: '#ffffff',
  };
  store.add(fill);
  expect(store.get(fill.id)).toBe(fill);
  store.delete(parent.id);
  expect(store.get(fill.id)).toBeUndefined();
  expect(store.count()).toBe(0);
});

it('resets family counts across restore, truncate and clear', () => {
  const store = new DrawingStore();
  store.setLimit('box', 2);
  store.add(box('a', 0));
  store.add(box('b', 1));
  const snapshot = store.snapshot();
  store.clear();
  store.add(box('c', 2));
  store.restore(snapshot);
  store.add(box('d', 2));
  expect(store.getIds('box')).toEqual(['b', 'd']);
  store.truncateFromBarIndex(2);
  store.add(box('e', 3));
  expect(store.getIds('box')).toEqual(['b', 'e']);
  store.clear();
  store.setLimit('box', 1);
  store.add(box('f', 4));
  expect(store.getIds('box')).toEqual(['f']);
});
