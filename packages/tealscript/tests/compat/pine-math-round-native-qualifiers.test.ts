import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const reference = '~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json';
const captures = '~/cs/tealstreet-next/packages/tealscript/oracle-probes/v2/captures/v2';

for (const [label, number, qualifier, expected, batch] of [
  ['const', '1.125', 'const', 1.13, 14],
  ['input', 'input.float(2.125)', 'input', 2.13, 15],
] as const) {
  describe(`CF016: ${reference} functions[152-159] math.round two-argument overload; ${captures}/conflicts-batch-${batch}-v1.csv`, () => {
    it(`retains the ${label} number qualifier with simple precision`, () => {
      const source = `//@version=6
indicator("CF016 native qualifier")
simple int precision = int(syminfo.mintick) > 0 ? 1 : 2
number = ${number}
result = math.round(number, precision)
namedResult = math.round(precision=precision, number=number)
seriesPrecisionResult = math.round(number, bar_index % 2)
oneArgumentResult = math.round(number)
${qualifier === 'const' ? 'const float constrained = result' : ''}
plot(result, title="Rounded")
${qualifier === 'input' ? 'plot(close, title="Consumer", linewidth=int(result))' : ''}
`;
      const checked = checkProgram(parse(source));
      expect(checked.diagnostics).toEqual([]);
      expect(checked.symbols.find((symbol) => symbol.name === 'result')?.type).toMatchObject({ kind: 'float', qualifier });
      expect(checked.symbols.find((symbol) => symbol.name === 'namedResult')?.type).toMatchObject({ kind: 'float', qualifier });
      expect(checked.symbols.find((symbol) => symbol.name === 'seriesPrecisionResult')?.type).toMatchObject({ kind: 'float', qualifier: 'series' });
      expect(checked.symbols.find((symbol) => symbol.name === 'oneArgumentResult')?.type).toMatchObject({ kind: 'int', qualifier });
      const result = runCompatScript(source, {
        bars: compatibilityBars.slice(0, 2),
        engineOptions: { runtime: { syminfo: { mintick: 0.01 } } },
      });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Rounded').values).toEqual([expected, expected]);
    });
  });
}
