import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// The v5 and v6 Arrays manuals' "Distance from high" example passes a
// fractional index directly to array.get and specifies floor(fillNo).
// Native v5 captures refuse literal float getters; integer-derived division remains accepted.
const bars = compatibilityBars.slice(0, 3);
const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');

function run(body: string, version: number, selectedBars = bars) {
  const source = `//@version=${version}\nindicator("Floored array indices")\n${body}`;
  expect(errors(source)).toEqual([]);
  const result = runCompatScript(source, { bars: selectedBars });
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors ?? 0).toBe(0);
  return result;
}

describe.each([5, 6])('manual float array indices in v%s', (version) => {
  it('runs the Distance from high formula with its fractional index', () => {
    const selectedBars = Array.from({ length: 17 }, (_, i) => ({
      ...bars[0]!,
      time: bars[0]!.time + i * 60_000,
      high: i < 12 ? 110 - i : 130 - (i - 12),
      low: 90,
      open: 95,
      close: 96,
    }));
    const result = run(
      `lookbackInput = input.int(10)
fillColors = array.from(color.new(color.green, 70), color.new(color.green, 75), color.new(color.green, 80), color.new(color.green, 85), color.new(color.green, 90))
lastHiBar = -ta.highestbars(high, lookbackInput)
fillNo = math.min(lastHiBar / (lookbackInput / 5), 4)
bgcolor(array.get(fillColors, fillNo))
plot(array.get(array.from(10, 20, 30, 40, 50), fillNo), title="Selected")`,
      version,
      selectedBars,
    );
    expect(getPlot(result, 'Selected').values).toEqual([
      ...Array<number | null>(9).fill(null),
      50,
      50,
      50,
      10,
      10,
      20,
      20,
      30,
    ]);
  });

  it.each([
    ['namespace', '', 'array.get(values, position)'],
    ['named namespace', '', 'array.get(index=position, id=values)'],
    ['receiver', '', 'values.get(position)'],
    ['erased UDF', 'read(receiver, index) => receiver.get(index)', 'read(values, position)'],
  ])('floors a changing supplied index through %s', (_name, declaration, call) => {
    const result = run(
      `${declaration}
values = array.from(10, 20, 30)
position = (bar_index * 10 + 9) / 10
plot(${call}, title="Selected")`,
      version,
    );
    expect(getPlot(result, 'Selected').values).toEqual([10, 20, 30]);
  });

  it.each(['19 / 10', 'input.int(19) / 10', 'simplePosition / 10'])('accepts weaker numeric index qualifiers: %s', (index) => {
    const result = run(
      `simple int simplePosition = 19
values = array.from(10, 20, 30)
plot(array.get(values, ${index}), title="Selected")`,
      version,
    );
    expect(getPlot(result, 'Selected').values).toEqual([20, 20, 20]);
  });

  it.each(['array.set(values, index=1.9, value=77)', 'values.set(index=1.9, value=77)'])(
    'floors a write index: %s',
    (call) => {
      const result = run(
        `values = array.from(10, 20, 30)
${call}
plot(array.get(values, 0), title="First")
plot(array.get(values, 1), title="Second")
plot(array.get(values, 2), title="Third")`,
        version,
      );
      expect(getPlot(result, 'First').values).toEqual([10, 10, 10]);
      expect(getPlot(result, 'Second').values).toEqual([77, 77, 77]);
      expect(getPlot(result, 'Third').values).toEqual([30, 30, 30]);
    },
  );

  it.each(['array.fill(values, 77, index_from=0.1, index_to=1.9)', 'values.fill(77, index_from=0.1, index_to=1.9)'])(
    'floors both fill bounds before looping: %s',
    (call) => {
      const result = run(
        `values = array.from(10, 20, 30)
${call}
plot(array.get(values, 0), title="First")
plot(array.get(values, 1), title="Second")
plot(array.get(values, 2), title="Third")`,
        version,
      );
      expect(getPlot(result, 'First').values).toEqual([77, 77, 77]);
      expect(getPlot(result, 'Second').values).toEqual([20, 20, 20]);
      expect(getPlot(result, 'Third').values).toEqual([30, 30, 30]);
    },
  );

  it.each(['array.get(values, 31 / 10)', 'values.get(31 / 10)', 'array.set(values, 3.1, 77)', 'values.set(3.1, 77)'])(
    'preserves finite bounds after flooring: %s',
    (call) => {
      const source = `//@version=${version}\nindicator("Finite bounds")\nvalues = array.from(10, 20, 30)\n${call}`;
      expect(errors(source)).toEqual([]);
      expect(runCompatScript(source, { bars }).errors).toEqual([
        expect.objectContaining({ message: expect.stringContaining('out of bounds') }),
      ]);
    },
  );

  it.each(['array.get(values, input.int(-2) / 10)', 'values.get(input.int(-2) / 10)'])(
    'preserves the versioned negative-index rule: %s',
    (call) => {
      const source = `//@version=${version}\nindicator("Negative index")\nvalues = array.from(10, 20, 30)\nplot(${call}, title="Selected")`;
      expect(errors(source)).toEqual([]);
      const result = runCompatScript(source, { bars });
      if (version === 5) {
        expect(result.errors).toEqual([
          expect.objectContaining({ message: expect.stringContaining('negative in this Pine version') }),
        ]);
      } else {
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'Selected').values).toEqual([30, 30, 30]);
      }
    },
  );

  it.each(version === 6 ? ['array.get(values, -12 / 10)', 'values.get(-12 / 10)'] : [])(
    'floors before v6 end-relative translation: %s',
    (call) => {
      const result = run(`values = array.from(10, 20, 30)\nplot(${call}, title="Selected")`, version);
      expect(getPlot(result, 'Selected').values).toEqual([20, 20, 20]);
    },
  );

  it.each(['array.get(values, VALUE)', 'values.set(VALUE, 77)', 'array.fill(values, 77, VALUE, 2)'])(
    'still refuses nonnumeric supplied indices: %s',
    (call) => {
      for (const value of ['"1"', 'false']) {
        const source = `//@version=${version}\nindicator("Index kind")\nvalues = array.from(10, 20, 30)\n${call.replace('VALUE', value)}`;
        expect(errors(source)).toEqual([expect.objectContaining({ code: 'type-mismatch' })]);
      }
    },
  );
});

