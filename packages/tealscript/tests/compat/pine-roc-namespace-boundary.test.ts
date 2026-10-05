import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const script = (version: number, body: string) =>
  `//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("ROC names")\n${body}`;
const errors = (text: string) => checkProgram(parse(text)).diagnostics.filter((entry) => entry.severity === 'error');
const bars = [10, 8, 12, 6, 15].map((close, index) => ({ ...compatibilityBars[index]!, close }));

describe('ROC moves from the global v4 name to the v5 TA namespace', () => {
  for (const version of [4, 5, 6]) {
    for (const named of [false, true]) {
      it(`retains literal ROC results in v${version} with ${named ? 'named' : 'positional'} arguments`, () => {
        const name = version === 4 ? 'roc' : 'ta.roc';
        const args = named ? 'length=2, source=close' : 'close, 2';
        const text = script(version, `plot(${name}(${args}), title="value")`);
        expect(errors(text)).toEqual([]);
        const result = runCompatScript(text, { bars });
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'value').values).toEqual([null, null, 20, -25, 25]);
      });
    }
  }

  for (const version of [5, 6]) {
    it(`refuses the old global builtin in v${version}`, () => {
      expect(errors(script(version, 'plot(roc(close, 2))'))).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'version-mismatch', message: expect.stringContaining('ta.roc') }),
        ]),
      );
    });

    it(`preserves a user function with the old spelling in v${version}`, () => {
      const text = script(
        version,
        'roc(float value, int length) => value - length\nplot(roc(close, 2), title="value")',
      );
      expect(errors(text)).toEqual([]);
      const result = runCompatScript(text, { bars });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'value').values).toEqual([8, 6, 10, 4, 13]);
    });
  }
});
