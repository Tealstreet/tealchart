import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

function admission(version: number, option: string, setup = '', local = true) {
  const request = 'request.security(syminfo.tickerid, "2", close)';
  const body = local ? `x = 0.0\nif bar_index >= 0\n    x := ${request}\nplot(x)` : `plot(${request})`;
  const ast = parse(`//@version=${version}\n${setup}indicator("Dynamic option"${option})\n${body}\n`);
  const errors = checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  const compiled = tryCompile(ast);
  return { accepted: errors.length === 0 && compiled.success, errors, unsupported: compiled.unsupported };
}

describe('indicator const bool expressions select dynamic request permission', () => {
  for (const version of [5, 6]) {
    const enabled = version === 5;
    const value = String(enabled);
    const opposite = String(!enabled);
    const natural = [
      { name: 'negation', value: `not ${opposite}`, setup: '' },
      { name: 'logical expression', value: `${value} and true`, setup: '' },
      { name: 'comparison', value: `1 == ${enabled ? 1 : 2}`, setup: '' },
      { name: 'ternary', value: `true ? ${value} : ${opposite}`, setup: '' },
      { name: 'const alias', value: 'DYNAMIC', setup: `const bool DYNAMIC = ${value}\n` },
      { name: 'const alias chain', value: 'SECOND', setup: `const bool FIRST = ${value}\nconst bool SECOND = FIRST\n` },
    ];
    it.each(natural)(`v${version} honors $name instead of its version default`, ({ value: expression, setup }) => {
      expect(admission(version, `, dynamic_requests=${expression}`, setup)).toEqual(expect.objectContaining({
        accepted: enabled,
      }));
    });
    it.each([false, true])(`v${version} retains literal %s permission`, (literal) => {
      expect(admission(version, `, dynamic_requests=${literal}`).accepted).toBe(literal);
    });
    it(`v${version} retains its omitted option default`, () => {
      expect(admission(version, '').accepted).toBe(version === 6);
    });
    it.each([false, true])(`v${version} retains global static requests with const alias %s`, (literal) => {
      expect(admission(version, ', dynamic_requests=DYNAMIC', `const bool DYNAMIC = ${literal}\n`, false).accepted)
        .toBe(true);
    });
    it(`v${version} retains a non-const option qualifier refusal`, () => {
      expect(admission(version, ', dynamic_requests=DYNAMIC', 'simple bool DYNAMIC = true\n').errors)
        .toEqual(expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining('const') }),
        ]));
    });
  }
});
