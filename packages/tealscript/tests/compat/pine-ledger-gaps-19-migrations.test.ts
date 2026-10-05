import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

function source(expression: string, version: number) {
  return `//@version=${version}\n${version < 5 ? 'study' : 'indicator'}("Migration")\nplot(${expression}, title="Value")\n`;
}

describe('published HMA, tonumber and cum migrations', () => {
  // Ledger724/743/754–755; https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/
  it.each([
    ['hma(close, 3)', 4],
    ['ta.hma(source=close, length=3)', 5],
    ['tonumber(x="-12.5")', 4],
    ['str.tonumber(string="-12.5")', 5],
    ['cum(x=close)', 4],
    ['ta.cum(source=close)', 5],
  ] as const)('accepts published %s in v%i', (call, version) => {
    expect(
      checkProgram(parse(source(call, version))).diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
    ).toEqual([]);
  });

  it.each(['hma(close, 3)', 'tonumber("-12.5")', 'cum(close)'])('refuses the old global in v5: %s', (call) => {
    expect(checkProgram(parse(source(call, 5))).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'version-mismatch' })]),
    );
  });

  it.each(['ta.hma(close, 3)', 'str.tonumber("-12.5")', 'ta.cum(close)'])(
    'refuses the new namespace in v4: %s',
    (call) => {
      expect(checkProgram(parse(source(call, 4))).diagnostics).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'version-mismatch' })]),
      );
    },
  );

  it.each([
    ['tonumber(string="-12.5")', 4],
    ['str.tonumber(x="-12.5")', 5],
    ['cum(source=close)', 4],
    ['ta.cum(x=close)', 5],
  ] as const)('refuses the other version named slot in %s v%i', (call, version) => {
    expect(checkProgram(parse(source(call, version))).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'unknown-argument' })]),
    );
  });

  it.each(['tonumber(x="-12.5")', 'tonumber("-12.5")'])('executes the legacy string slot: %s', (call) => {
    const result = runCompatScript(source(call, 4), { bars: compatibilityBars.slice(0, 3) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Value').values).toEqual([-12.5, -12.5, -12.5]);
  });

  it.each(['cum(x=close)', 'cum(close)', 'ta.cum(source=close)'])(
    'executes the published cumulative source slot: %s',
    (call) => {
      const result = runCompatScript(source(call, call.startsWith('ta.') ? 5 : 4), {
        bars: compatibilityBars.slice(0, 3),
      });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Value').values).toEqual([102, 207, 314]);
    },
  );
});

describe('histogram constant migration', () => {
  // Ledger752; https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-4/
  it.each([
    ['histogram', 3],
    ['plot.style_histogram', 4],
    ['plot.style_histogram', 5],
  ] as const)('accepts %s in v%i', (style, version) => {
    const script = source('close', version).replace('title="Value"', `title="Value", style=${style}`);
    expect(checkProgram(parse(script)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = runCompatScript(script, { bars: compatibilityBars.slice(0, 3) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Value').style).toBe('histogram');
    expect(getPlot(result, 'Value').values).toEqual([102, 105, 107]);
  });

  it.each([
    ['histogram', 4],
    ['plot.style_histogram', 3],
  ] as const)('refuses %s in v%i', (style, version) => {
    const script = source('close', version).replace('title="Value"', `title="Value", style=${style}`);
    expect(checkProgram(parse(script)).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'version-mismatch' })]),
    );
  });
});

// A declared local is not the builtin constant renamed in Pine v4.
it('preserves a local histogram identifier in v4', () => {
  expect(
    checkProgram(parse('//@version=4\nstudy("Local")\nhistogram=3\nplot(histogram)\n')).diagnostics.filter(
      (diagnostic) => diagnostic.severity === 'error',
    ),
  ).toEqual([]);
});
