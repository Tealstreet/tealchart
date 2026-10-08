import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// V6 mutable variables are series, even when every assigned value is constant.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#mutable-variables
describe('v6 mutable numeric declaration qualifiers', () => {
  it.each([
    ['int', '3', '4', 4],
    ['float', '-7.5', '2.25', 2.25],
  ] as const)('promotes a reassigned %s binding and publishes its assigned value', (kind, initial, assigned, value) => {
    const source = `//@version=6
indicator("Mutable declaration qualifier")
${kind} value = ${initial}
value := ${assigned}
plot(value, "Value")`;
    const checked = checkProgram(parse(source));
    expect(checked.diagnostics).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({ kind, qualifier: 'series' });

    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 4) });
    expect(result.errors).toEqual([]);
    expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
    expect(result.profile?.swallowedErrors ?? []).toEqual([]);
    expect(getPlot(result, 'Value').values).toEqual([value, value, value, value]);
  });
});
