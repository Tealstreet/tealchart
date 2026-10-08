import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const families = [
  { kind: 'line', create: 'line.new(bar_index, close, bar_index + 1, close)', count: 2 },
  { kind: 'label', create: 'label.new(bar_index, close)', count: 2 },
  { kind: 'table', create: 'table.new(bar_index == 1 ? position.top_right : position.bottom_right, 1, 1)', count: 2 },
  { kind: 'box', create: 'box.new(bar_index, close, bar_index + 1, close)', count: 2 },
  { kind: 'linefill', create: 'linefill.new(line.new(bar_index, 1, bar_index + 1, 1), line.new(bar_index, 2, bar_index + 1, 2), color.red)', count: 2 },
] as const;

// Authority: https://www.tradingview.com/pine-script-reference/v6/.
// Cast functions 304–308 return typed series handles; na function 67 detects absence.
// Missing/present/missing/present rejects fake handles and always-missing detection.
for (const family of families) {
  it.each([false, true])(`${family.kind} cast preserves missing and present handles, named=%s`, (named) => {
    const source = `//@version=6
indicator("Reference missing cast")
${family.kind} original = na
if bar_index == 1 or bar_index == 3
    original := ${family.create}
converted = ${family.kind}(${named ? 'x = ' : ''}original)
alias = converted
plot((na(converted) ? 1 : 0) + (na(alias) ? 2 : 0), "missing")
plot(na(original) ? -1 : array.indexof(array.from(original), converted) == 0 ? 1 : 0, "identity")`;
    const checked = checkProgram(parse(source));
    expect(checked.diagnostics).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'converted')?.type).toEqual({ kind: family.kind, qualifier: 'series' });
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 4) });
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(getPlot(result, 'missing').values).toEqual([3, 0, 3, 0]);
    expect(getPlot(result, 'identity').values).toEqual([-1, 1, -1, 1]);
    expect(result.drawings.filter((drawing) => drawing.type === family.kind)).toHaveLength(family.count);
  });
}
