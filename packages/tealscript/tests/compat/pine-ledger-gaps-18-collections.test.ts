import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

describe('ledger18 empty array max/sum reference remarks', () => {
  for (const kind of ['int', 'float']) {
    for (const method of ['max', 'sum']) {
      for (const receiver of [false, true]) {
        it(`${kind} ${receiver ? 'receiver' : 'namespace'} ${method} returns na for empty, preserves nonempty`, () => {
          const call = receiver ? `a.${method}()` : `array.${method}(a)`;
          const source = `//@version=6\nindicator("empty numeric array")\na = array.new<${kind}>()\nplot(na(${call}) ? 1 : 0, title="empty")\na.push(${kind === 'int' ? '7' : '7.5'})\na.push(${kind === 'int' ? '-2' : '-2.25'})\nplot(${call}, title="value")`;
          expect(checkProgram(parse(source)).diagnostics).toEqual([]);
          const result = runCompatScript(source);
          expect(result.errors).toEqual([]);
          expect(getPlot(result, 'empty').values).toEqual(Array(12).fill(1));
          const expected = method === 'max' ? (kind === 'int' ? 7 : 7.5) : (kind === 'int' ? 5 : 5.25);
          expect(getPlot(result, 'value').values).toEqual(Array(12).fill(expected));
        });
      }
    }
  }
});
