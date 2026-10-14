import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const bars = Array.from({ length: 256 }, (_, index) => ({
  time: Date.UTC(2026, 9, 1) + index * 120000,
  open: 41 + index * 0.25,
  high: 200 + index,
  low: 1,
  close: 43 + index * 0.5,
  volume: 100,
}));

for (const version of [5, 6]) {
  for (const kind of ['int', 'float']) {
    describe(`v${version} imported float-array pick on ${kind}[]`, () => {
      function run(localName: string, localReceiver = false) {
        const library = `//@version=${version}
library("Extra")
export method pick(array<float> self)=>array.sum(self)+17`;
        const libraries = new Map([['QA/Extra/1', parse(library)]]);
        const source = `//@version=${version}
indicator("repro")
import QA/Extra/1 as lib
type Holder
    int v
method ${localName}(Holder self)=>self.v+200
a=${localReceiver ? 'Holder.new(14)' : `array.from(${kind}(close),${kind}(open))`}
plot(a.pick())`;
        const ast = parse(source);
        expect(checkProgram(ast, { libraries }).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
        const compiled = tryCompile(ast, undefined, { libraries });
        expect(compiled.success).toBe(true);
        const result = executeCompiled(compiled, bars);
        expect(result).toBeDefined();
        expect(result!.errors).toEqual([]);
        expect(result!.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result!.plots).toHaveLength(1);
        const values = result!.plots[0]!.values;
        expect(values.every(value => Number.isFinite(value))).toBe(true);
        expect(values).toEqual(localReceiver ? bars.map(() => 214) : bars.map(bar => (kind === 'int'
          ? Math.trunc(bar.open) + Math.trunc(bar.close)
          : bar.open + bar.close) + 17));
        return values;
      }

      it('compatible import survives an unrelated same-named local', () => {
        expect(run('pick')).toEqual(run('other'));
      });

      it('renamed local control', () => {
        run('other');
      });

      it('compatible local method keeps precedence', () => {
        run('pick', true);
      });
    });
  }
}
