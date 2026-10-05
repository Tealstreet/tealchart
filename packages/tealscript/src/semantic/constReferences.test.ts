import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { executeCompiledScript } from '../runtime/codegen/execute';
import { checkProgram } from './checker';

// TradingView v3 accepts const array/matrix/map/line IDs, permits content
// mutation, and rejects ID replacement. Reference values remain series-qualified.
// UDTs are excluded by the current manual; they are refusal controls below.
// https://www.tradingview.com/pine-script-docs/language/type-system/#using-const-with-reference-types
describe('const reference IDs', () => {
  it('keeps enum values const-qualified', () => {
    const result = checkProgram(
      parse(
        '//@version=6\nindicator("enum")\nenum Direction\n    up\n    down\nconst Direction value = Direction.up\nplot(value == Direction.up ? 1 : 0)',
      ),
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toMatchObject({
      kind: 'udt',
      qualifier: 'const',
      name: 'Direction',
    });
  });
  const cases = [
    ['array<float>', 'array.new<float>(1, close)', 'array.set(value, 0, close)', 'array', 'array.get(value, 0)'],
    [
      'matrix<float>',
      'matrix.new<float>(1, 1, close)',
      'matrix.set(value, 0, 0, close)',
      'matrix',
      'matrix.get(value, 0, 0)',
    ],
    ['map<string, float>', 'map.new<string, float>()', 'map.put(value, "a", close)', 'map', 'map.get(value, "a")'],
    ['line', 'line.new(0, close, 1, close)', 'line.set_y1(value, close)', 'line', 'line.get_y1(value)'],
  ];

  function program(body: string) {
    return parse(`//@version=6\nindicator("const reference")\ntype Point\n    float price\n${body}\n`);
  }

  it.each(cases)('keeps const %s series-qualified and permits object mutation', (type, constructor, mutation, kind) => {
    const result = checkProgram(program(`const ${type} value = ${constructor}\n${mutation}`));
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toMatchObject({
      kind,
      qualifier: 'series',
    });
  });

  it.each(cases)('refuses replacing the ID of const %s', (type, constructor) => {
    const result = checkProgram(program(`const ${type} value = ${constructor}\nvalue := ${constructor}`));
    expect(result.diagnostics).toEqual([expect.objectContaining({ code: 'const-reassignment' })]);
  });

  it.each(cases)('checks plot consumption after accepting const %s', (type, constructor) => {
    const result = checkProgram(program(`const ${type} value = ${constructor}\nplot(value, "OUTCOME")`));
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('plot') }),
    ]);
  });

  for (const mode of ['', 'var ']) {
    it.each(cases)(
      `${mode || 'per-bar '}const %s content matches the native close + 1 output`,
      (type, constructor, mutation, _kind, read) => {
        const ast = program(
          `${mode}const ${type} value = ${constructor}\n${mutation.replace(/close/g, 'close + 1')}\nplot(${read}, "OUTCOME")`,
        );
        expect(checkProgram(ast).diagnostics).toEqual([]);
        const result = executeCompiledScript(
          ast,
          [10, 20, 30].map((close, index) => ({
            time: 1700000000000 + index * 60000,
            open: close,
            high: close,
            low: close,
            close,
            volume: 1,
          })),
        );
        expect(result.status).toBe('success');
        if (result.status !== 'success') throw new Error(result.reason);
        expect(result.result.errors).toEqual([]);
        expect(result.result.plots[0].values).toEqual([11, 21, 31]);
      },
    );
  }

  it('refuses a const UDT declaration rather than accepting its constructor', () => {
    const result = checkProgram(program('const Point value = Point.new(close)'));
    expect(result.diagnostics).toEqual([expect.objectContaining({ code: 'qualifier-mismatch' })]);
  });

  it('also refuses replacement after an invalid const UDT declaration', () => {
    const result = checkProgram(program('const Point value = Point.new(close)\nvalue := Point.new(close)'));
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'qualifier-mismatch',
      'const-reassignment',
    ]);
  });

  it('executes mutations through a persistent const array without fixing its contents', () => {
    const ast = program(
      'var const array<float> value = array.new<float>(1, close)\nvalue.set(0, close * 2)\nplot(value.get(0))',
    );
    expect(checkProgram(ast).diagnostics).toEqual([]);
    const result = executeCompiledScript(
      ast,
      [10, 20, 30].map((close, index) => ({
        time: 1700000000000 + index * 60000,
        open: close,
        high: close,
        low: close,
        close,
        volume: 1,
      })),
    );
    expect(result.status).toBe('success');
    if (result.status !== 'success') throw new Error(result.reason);
    expect(result.result.errors).toEqual([]);
    expect(result.result.plots[0].values).toEqual([20, 40, 60]);
  });
});
