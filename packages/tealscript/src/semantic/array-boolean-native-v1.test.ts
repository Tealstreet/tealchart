import { withVersionAdvisory } from '../../tests/helpers/expectedVersionAdvisory';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../parser/parser';
import { checkProgram } from './checker';

const nativeProbe = new URL('../../oracle-probes/v2/outcome-only/conflicts-batch-4-v1.pine', import.meta.url);
const nativeDiagnostic = new URL(
  '../../oracle-probes/v2/captures/v2/evidence/conflicts-batch-4-v1-attempt2-error.txt',
  import.meta.url,
);
const capturedCalls = [
  ['every', 'int', '0, 2, -1'],
  ['some', 'int', '0, 2, -1'],
  ['every', 'float', '2.0, -1.0'],
] as const;
const check = (version: number, values: string, call: string) =>
  checkProgram(
    parse(`//@version=${version}
indicator("CF003 boolean array arguments")
a = array.from(${values})
result = ${call}
`),
  );

describe('CF003 native v6 boolean array eligibility', () => {
  it('replays all three native compiler refusals from the captured source', () => {
    const evidence = readFileSync(nativeDiagnostic, 'utf8');
    for (const [method, kind] of capturedCalls) {
      expect(evidence).toContain(`array.${method}`);
      expect(evidence).toContain(`array<${kind}>`);
    }
    const errors = checkProgram(parse(readFileSync(nativeProbe, 'utf8'))).diagnostics;
    expect(
      errors.map((error) => error.code),
      nativeDiagnostic.pathname,
    ).toEqual(Array(3).fill('CE10123'));
    expect(
      errors.map((error) => error.message),
      nativeDiagnostic.pathname,
    ).toEqual([
      'Cannot call "array.every" with argument "id"="cf003_a". An argument of "array<int>" type was used but a "array<bool>"  is expected.',
      'Cannot call "array.some" with argument "id"="cf003_a". An argument of "array<int>" type was used but a "array<bool>"  is expected.',
      'Cannot call "array.every" with argument "id"="cf003_b". An argument of "array<float>" type was used but a "array<bool>"  is expected.',
    ]);
  });

  for (const [method, kind, values] of capturedCalls) {
    for (const form of ['namespace', 'named', 'receiver'] as const) {
      it(`refuses captured ${kind} ${method} through ${form}, preserving bool and v5 controls`, () => {
        const call = form === 'receiver' ? `a.${method}()` : `array.${method}(${form === 'named' ? 'id=' : ''}a)`;
        expect(check(6, 'false, true', call).diagnostics, nativeDiagnostic.pathname).toEqual([]);
        // v78 v5 numeric named/positional attempts admit with a bool-conversion warning.
        expect(check(5, values, call).diagnostics).toEqual(withVersionAdvisory(form === 'receiver' ? [] : [
          expect.objectContaining({
            severity: 'warning',
            message: `The \`id\` parameter of the \`array.${method}\` function accepts a 'bool' argument. To avoid potential unexpected results, pass a 'bool' value or expression to this parameter.`,
          }),
        ], 5));
        const errors = check(6, values, call).diagnostics;
        // v78 v6 every/some int/float named attempts also expose CE10123.
        expect(
          errors.map((error) => error.code),
          nativeDiagnostic.pathname,
        ).toEqual(['CE10123']);
        expect(errors[0]?.message, nativeDiagnostic.pathname).toBe(
          `Cannot call "array.${method}" with argument "id"="a". An argument of "array<${kind}>" type was used but a "array<bool>"  is expected.`,
        );
      });
    }
  }
});
