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

describe('Collection ranked 15: includes', () => {
  it('includes method int finds value and distinguishes absence', () => {
    constant(
      'array<int> a = array.from(2, 7, 11)\nplot(a.includes(value=7) and not a.includes(value=9) ? 1 : 0, title="result")',
      1,
    );
  });
  it('includes method float finds value and distinguishes absence', () => {
    constant(
      'array<float> a = array.from(2.5, 7.25, 11.5)\nplot(a.includes(value=7.25) and not a.includes(value=9.25) ? 1 : 0, title="result")',
      1,
    );
  });
  it('includes method string finds value and distinguishes absence', () => {
    constant(
      'array<string> a = array.from("red", "blue")\nplot(a.includes(value="blue") and not a.includes(value="green") ? 1 : 0, title="result")',
      1,
    );
  });
  it('includes method bool finds value and distinguishes absence', () => {
    constant(
      'array<bool> a = array.from(true, true)\nplot(a.includes(value=true) and not a.includes(value=false) ? 1 : 0, title="result")',
      1,
    );
  });
  it('includes requires value', () => {
    expect(errors('a = array.from(1, 2)\nx = a.includes()').length).toBeGreaterThan(0);
  });
  it('includes refuses incompatible search value', () => {
    expect(errors('a = array.from(1, 2)\nx = a.includes(value="two")').length).toBeGreaterThan(0);
  });
  it('namespace rejects incompatible search value', () => {
    expect(errors('a = array.from(1, 2)\nx = array.includes(id=a, value="two")').length).toBeGreaterThan(0);
  });
  it('float array accepts an int search value', () => {
    constant('a = array.from(1.0, 2.0)\nplot(a.includes(2) ? 1 : 0, title="result")', 1);
  });
  it('custom includes method can accept a different search contract', () => {
    expect(
      errors(
        'method includes(array<int> a, string value) => value == "two"\na = array.from(1, 2)\nx = a.includes(value="two")',
      ),
    ).toEqual([]);
  });
  it('method accepts a series element search value', () => {
    constant('a = array.from(close, high)\nplot(a.includes(value=close) ? 1 : 0, title="result")', 1);
  });
});
