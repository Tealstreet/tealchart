import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

const nativeSources = [
  {
    name: 'ledger-1094-asin-number-v5-v1.pine',
    sha256: 'aaa71170f0a917987c7344904aab5c8c484b240cb1a7f2f9e320f0ae72161e32',
    source:
      '//@version=5\nindicator("Ledger1094 asin number v5", overlay=false)\nfloat value = math.asin(number=0.5)\nplot(value, "OUTCOME")\n',
  },
  {
    name: 'ledger-1094-asin-number-v6-v1.pine',
    sha256: 'c4b5c58c2d65815da9f0b84c206fcc6ba680c9f69a0577269b0cd25732b781ce',
    source:
      '//@version=6\nindicator("Ledger1094 asin number v6", overlay=false)\nfloat value = math.asin(number=0.5)\nplot(value, "OUTCOME")\n',
  },
  {
    name: 'trace-705-chart-fg-solid-background-v1.pine',
    sha256: 'c84e011a62b9c0e4b52cb0d2b66f32fd860d550ef02d58000491884fa50d32a6',
    source:
      '//@version=6\nindicator("TRACE705 chart foreground", overlay=false)\nint encoded = int(color.r(chart.fg_color)) * 65536 + int(color.g(chart.fg_color)) * 256 + int(color.b(chart.fg_color))\nplot(encoded, "OUTCOME")\nif barstate.islast\n    log.info("background=" + str.tostring(chart.bg_color) + " foreground=" + str.tostring(chart.fg_color) + " rgb=" + str.tostring(encoded, "#"))\n',
  },
];

describe('native v4 asin slot and tostring color refusals', () => {
  it.each(nativeSources)('refuses unchanged captured $name', ({ source, sha256 }) => {
    expect(createHash('sha256').update(source).digest('hex')).toBe(sha256);
    expect(checkProgram(parse(source)).diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });
  it.each([4, 5, 6])('preserves v%s asin controls', (version) => {
    const declaration = version === 4 ? 'study' : 'indicator';
    const named = version === 4 ? 'asin(x=0.5)' : 'math.asin(angle=0.5)';
    const positional = version === 4 ? 'asin(0.5)' : 'math.asin(0.5)';
    const source = `//@version=${version}\n${declaration}("asin controls")\nplot(${named}, "named")\nplot(${positional}, "positional")`;
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'named').values[0]).toBeCloseTo(Math.PI / 6, 12);
    expect(getPlot(result, 'positional').values[0]).toBeCloseTo(Math.PI / 6, 12);
  });
  it.each(['str.tostring(7)', 'str.tostring(0.5, "#.00")', 'str.tostring(true)', 'str.tostring("ok")'])(
    'preserves scalar control %s',
    (call) => {
      const source = `//@version=6\nindicator("scalar")\nstring value = ${call}\nplot(str.length(value))`;
      expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(runCompatScript(source).errors).toEqual([]);
    },
  );
  it('preserves enum title conversion', () => {
    const source = `//@version=6\nindicator("enum")\nenum Choice\n    red = "Red"\nstring value = str.tostring(Choice.red)\nplot(str.length(value))`;
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(result.plots[0]?.values[0]).toBe(3);
  });
  it.each([5, 6])('rejects v%s nonnumeric angle', (version) => {
    const source = `//@version=${version}\nindicator("angle")\nplot(math.asin(angle="wrong"))`;
    expect(checkProgram(parse(source)).diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });
  it.each(['color.red', 'input.color(color.red)', 'close > open ? color.red : color.blue'])(
    'refuses color conversion %s',
    (value) => {
      const source = `//@version=6\nindicator("color")\nstring value = str.tostring(${value})`;
      expect(checkProgram(parse(source)).diagnostics.some((d) => d.severity === 'error')).toBe(true);
    },
  );
});
