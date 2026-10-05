import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Shared array.from limit rule: 4000 color, 999 other reference/enum types.
for (const [kind, value, limit, setup] of [
  ['color', 'color.red', 4000, ''],
  ['enum', 'Side.left', 999, 'enum Side\n    left\n    right\n'],
  ['box', 'box(na)', 999, ''],
  ['table', 'table(na)', 999, ''],
  ['linefill', 'linefill(na)', 999, ''],
] as const)
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
