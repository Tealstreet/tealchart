import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

describe('pine-worklist-stdev-remarks-v1', () => {
  registerCollectionReferenceCases([
    {
      name: 'int namespace population sample empty',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.stdev',
      rejects: 'discarding arguments, reordering values, or changing the documented result',
      source: 'a = array.new<int>()\na.push(1)\na.push(3)\na.push(5)\nb = array.from(1, 3)',
      expressions: ['array.stdev(b, true)', 'array.stdev(a, false)', 'array.stdev(array.new<int>())'],
      expected: [1, 2, null],
    },
    {
      name: 'int method population sample empty',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.stdev',
      rejects: 'discarding arguments, reordering values, or changing the documented result',
      source: 'a = array.new<int>()\na.push(1)\na.push(3)\na.push(5)\nb = array.from(1, 3)',
      expressions: ['b.stdev(true)', 'a.stdev(false)', 'array.stdev(array.new<int>())'],
      expected: [1, 2, null],
    },
    {
      name: 'float namespace population sample empty',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.stdev',
      rejects: 'discarding arguments, reordering values, or changing the documented result',
      source: 'a = array.new<float>()\na.push(1)\na.push(3)\na.push(5)\nb = array.from(1, 3)',
      expressions: ['array.stdev(b, true)', 'array.stdev(a, false)', 'array.stdev(array.new<float>())'],
      expected: [1, 2, null],
    },
    {
      name: 'float method population sample empty',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.stdev',
      rejects: 'discarding arguments, reordering values, or changing the documented result',
      source: 'a = array.new<float>()\na.push(1)\na.push(3)\na.push(5)\nb = array.from(1, 3)',
      expressions: ['b.stdev(true)', 'a.stdev(false)', 'array.stdev(array.new<float>())'],
      expected: [1, 2, null],
    },
  ]);
});
