import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { executeScript } from '../../src/runtime/compiledOnly';

const prefix = '//@version=6\nindicator("linefill type")\n';
const bars = [{ time: 0, open: 1, high: 2, low: 0, close: 1, volume: 1 }];
// Authority: type-system drawing/reference types and v6 type_linefill, rank 373.
describe('worklist linefill reference type', () => {
  it('infers and annotates a series linefill ID, sharing the same object through aliases', () => {
    const ast = parse(prefix + `a = line.new(0, 7, 1, 8)
b = line.new(0, 3, 1, 4)
linefill value = linefill.new(a, b, color.red)
alias = value
line.set_y1(linefill.get_line1(alias), 11)
plot(line.get_y1(linefill.get_line1(value)))
plot(line.get_y1(a))
plot(line.get_y1(b))`);
    const checked = checkProgram(ast);
    expect(checked.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
    for (const name of ['value', 'alias']) expect(checked.symbols.find((symbol) => symbol.name === name)?.type).toMatchObject({ kind: 'linefill', qualifier: 'series' });
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([[11], [11], [3]]);
  });
  it('rejects a line ID in a linefill variable', () => {
    const result = checkProgram(parse(prefix + 'linefill value = line.new(0, 1, 1, 2)\nplot(1)'));
    expect(result.diagnostics.some((entry) => entry.severity === 'error' && entry.code === 'type-mismatch')).toBe(true);
  });
});
