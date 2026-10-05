import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const header = '//@version=6\nindicator("Simple value qualifier")\n';

function check(body: string) {
  return checkProgram(parse(header + body));
}

function run(body: string) {
  const result = runCompatScript(header + body, {
    bars: compatibilityBars.slice(0, 3),
    engineOptions: { runtime: { timeframe: { period: '3', multiplier: 3 }, syminfo: { ticker: 'DEMO' } } },
  });
  expect(result.errors).toEqual([]);
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  return result.plots.map((plot) => plot.values);
}

describe('simple primitive value qualifier, rank361', () => {
  it.each(['3', 'input.int(3)', 'timeframe.multiplier'])(
    'accepts a weaker or simple integer initializer and simple consumer: %s',
    (initializer) => {
      const body = `simple int length = ${initializer}
simple int alias = length
plot(length)
plot(alias)`;
      const result = check(`${body}\nplot(ta.ema(close, alias))`);
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'alias')?.type).toEqual({
        kind: 'int',
        qualifier: 'simple',
      });
      expect(run(body)).toEqual([
        [3, 3, 3],
        [3, 3, 3],
      ]);
    },
  );

  it.each([
    ['"AB"', 2],
    ['input.string("ABC")', 3],
    ['syminfo.ticker', 4],
  ] as const)('keeps the accepted string value stable across changing bars: %s', (initializer, length) => {
    const body = `simple string value = ${initializer}\nplot(str.length(value))`;
    const result = check(body);
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({
      kind: 'string',
      qualifier: 'simple',
    });
    expect(run(body)).toEqual([[length, length, length]]);
  });

  it.each(['simple int value = bar_index', 'simple string value = str.tostring(close)'])(
    'refuses a changing series initializer: %s',
    (declaration) => {
      expect(check(declaration).diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining('simple') }),
        ]),
      );
    },
  );
});
