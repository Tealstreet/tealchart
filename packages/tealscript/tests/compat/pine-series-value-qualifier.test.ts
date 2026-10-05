import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const header = '//@version=6\nindicator("Series value qualifier")\n';

describe('series primitive value qualifier, rank362', () => {
  it.each([
    ['int', 'bar_index', [0, 1, 2], [1, 2, 3]],
    ['float', 'close', [102, 105, 107], [103, 106, 108]],
  ] as const)('admits changing %s initialization and reassignment on each bar', (kind, initializer, before, after) => {
    const body = `series ${kind} value = ${initializer}
plot(value)
value := value + 1
plot(value)`;
    const checked = checkProgram(parse(header + body));
    expect(checked.diagnostics).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({ kind, qualifier: 'series' });
    const result = runCompatScript(header + body, { bars: compatibilityBars.slice(0, 3) });
    expect(result.errors).toEqual([]);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([before, after]);
  });

  it.each([
    'series int length = 3\nplot(ta.ema(close, length))',
    'series string caption = "Fixed"\nplot(close, title=caption)',
  ])('does not demote an explicit series value for a weaker consumer: %s', (body) => {
    expect(checkProgram(parse(header + body)).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining('series') }),
      ]),
    );
  });
});
