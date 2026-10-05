import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const diagnostics = (body: string) =>
  checkProgram(
    parse(`//@version=6
indicator("Input defaults")
${body}
plot(close)`),
  ).diagnostics;

describe('input review numeric source defaults', () => {
  it.each(['"bad"', 'true', 'color.red', 'array.new_float()'])(
    'rejects nonnumeric source %s for both argument bindings',
    (value) => {
      for (const arg of [value, `defval=${value}`]) {
        expect(diagnostics(`v=input.source(${arg})`)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('defval') }),
          ]),
        );
      }
    },
  );
  it.each(['3', '3.5', 'close', 'hlc3', 'close * 2'])('admits numeric source %s without a const ceiling', (value) =>
    expect(diagnostics(`v=input.source(${value})`)).toEqual([]),
  );
});

describe('input review generic default kinds', () => {
  it.each(['array.new_float()', 'matrix.new<float>()', 'map.new<string, float>()', 'line.new(0, 1, 1, 2)'])(
    'rejects unsupported reference default %s',
    (value) =>
      expect(diagnostics(`v=input(${value})`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('defval') }),
        ]),
      ),
  );
  it.each(['true', '3', '1.0', '"abc"', 'color.red', 'close'])('admits documented generic default %s', (value) =>
    expect(diagnostics(`v=input(${value})`)).toEqual([]),
  );
  it('preserves a local callable named input', () => {
    expect(
      diagnostics(`input(array<float> values) => array.size(values)
v=input(array.new_float())`),
    ).toEqual([]);
  });
});

describe('input review source parameter qualifier', () => {
  it('admits a series numeric default through a typed UDF parameter', () => {
    expect(
      diagnostics(`source(float value) => input.source(value)
v=source(close)`),
    ).toEqual([]);
  });
});
