import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime';
import { checkProgram } from '../../src/semantic/checker';

const diagnostics = (source: string) => checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
const script = (version: number, body: string) => `//@version=${version}\nindicator("Stdev integer contract")\n${body}`;
// Authority: Pine v6 reference ta.stdev length permits int of all qualifiers.
// Integer-valued float expressions retain their float kind. No simple ceiling.
describe('ledger492 ta.stdev integer length kind', () => {
  for (const version of [5, 6]) {
    for (const [name, body] of [
      ['positional float literal', 'plot(ta.stdev(close, 2.0))'],
      ['named float literal', 'plot(ta.stdev(source=close, length=2.0))'],
      ['input float', 'length = input.float(2.0)\nplot(ta.stdev(close, length))'],
      ['simple float', 'simple float length = 2.0\nplot(ta.stdev(close, length))'],
      ['series float', 'length = bar_index % 2 == 0 ? 2.0 : 3.0\nplot(ta.stdev(close, length))'],
      ['float cast', 'plot(ta.stdev(close, float(2)))'],
    ])
      it(`v${version} refuses ${name}`, () => {
        expect(diagnostics(script(version, body))).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: 'type-mismatch',
              message: expect.stringMatching(/ta\.stdev length must be an integer/),
            }),
          ]),
        );
      });
    for (const [name, body] of [
      ['const int', 'plot(ta.stdev(close, 2))'],
      ['named int', 'plot(ta.stdev(source=close, length=2, biased=false))'],
      ['input int', 'length = input.int(2)\nplot(ta.stdev(close, length))'],
      ['simple int', 'simple int length = 2\nplot(ta.stdev(close, length))'],
      ['series int', 'length = bar_index % 2 == 0 ? 2 : 3\nplot(ta.stdev(close, length))'],
      ['explicit int cast', 'plot(ta.stdev(close, int(2.0)))'],
      ['float source', 'plot(ta.stdev(close + 0.5, 2))'],
    ])
      it(`v${version} accepts ${name}`, () => expect(diagnostics(script(version, body))).toEqual([]));
  }
  it('ledger491 ignores source holes and uses two non-na samples for population/unbiased deviations', () => {
    // Independent arithmetic: each non-na pair differs by2, so squared deviations
    // sum to2, population SD=1, sample SD=sqrt(2); holes retain the non-na window.
    const bars: Bar[] = [1, Number.NaN, 3, Number.NaN, 5].map((close, i) => ({
      time: 1700000000000 + i * 60000,
      open: close,
      high: close,
      low: close,
      close,
      volume: 1,
    }));
    const source = script(6, 'plot(ta.stdev(close, 2), "Population")\nplot(ta.stdev(close, 2, false), "Sample")');
    expect(diagnostics(source)).toEqual([]);
    const result = executeScript(parse(source), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([null, null, 1, 1, 1]);
    expect(result.plots[1].values).toEqual([null, null, Math.sqrt(2), Math.sqrt(2), Math.sqrt(2)]);
  });
});
