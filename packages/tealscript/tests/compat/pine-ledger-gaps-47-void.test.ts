import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Rank1863: https://www.tradingview.com/pine-script-docs/language/type-system/#void
// Internal void results exist, but void is not an available annotation keyword.
function errors(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("Void annotation")\n${body}`)).diagnostics.filter(
    (d) => d.severity === 'error',
  );
}

describe('ledger47 unavailable void annotations', () => {
  for (const [name, body] of [
    ['variable', 'void value = na'],
    ['parameter', 'f(void value) => 1\nplot(f(1))'],
    ['field', 'type Record\n    void value'],
    ['array element', 'array<void> values = na'],
    ['matrix element', 'matrix<void> values = na'],
    ['map value', 'map<string,void> values = na'],
  ]) {
    it(`refuses ${name}`, () => {
      expect(errors(body).some((d) => d.message.includes('void'))).toBe(true);
    });
  }
  for (const [name, body] of [
    ['numeric annotations', 'float value = na\nf(int value) => value\nplot(f(1))'],
    ['collection annotation', 'array<int> values = array.new_int()'],
    ['internal void UDF return', 'values = array.new_int()\nf() => array.push(values,1)\nf()'],
  ]) {
    it(`retains ${name}`, () => {
      expect(errors(body)).toEqual([]);
    });
  }
});