describe('explicit float getter parameters', () => {
  it('refuses a float-kind UDF index without integer-derived provenance', () => {
    const source = `//@version=6
indicator("Typed float getter")
read(array<int> receiver, float index) => receiver.get(index)
plot(read(array.from(10, 20, 30), 1.5))`;
    expect(errors(source)).toEqual([expect.objectContaining({ code: 'type-mismatch' })]);
  });
});

describe('floored v6 reference writes', () => {
  it.each(['array.set(values, -0.2, 77)', 'values.set(-0.2, 77)'])('floors the end-relative write: %s', (call) => {
    const result = run(
      `values = array.from(10, 20, 30)
${call}
plot(array.get(values, 0), title="First")
plot(array.get(values, 2), title="Last")`,
      6,
    );
    expect(getPlot(result, 'First').values).toEqual([10, 10, 10]);
    expect(getPlot(result, 'Last').values).toEqual([77, 77, 77]);
  });

  it.each(['array.get(view, -2 / 10)', 'view.get(-2 / 10)'])('floors inside a live slice: %s', (call) => {
    const result = run(
      `values = array.from(10, 20, 30, 40)
view = array.slice(values, 1, 3)
plot(${call}, title="Selected")
view.set(-1.2, 77)
plot(values.get(1), title="Parent")`,
      6,
    );
    expect(getPlot(result, 'Selected').values).toEqual([30, 30, 30]);
    expect(getPlot(result, 'Parent').values).toEqual([77, 77, 77]);
  });
});
