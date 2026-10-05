import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

// TV v2 coverage-time-2-v1.pine:33, attempts 1/2 in outcomes-v2.json:
// CE10294, resolution.trim is not a function. Named bindings are equivalent.
// The accepted one-second control preserves the existing engine contract.
const calls = [
  'timeframe.in_seconds(timeframe.from_seconds(59))',
  'timeframe.in_seconds(timeframe=timeframe.from_seconds(59))',
  'timeframe.in_seconds(timeframe.from_seconds(seconds=59))',
];
const message = 'TradingView CE10294 refuses timeframe.in_seconds(timeframe.from_seconds(59)): resolution.trim is not a function';
function source(call: string) {
  return `//@version=6\nindicator("Captured timeframe refusal")\nplot(${call})`;
}

describe('TradingView captured timeframe compile refusal', () => {
  it.each(calls)('surfaces the captured refusal in semantic diagnostics: %s', (call) => {
    expect(checkProgram(parse(source(call.replace('59', '1')))).diagnostics).toEqual([]);
    expect(checkProgram(parse(source(call))).diagnostics).toEqual([
      expect.objectContaining({ code: 'unsupported-feature', message, severity: 'error', line: 3 }),
    ]);
  });

  it.each(calls)('refuses compiled execution of the captured expression: %s', (call) => {
    expect(tryCompile(parse(source(call.replace('59', '1')))).success).toBe(true);
    const result = tryCompile(parse(source(call)));
    expect(result.success).toBe(false);
    expect(result.unsupported).toContain(message);
  });
});
