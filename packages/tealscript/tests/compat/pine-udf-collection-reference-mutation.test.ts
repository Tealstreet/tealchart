import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript, type Bar } from '../../src/runtime';
import { checkProgram } from '../../src/semantic/checker';

const bars: Bar[] = [17, 4, 23, 9, 12].map((close, index) => ({
  time: (index + 1) * 60_000,
  open: [10, 8, 20, 14, 7][index]!,
  high: close + 20,
  low: close - 20,
  close,
  volume: 100,
}));

const collections = [
  {
    name: 'matrix',
    type: 'matrix<float>',
    setup: 'var shared = matrix.new<float>(1, 2, -31)\nif barstate.isfirst\n    matrix.set(shared, 0, 0, 13)',
    read: (id: string) => `matrix.get(${id}, 0, 0)`,
    write: (id: string) => `matrix.set(${id}, 0, 0, before + delta)`,
    sentinel: 'matrix.get(shared, 0, 1)',
  },
  {
    name: 'map',
    type: 'map<string, float>',
    setup: 'var shared = map.new<string, float>()\nif barstate.isfirst\n    map.put(shared, "total", 13)\n    map.put(shared, "sentinel", -31)',
    read: (id: string) => `map.get(${id}, "total")`,
    write: (id: string) => `map.put(${id}, "total", before + delta)`,
    sentinel: 'map.get(shared, "sentinel")',
  },
];

describe('documented UDF mutation of referenced collections', () => {
  for (const collection of collections) {
    for (const binding of ['global', 'parameter']) {
      // Reference entries =>, matrix.set and map.put: setters mutate the object.
      // https://www.tradingview.com/pine-script-docs/language/user-defined-functions/#function-scopes
      // Mutating referenced data preserves the caller's ID and untouched members.
      it(`mutates a ${collection.name} through its ${binding} reference`, () => {
        const target = binding === 'global' ? 'shared' : 'target';
        const ast = parse(`//@version=6
indicator("UDF shared collection")
${collection.setup}
alias = shared
mutate(${binding === 'parameter' ? `${collection.type} target, ` : ''}float delta) =>
    before = ${collection.read(target)}
    ${collection.write(target)}
    [before, ${collection.read(target)}]
plot(${collection.read('alias')}, "Before")
[prior, observed] = mutate(${binding === 'parameter' ? 'alias, ' : ''}close - open)
plot(prior, "Prior")
plot(observed, "Returned")
plot(${collection.read('shared')}, "Shared")
plot(${collection.read('alias')}, "Alias")
plot(${collection.sentinel}, "Sentinel")`);
        expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
        const result = executeScript(ast, bars);
        expect(result.errors).toEqual([]);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        const values = (title: string) => {
          const plot = result.plots.find((candidate) => candidate.title === title);
          expect(plot, title).toBeDefined();
          return plot!.values;
        };
        expect(values('Before')).toEqual([13, 20, 16, 19, 14]);
        expect(values('Prior')).toEqual([13, 20, 16, 19, 14]);
        for (const title of ['Returned', 'Shared', 'Alias']) {
          expect(values(title)).toEqual([20, 16, 19, 14, 19]);
        }
        expect(values('Sentinel')).toEqual([-31, -31, -31, -31, -31]);
      });
    }
  }
});
