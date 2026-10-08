import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Ranked 851–880: reference int/float overloads and empty-array remarks.
// The arrays manual and reference disagree on mode with no repeated winner.
// No no-winner or tied-winner policy is inferred from these unique-mode cases.
const source = (body: string) => `//@version=6\nindicator("aggregate contracts")\n${body}`;
const checked = (body: string) => checkProgram(parse(source(body)));
const call = (route: string, operation: string) =>
  route === 'namespace' ? `array.${operation}(id=values)` : `values.${operation}()`;

describe.each(['namespace', 'receiver'])('ranked array aggregates %s contracts', (route) => {
  it.each([
    ['int', 'array.from(-8, 7, -2, 4)', 15],
    ['float', 'array.from(-8.5, 7.25, -2.0, 4.0)', 15.75],
    ['int singleton', 'array.from(-4)', 0],
    ['float singleton', 'array.from(-4.25)', 0],
    ['int equal', 'array.from(3, 3, 3)', 0],
    ['float equal', 'array.from(3.5, 3.5, 3.5)', 0],
  ])('range returns max minus min for %s', (_name, constructor, expected) => {
    const body = `values = ${constructor}\nresult = ${call(route, 'range')}\nplot(result, title="result")`;
    expect(checked(body).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    const result = runCompatScript(source(body));
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'result').values).toEqual(compatibilityBars.map(() => expected));
  });

  it.each([
    ['int', 'array.from(-8, 7, -8, 4, 7, 7)', 7],
    ['float', 'array.from(-8.5, 7.25, -8.5, 4.0, 7.25, 7.25)', 7.25],
    ['int negative', 'array.from(8, -7, 8, -7, -7)', -7],
    ['float negative', 'array.from(8.5, -7.25, 8.5, -7.25, -7.25)', -7.25],
  ])('mode returns the unique most frequent %s value', (_name, constructor, expected) => {
    const body = `values = ${constructor}\nresult = ${call(route, 'mode')}\nplot(result, title="result")`;
    expect(checked(body).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    const result = runCompatScript(source(body));
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'result').values).toEqual(compatibilityBars.map(() => expected));
  });

  describe.each(['range', 'mode'])('%s overloads', (operation) => {
    it.each(['int', 'float'])('preserves %s kind with a series return', (kind) => {
      const body = `values = array.new<${kind}>(3, 2)\nresult = ${call(route, operation)}\nplot(result)`;
      const result = checked(body);
      expect(result.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'result')?.type).toMatchObject({
        kind,
        qualifier: 'series',
      });
    });

    it.each(['int', 'float'])('refuses assigning its %s series result to const', (kind) => {
      const body = `values = array.new<${kind}>(3, 2)\nconst ${kind} result = ${call(route, operation)}`;
      expect(checked(body).diagnostics).toContainEqual(expect.objectContaining({ code: 'qualifier-mismatch' }));
    });

    it.each(['int', 'float'])('returns na for an empty %s array', (kind) => {
      const body = `values = array.new<${kind}>()\nplot(na(${call(route, operation)}) ? 1 : 0, title="result")`;
      expect(checked(body).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
      const result = runCompatScript(source(body));
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'result').values).toEqual(compatibilityBars.map(() => 1));
    });

    it('keeps a float result even when the declared float array holds integers', () => {
      const body = `values = array.new<float>(3, 2)\nint result = ${call(route, operation)}`;
      expect(checked(body).diagnostics).toContainEqual(
        expect.objectContaining({
          code: 'type-mismatch',
          message: expect.stringContaining('Cannot assign float value to int'),
        }),
      );
    });

    it.each(['array.from(true, false)', 'array.from("a", "b")', 'array.new<Record>()'])(
      'refuses nonnumeric elements in %s',
      (constructor) => {
        const body = `type Record\n    int value\nvalues = ${constructor}\nresult = ${call(route, operation)}`;
        expect(checked(body).diagnostics).toContainEqual(
          expect.objectContaining({
            code: 'type-mismatch',
            message: expect.stringContaining('requires an int or float array'),
          }),
        );
      },
    );
  });
});

describe.each(['range', 'mode'])('ranked array.%s required ID', (operation) => {
  it('requires an array argument in namespace form', () => {
    expect(
      checked(`result = array.${operation}()`).diagnostics.filter((item) => item.severity === 'error'),
    ).not.toEqual([]);
  });

  it.each(['1', '1.5', 'true', '"wrong"'])('refuses scalar ID %s', (id) => {
    expect(checked(`result = array.${operation}(${id})`).diagnostics).toContainEqual(
      expect.objectContaining({ code: 'type-mismatch' }),
    );
  });
});
