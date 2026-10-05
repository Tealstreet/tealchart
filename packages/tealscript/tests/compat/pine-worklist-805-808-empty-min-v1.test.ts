import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

// Native v7 confirms the float namespace empty result; other forms use the reference.
// Explicit nth=0 avoids inferring an omitted-rank or all-NA policy.
describe('pine-worklist-805-808-empty-min-v1', () => {
  registerCollectionReferenceCases([
    {
      name: 'int namespace empty min then finite recovery',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.min',
      rejects: 'zero empty sentinel or changing the explicit rank-zero minimum',
      source: 'a = array.new<int>()\nempty = array.min(a, 0)\na.push(13)\na.push(7)',
      expressions: ['empty', 'array.min(a, 0)', 'a.size()'],
      expected: [null, 7, 2],
    },
    {
      name: 'int method empty min then finite recovery',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.min',
      rejects: 'zero empty sentinel or changing the explicit rank-zero minimum',
      source: 'a = array.new<int>()\nempty = a.min(0)\na.push(13)\na.push(7)',
      expressions: ['empty', 'a.min(0)', 'a.size()'],
      expected: [null, 7, 2],
    },
    {
      name: 'float namespace empty min then finite recovery',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.min',
      rejects: 'zero empty sentinel or changing the explicit rank-zero minimum',
      source: 'a = array.new<float>()\nempty = array.min(a, 0)\na.push(13)\na.push(7)',
      expressions: ['empty', 'array.min(a, 0)', 'a.size()'],
      expected: [null, 7, 2],
    },
    {
      name: 'float method empty min then finite recovery',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.min',
      rejects: 'zero empty sentinel or changing the explicit rank-zero minimum',
      source: 'a = array.new<float>()\nempty = a.min(0)\na.push(13)\na.push(7)',
      expressions: ['empty', 'a.min(0)', 'a.size()'],
      expected: [null, 7, 2],
    },
  ]);
});
