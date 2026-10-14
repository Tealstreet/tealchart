import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
const read = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
describe('v71 builtin method receiver captures', () => {
  for (const version of [5, 6]) for (const kind of ['box', 'footprint']) for (const role of ['natural', 'control']) {
    it(`v${version} ${kind} ${role}`, () => {
      const prefix = `v71/captures/v71/unused-builtin-${kind}-v${version}-${role}-v2/attempt-v1/`;
      const source = read(`${prefix}executed-v1.pine`);
      const observation = JSON.parse(read(`${prefix}observation-v3.json`));
      expect(observation.executedSource).toBe(source);
      const errors = checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error');
      if (observation.status === 'COMPILE-ERROR') {
        const marker = observation.markers.find((m: { message: string }) => m.message.includes('first method argument') || m.message.includes('not a valid type keyword'));
        expect(errors).toContainEqual(expect.objectContaining({ message: marker.message, line: marker.startLineNumber, column: marker.startColumn }));
      } else {
        expect(errors).toEqual([]);
        const rows = read(`${prefix}native-v1.csv`).trim().split(/\r?\n/).slice(1).map(row => row.split(','));
        const closed = rows.filter(row => Number(row[0]) <= Number(observation.closedBarCutoff));
        expect(closed.length).toBeGreaterThanOrEqual(32);
        expect(closed.every(row => row[6] === '7')).toBe(true);
        const compiled = tryCompile(parse(source));
        expect(compiled.success).toBe(true);
        const bars = Array.from({ length: 32 }, (_, i) => ({ time: Date.UTC(2026, 9, 1) + i * 120000, open: 41, high: 44, low: 40, close: 43, volume: 100 }));
        const result = executeCompiled(compiled, bars)!;
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.plots[0]!.values).toEqual(bars.map(() => 7));
      }
    });
  }
});

for (const version of [5, 6]) for (const kind of ['line', 'label', 'table', 'linefill']) {
  it(`preserves unwitnessed v${version} ${kind} unused receiver admission`, () => {
    const source = `//@version=${version}
indicator("Unwitnessed receiver")
method inspect(${kind} self) => 7
${kind} value = na
plot(value.inspect())`;
    expect(checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  });
}
