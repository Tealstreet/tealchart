import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { runCompatScript } from './fixtures';

const constants = 'const int BASE = 1\nconst int LIMIT = BASE + 2\n';
const properties =
  'precision=VALUE, max_labels_count=VALUE, max_lines_count=VALUE, max_boxes_count=VALUE, max_polylines_count=VALUE';

function source(value: string, setup = '') {
  return `//@version=6\n${setup}indicator("Numeric properties", ${properties.replaceAll('VALUE', value)})
label.new(bar_index, close)
line.new(bar_index, low, bar_index, high)
box.new(bar_index, high, bar_index + 1, low)
polyline.new(array.from(chart.point.from_index(bar_index, low), chart.point.from_index(bar_index + 1, high)))
plot(close)`;
}

// Declaration statements require const arguments; numeric properties retain their values.
// https://www.tradingview.com/pine-script-docs/language/declaration-statements/
describe('rank1776 constant numeric declaration properties', () => {
  it.each(['1 + 2', '2 * 3 - 3', '+(8 % 5)', 'LIMIT'])('matches literal properties for %s', (value) => {
    const script = source(value, value === 'LIMIT' ? constants : '');
    expect(checkProgram(parse(script)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = runCompatScript(script);
    const literal = runCompatScript(source('3'));
    expect(result.errors).toEqual([]);
    expect(result.declaration.precision).toBe(3);
    expect(result.indicatorPrecision).toBe(3);
    expect(result.plots).toEqual(literal.plots);
  });

  it.each(['1 + 2', 'LIMIT'])('applies drawing limits like the equivalent literal for %s', (value) => {
    const script = source(value, value === 'LIMIT' ? constants : '');
    expect(checkProgram(parse(script)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = runCompatScript(script);
    const literal = runCompatScript(source('3'));
    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual(literal.drawings);
    expect(result.declaration.drawingLimits).toEqual({ label: 3, line: 3, box: 3, polyline: 3 });
    expect(result.indicatorDrawingLimits).toEqual(literal.indicatorDrawingLimits);
  });

  it('retains zero precision and literal drawing limits', () => {
    const result = runCompatScript(
      '//@version=6\nindicator("Zero precision", precision=0, max_labels_count=3)\nplot(close)',
    );
    expect(result.errors).toEqual([]);
    expect(result.indicatorPrecision).toBe(0);
    expect(result.indicatorDrawingLimits.label).toBe(3);
  });

  it.each(['input.int(3)', 'bar_index + 3'])('refuses a nonconstant precision %s', (value) => {
    const diagnostics = checkProgram(
      parse(`//@version=6\nindicator("Qualified precision", precision=${value})\nplot(close)`),
    ).diagnostics;
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'error', message: expect.stringMatching(/const/i) }),
      ]),
    );
  });
});
