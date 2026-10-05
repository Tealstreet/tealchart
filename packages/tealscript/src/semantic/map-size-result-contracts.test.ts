import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

describe('map size result type', () => {
  for (const valueType of ['int', 'float', 'bool', 'Point']) {
    it.each(['namespace', 'method'])('returns series int for ' + valueType + ' values through its %s form', (form) => {
      const call = form === 'namespace' ? 'map.size(id=pairs)' : 'pairs.size()';
      const checked = checkProgram(
        parse(`//@version=6
indicator("Map size result")
type Point
    int score
pairs = map.new<string, ${valueType}>()
count = ${call}
`),
      );
      expect(checked.diagnostics).toEqual([]);
      expect(checked.symbols.find((symbol) => symbol.name === 'count')?.type).toMatchObject({
        kind: 'int',
        qualifier: 'series',
      });
    });
  }
});
