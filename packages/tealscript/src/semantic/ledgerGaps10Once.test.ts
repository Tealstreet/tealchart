import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { executeScript } from '../runtime/compiledOnly';
import { checkProgram } from './checker';

const check = (body: string) => checkProgram(parse(`//@version=6\nindicator("ledger gaps 10")\n${body}\n`));
const errors = (body: string) => check(body).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

// Pine conditional-structures: once is statement-only, including at UDF tails.
describe('ledger gaps 10 once value contracts', () => {
  it('refuses a value returned from a UDF ending in once (row 388)', () => {
    const result = check(`f() =>\n    once\n        7\nvalue = f()\nplot(1)`);
    expect(result.symbols.find((symbol) => symbol.name === 'value')).toBeUndefined();
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('returns no value') }),
      ]),
    );
  });

  it('refuses a once-only UDF as a builtin or user-function argument (row 388)', () => {
    for (const call of ['plot(f())', 'sink(f())']) {
      expect(errors(`f() =>\n    once\n        7\nsink(value) => value\n${call}`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('no value') }),
        ]),
      );
    }
  });

  it('accepts a statement-only once UDF and a UDF returning after once (row 388)', () => {
    const body = `f() =>\n    once\n        log.info("first")\nf()\ng() =>\n    once\n        log.info("second")\n    7\nplot(g())`;
    expect(errors(body)).toEqual([]);
    const result = executeScript(
      parse(`//@version=6\nindicator("once statement")\n${body}`),
      [0, 1].map((index) => ({
        time: (index + 1) * 60000,
        open: 1,
        high: 2,
        low: 0,
        close: 1,
        volume: 100,
      })),
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([7, 7]);
    expect(result.logs.map((log) => log.message)).toEqual(['first', 'second']);
  });
});
