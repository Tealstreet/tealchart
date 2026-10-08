import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const bar = { time: Date.UTC(2026, 9, 1), open: 1, high: 2, low: 0, close: 1, volume: 100 };
for (const kind of ['matrix', 'map']) {
  for (const mode of ['plain', 'enum-spelled', 'builtin']) {
    for (const context of ['direct', 'security', 'security_lower_tf']) {
      const id = `${kind}-${mode}-${context}`;
      it(id, () => {
        const method = kind === 'array' ? 'get' : kind === 'matrix' ? 'row' : 'values';
        const shape = kind === 'map' ? 'map<string, Direction>' : `${kind}<Direction>`;
        const marker = mode === 'plain' ? 'plain' : 'Test/Directions/1.Direction.up';
        const creation =
          kind === 'array'
            ? 'values = array.from(Direction.up)'
            : kind === 'matrix'
              ? 'values = matrix.new<Direction>(1, 1, Direction.up)'
              : 'values = map.new<string, Direction>()\n    values.put("target", Direction.up)';
        const access =
          mode === 'builtin'
            ? kind === 'array'
              ? 'array.get(values, 0)'
              : kind === 'matrix'
                ? 'matrix.row(values, 0).get(0)'
                : 'map.values(values).get(0)'
            : kind === 'array'
              ? `values.get("${marker}")`
              : `values.${method}("${marker}").get(0)`;
        const librarySource = `//@version=6
library("Directions")
export enum Direction
    up = "rising"
export method ${method}(${shape} values, string marker) =>
    ${kind === 'array' ? 'marker' : 'array.from(marker)'}
export choose() =>
    ${creation}
    ${access}`;
        const lower = context === 'security_lower_tf';
        const requested = context === 'direct' ? 'lib.choose()' : `request.${context}("REMOTE:ALT", "1", lib.choose())`;
        const value = lower ? 'array.get(requested, 0)' : 'requested';
        const wanted = mode === 'builtin' ? 'rising' : marker;
        const rawWanted = mode === 'builtin' ? 'lib.Direction.up' : `"${marker}"`;
        const source = `//@version=6
indicator("${id}")
import Test/Directions/1 as lib
requested = ${requested}
plot(${value} == ${rawWanted} ? 1 : 0, "Raw")
plot(str.tostring(${value}) == "${wanted}" ? 7 : 99, "Text")`;
        const libraries = new Map([['Test/Directions/1', parse(librarySource)]]);
        const result = runCompatScript(source, {
          bars: [bar],
          engineOptions: {
            libraries,
            requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'REMOTE:ALT', timeframe: '1', bars: [bar] }]),
            runtime: { timeframe: { period: lower ? '3' : '1' } },
          },
        });
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        expect(getPlot(result, 'Raw').values).toEqual([1]);
        expect(getPlot(result, 'Text').values).toEqual([7]);
      });
    }
  }
}
