import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const diagnostics = (fields: string) =>
  checkProgram(parse(`//@version=6\nindicator("UDT default contracts")\ntype State\n${fields}\nplot(1)`)).diagnostics;
describe('ledger gaps43 UDT default call prohibition', () => {
  it.each([
    ['generic array', 'array<int> x = array.new<int>()'],
    ['legacy array', 'array<float> x = array.new_float(0)'],
    ['matrix', 'matrix<float> x = matrix.new<float>()'],
    ['map', 'map<string,float> x = map.new<string,float>()'],
    ['table', 'table x = table.new(position.top_right,1,1)'],
  ])('1696 refuses %s constructor field default', (_, field) => {
    expect(diagnostics('    ' + field)).toContainEqual(
      expect.objectContaining({ code: 'invalid-field-default', severity: 'error' }),
    );
  });
  it('1696 preserves literal and compatible builtin field defaults', () => {
    expect(
      diagnostics(
        '    float x = close\n    int i = -1\n    bool enabled = true\n    string title = "x"\n    color shade = #123456\n    float missing = na',
      ),
    ).toEqual([]);
  });
  it('1696 permits collection fields without a constructor default', () => {
    expect(diagnostics('    array<int> x\n    matrix<float> m\n    map<string,float> lookup')).toEqual([]);
  });
  it('preserves the existing earlier-version constructor-default extension', () => {
    expect(
      checkProgram(
        parse(
          '//@version=5\nindicator("Legacy defaults")\ntype State\n    array<int> values=array.new<int>()\nplot(1)',
        ),
      ).diagnostics,
    ).toEqual([]);
  });
});
