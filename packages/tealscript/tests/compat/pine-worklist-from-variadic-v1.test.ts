import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

describe('pine-worklist-from-variadic-v1', () => {
  registerCollectionReferenceCases([
    {
      name: 'generic variadic preserves both arguments',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.from',
      rejects: 'discarding arguments, reordering values, or changing the documented result',
      source: 'type Item\n    int value\na = array.from(Item.new(7), Item.new(13))',
      expressions: ['a.get(0).value', 'a.get(1).value', 'a.size()'],
      expected: [7, 13, 2],
    },
    {
      name: 'int variadic preserves both arguments',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.from',
      rejects: 'discarding arguments, reordering values, or changing the documented result',
      source: 'a = array.from(7, 13)',
      expressions: ['a.get(0)', 'a.get(1)', 'a.size()'],
      expected: [7, 13, 2],
    },
    {
      name: 'float variadic preserves both arguments',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.from',
      rejects: 'discarding arguments, reordering values, or changing the documented result',
      source: 'a = array.from(7, 13.5)',
      expressions: ['a.get(0)', 'a.get(1)', 'a.size()'],
      expected: [7, 13.5, 2],
    },
    {
      name: 'bool variadic preserves both arguments',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.from',
      rejects: 'discarding arguments, reordering values, or changing the documented result',
      source: 'a = array.from(false, true)',
      expressions: ['a.get(0) ? 1 : 0', 'a.get(1) ? 1 : 0', 'a.size()'],
      expected: [0, 1, 2],
    },
    {
      name: 'string variadic preserves both arguments',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.from',
      rejects: 'discarding arguments, reordering values, or changing the documented result',
      source: 'a = array.from("seven", "thirteen")',
      expressions: ['a.get(0) == "seven" ? 1 : 0', 'a.get(1) == "thirteen" ? 1 : 0', 'a.size()'],
      expected: [1, 1, 2],
    },
    {
      name: 'label variadic preserves both arguments',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.from',
      rejects: 'discarding arguments, reordering values, or changing the documented result',
      source: 'a = array.from(label.new(7, 1), label.new(13, 1))',
      expressions: ['label.get_x(a.get(0))', 'label.get_x(a.get(1))', 'a.size()'],
      expected: [7, 13, 2],
    },
    {
      name: 'line variadic preserves both arguments',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.from',
      rejects: 'discarding arguments, reordering values, or changing the documented result',
      source: 'a = array.from(line.new(7, 1, 8, 2), line.new(13, 1, 14, 2))',
      expressions: ['line.get_x1(a.get(0))', 'line.get_x1(a.get(1))', 'a.size()'],
      expected: [7, 13, 2],
    },
  ]);
});
