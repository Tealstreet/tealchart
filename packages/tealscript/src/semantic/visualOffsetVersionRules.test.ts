import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const calls = ['plot(close', 'plotshape(true', 'plotchar(true', 'plotarrow(close', 'barcolor(color.red', 'bgcolor(color.red'];

// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#no-series-offset-values
// The v5/v6 references independently specify offset qualifiers for all six members.
describe('visual offset version qualifiers', () => {
  it.each(calls)('refuses series offsets in v6: %s', (call) => {
    const result = checkProgram(parse(`//@version=6\nindicator("Offset")\n${call}, offset=bar_index)`));
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].code).toBe('qualifier-mismatch');
    expect(result.diagnostics[0].message).toContain('offset');
    expect(result.diagnostics[0].message).toContain('series');
    expect(result.diagnostics[0].line).toBe(3);
  });

  it.each(calls)('retains v5 series acceptance: %s', (call) => {
    expect(checkProgram(parse(`//@version=5\nindicator("Offset")\n${call}, offset=bar_index)`)).diagnostics).toEqual([]);
  });

  it.each(['2', '-2', 'input.int(2)', 'timeframe.multiplier'])('accepts v6 weaker offsets: %s', (offset) => {
    expect(checkProgram(parse(`//@version=6\nindicator("Offset")\n${calls.map(call => `${call}, offset=${offset})`).join('\n')}`)).diagnostics).toEqual([]);
  });

  it.each(['shift = bar_index', 'int shift = bar_index', 'series int shift = bar_index', 'int shift = 2\nshift := bar_index', 'int shift = bar_index\nint other = shift + 1'])('refuses series aliases: %s', (declaration) => {
    const offset = declaration.includes('other') ? 'other' : 'shift';
    const result = checkProgram(parse(`//@version=6\nindicator("Offset")\n${declaration}\nplot(close, offset=${offset})`));
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].code).toBe('qualifier-mismatch');
  });

  it.each(['int shift = input.int(2)', 'simple int shift = 2', 'const int shift = 2', 'int shift = 2'])('accepts weaker typed aliases: %s', (declaration) => {
    expect(checkProgram(parse(`//@version=6\nindicator("Offset")\n${declaration}\nplot(close, offset=shift)`)).diagnostics).toEqual([]);
  });

  it('checks positional offsets', () => {
    const result = checkProgram(parse('//@version=6\nindicator("Offset")\nplot(close, "Plot", color.red, 1, plot.style_line, false, 0, bar_index)'));
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].code).toBe('qualifier-mismatch');
  });

  it.each([3, 4])('preserves existing v%i acceptance without claiming undocumented rendering', (version) => {
    const offset = version === 3 ? 'n' : 'bar_index';
    expect(checkProgram(parse(`//@version=${version}\nstudy("Offset")\nplot(close, offset=${offset})`)).diagnostics).toEqual([]);
  });
});
