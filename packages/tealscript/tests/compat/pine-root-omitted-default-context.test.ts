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

describe('root omitted default helper arithmetic context', () => {
  for (const context of ['direct', 'security']) {
    for (const arithmetic of [false, true]) {
      for (const mode of ['omitted', 'body-frame', 'supplied', 'literal']) {
        it(`${context} arithmetic=${arithmetic} ${mode} preserves the title and length`, () => {
          const helpers =
            mode === 'literal'
              ? 'show(value = Side.up) => str.tostring(value)'
              : `make() =>
    values = map.new<string, Side>()
    values.put("k", Side.up)
    values
show(${mode === 'supplied' ? 'map<string, Side> ' : ''}values = make()) => str.tostring(values.get("k"))`;
          const call = mode === 'supplied' ? 'show(make())' : mode === 'body-frame' ? 'outer()' : 'show()';
          const source = `//@version=5
indicator("Default context discriminator")
enum Side
    up = "UP TITLE"
${helpers}
${mode === 'body-frame' ? 'outer() => show()\n' : ''}value = ${context === 'direct' ? call : `request.security("REMOTE:VERIFY", "1", ${call})`}
${arithmetic ? 'plot(close + 0, "Activation")' : ''}
plot(value == "UP TITLE" ? 1 : 0, "Match")
plot(str.length(value), "Length")`;
          const compiled = tryCompile(parse(source));
          expect(compiled.success).toBe(true);
          const result = executeCompiled(compiled, bars, undefined, {
            requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'REMOTE:VERIFY', timeframe: '1', bars }]),
            runtime: { timeframe: { period: '1' } },
          });
          expect(result).toBeDefined();
          expect(result!.errors).toEqual([]);
          expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
          expect(result!.plots.find((plot) => plot.title === 'Match')?.values).toEqual([1, 1, 1, 1]);
          expect(result!.plots.find((plot) => plot.title === 'Length')?.values).toEqual([8, 8, 8, 8]);
        });
      }
    }
  }
});
