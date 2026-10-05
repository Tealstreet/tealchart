import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const check = (body: string) => checkProgram(parse(`//@version=6\nindicator("ledger gaps 10")\n${body}\n`));
const errors = (body: string) => check(body).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

// Literal acceptance/refusal expectations derive from the Pine v6 manual:
// variable-declarations/#tuple-declarations, user-defined-functions/#type-keywords
// and /#function-overloading, objects/#creating-objects, enums/#creating-enums,
// conditional-structures/#once-structure. These are not engine-output snapshots.
describe('ledger gaps 10 declaration contracts', () => {
  it.each(['float', 'series float', 'simple int', 'const int', 'var', 'varip', 'var float'])(
    'refuses tuple declaration keyword %s (row 380)',
    (prefix) => {
      expect(errors(`pair() => [1, 2]\n${prefix} [a, b] = pair()\nplot(a + b)`)).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'invalid-tuple-declaration' })]),
      );
    },
  );

  it('accepts inferred tuple members in global and function scopes (row 380)', () => {
    expect(
      errors(
        `pair() => [1, 2]\nwrapper() =>\n    [a, b] = pair()\n    a + b\n[c, d] = pair()\nplot(wrapper() + c + d)`,
      ),
    ).toEqual([]);
  });

  it.each(['f(value = na) => 1', 'method f(int receiver, value = na) => receiver'])(
    'refuses an untyped na parameter default: %s (row 381)',
    (declaration) => {
      expect(errors(`${declaration}\nplot(1)`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('explicit type') }),
        ]),
      );
    },
  );

  it('accepts typed missing and untyped finite defaults (row 381)', () => {
    expect(errors(`f(float value = na) => value\ng(value = 1) => value\nplot(nz(f()) + g())`)).toEqual([]);
  });

  it.each([
    'f(float x) => x\nf(float other) => other',
    'f(float x) => x\nf(series float other) => other',
    'f(float x) => x\nf(float x, int extra = 1) => x + extra',
    'f() => 1\nf(int optional = 2) => optional',
  ])('refuses duplicate required qualified types regardless of optional slots (row 382): %s', (declarations) => {
    expect(errors(`${declarations}\nplot(1)`)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'invalid-overload' })]),
    );
  });

  // Methods specifically permit overriding user-defined methods. UDF required-
  // signature uniqueness does not establish a method replacement refusal.
  // This checks declaration admission only; identical invocation choice awaits TV.
  it('admits method declarations sharing required types without selecting a replacement (row 382)', () => {
    expect(
      errors(
        `method f(int receiver, float x) => x\nmethod f(int receiver, float other, int optional = 1) => other\nplot(1)`,
      ),
    ).toEqual([]);
  });

  it('accepts distinct required types, qualifiers, counts and method receivers (row 382)', () => {
    expect(
      errors(
        `f(float x) => x\nf(bool x) => x ? 1 : 0\nf(simple float x) => x\nf(float x, float y) => x + y\nmethod g(int receiver) => receiver\nmethod g(float receiver) => receiver\nplot(f(close) + f(true) + f(close, open))`,
      ),
    ).toEqual([]);
  });

  it.each(['value = 1', 'value', 'varip value = 1'])('refuses an untyped UDT field %s (row 383)', (field) => {
    expect(errors(`type Record\n    ${field}\nplot(1)`)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('explicit type') }),
      ]),
    );
  });

  it('accepts typed UDT fields with and without defaults (row 383)', () => {
    expect(
      errors(
        `type Record\n    int index\n    float price = 1.5\n    varip int count = 0\nr = Record.new(bar_index)\nplot(r.price)`,
      ),
    ).toEqual([]);
  });
});
