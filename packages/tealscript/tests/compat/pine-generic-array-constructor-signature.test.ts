import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const source = (body: string) => `//@version=6\nindicator("Generic array signature")\n${body}`;
const bars = compatibilityBars.slice(0, 3);

describe('generic array.new preserves its template and bound constructor arguments', () => {
  for (const [kind, seed] of [
    ['int', '-17'],
    ['float', '-13.25'],
    ['bool', 'true'],
    ['string', '"seed"'],
    ['color', '#123456'],
  ]) {
    for (const named of [false, true]) {
      it(`seeds all ${kind} slots and returns typed series with ${named ? 'named' : 'positional'} arguments`, () => {
        const call = named ? `array.new<${kind}>(initial_value=${seed}, size=3)` : `array.new<${kind}>(3, ${seed})`;
        const text = source(`items = ${call}\nplot(items.size(), "size")
plot(items.get(0) == ${seed} and items.get(1) == ${seed} and items.get(2) == ${seed} ? 1 : 0, "seeds")`);
        const checked = checkProgram(parse(text));
        expect(checked.diagnostics).toEqual([]);
        expect(checked.symbols.find((symbol) => symbol.name === 'items')?.type).toEqual({
          kind: 'array',
          qualifier: 'series',
          elementType: { kind },
        });
        const result = runCompatScript(text, { bars });
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'size').values).toEqual([3, 3, 3]);
        expect(getPlot(result, 'seeds').values).toEqual([1, 1, 1]);
      });
    }
  }

  for (const kind of ['int', 'float']) {
    it(`defaults ${kind} size to zero and omitted nonempty seeds to NA`, () => {
      const result = runCompatScript(
        source(`empty = array.new<${kind}>()
missing = array.new<${kind}>(size=3)
plot(empty.size(), "empty")
plot(missing.size(), "size")
plot(na(missing.get(0)) and na(missing.get(1)) and na(missing.get(2)) ? 1 : 0, "missing")`),
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'empty').values).toEqual([0, 0, 0]);
      expect(getPlot(result, 'size').values).toEqual([3, 3, 3]);
      expect(getPlot(result, 'missing').values).toEqual([1, 1, 1]);
    });
  }

  for (const [qualifier, declaration, sizes] of [
    ['const', 'const int count = 2', [2, 2, 2]],
    ['input', 'count = input.int(2)', [2, 2, 2]],
    ['simple', 'simple int count = 2', [2, 2, 2]],
    ['series', 'series int count = bar_index + 1', [1, 2, 3]],
  ] as const) {
    it(`accepts ${qualifier} size and series initial values`, () => {
      const result = runCompatScript(
        source(`${declaration}\nitems = array.new<float>(initial_value=close, size=count)
plot(items.size(), "size")\nplot(items.get(count - 1), "tail")`),
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'size').values).toEqual(sizes);
      expect(getPlot(result, 'tail').values).toEqual(bars.map((bar) => bar.close));
    });
  }

  for (const [kind, declaration, seed, condition] of [
    ['Tone', 'enum Tone\n    quiet\n    loud', 'Tone.loud', 'items.get(0) == Tone.loud and items.get(1) == Tone.loud'],
    [
      'Reading',
      'type Reading\n    float value',
      'Reading.new(17.25)',
      'items.get(0).value == 17.25 and items.get(1).value == 17.25',
    ],
    ['chart.point', '', 'chart.point.from_index(7, -13.5)', 'items.get(0).index == 7 and items.get(1).price == -13.5'],
    ['line', '', 'line.new(0, 7, 1, 9)', 'items.get(0).get_y1() == 7 and items.get(1).get_y2() == 9'],
  ]) {
    it(`supports an ordinary ${kind} template with matching seed`, () => {
      const text = source(`${declaration}\nitems = array.new<${kind}>(initial_value=${seed}, size=2)
plot(items.size(), "size")\nplot(${condition} ? 1 : 0, "seed")`);
      expect(checkProgram(parse(text)).diagnostics).toEqual([]);
      const result = runCompatScript(text, { bars });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'size').values).toEqual([2, 2, 2]);
      expect(getPlot(result, 'seed').values).toEqual([1, 1, 1]);
    });
  }

  for (const call of ['array.new<int>(2, "bad")', 'array.new<int>(initial_value="bad", size=2)']) {
    it(`refuses an incompatible template seed in ${call}`, () => {
      expect(checkProgram(parse(source(`items = ${call}\nplot(0)`))).diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('initial_value') }),
        ]),
      );
    });
  }
});
