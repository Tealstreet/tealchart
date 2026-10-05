import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parse } from '../parser/parser';
import { checkProgram } from './checker';

const nativeProbe = new URL('../../oracle-probes/v2/outcome-only/conflicts-batch-4-v1.pine', import.meta.url);
const nativeDiagnostic = new URL('../../oracle-probes/v2/captures/v2/evidence/conflicts-batch-4-v1-attempt2-error.txt', import.meta.url);
const capturedCalls = [
  ['every', 'int', '0, 2, -1'],
  ['some', 'int', '0, 2, -1'],
  ['every', 'float', '2.0, -1.0'],
] as const;
const check = (version: number, values: string, call: string) => checkProgram(parse(`//@version=${version}
indicator("CF003 boolean array arguments")
a = array.from(${values})
result = ${call}
`));

describe('CF003 native v6 boolean array eligibility', () => {
  it('replays all three native compiler refusals from the captured source', () => {
    const evidence = readFileSync(nativeDiagnostic, 'utf8');
    for (const [method, kind] of capturedCalls) {
      expect(evidence).toContain(`array.${method}`);
      expect(evidence).toContain(`array<${kind}>`);
    }
    const errors = checkProgram(parse(readFileSync(nativeProbe, 'utf8'))).diagnostics;
    expect(errors.map((error) => error.code), nativeDiagnostic.pathname).toEqual(Array(3).fill('type-mismatch'));
    expect(errors.map((error) => error.message), nativeDiagnostic.pathname).toEqual([
      'array.every requires bool array elements in Pine v6, got array<int>',
      'array.some requires bool array elements in Pine v6, got array<int>',
      'array.every requires bool array elements in Pine v6, got array<float>',
    ]);
  });

  for (const [method, kind, values] of capturedCalls) {
    for (const form of ['namespace', 'named', 'receiver'] as const) {
      it(`refuses captured ${kind} ${method} through ${form}, preserving bool and v5 controls`, () => {
        const call = form === 'receiver' ? `a.${method}()` : `array.${method}(${form === 'named' ? 'id=' : ''}a)`;
        expect(check(6, 'false, true', call).diagnostics, nativeDiagnostic.pathname).toEqual([]);
        expect(check(5, values, call).diagnostics).toEqual([]);
        const errors = check(6, values, call).diagnostics;
        expect(errors.map((error) => error.code), nativeDiagnostic.pathname).toEqual(['type-mismatch']);
        expect(errors[0]?.message, nativeDiagnostic.pathname).toBe(`array.${method} requires bool array elements in Pine v6, got array<${kind}>`);
      });
    }
  }
});
