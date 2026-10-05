import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const errors = (body: string) =>
  checkProgram(parse(`//@version=6\nindicator("Collection nesting")\n${body}\nplot(1)`)).diagnostics.filter(
    (d) => d.severity === 'error',
  );
describe('ledger gaps43 direct nested collection restriction', () => {
  it.each(['array<int>', 'matrix<float>', 'map<string,int>'])(
    '1703 refuses array element %s constructor and annotation',
    (type) => {
      expect(errors(`array<${type}> a=array.new<${type}>()`)).toContainEqual(
        expect.objectContaining({ code: 'invalid-type-template' }),
      );
    },
  );
  it.each(['array<int>', 'matrix<float>', 'map<string,int>'])('1703 refuses matrix element %s', (type) => {
    expect(errors(`matrix<${type}> m=matrix.new<${type}>()`)).toContainEqual(
      expect.objectContaining({ code: 'invalid-type-template' }),
    );
  });
  it.each(['array<int>', 'matrix<float>', 'map<string,int>'])('1703 refuses map value %s', (type) => {
    expect(errors(`map<string,${type}> m=map.new<string,${type}>()`)).toContainEqual(
      expect.objectContaining({ code: 'invalid-type-template' }),
    );
  });
  it('1703 permits UDT indirection to collection IDs', () => {
    expect(
      errors(
        'type State\n    array<int> values\ns=State.new(array.new<int>())\narray<State> states=array.new<State>()\narray.push(states,s)',
      ),
    ).toEqual([]);
  });
  it.each(['array.new<int>()', 'matrix.new<float>()', 'map.new<string,int>()'])(
    '1703 refuses inferred array.from nested %s element',
    (value) => {
      expect(errors(`a=array.from(${value})`)).toContainEqual(
        expect.objectContaining({ code: 'invalid-type-template' }),
      );
    },
  );
});
