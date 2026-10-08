import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const bar = { time: Date.UTC(2026, 9, 1), open: 1, high: 2, low: 0, close: 1, volume: 100 };
for (const version of [5, 6]) {
  for (const root of ['enum-direct', 'enum-security', 'enum-lower']) {
    for (const overload of [true, false]) {
      it(`v${version} ${root} ${overload ? 'natural RED' : 'namespace control'}`, () => {
        const matrix = root === 'metadata';
        const returned = matrix ? 'array.from(marker)' : 'marker';
        const declaration = overload
          ? `export method echo(Direction values, string marker) =>
    ${returned}
`
          : '';
        const access = overload ? 'Direction.up.echo("custom")' : '"custom"';
        const library = `//@version=${version}
library("Directions")
export enum Direction
    up = "rising"
${declaration}export choose() =>
    values = ${matrix ? 'matrix.new<Direction>(1, 1, Direction.up)' : 'array.from(Direction.up)'}
    ${access}`;
        const lower = root === 'enum-lower';
        const value = lower ? 'requested.get(0)' : 'requested';
        const wanted = 'custom';
        const source = `//@version=${version}
indicator("Minimal ${root}")
import Test/Directions/1 as lib
requested = ${lower ? 'request.security_lower_tf("REMOTE:ALT", "1", lib.choose())' : root === 'enum-security' ? 'request.security("REMOTE:ALT", "1", lib.choose())' : 'lib.choose()'}
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
}

for (const version of [5, 6]) {
  for (const receiver of ['Other.up', '"Test/Directions/1.Direction.up"']) {
    it(`v${version} rejects unrelated receiver ${receiver}`, () => {
      const library = parse(`//@version=${version}
library("Directions")
export enum Direction
    up = "rising"
export enum Other
    up = "rising"
export method echo(Direction value, string marker) =>
    marker
export choose() =>
    ${receiver}.echo("custom")`);
      const result = runCompatScript(
        `//@version=${version}
indicator("Unrelated receiver control")
import Test/Directions/1 as lib
plot(str.tostring(lib.choose()) == "custom" ? 7 : 99)`,
        { bars: [bar], engineOptions: { libraries: new Map([['Test/Directions/1', library]]) } },
      );
      expect(result.profile.compiledBarErrors?.firstMessage).toContain('No imported method overload matched echo');
    });
  }
}
