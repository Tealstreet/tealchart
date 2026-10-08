import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Version ledger42; v4 migration explicitly renames dotted to hline.style_dotted.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-4/#renaming-of-built-in-constants-variables-and-functions
// Reference v6 constants[10] (entry217) defines dotted; assertions cover output metadata.
describe('v4 dotted rename runtime values', () => {
  it.each([[3, 'dotted'], [4, 'hline.style_dotted']] as const)(
    'v%i %s preserves the dotted line-style payload', (version, expression) => {
      const source = `//@version=${version}
study("Dotted rename")
hline(7, title="level", linestyle=${expression})`;
      expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'level')).toMatchObject({ type: 'hline', lineStyle: 'dotted', values: [7, 7] });
    },
  );

  it('a declared dotted value still uses its binding after the rename', () => {
    const source = `//@version=4
study("Dotted local")
dotted = 7
plot(dotted, "local")
hline(11, title="level", linestyle=hline.style_dotted)`;
    expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 2) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'local').values).toEqual([7, 7]);
    expect(getPlot(result, 'level')).toMatchObject({ type: 'hline', lineStyle: 'dotted', values: [11, 11] });
  });
});
