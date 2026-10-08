import { expect, it } from 'vitest';

import { arityBoundaryCases } from './arityBoundaryCases';

const cases = [
  { name: 'int', limit: 4000 },
  { name: 'float', limit: 4000 },
  { name: 'string', limit: 999 },
  { name: 'UDT', limit: 999 },
];

it('samples each distinct boundary by default and retains all cases for the sweep', () => {
  expect(arityBoundaryCases(cases, false)).toEqual([cases[0], cases[2]]);
  expect(arityBoundaryCases(cases, true)).toEqual(cases);
});
