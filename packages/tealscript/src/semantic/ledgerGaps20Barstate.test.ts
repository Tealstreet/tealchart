import { expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

it('ledger775: barstate.isrealtime has the exact documented series bool type', () => {
  const result = checkProgram(
    parse('//@version=6\nindicator("realtime type")\nx = barstate.isrealtime\nplot(x ? 1 : 0)'),
  );
  expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  expect(result.symbols.find((symbol) => symbol.name === 'x')?.type).toEqual({ kind: 'bool', qualifier: 'series' });
});
