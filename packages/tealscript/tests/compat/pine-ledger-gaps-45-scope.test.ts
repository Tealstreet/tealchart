import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';

function check(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("Scope contracts")\n${body}\n`));
}

describe('ledger gaps 45: discard-only names and scope', () => {
  // https://www.tradingview.com/pine-script-reference/v6/ entries[30] contextual example.
  // Rank1668: https://www.tradingview.com/pine-script-docs/language/variable-declarations/#scopes
  it('1668 exposes a variable only after its declaration in global and nested scopes', () => {
    for (const body of [
      'int result = futureValue\nint futureValue = 7\nplot(result)',
      'if true\n    int result = futureValue\n    int futureValue = 7\nplot(close)',
    ]) {
      expect(check(body).diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'unknown-identifier',
            severity: 'error',
            message: expect.stringContaining('futureValue'),
          }),
        ]),
      );
    }
    expect(check('int futureValue = 7\nint result = futureValue\nplot(result)').diagnostics).toEqual([]);
    expect(check('if true\n    int futureValue = 7\n    int result = futureValue\nplot(close)').diagnostics).toEqual(
      [],
    );
  });

  it.each([
    '_ = 17\nplot(_)',
    'int _ = 17\nplot(_)',
    'var int _ = 17\nplot(_)',
    'varip int _ = 17\nplot(_)',
    'if true\n    _ = 17\n    int value = _',
  ])('1797 refuses reading a scalar discard: %s', (body) => {
    expect(check(body).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-identifier',
          severity: 'error',
          message: expect.stringContaining('_'),
        }),
      ]),
    );
  });

  it.each([
    '_ = 17\n_ = 19\nplot(close)',
    'int _ = 17\nfloat _ = 19.5\nplot(close)',
    'pair() => [1, 2]\n[_, _] = pair()\n_ = 17\n_ = 19\nplot(close)',
    '_ = 17\nif true\n    _ = 19\n    _ = 23\nplot(close)',
  ])('1797 permits repeated scalar discards without a symbol: %s', (body) => {
    const result = check(body);
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(result.symbols.some((symbol) => symbol.name === '_')).toBe(false);
  });

  it('1797 retains initializer validation for a discarded value', () => {
    expect(check('_ = missingValue\nplot(close)').diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'unknown-identifier', message: expect.stringContaining('missingValue') }),
      ]),
    );
  });

  // Rank1797: the same underscore manual clause permits repeated assignments and evaluates their initializers.
  it('1797 evaluates each repeated discard initializer', () => {
    const program = parse(`//@version=6
indicator("Discard initializers")
record(array<int> entries, int value) =>
    array.push(entries, value)
    array.size(entries)
var entries = array.new_int(0)
_ = record(entries, 1)
_ = record(entries, 2)
plot(array.size(entries))`);
    expect(checkProgram(program).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const bars = [11, 4, 9].map((close, index) => ({
      time: (index + 1) * 60_000,
      open: close,
      high: close,
      low: close,
      close,
      volume: 100,
    }));
    const result = executeScript(program, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots[0]?.values).toEqual([2, 4, 6]);
  });

  // https://www.tradingview.com/pine-script-reference/v6/ entries[30] is scope context, not a discard rule.
  // Ranks1671/1797: https://www.tradingview.com/pine-script-docs/language/variable-declarations/#using-an-underscore-_-as-an-identifier
  it('1797 refuses a tuple discard read while accepting repeated tuple discards', () => {
    expect(check('pair() => [1, 2]\n[_, _] = pair()\nplot(_)').diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'unknown-identifier', message: expect.stringContaining('_') }),
      ]),
    );
    expect(check('pair() => [1, 2]\n[_, _] = pair()\n[_, kept] = pair()\nplot(kept)').diagnostics).toEqual([]);
  });

  // Ranks1679/1799: frozen reference entries[3]/[30] local blocks; the scopes manual supplies outward inaccessibility.
  it.each([
    'if true\n    int inside = 3\nplot(inside)',
    'for i = 1 to 3\n    int inside = i\nplot(inside)',
    'read() =>\n    int inside = 3\n    inside\nplot(inside)',
  ])('1799 refuses access to an inner declaration from the outer scope: %s', (body) => {
    expect(check(body).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'unknown-identifier', message: expect.stringContaining('inside') }),
      ]),
    );
  });
});
