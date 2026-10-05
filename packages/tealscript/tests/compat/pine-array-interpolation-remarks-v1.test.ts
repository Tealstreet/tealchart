import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

const reference = 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.percentile_linear_interpolation';

describe('array linear interpolation midpoint and empty remarks', () => {
  for (const kind of ['int', 'float'] as const) {
    for (const namespace of [true, false]) {
      const call = (id: string): string =>
        namespace
          ? `array.percentile_linear_interpolation(id=${id}, percentage=50)`
          : `${id}.percentile_linear_interpolation(percentage=50)`;
      const offset = kind === 'int' ? 0 : 0.5;
      const literal = (value: number): string => String(value + offset);
      const route = namespace ? 'namespace' : 'receiver';
      registerCollectionReferenceCases([
        {
          name: `${kind} ${route} interpolates the midpoint between adjacent ranks`,
          reference,
          rejects: 'nearest-rank selection, lower-rank selection, upper-rank selection, and detached source mutation',
          source: `pair = array.from(${[8, 24].map(literal).join(', ')})
even = array.from(${[0, 20, 80, 100].map(literal).join(', ')})
odd = array.from(${[0, 20, 80].map(literal).join(', ')})
single = array.from(${literal(17)})`,
          expressions: [
            call('pair'),
            call('even'),
            call('odd'),
            call('single'),
            'pair.size()',
            'pair.get(0)',
            'pair.get(1)',
          ],
          expected: [16 + offset, 50 + offset, 20 + offset, 17 + offset, 2, 8 + offset, 24 + offset],
        },
        {
          name: `${kind} ${route} returns na for an empty array`,
          reference,
          rejects: 'zero fallback, missing plot execution, and allocating a source element',
          source: `empty = array.new<${kind}>()`,
          expressions: [call('empty'), `na(${call('empty')}) ? 1 : 0`, 'empty.size()'],
          expected: [null, 1, 0],
        },
      ]);
    }
  }
});
