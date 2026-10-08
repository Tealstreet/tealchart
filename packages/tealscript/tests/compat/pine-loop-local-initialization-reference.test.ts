import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript, type Bar } from '../../src/runtime';

const bars: Bar[] = [17, 4, 23, 9, 12].map((close, index) => ({
  time: (index + 1) * 60_000,
  open: [10, 8, 20, 14, 7][index]!,
  high: close + 20,
  low: close - 20,
  close,
  volume: 100,
}));

const loops = [
  {
    name: 'for',
    source: `int endpoint = active ? 1 : na
for index = 0 to endpoint
    value = index == 0 ? close - open : close + open`,
  },
  {
    name: 'while',
    source: `while active and visited < 2
    value = visited == 0 ? close - open : close + open`,
  },
  {
    name: 'for...in',
    source: `samples = active ? array.from(close - open, close + open) : array.new_float(0)
for value in samples`,
  },
];

describe('documented first execution of persistent loop locals', () => {
  for (const mode of ['var', 'varip']) {
    for (const loop of loops) {
      // Reference entries var, varip and this loop keyword; local persistence:
      // https://www.tradingview.com/pine-script-docs/language/variable-declarations/#var
      // Rejects eager initialization, per-iteration/bar resets, and lost reentry writes.
      it(`${mode} initializes inside ${loop.name} only when its body first executes`, () => {
        const result = executeScript(
          parse(`//@version=6
indicator("Delayed loop local")
var calls = array.new_int(1, 0)
initialize(float value) =>
    array.set(calls, 0, array.get(calls, 0) + 1)
    value
active = bar_index != 0 and bar_index != 2
int visited = 0
float regularTotal = 0
float last = na
${loop.source}
    ${mode} float seed = initialize(value)
    float regular = value
    seed := seed + value
    regular := regular + 1
    regularTotal := regularTotal + regular
    last := seed
    visited := visited + 1
plot(last, "Persistent")
plot(array.get(calls, 0), "Initializations")
plot(regularTotal, "Regular")
plot(visited, "Iterations")`),
          bars,
        );

        expect(result.errors).toEqual([]);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        const values = (title: string) => {
          const plot = result.plots.find((candidate) => candidate.title === title);
          expect(plot, title).toBeDefined();
          return plot!.values;
        };
        expect(values('Persistent')).toEqual([null, 4, null, 22, 46]);
        expect(values('Initializations')).toEqual([0, 1, 1, 1, 1]);
        expect(values('Regular')).toEqual([0, 10, 0, 20, 26]);
        expect(values('Iterations')).toEqual([0, 2, 0, 2, 2]);
      });
    }
  }
});
