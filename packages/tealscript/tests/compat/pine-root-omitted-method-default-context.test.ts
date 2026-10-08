import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

const bars = [23, 25, 29, 31].map((close, index) => ({
  time: Date.UTC(2026, 9, 2) + index * 60_000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 17,
}));

const modes = [
  'omitted-method',
  'omitted-typed-method',
  'omitted-helper-with-method',
  'supplied-method',
  'literal',
  'typed-literal',
  'direct-method',
  'helper-without-method',
  'supplied-literal',
  'body-frame',
  'omitted-overload-int',
  'omitted-overload-float',
  'supplied-overload-int',
  'supplied-overload-float',
] as const;

describe('omitted local defaults retain method context frame ownership', () => {
  for (const version of [5, 6]) {
    for (const context of ['direct', 'security', 'lower']) {
      for (const mode of modes) {
        it(`v${version} ${context} ${mode} preserves the length`, () => {
          const helperDefault = mode === 'omitted-helper-with-method' || mode === 'helper-without-method';
          const literalDefault = mode === 'literal' || mode === 'typed-literal';
          const defaultValue = literalDefault ? '2' : helperDefault ? 'measure()' : 'seed.width()';
          const annotation = mode === 'omitted-typed-method' || mode === 'typed-literal' ? 'int ' : '';
          const overload = mode.includes('overload');
          const floatReceiver = mode.endsWith('float');
          const call =
            mode === 'supplied-method' || mode.startsWith('supplied-overload')
              ? 'read(seed.width())'
              : mode === 'direct-method'
                ? 'seed.width()'
                : mode === 'supplied-literal'
                  ? 'read(7)'
                  : mode === 'body-frame'
                    ? 'outer()'
                    : 'read()';
          const source = `//@version=${version}
indicator("Default method context frame")
${mode === 'helper-without-method' ? '' : `method width(array<int> values) => values.size()${overload ? '\nmethod width(array<float> values) => values.size() + 3' : ''}`}
seed = ${floatReceiver ? 'array.new_float(2, 1.5)' : 'array.new_int(2, 1)'}
${helperDefault ? 'measure() => seed.size()' : ''}
read(${annotation}value = ${defaultValue}) => value
${mode === 'body-frame' ? 'outer() => read()' : ''}
${
  context === 'lower'
    ? `values = request.security_lower_tf("REMOTE:ALT", "1", ${call})
value = array.size(values) > 0 ? array.get(values, 0) : na`
    : `value = ${context === 'security' ? `request.security("REMOTE:ALT", "1", ${call})` : call}`
}
plot(value, "Length")`;
          const compiled = tryCompile(parse(source));
          expect(compiled.success).toBe(true);
          const result = executeCompiled(compiled, bars, undefined, {
            requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'REMOTE:ALT', timeframe: '1', bars }]),
            runtime: { timeframe: { period: context === 'lower' ? '3' : '1' } },
          });
          expect(result).toBeDefined();
          expect(result!.errors).toEqual([]);
          expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
          const expected = mode === 'supplied-literal' ? 7 : floatReceiver ? 5 : 2;
          const values = result!.plots.find((plot) => plot.title === 'Length')?.values;
          expect(context === 'lower' ? values?.slice(0, 2) : values).toEqual(
            context === 'lower' ? [expected, expected] : [expected, expected, expected, expected],
          );
        });
      }
    }
  }
});
