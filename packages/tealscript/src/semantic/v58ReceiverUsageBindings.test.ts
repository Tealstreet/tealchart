import { expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

for (const version of [5, 6]) {
  for (const name of ['xs', 'array', 'ta', 'line']) {
    it(`v${version} receiver ${name} used as method object`, () => {
      const source = `//@version=${version}\nindicator("receiver usage")\nmethod score(array<int> ${name}) => ${name}.get(0)\nplot(array.from(3).score())`;
      expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    });
  }
}

for (const version of [5, 6]) {
  for (const name of ['xs', 'array', 'ta', 'line']) {
    it(`v${version} receiver ${name} used as UDT field object`, () => {
      const source = `//@version=${version}\nindicator("field usage")\ntype Holder\n    int value\nmethod score(Holder ${name}) => ${name}.value\nplot(Holder.new(3).score())`;
      expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    });
  }
}
