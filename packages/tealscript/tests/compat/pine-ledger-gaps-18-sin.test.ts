import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

describe('ledger18 sin migration slots', () => {
  for (const version of [3, 4, 5, 6]) {
    for (const named of [false, true]) {
      it(`v${version} ${named ? 'named' : 'positional'} binding`, () => {
        const call = version < 5 ? `sin(${named ? 'x=' : ''}0.5)` : `math.sin(${named ? 'angle=' : ''}0.5)`;
        const source = `//@version=${version}\n${version < 5 ? 'study' : 'indicator'}("migration")\nplot(${call}, title="value")`;
        expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
        const result = runCompatScript(source);
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'value').values).toEqual(Array(12).fill(Math.sin(0.5)));
      });
    }
    if (version >= 5) {
      for (const call of ['sin(0.5)', 'math.sin(x=0.5)']) {
        it(`v${version} rejects obsolete ${call}`, () => {
          expect(checkProgram(parse(`//@version=${version}\nindicator("old slot")\nplot(${call})`)).diagnostics.length).toBeGreaterThan(0);
        });
      }
    }
  }
});
