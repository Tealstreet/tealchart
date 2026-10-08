import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Row 131: ordered comparisons require numeric operands (Operators manual).
const nonNumericOperands = [
  { kind: 'bool', first: 'true', second: 'false' },
  { kind: 'string', first: '"b"', second: '"a"' },
  { kind: 'color', first: 'color.red', second: 'color.blue' },
];

for (const version of [5, 6]) {
  describe(`v${version} numeric ordering admission (language row 131)`, () => {
    for (const operator of ['<', '<=', '>', '>=']) {
      for (const { kind, first, second } of nonNumericOperands) {
        for (const [position, left, right] of [
          ['both', first, second],
          ['left', first, '2'],
          ['right', '2', second],
        ]) {
          it(`refuses ${operator} with ${kind} on ${position}`, () => {
            const source = `//@version=${version}
indicator("Numeric ordering admission")
result = ${left} ${operator} ${right}
plot(result ? 1 : 0)`;
            const errors = checkProgram(parse(source)).diagnostics.filter(
              (diagnostic) => diagnostic.severity === 'error',
            );
            expect(errors).toHaveLength(1);
            expect(errors[0]?.code).toBe('invalid-operator-operands');
          });
        }
      }
    }
  });
}
