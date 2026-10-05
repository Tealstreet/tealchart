import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

const cases = [
  { title: 'explicit subtraction group', initial: '10000000000000000.0', a: '-10000000000000000.0', b: '-1.0', operation: '+= (a - b)', expected: 0 },
  { title: 'multiplication precedence', initial: '1.0', a: '3.0', b: '2.0', operation: '+= a * b', expected: 7 },
  { title: 'subtraction assignment', initial: '10.0', a: '4.0', b: '2.0', operation: '-= (a - b)', expected: 8 },
  { title: 'multiplication assignment', initial: '3.0', a: '4.0', b: '2.0', operation: '*= (a - b)', expected: 6 },
  { title: 'division assignment', initial: '12.0', a: '4.0', b: '2.0', operation: '/= (a - b)', expected: 6 },
  { title: 'modulo assignment', initial: '7.0', a: '4.0', b: '1.0', operation: '%= (a - b)', expected: 1 },
  { title: 'integer addition', initial: '10', a: '3', b: '1', operation: '+= a - b', expected: 12 },
  { title: 'string concatenation', initial: '"a"', a: '"b"', b: '"c"', operation: '+= a + b', expected: 'abc' },
];
const bars = [{ time: 60_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }];

describe('compound assignment precedence controls', () => {
  for (const item of cases) {
    it(item.title, () => {
      const source = `//@version=6
indicator("Compound grouping control")
total = ${item.initial}
a = ${item.a}
b = ${item.b}
total ${item.operation}
plot(${typeof item.expected === 'string' ? 'total == "abc" ? 1 : 0' : 'total'})
`;
      const result = executeScript(parse(source), bars);
      expect(result.errors).toEqual([]);
      expect(result.plots[0]?.values).toEqual([typeof item.expected === 'string' ? 1 : item.expected]);
    });
  }
});
