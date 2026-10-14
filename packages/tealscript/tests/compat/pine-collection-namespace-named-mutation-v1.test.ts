import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { checkProgram } from '../../src/semantic/checker';
import { expectedVersionAdvisories } from '../helpers/expectedVersionAdvisory';

const families = [
  { namespace: 'array', initializer: 'array.new_int(2, 1)', calls: ['push(VALUE)', 'set(0, VALUE)', 'unshift(VALUE)', 'fill(VALUE)', 'insert(0, VALUE)'] },
  { namespace: 'map', initializer: 'map.new<string, int>()', calls: ['put("k", VALUE)'] },
  { namespace: 'matrix', initializer: 'matrix.new<int>(2, 2, 1)', calls: ['set(0, 0, VALUE)', 'fill(VALUE)'] },
];

describe('collection mutation binding follows the selected call form', () => {
  for (const version of [5, 6]) {
    for (const { namespace, initializer, calls } of families) {
      for (const call of calls) {
        for (const name of [namespace, 'fresh']) {
          it(`v${version} checks ${name}.${call}`, () => {
            const source = `//@version=${version}\nindicator("Mutation")\n${name} = ${initializer}\n${name}.${call.replace('VALUE', '"bad"')}\nplot(1)`;
            const diagnostics = checkProgram(parse(source)).diagnostics;
            expect(diagnostics).toHaveLength(expectedVersionAdvisories(version).length + 1);
            expect(diagnostics).toEqual([...expectedVersionAdvisories(version), {
              code: 'type-mismatch', severity: 'error',
              message: `Cannot use string value as int ${namespace === 'map' ? 'map value' : `${namespace} element`}`,
              line: 4, column: source.split('\n')[3]!.indexOf('"bad"') + 1,
            }]);
          });
          it(`v${version} admits ${name}.${call} with an integer`, () => {
            const source = `//@version=${version}\nindicator("Mutation")\n${name} = ${initializer}\n${name}.${call.replace('VALUE', '2')}\nplot(1)`;
            expect(checkProgram(parse(source)).diagnostics).toEqual(expectedVersionAdvisories(version));
          });
        }
        it(`v${version} preserves explicit ${namespace}.${call} beside a same-name value`, () => {
          const args = call.replace('VALUE', '"bad"');
          const explicit = args.replace('(', `(${namespace}, `);
          const source = `//@version=${version}\nindicator("Mutation")\n${namespace} = ${initializer}\n${namespace}.${explicit}\nplot(1)`;
          expect(checkProgram(parse(source)).diagnostics.at(-1)).toMatchObject({ code: 'type-mismatch', severity: 'error' });
        });
      }
    }
  }
});
