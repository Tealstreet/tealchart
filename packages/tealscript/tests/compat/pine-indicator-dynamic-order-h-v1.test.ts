import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const forms = ['literal', 'alias', 'negation'] as const;
const positions = ['before', 'after'] as const;

function source(version: number, enabled: boolean, form: typeof forms[number], position: typeof positions[number], parameter: boolean) {
  const option = form === 'literal' ? String(enabled) : form === 'alias' ? 'DYNAMIC' : `not ${!enabled}`;
  const symbol = 'close > open ? "NASDAQ:AAPL" : "NASDAQ:MSFT"';
  const declaration = `indicator("Option order", dynamic_requests=${option})`;
  const udf = parameter
    ? 'probe(series string symbol) => request.security(symbol, timeframe.period, close)'
    : `probe() =>
    float value = na
    if close > open
        value := request.security(${symbol}, timeframe.period, close)
    value`;
  return `//@version=${version}
DYNAMIC = ${enabled}
${position === 'before' ? udf + '\n' + declaration : declaration + '\n' + udf}
plot(probe(${parameter ? symbol : ''}))
`;
}

function readback(text: string) {
  const ast = parse(text);
  const checked = checkProgram(ast);
  const compiled = tryCompile(ast);
  return {
    errors: checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
    option: checked.indicatorDynamicRequests,
    compiledOption: compiled.indicatorDynamicRequests,
    compiled: compiled.success,
  };
}

describe('indicator dynamic option has uniform declaration-order semantics', () => {
  for (const version of [5, 6]) {
    const enabled = version === 5;
    for (const parameter of [false, true]) {
      for (const position of positions) {
        it.each(forms)(`v${version} ${position} UDF parameter=${parameter} resolves %s uniformly`, (form) => {
          const actual = readback(source(version, enabled, form, position, parameter));
          expect(actual.option).toBe(enabled);
          if (actual.compiled) expect(actual.compiledOption).toBe(enabled);
          const contextErrors = actual.errors.filter((diagnostic) => diagnostic.code === 'qualifier-mismatch');
          if (enabled) {
            expect(actual.errors).toEqual([]);
            expect(actual.compiled).toBe(true);
          } else {
            expect(contextErrors).toEqual(expect.arrayContaining([
              expect.objectContaining({ message: expect.stringContaining("simple parameter 'symbol'") }),
            ]));
          }
        });
      }
    }
    for (const position of positions) {
      it.each([false, true])(`v${version} ${position} literal %s keeps series-context policy`, (enabled) => {
        const actual = readback(source(version, enabled, 'literal', position, true));
        expect(actual.errors.some((diagnostic) => diagnostic.code === 'qualifier-mismatch')).toBe(!enabled);
      });
      it(`v${version} ${position} local shadow cannot replace global option`, () => {
        const text = source(version, true, 'alias', position, false).replace('float value = na', 'bool DYNAMIC = false\n    float value = na');
        expect(readback(text).errors).toEqual([]);
      });
    }
  }
});
