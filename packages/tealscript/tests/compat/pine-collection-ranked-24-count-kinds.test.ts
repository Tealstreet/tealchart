import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const source = (body: string) => `//@version=6\nindicator("Collection boundaries24")\n${body}`;
describe('matrix count accepts different element kinds', () => {
  for (const kind of ['bool', 'string', 'color']) {
    for (const receiver of [false, true]) {
      const call = receiver ? 'm.elements_count()' : 'matrix.elements_count(m)';
      it(`${call} accepts a ${kind} matrix`, () => {
        const result = checkProgram(parse(source(`m = matrix.new<${kind}>(2, 3)\nvalue = ${call}`)));
        expect(result.diagnostics).toEqual([]);
        expect(result.symbols.find((s) => s.name === 'value')?.type).toMatchObject({
          kind: 'int',
          qualifier: 'series',
        });
      });
    }
  }
});
