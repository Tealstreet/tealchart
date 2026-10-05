import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';

const bars = [{time: 60000, open: 1, high: 2, low: 0, close: 1, volume: 1}];

describe('v5 fill named transparency with positional title', () => {
  // Native v4 drawing-default-blue-v5-v1-attempt1-grid-v2.png: color.blue matches #2962FF.
  it('keeps the fourth positional argument bound to title', () => {
    const ast = parse(`//@version=5
indicator("fill title")
a = plot(close)
b = plot(close + 1)
fill(a, b, color.blue, "Area", transp=80)
`);
    expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    const fill = result.plots.find(p => p.type === 'fill');
    expect(fill?.title).toBe('Area');
    expect(fill?.color).toEqual(['#2962FF33']);
  });

  it('retains v4 positional transparency before title', () => {
    const ast = parse(`//@version=4
study("fill title")
a = plot(close)
b = plot(close + 1)
fill(a, b, color.blue, 80, "Area")
`);
    expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.find(p => p.type === 'fill')?.title).toBe('Area');
  });
});
