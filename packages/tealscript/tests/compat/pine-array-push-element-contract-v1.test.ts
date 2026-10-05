import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const reference = 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.push';
const kinds = ['int', 'float', 'bool', 'string', 'color', 'label', 'line', 'box', 'table', 'linefill'];

describe('array.push value element type contract', () => {
  for (const route of ['namespace', 'receiver'] as const) {
    it(`${route} refuses incompatible values for every documented from element kind`, () => {
      for (const kind of kinds) {
        const wrong = kind === 'string' ? '17' : '"wrong"';
        const call = route === 'namespace' ? `array.push(value=${wrong}, id=values)` : `values.push(value=${wrong})`;
        const result = checkProgram(
          parse(`//@version=6
indicator("Push element kind")
values = array.new<${kind}>()
${call}`),
        );
        expect(result.diagnostics, `${reference}; ${kind}`).toEqual([
          expect.objectContaining({ code: 'type-mismatch' }),
        ]);
        expect(result.diagnostics[0].message, reference).toMatch(/array element/);
      }
    });
  }
});
