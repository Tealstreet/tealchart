import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, roundSeries, runCompatScript } from './fixtures';

const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
const header = '//@version=6\nindicator("CMO ledger31")\n';

describe('ledger31 CMO contracts', () => {
  for (const named of [false, true]) {
    for (const value of ['2.0', 'input.float(2.0)', 'close']) {
      it(`refuses float length ${value} in ${named ? 'named' : 'positional'} binding, rank1215`, () => {
        const call = named ? `ta.cmo(series=close, length=${value})` : `ta.cmo(close, ${value})`;
        expect(
          errors(header + `plot(${call})`).some(
            (d) => d.code === 'type-mismatch' && d.message.includes('length must be an integer'),
          ),
        ).toBe(true);
      });
    }
    for (const qualifier of ['const', 'input', 'simple', 'series']) {
      it(`accepts ${qualifier} integer length with ${named ? 'named' : 'positional'} binding, rank1215`, () => {
        const declaration =
          qualifier === 'input'
            ? 'length = input.int(2)'
            : qualifier === 'series'
              ? 'series int length = bar_index % 2 + 1'
              : `${qualifier} int length = 2`;
        const call = named ? 'ta.cmo(series=close, length=length)' : 'ta.cmo(close, length)';
        expect(errors(header + declaration + `\nplot(${call})`)).toEqual([]);
      });
    }
  }
  for (const version of [4, 5, 6]) {
    it(`CMO namespace migration in v${version}, rank1216`, () => {
      const header = `//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("CMO version")\n`;
      if (version >= 5) expect(errors(header + 'plot(cmo(close, 2))').length).toBeGreaterThan(0);
      const source = header + `plot(${version === 4 ? 'cmo' : 'ta.cmo'}(series=close, length=2), title="Result")`;
      expect(errors(source)).toEqual([]);
      const bars = [10, 12, 9, 15].map((close, index) => ({
        ...compatibilityBars[0]!,
        close,
        time: compatibilityBars[0]!.time + index * 60_000,
      }));
      const result = runCompatScript(source, { bars });
      expect(result.errors).toEqual([]);
      expect(roundSeries(getPlot(result, 'Result').values)).toEqual([null, null, -20, 33.333333]);
    });
  }
});
