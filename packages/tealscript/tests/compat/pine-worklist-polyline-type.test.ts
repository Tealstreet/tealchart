import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { executeScript } from '../../src/runtime/compiledOnly';

const prefix = '//@version=6\nindicator("polyline type")\n';
// Authority: type-system drawing/reference types and v6 type_polyline, rank 379.
describe('worklist polyline reference type', () => {
  it('infers and annotates a series polyline ID; deleting an alias affects its sole object', () => {
    const ast = parse(prefix + `points = array.from(chart.point.from_index(0, 1), chart.point.from_index(1, 2))
polyline value = polyline.new(points)
alias = value
plot(array.size(polyline.all))
polyline.delete(alias)
plot(array.size(polyline.all))`);
    const checked = checkProgram(ast);
    expect(checked.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
    for (const name of ['value', 'alias']) expect(checked.symbols.find((symbol) => symbol.name === name)?.type).toMatchObject({ kind: 'polyline', qualifier: 'series' });
    const result = executeScript(ast, [{ time: 0, open: 1, high: 2, low: 0, close: 1, volume: 1 }]);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([[1], [0]]);
  });
  it('rejects a line ID in a polyline variable', () => {
    const result = checkProgram(parse(prefix + 'polyline value = line.new(0, 1, 1, 2)\nplot(1)'));
    expect(result.diagnostics.some((entry) => entry.severity === 'error' && entry.code === 'type-mismatch')).toBe(true);
  });
});
