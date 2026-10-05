import type { BoxDrawingOutput } from './types';

import { performance } from 'node:perf_hooks';

import { expect, it } from 'vitest';

import { DrawingStore } from './store';

// Pine handle lookup: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json functions[384].
// The timing bound is an engine regression gate, not a TradingView execution-time contract.
it('resolves retained and missing drawing handles without scanning the live drawing collection', () => {
  const store = new DrawingStore();
  store.setLimit('box', 500);
  for (let i = 0; i < 500; i++) {
    store.add({
      id: `box_${i}`,
      type: 'box',
      barIndex: i,
      left: i,
      right: i + 1,
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
    } satisfies BoxDrawingOutput);
  }
  const target = store.get('box_499');
  expect(target?.type).toBe('box');
  const started = performance.now();
  let found = 0;
  for (let i = 0; i < 1_000_000; i++) {
    if (store.get(i % 2 === 0 ? 'box_499' : 'box_deleted') === target) found++;
  }
  const elapsed = performance.now() - started;
  expect(found).toBe(500_000);
  if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
    expect(elapsed).toBeLessThan(1_000);
  }
});

// Snapshot/truncation are engine rollback controls; box.copy/delete cite functions[380]/[383] in the same reference.
it('keeps handle reads coherent through copying, deletion, eviction, restore and rollback', () => {
  const store = new DrawingStore();
  const box = {
    id: 'box_0',
    type: 'box',
    barIndex: 0,
    left: 0,
    right: 1,
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
  } satisfies BoxDrawingOutput;
  store.add(box);
  expect(store.get(box.id)).toBe(box);
  const snapshot = store.snapshot();
  const copy = store.copyBox(box.id, 'box_1', 1);
  expect(store.get('box_1')).toBe(copy);
  store.delete(box.id);
  expect(store.get(box.id)).toBeUndefined();
  store.restore(snapshot);
  const restored = store.get(box.id);
  expect(restored).toEqual(box);
  expect(restored).not.toBe(box);
  expect(store.get('box_1')).toBeUndefined();
  store.copyBox(box.id, 'box_2', 2);
  expect(store.get('box_2')).toBeDefined();
  store.truncateFromBarIndex(1);
  expect(store.get('box_2')).toBeUndefined();
  expect(store.get(box.id)).toBe(restored);
  store.setLimit('box', 1);
  const newest = store.copyBox(box.id, 'box_3', 3);
  expect(store.get(box.id)).toBeUndefined();
  expect(store.get('box_3')).toBe(newest);
  store.clear();
  expect(store.get('box_3')).toBeUndefined();
});
