import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const header = '//@version=6\nindicator("Drawing array seed contracts")\n';
const errors = (source: string) =>
  checkProgram(parse(header + source)).diagnostics.filter((entry) => entry.severity === 'error');

describe('packet 003 bounded line and box array seeds', () => {
  for (const [kind, constructor, foreign] of [
    ['line', 'line.new(0, 7, 1, 9)', 'box.new(0, 9, 1, 7)'],
    ['box', 'box.new(0, 9, 1, 7)', 'line.new(0, 7, 1, 9)'],
  ]) {
    for (const [qualifier, size] of [
      ['const', 'const int size = 2'],
      ['input', 'input int size = input.int(2)'],
      ['simple', 'simple int size = 2'],
      ['series', 'series int size = bar_index + 1'],
    ]) {
      it(`new_${kind} accepts a matching handle with ${qualifier} size and reordered named seed`, () => {
        const source = `seed = ${constructor}\n${size}\nitems = array.new_${kind}(initial_value=seed, size=size)
value = items.get(0)
plot(items.size(), title="size")
plot(${kind === "box" ? "array.indexof(items, value) == 0" : "value == seed"} ? 1 : 0, title="identity")`;
        expect(errors(source)).toEqual([]);
        const result = runCompatScript(header + source, { bars: compatibilityBars.slice(0, 3) });
        expect(result.errors).toEqual([]);
        expect(result.plots.find((plot) => plot.title === 'size')?.values).toEqual(
          qualifier === 'series' ? [1, 2, 3] : [2, 2, 2],
        );
        expect(result.plots.find((plot) => plot.title === 'identity')?.values).toEqual([1, 1, 1]);
      });
    }
    for (const seed of ['na', `${kind}(na)`]) {
      it(`new_${kind} accepts missing reference seed ${seed}`, () => {
        const source = `items = array.new_${kind}(initial_value=${seed}, size=2)\nvalue = items.get(1)\nplot(na(value) ? 1 : 0, title="missing")`;
        expect(errors(source)).toEqual([]);
        const result = runCompatScript(header + source, { bars: compatibilityBars.slice(0, 3) });
        expect(result.errors).toEqual([]);
        expect(result.plots.find((plot) => plot.title === 'missing')?.values).toEqual([1, 1, 1]);
      });
    }
    for (const seed of ['3', '2.5', 'true', '"handle"', 'color.red', foreign]) {
      for (const call of [`array.new_${kind}(2, ${seed})`, `array.new_${kind}(initial_value=${seed}, size=2)`]) {
        it(`new_${kind} refuses wrong seed through exact binding: ${call}`, () => {
          expect(
            errors(`items = ${call}`).some(
              (entry) => entry.code === 'type-mismatch' && entry.message.includes('initial_value'),
            ),
          ).toBe(true);
        });
      }
    }
  }
});
