import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';

const bars = [1, 2].map((close, i) => ({
  time: (i + 1) * 60000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));
describe('ledger773–774/776–777/780–781/784–785: line setter methods', () => {
  it.each([
    ['set_y1', 'close + 10', 'y1', 12],
    ['set_y2', 'close + 20', 'y2', 22],
    ['set_width', '7', 'width', 7],
    ['set_style', 'line.style_dotted', 'style', 'dotted'],
  ] as const)('%s binds the line receiver and matches the namespace setter', (method, argument, field, expected) => {
    const ast = parse(
      `//@version=6\nindicator("line methods")\nvar line a = line.new(0, 3, 1, 5)\nvar line b = line.new(0, 3, 1, 5)\na.${method}(${argument})\nline.${method}(b, ${argument})\nplot(a.get_y1())\nplot(a.get_y2())`,
    );
    expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    const lines = result.drawings.filter((drawing) => drawing.type === 'line');
    expect(lines).toHaveLength(2);
    expect(lines.map((line) => line[field])).toEqual([expected, expected]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      method === 'set_y1' ? [11, 12] : [3, 3],
      method === 'set_y2' ? [21, 22] : [5, 5],
    ]);
  });
});
