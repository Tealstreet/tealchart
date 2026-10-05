import { expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// var_barstate.isconfirmed remarks[1] discourages requested use; it promises no stable returned value.
it('admits requested confirmation directly and through a UDF without asserting its unpredictable value', () => {
  for (const [setup, expression] of [['', 'barstate.isconfirmed'], ['confirmed() => barstate.isconfirmed', 'confirmed()']]) {
    const result = checkProgram(parse(`//@version=6\nindicator("Requested confirmation")\n${setup}\nseries bool requested = request.security("TEST", "D", ${expression})`));
    expect(result.diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toEqual([]);
    expect(result.symbols.find(symbol => symbol.name === 'requested')?.type).toEqual({ kind: 'bool', qualifier: 'series' });
  }
});
