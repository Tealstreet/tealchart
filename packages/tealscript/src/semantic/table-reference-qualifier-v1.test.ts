import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// Table references always inherit series, including explicitly annotated IDs.
// https://www.tradingview.com/pine-script-reference/v6/#type_table
const check = (body: string) => checkProgram(parse(`//@version=6\nindicator("Table qualifier")\n${body}\nplot(1)`));

describe('table reference qualifier', () => {
  it.each(['input', 'simple'])('keeps %s-annotated missing table IDs series', (qualifier) => {
    const result = check(`${qualifier} table value = na\ntable alias = value`);
    expect(result.diagnostics).toEqual([]);
    for (const name of ['value', 'alias']) {
      expect(result.symbols.find((symbol) => symbol.name === name)?.type).toEqual({ kind: 'table', qualifier: 'series' });
    }
  });

  it.each(['const', 'series', ''])('preserves %s table reference inference', (qualifier) => {
    const result = check(`${qualifier ? qualifier + " " : ""}table value = na`);
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({ kind: 'table', qualifier: 'series' });
  });

  it.each(['input', 'simple'])('preserves %s constructor qualifier refusal', (qualifier) => {
    const result = check(`${qualifier} table value = table.new(position.top_left, 1, 1)`);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'qualifier-mismatch' }));
  });

  it.each(['input', 'simple'])('preserves explicit %s scalar qualifiers', (qualifier) => {
    const result = check(`${qualifier} int value = 3`);
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({ kind: 'int', qualifier });
  });
});
