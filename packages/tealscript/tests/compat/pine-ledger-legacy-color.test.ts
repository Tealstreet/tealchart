import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// version-rules-v1#39: the old transparency constructor was renamed in v4.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-4/
// Single-argument color(x) casts are a separate current reference overload:
// https://www.tradingview.com/pine-script-reference/v6/#fun_color
function source(version: number, body: string) {
  return `//@version=${version}\n${version <= 4 ? 'study' : 'indicator'}("Color rename")\n${body}`;
}
function errors(version: number, body: string) {
  return checkProgram(parse(source(version, body))).diagnostics.filter((d) => d.severity === 'error');
}

describe('ledger: color transparency constructor rename', () => {
  it.each(['color(#123456, 60)', 'color(color=#123456, transp=60)'])('accepts v3 %s with defined alpha', (call) => {
    expect(errors(3, `tint = ${call}\nplot(color.t(tint))`)).toEqual([]);
    const result = runCompatScript(source(3, `tint = ${call}\nplot(color.t(tint), title="Transparency")`), {
      bars: compatibilityBars.slice(0, 2),
    });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Transparency').values).toEqual([60, 60]);
  });

  const obsoleteCalls = [4, 5, 6].flatMap((version) =>
    ['color(#123456, 60)', 'color(color=#123456, transp=60)'].map((call) => ({ version, call })),
  );
  it.each(obsoleteCalls)('diagnoses the old constructor $call in v$version', ({ version, call }) => {
    expect(errors(version, `tint = ${call}\nplot(close, color=tint)`)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'version-mismatch', message: expect.stringContaining('color.new') }),
      ]),
    );
  });
  it.each(obsoleteCalls)('halts compiled execution for $call in v$version', ({ version, call }) => {
    const result = runCompatScript(source(version, `tint = ${call}\nplot(close, title="After", color=tint)`), {
      bars: compatibilityBars.slice(0, 2),
    });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toContain('color.new');
    expect(result.profile.compiledBarErrors ?? 0).toBe(0);
    expect(result.plots.every((plot) => plot.values.every((value) => value === null))).toBe(true);
  });

  it.each([4, 5, 6])('accepts the renamed color.new constructor in v%s', (version) => {
    const body = 'tint = color.new(#123456, 60)\nplot(color.t(tint), title="Transparency")';
    expect(errors(version, body)).toEqual([]);
    const result = runCompatScript(source(version, body), { bars: compatibilityBars.slice(0, 2) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Transparency').values).toEqual([60, 60]);
  });

  it('keeps modern single-argument casts and explicit RGB constructors', () => {
    const body = `absent = color(na)
base = color(#123456)
rgb = color.rgb(18, 52, 86, 60)
plot(na(absent) ? 1 : 0, title="Missing")
plot(color.r(base), title="Red")
plot(color.t(rgb), title="Transparency")`;
    expect(errors(6, body)).toEqual([]);
    const result = runCompatScript(source(6, body), { bars: compatibilityBars.slice(0, 2) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values).toEqual([1, 1]);
    expect(getPlot(result, 'Red').values).toEqual([18, 18]);
    expect(getPlot(result, 'Transparency').values).toEqual([60, 60]);
  });

  it('preserves locally shadowing two-argument user functions named color', () => {
    const body = 'color(float x, float y) => x + y\nplot(color(2.0, 3.0), title="Local")';
    expect(errors(6, body)).toEqual([]);
    const result = runCompatScript(source(6, body), { bars: compatibilityBars.slice(0, 2) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Local').values).toEqual([5, 5]);
  });
});
