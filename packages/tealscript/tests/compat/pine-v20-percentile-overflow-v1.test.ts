import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

// Native v20 captures at 4b2a3a89d6: P2 constant and dynamic 101 fail RE10002 when called.
const cases = [
  {
    kind: 'constant',
    bar: 0,
    source:
      '//@version=6\nindicator("silent-p2-percentile-101-constant-v20-v1", precision=16)\narray<float> values = array.from(1.0, 2.0)\nfloat percentage = 101.0\nfloat result = array.percentile_linear_interpolation(values, percentage)\nplot(bar_index, title="CHART_INDEX", display=display.data_window)\nplot(time, title="CHART_TIME_MS", display=display.data_window)\nplot(percentage, title="REQUESTED_PERCENTAGE", display=display.data_window)\nplot(result, title="PERCENTILE_RESULT")\nplot(na(result) ? 1 : 0, title="RESULT_NA", display=display.data_window)\n',
    sha: '08d1a102fc65164676a43e0c2781c5be5f72214753f5e611fb1dbd793e996aea',
  },
  {
    kind: 'dynamic',
    bar: 3,
    source:
      '//@version=6\nindicator("silent-p2-percentile-101-dynamic-v20-v1", precision=16)\narray<float> values = array.from(1.0, 2.0)\nfloat percentage = (bar_index < 3 ? 50.0 : 101.0)\nfloat result = array.percentile_linear_interpolation(values, percentage)\nplot(bar_index, title="CHART_INDEX", display=display.data_window)\nplot(time, title="CHART_TIME_MS", display=display.data_window)\nplot(percentage, title="REQUESTED_PERCENTAGE", display=display.data_window)\nplot(result, title="PERCENTILE_RESULT")\nplot(na(result) ? 1 : 0, title="RESULT_NA", display=display.data_window)\n',
    sha: '5125edbb26d5b5605142a5cfc7e8dcd6e68142ec1ec98e9bbfebefb0a53c5875',
  },
];
const bars = Array.from({ length: 6 }, (_, i) => ({
  time: 1789948800000 + i * 60000,
  open: 100,
  high: 101,
  low: 99,
  close: 100,
  volume: 1,
}));

describe('v20 captured percentile overflow', () => {
  for (const witness of cases) {
    it(`${witness.kind} 101 fails at native bar ${witness.bar}`, () => {
      expect(createHash('sha256').update(witness.source).digest('hex')).toBe(witness.sha);
      const ast = parse(witness.source);
      expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      const execution = executeCompiledScript(ast, bars);
      expect(execution.status).toBe('success');
      if (execution.status !== 'success') throw new Error(execution.reason);
      expect(execution.result.errors).toHaveLength(1);
      expect(execution.result.errors[0]).toMatchObject({
        code: 'RE10002',
        barIndex: witness.bar,
        message: `Error on bar ${witness.bar}: Invalid value of the 'percentage' argument (101) in the 'array.percentile_linear_interpolation' function. It must be in the range [0..100].`,
      });
    });
  }
});
