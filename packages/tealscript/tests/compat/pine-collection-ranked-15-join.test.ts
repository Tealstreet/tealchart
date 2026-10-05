import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const errors = (body: string) =>
  checkProgram(parse(`//@version=6\nindicator("Collection 15")\n${body}`)).diagnostics.filter(
    (d) => d.severity === 'error',
  );
const constant = (body: string, expected: number) => {
  expect(errors(body)).toEqual([]);
  const result = runCompatScript(`//@version=6\nindicator("Collection 15")\n${body}`);
  expect(result.errors).toEqual([]);
  expect(getPlot(result, 'result').values).toEqual(compatibilityBars.map(() => expected));
};

describe('Collection ranked 15: join', () => {
  it('join ordered separated string', () => {
    constant(
      'a = array.from("red", "blue", "green")\nstring joined = array.join(a, "|")\nplot(joined == "red|blue|green" ? 1 : 0, title="result")',
      1,
    );
  });
  it('join returns series string', () => {
    expect(
      errors('f(simple string s) => s\na = array.from("red", "blue")\nx = f(array.join(a, "|"))').length,
    ).toBeGreaterThan(0);
  });
  it('method join result is series string', () => {
    expect(errors('f(simple string s) => s\na = array.from("red", "blue")\nx = f(a.join("|"))').length).toBeGreaterThan(
      0,
    );
  });
  it('literal simple string control stays accepted', () => {
    constant('f(simple string s) => s\nx = f("red")\nplot(x == "red" ? 1 : 0, title="result")', 1);
  });
  it('join result accepted by series string UDF', () => {
    constant(
      'f(series string s) => s\na = array.from("red", "blue")\nx = f(array.join(a, "|"))\nplot(x == "red|blue" ? 1 : 0, title="result")',
      1,
    );
  });
  it('custom join method keeps its own return contract', () => {
    expect(
      errors(
        'method join(array<string> a) => "custom"\nf(simple string s) => s\na = array.from("red")\nx = f(a.join())',
      ),
    ).toEqual([]);
  });
});
