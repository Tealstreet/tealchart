import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';

const bars = [11, 4, 9].map((close, index) => ({
  time: (index + 1) * 60_000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 100,
}));

describe('ledger gaps 45: local scalar discard execution', () => {
  it.each([
    [
      'function',
      'consume() =>\n    _ = record(1)\n    _ = record(2)\n    array.get(effects, 0)\nplot(consume())',
      [3, 6, 9],
    ],
    ['conditional block', 'if true\n    _ = record(1)\n    _ = record(2)\nplot(array.get(effects, 0))', [3, 6, 9]],
    ['loop block', 'for i = 1 to 2\n    _ = record(1)\n    _ = record(2)\nplot(array.get(effects, 0))', [6, 12, 18]],
  ] as const)('1797 evaluates repeated scalar discard initializers in a %s', (_scope, body, expected) => {
    const program = parse(
      `//@version=6\nindicator("Discard effects")\nvar effects = array.new_int(1, 0)\nrecord(int amount) =>\n    array.set(effects, 0, array.get(effects, 0) + amount)\n    amount\n${body}\n`,
    );
    expect(checkProgram(program).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = executeScript(program, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([expected]);
  });
});
