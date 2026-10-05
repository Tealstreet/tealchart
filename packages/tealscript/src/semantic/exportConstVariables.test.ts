import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

function errors(declaration: string) {
  return checkProgram(
    parse(`//@version=6\nlibrary("Constants")\n${declaration}\nexport identity(float x) => x\n`),
  ).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('exported variable declaration contract', () => {
  it.each(['int VALUE = 2', 'float VALUE = 2.5', 'string VALUE = "a"', 'bool VALUE = true', 'color VALUE = color.red'])(
    'requires explicit const for exported %s',
    (declaration) => {
      expect(errors(`export ${declaration}`)).toContainEqual(expect.objectContaining({ code: 'library-export' }));
      expect(errors(`export const ${declaration}`)).toEqual([]);
    },
  );

  it.each(['line', 'label', 'array<float>', 'matrix<float>', 'map<string, float>'])(
    'refuses exported const reference %s even with a constant na initializer',
    (type) => {
      expect(errors(`export const ${type} VALUE = na`)).toContainEqual(
        expect.objectContaining({ code: 'library-export' }),
      );
    },
  );

  it.each(['input', 'simple', 'series'])('refuses the %s qualifier on exported fundamental variables', (qualifier) => {
    expect(errors(`export ${qualifier} int VALUE = 2`)).toContainEqual(
      expect.objectContaining({ code: 'library-export' }),
    );
  });
});
