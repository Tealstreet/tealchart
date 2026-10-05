import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

function errors(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("Visual rules")\n${body}`))
    .diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('Pine flat fill optional color', () => {
  // functions[58] and functions[59] require only the two handle arguments.
  for (const fn of ['plot', 'hline']) {
    for (const named of [false, true]) {
      it(`accepts ${fn} handles without color (${named ? 'named' : 'positional'})`, () => {
        const args = named ? (fn === 'plot' ? 'plot1=a, plot2=b' : 'hline1=a, hline2=b') : 'a, b';
        expect(errors(`a = ${fn}(100)\nb = ${fn}(90)\nfill(${args})`)).toEqual([]);
      });
    }
  }
});
