import { expect, it } from 'vitest';

import { arityBoundaryCases } from '../helpers/arityBoundaryCases';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Shared array.from limit rule: 4000 color, 999 other reference/enum types.
const cases = [
  ['color', 'color.red', 4000, ''],
  ['enum', 'Side.left', 999, 'enum Side\n    left\n    right\n'],
  ['box', 'box(na)', 999, ''],
  ['table', 'table(na)', 999, ''],
  ['linefill', 'linefill(na)', 999, ''],
] as const;

const boundaries = cases.map(([kind, value, limit, setup]) => ({ kind, value, limit, setup }));
for (const { kind, value, setup } of boundaries) {
  it(`array.from ${kind} small call accepts`, () => {
    expect(checkProgram(parse(`//@version=6\nindicator("Arity")\n${setup}values = array.from(${Array(3).fill(value).join(', ')})`)).diagnostics).toEqual([]);
  });
}
for (const { kind, value, limit, setup } of arityBoundaryCases(boundaries))
  it(`array.from ${kind} exact max${limit} accepts, +1 refuses`, () => {
    const errors = (n: number) =>
      checkProgram(
        parse(`//@version=6\nindicator("Arity")\n${setup}values = array.from(${Array(n).fill(value).join(', ')})`),
      ).diagnostics.filter((d) => d.severity === 'error');
    expect(errors(limit)).toEqual([]);
    expect(errors(limit + 1)).toEqual([
      expect.objectContaining({ code: 'argument-count', message: expect.stringContaining(`at most ${limit}`) }),
    ]);
  }, 90_000); // Two maximum-size calls must finish under the shared CPU gate.
