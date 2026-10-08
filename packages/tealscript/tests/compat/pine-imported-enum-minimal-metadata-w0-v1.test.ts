import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const bar = { time: Date.UTC(2026, 9, 1), open: 1, high: 2, low: 0, close: 1, volume: 100 };
for (const root of ['metadata', 'dispatch']) {
  for (const overload of [true, false]) {
    it(`${root} ${overload ? 'natural RED' : 'namespace control'}`, () => {
      const matrix = root === 'metadata';
      const method = matrix ? 'row' : 'get';
      const shape = matrix ? 'matrix<Direction>' : 'array<Direction>';
      const returned = matrix ? 'array.from(marker)' : 'marker';
      const declaration = overload
        ? `export method ${method}(${shape} values, string marker) =>
    ${returned}
`
        : '';
      const access =
        root === 'dispatch' && overload
          ? 'values.get("custom")'
          : matrix
            ? 'matrix.row(values, 0).get(0)'
            : 'array.get(values, 0)';
      const library = `//@version=6
library("Directions")
export enum Direction
    up = "rising"
${declaration}export choose() =>
    values = ${matrix ? 'matrix.new<Direction>(1, 1, Direction.up)' : 'array.from(Direction.up)'}
    ${access}`;
      const lower = root === 'fallback';
      const value = lower ? 'requested.get(0)' : 'requested';
      const wanted = root === 'dispatch' && overload ? 'custom' : 'rising';
      const source = `//@version=6
indicator("Minimal ${root}")
import Test/Directions/1 as lib
requested = ${lower ? 'request.security_lower_tf("REMOTE:ALT", "1", lib.choose())' : 'lib.choose()'}
plot(str.tostring(${value}) == "${wanted}" ? 7 : 99, "Selected")`;
      const result = runCompatScript(source, {
        bars: [bar],
        engineOptions: {
          libraries: new Map([['Test/Directions/1', parse(library)]]),
          requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'REMOTE:ALT', timeframe: '1', bars: [bar] }]),
          runtime: { timeframe: { period: lower ? '3' : '1' } },
        },
      });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
      expect(getPlot(result, 'Selected').values).toEqual([7]);
    });
  }
}
