import type { Bar } from '../../src/runtime/context';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';

const bars: Bar[] = [12, 17, 23].map((close, index) => ({
  time: (index + 1) * 60_000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 10,
}));

function check(body: string) {
  const ast = parse(`//@version=6\nindicator("Array constructor parameters")\n${body}`);
  const errors = checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  return { ast, errors };
}

function values(body: string) {
  const { ast, errors } = check(body);
  expect(errors).toEqual([]);
  const result = executeScript(ast, bars);
  expect(result.errors).toEqual([]);
  return result.plots.map((plot) => plot.values);
}

describe('array.new size and initial_value clauses 431/432', () => {
  it.each(['array.new<float>()', 'array.new<float>(initial_value=7)'])(
    'defaults the omitted size to zero: %s',
    (constructor) => {
      expect(values(`items = ${constructor}\nplot(array.size(items))`)).toEqual([[0, 0, 0]]);
    },
  );

  it.each(['array.new<float>(bar_index + 1, close)', 'array.new<float>(initial_value=close, size=bar_index + 1)'])(
    'uses the current series-int size and seeds every slot: %s',
    (constructor) => {
      expect(
        values(`items = ${constructor}
plot(array.size(items))
plot(array.get(items, 0))
plot(array.get(items, bar_index))`),
      ).toEqual([
        [1, 2, 3],
        [12, 17, 23],
        [12, 17, 23],
      ]);
    },
  );

  it.each(['array.new<float>(2)', 'array.new<float>(size=2)'])(
    'defaults each numeric initial_value to missing: %s',
    (constructor) => {
      expect(
        values(`items = ${constructor}
plot(array.size(items))
plot(na(array.get(items, 0)) ? 1 : 0)
plot(na(array.get(items, 1)) ? 1 : 0)`),
      ).toEqual([
        [2, 2, 2],
        [1, 1, 1],
        [1, 1, 1],
      ]);
    },
  );

  it.each(['array.new<float>(1.5, 7)', 'array.new<float>(initial_value=7, size=1.5)'])(
    'refuses a float size: %s',
    (constructor) => {
      expect(check(`items = ${constructor}`).errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('size') }),
        ]),
      );
    },
  );

  it.each(['array.new<int>(2, "bad")', 'array.new<int>(initial_value="bad", size=2)'])(
    'refuses an incompatible initial_value: %s',
    (constructor) => {
      expect(check(`items = ${constructor}`).errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('initial_value') }),
        ]),
      );
    },
  );
});
