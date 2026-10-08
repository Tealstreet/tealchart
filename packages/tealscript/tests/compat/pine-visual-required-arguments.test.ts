import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Authority: Pine v6 reference functions[1..8], [56..59], required arguments.
const contracts = [
  { name: 'plot', entry: 1, defaults: { series: '2' }, required: ['series'] },
  { name: 'plotshape', entry: 2, defaults: { series: 'true' }, required: ['series'] },
  { name: 'plotchar', entry: 3, defaults: { series: 'true' }, required: ['series'] },
  { name: 'plotarrow', entry: 4, defaults: { series: '-2' }, required: ['series'] },
  { name: 'plotbar', entry: 5, defaults: { open: '2', high: '4', low: '-3', close: '1' }, required: ['open', 'high', 'low', 'close'] },
  { name: 'plotcandle', entry: 6, defaults: { open: '2', high: '4', low: '-3', close: '1' }, required: ['open', 'high', 'low', 'close'] },
  { name: 'barcolor', entry: 7, defaults: { color: '#123456' }, required: ['color'] },
  { name: 'bgcolor', entry: 8, defaults: { color: '#123456' }, required: ['color'] },
  { name: 'hline', entry: 56, defaults: { price: '-3' }, required: ['price'] },
  { name: 'fill', entry: 57, defaults: { plot1: 'p', plot2: 'q', top_value: '2', bottom_value: '-3', top_color: '#123456', bottom_color: '#654321' }, required: ['plot1', 'plot2'] },
  { name: 'fill', entry: 58, defaults: { hline1: 'h', hline2: 'i', color: '#123456' }, required: ['hline1', 'hline2'] },
  { name: 'fill', entry: 59, defaults: { plot1: 'p', plot2: 'q', color: '#123456' }, required: ['plot1', 'plot2'] },
] as const;

function errors(name: string, args: string[]) {
  return checkProgram(parse(`//@version=6
indicator("Required visual arguments")
p = plot(2)
q = plot(-3)
h = hline(2)
i = hline(-3)
${name}(${args.join(', ')})`)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('documented visual required argument identities', () => {
  for (const contract of contracts) {
    for (const missing of contract.required) {
      it(`${contract.name} requires ${missing} even with an optional title [functions[${contract.entry}]]`, () => {
        const entries = Object.entries(contract.defaults);
        expect(errors(contract.name, entries.map(([, value]) => value))).toEqual([]);
        const named = entries.map(([parameter, value]) => `${parameter}=${value}`);
        expect(errors(contract.name, ['title="Required"', ...named.reverse()])).toEqual([]);
        const incomplete = entries.filter(([parameter]) => parameter !== missing).map(([parameter, value]) => `${parameter}=${value}`);
        expect(errors(contract.name, ['title="Required"', ...incomplete])).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'argument-count' })]),
        );
      });
    }
  }
});
