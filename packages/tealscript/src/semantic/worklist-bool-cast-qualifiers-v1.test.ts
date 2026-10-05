import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// DOC-CONFLICT-NATIVE-WINS: v8 numeric input/simple arguments permit const bool.
// Bool arguments retain their qualifier; float-NA semantics remain outside scope.
describe('worklist bool cast overload qualifiers', () => {
  it.each([
    ['const', 'const int value = 2', 'const'],
    ['input', 'input int value = input.int(2)', 'const'],
    ['simple', 'simple int value = timeframe.multiplier', 'const'],
    ['series', 'series int value = bar_index', 'series'],
    ['const bool', 'const bool value = true', 'const'],
    ['input bool', 'input bool value = input.bool(true)', 'input'],
    ['simple bool', 'simple bool value = timeframe.isintraday', 'simple'],
    ['series bool', 'series bool value = close > 0', 'series'],
  ])('keeps %s argument and selected result overload', (_name, declaration, qualifier) => {
    const result = checkProgram(
      parse(`//@version=6
indicator("Bool overload")
${declaration}
converted = bool(x=value)
plot(converted ? 1 : 0)`),
    );
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'converted')?.type).toEqual({ kind: 'bool', qualifier });
  });
});
