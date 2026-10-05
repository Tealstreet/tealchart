import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Ledger1724: kw_export remarks require every exported parameter to be used in its body.
// Authority: frozen pine-v6-reference-v1.json, export remarks; library manual type constraints.
describe('exported library parameter use', () => {
  const diagnostics = (body: string) => checkProgram(parse(`//@version=6\nlibrary("Parameter use")\n${body}`)).diagnostics;

  for (const [name, body, parameter] of [
    ['function namespace callee', 'helper(float x) => x * 2\nexport pick(float helper) => helper(1.0)', 'helper'],
    ['expression body', 'export pick(float used, float ignored) => used', 'ignored'],
    ['block body', 'export pick(float used, float ignored) =>\n    result = used * 2\n    result', 'ignored'],
    ['method body', 'export method pick(float this, float ignored) => this', 'ignored'],
    ['default value is outside body', 'export pick(float ignored = 1) => 2.0', 'ignored'],
    ['shadowing loop counter', 'export pick(int ignored) =>\n    float result = 0\n    for ignored = 0 to 2\n        result += ignored\n    result', 'ignored'],
  ]) {
    it(`refuses unused parameter in ${name}`, () => {
      expect(diagnostics(body).some((entry) => entry.code === 'library-export' && entry.message.includes(`parameter ${parameter}`) && entry.message.includes('used'))).toBe(true);
    });
  }

  for (const [name, body] of [
    ['parameter passed to same-named helper', 'helper(float x) => x * 2\nexport pick(float helper) => helper(helper)'],
    ['both numeric operands', 'export pick(float first, float second) => first + second'],
    ['condition and branch', 'export pick(bool condition, float value) => condition ? value : -value'],
    ['nested builtin argument', 'export pick(float value) => math.abs(value)'],
    ['local initializer', 'export pick(float value) =>\n    result = value * 2\n    result'],
    ['loop bound', 'export pick(int length) =>\n    float result = 0\n    for i = 0 to length\n        result += i\n    result'],
    ['method receiver and argument', 'export method pick(float this, float delta) => this + delta'],
    ['comma initializer', 'export pick(float value) =>\n    first = value, second = first * 2\n    second'],
    ['conditional block', 'export pick(float value) =>\n    if value > 0\n        value\n    else\n        -value'],
    ['helper call', 'helper(float value) => value * 2\nexport pick(float value) => helper(value)'],
  ]) {
    it(`accepts parameter used as ${name}`, () => {
      // Builtin-shadow warning: variable-declarations/#shadowing; second is listed in concepts/time/#time-variables.
      const expectedDiagnostics = name === 'comma initializer' ? [{
        code: 'builtin-shadow',
        message: "Variable 'second' shadows a Pine builtin",
        severity: 'warning',
        line: 4,
        column: 20,
      }] : [];
      expect(diagnostics(body)).toEqual(expectedDiagnostics);
    });
  }
});
