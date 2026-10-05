import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/conditional-structures/#matching-local-block-type-requirement
const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
const prefix = `//@version=6
indicator("Conditional branches")
`;

describe('worklist 33 value-returning conditional branch types', () => {
  it('accepts the documented close/open float arms and executes the selected value', () => {
    const source =
      prefix +
      `value = if close > open
    close
else
    open
plot(value, title="selected")`;
    expect(errors(source)).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'selected').values).toEqual(
      compatibilityBars.map((b) => (b.close > b.open ? b.close : b.open)),
    );
  });
  it('refuses the documented float/string arms when the if initializes a variable', () => {
    const source =
      prefix +
      `value = if close > open
    close
else
    "open"
plot(close)`;
    expect(errors(source).some((d) => d.code === 'conditional-branch-type-mismatch')).toBe(true);
  });
  it('allows different branch values when the standalone result is discarded', () => {
    const source =
      prefix +
      `if close > open
    close
else
    "open"
plot(close, title="control")`;
    expect(errors(source)).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'control').values).toEqual(compatibilityBars.map((b) => b.close));
  });
});
