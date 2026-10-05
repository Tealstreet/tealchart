import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

function errors(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("Visual rules")\n${body}`))
    .diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('Pine fill handle eligibility', () => {
  // ledger row 1118; visuals/fills forbids mixing plot and hline IDs.
  // Both orders and aliases reject asymmetric or identifier-name-only checks.
  for (const args of ['p, h', 'h, p', 'plot1=p, plot2=h', 'hline1=h, hline2=p']) {
    it(`refuses mixed fill handles (${args}) [visual-output row 1118]`, () => {
      expect(errors(`p = plot(close)\nh = hline(100)\nfill(${args}, color=#123456)`))
        .toEqual(expect.arrayContaining([
          expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('fill()') }),
        ]));
    });
  }

  for (const args of ['1, p', 'p, 2', 'p, "value"', 'p, #123456']) {
    it(`refuses non-handle fill IDs (${args}) [functions[58/59]]`, () => {
      expect(errors(`p = plot(close)\nfill(${args}, color=#123456)`)).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('fill()') }),
      ]));
    });
  }

  for (const fn of ['plot', 'hline']) {
    it(`accepts two ${fn} handles [functions[${fn === 'plot' ? 59 : 58}]]`, () => {
      expect(errors(`a = ${fn}(100)\nb = ${fn}(90)\nfill(a, b, color=#123456)`)).toEqual([]);
    });
  }
});
