import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';
const cases = [
  {
    "probe": "unused-udt-v5-indicator-v1",
    "source": "v60/captures/v60/unused-udt-v5-indicator-v1/attempt-v1/executed-v1.pine",
    "sha256": "b8223f7ae7696939edfdc09c2fd448f5c155ebc628a5db45b9a710a3a67fe25d",
    "library": false
  },
  {
    "probe": "unused-udt-v5-library-v1",
    "source": "v60/captures/v60/unused-udt-v5-library-v1/attempt-v1/executed-v1.pine",
    "sha256": "3c7cdb9f5c456a03729de57f35f8fa1a79ed50f8278778e9fb56cc31b6e36d2f",
    "library": true
  },
  {
    "probe": "unused-udt-v6-indicator-v1",
    "source": "v60/captures/v60/unused-udt-v6-indicator-v1/attempt-v1/executed-v1.pine",
    "sha256": "f3d0a95c4e5ca9667f389a735e252d620f127cdd003170b7b6bd6ab7823f4c82",
    "library": false
  },
  {
    "probe": "unused-udt-v6-library-v1",
    "source": "v60/captures/v60/unused-udt-v6-library-v1/attempt-v1/executed-v1.pine",
    "sha256": "f09ca2b9b3264c22dd595a9e734e081d868eae3383125f7ec82a8258d6814977",
    "library": true
  }
];
const read = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
describe('v60 unused UDT receiver native boundaries', () => {
  for (const entry of cases) {
    it(entry.probe, () => {
      const source = read(entry.source);
      expect(createHash('sha256').update(source).digest('hex')).toBe(entry.sha256);
      const observation = JSON.parse(read(entry.source.replace('executed-v1.pine', 'observation-v4.json')));
      expect(observation.executedSha256).toBe(entry.sha256);
      const errors = checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error');
      if (entry.library) {
        expect(observation.status).toBe('RUNS');
        expect(errors).toEqual([]);
      } else {
        expect(observation.status).toBe('COMPILE-ERROR');
        expect(errors).toContainEqual(expect.objectContaining({ code: 'unused-method-receiver', line: 5, column: 13, message: observation.markers.find((marker: { message: string }) => marker.message.includes('first method argument')).message }));
      }
    });
    it(`${entry.probe} receiver-used control`, () => {
      const source = read(entry.source).replace('other.x + delta', 'other.x + delta + p.x * 0');
      const ast = parse(source);
      expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
      if (!entry.library) {
        const compiled = tryCompile(ast);
        expect(compiled.success).toBe(true);
        const bars = Array.from({ length: 32 }, (_, i) => ({ time: Date.UTC(2026, 9, 1) + i * 120000, open: 41, high: 44, low: 40, close: 43, volume: 100 }));
        const result = executeCompiled(compiled, bars)!;
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.plots[0]!.values).toEqual(bars.map(() => 21));
      }
    });
  }
});

for (const version of [5, 6]) it(`v${version} different UDT method with a used first receiver stays admitted`, () => {
  const ast = parse(`//@version=${version}
indicator("Used UDT method")
type Point
    float x
method translate(Point self, float delta) => self.x + delta
p = Point.new(11)
plot(p.translate(1))`);
  expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  expect(compiled.success).toBe(true);
  const bars = Array.from({ length: 32 }, (_, i) => ({ time: Date.UTC(2026, 9, 1) + i * 120000, open: 41, high: 44, low: 40, close: 43, volume: 100 }));
  const result = executeCompiled(compiled, bars)!;
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  expect(result.plots[0]!.values).toEqual(bars.map(() => 12));
});

for (const version of [5, 6]) {
  it(`v${version} receiver-only unused UDT method refuses with native text/site`, () => {
    const prefix = `v68/captures/v68/unused-udt-receiver-only-v${version}-natural-v1/attempt-v1/`;
    const source = read(`${prefix}executed-v1.pine`);
    const observation = JSON.parse(read(`${prefix}observation-v3.json`));
    expect(observation.executedSource).toBe(source);
    expect(observation.status).toBe('COMPILE-ERROR');
    const marker = observation.markers.find((entry: { message: string }) => entry.message.includes('first method argument'));
    expect(marker.startLineNumber).toBe(5);
    expect(marker.startColumn).toBe(15);
    const errors = checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error');
    expect(errors).toContainEqual(expect.objectContaining({ code: 'unused-method-receiver', line: 5, column: 15, message: marker.message }));
    const exactVerifierSource = `//@version=${version}
indicator("Receiver-only control")
type Point
    float x
method inspect(Point p) => 12.0
plot(close)
`;
    expect(checkProgram(parse(exactVerifierSource)).diagnostics).toContainEqual(expect.objectContaining({ code: 'unused-method-receiver', line: 5, column: 15, message: marker.message }));
  });
  it(`v${version} v68 used receiver control stays admitted and plots native12`, () => {
    const prefix = `v68/captures/v68/unused-udt-receiver-only-v${version}-control-v1/attempt-v1/`;
    const source = read(`${prefix}executed-v1.pine`);
    const observation = JSON.parse(read(`${prefix}observation-v3.json`));
    expect(observation.executedSource).toBe(source);
    expect(observation.status).toBe('RUNS');
    const rows = read(`${prefix}native-v1.csv`).trim().split(/\r?\n/).slice(1).map(row => row.split(','));
    const closed = rows.filter(row => Number(row[0]) <= Number(observation.closedBarCutoff));
    expect(closed.length).toBeGreaterThanOrEqual(32);
    expect(closed.every(row => row[6] === '12')).toBe(true);
    const ast = parse(source);
    expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);
    const bars = Array.from({ length: 32 }, (_, i) => ({ time: Date.UTC(2026, 9, 1) + i * 120000, open: 41, high: 44, low: 40, close: 43, volume: 100 }));
    const result = executeCompiled(compiled, bars)!;
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(result.plots[0]!.values).toEqual(bars.map(() => 12));
  });
}

it('preserves used opaque builtin footprint receivers and their base value', () => {
  const ast = parse(`//@version=6
indicator("Native missing footprint IDs")
method rows(footprint fp) =>
    na(fp) ? 7 : 7
footprint fp = na
plot(fp.rows())`);
  expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  expect(compiled.success).toBe(true);
  const bars = Array.from({ length: 6 }, (_, i) => ({ time: Date.UTC(2026, 9, 1) + i * 120000, open: 100, high: 102, low: 98, close: 101, volume: 10 }));
  const result = executeCompiled(compiled, bars)!;
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  expect(result.plots[0]!.values).toEqual(Array(6).fill(7));
});
