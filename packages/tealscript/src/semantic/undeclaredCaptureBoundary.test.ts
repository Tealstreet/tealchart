import { describe, expect, it } from 'vitest';
import { parse } from '../parser';
import { checkProgram } from './checker';

const names = ['void', 'macd_line', 'signal_line', 'positionValue', 'currentEquity', 'currentPositionSize',
  'deltaPositionSize', 'day', 'dayofyear', 'isBullishImbalance', 'isBearishImbalance'];

describe('unwitnessed v6 undeclared diagnostic boundary', () => {
  it.each(names)('keeps the parent diagnostic for unresolved %s', (name) => {
    const diagnostics = checkProgram(parse(`//@version=6
indicator("Unsupported identifier")
plot(${name})`)).diagnostics;
    expect(diagnostics).toEqual([{ code: 'unknown-identifier', message: `Unknown identifier: ${name}`,
      severity: 'error', line: 3, column: 6 }]);
  });

  it('keeps the parent diagnostic for an uncaptured identifier', () => {
    expect(checkProgram(parse(`//@version=6
indicator("Uncaptured")
plot(unwitnessedValue)`)).diagnostics).toEqual([
      { code: 'unknown-identifier', message: 'Unknown identifier: unwitnessedValue', severity: 'error', line: 3, column: 6 },
    ]);
  });
});
