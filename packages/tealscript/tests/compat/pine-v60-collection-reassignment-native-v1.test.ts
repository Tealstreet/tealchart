import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';
const cases = [
  {
    "probe": "v60-array-reassign-v5-untyped-v1",
    "source": "v60/captures/v60/v60-array-reassign-v5-untyped-v1/attempt-v1/executed-v1.pine",
    "sha256": "624d85aac031848dffd1662c1dd5689b1bd8282df5e5b9765a3db8ecb4d853ff",
    "refused": false,
    "csv": "v60/captures/v60/v60-array-reassign-v5-untyped-v1/attempt-v1/native-v1.csv"
  },
  {
    "probe": "v60-array-reassign-v5-typed-v1",
    "source": "v60/captures/v60/v60-array-reassign-v5-typed-v1/attempt-v1/executed-v1.pine",
    "sha256": "7942a402f6635bdd07983ddc3502f7a670dee157d7a1a0e37d252417160b65bb",
    "refused": false,
    "csv": "v60/captures/v60/v60-array-reassign-v5-typed-v1/attempt-v1/native-v1.csv"
  },
  {
    "probe": "v60-array-reassign-v6-untyped-v1",
    "source": "v60/captures/v60/v60-array-reassign-v6-untyped-v1/attempt-v1/executed-v1.pine",
    "sha256": "aa5621cd8642e8a553d659d7aacd026fa38ce184fc8c7abdd6e938819ac726d2",
    "refused": true
  },
  {
    "probe": "v60-array-reassign-v6-typed-v1",
    "source": "v60/captures/v60/v60-array-reassign-v6-typed-v1/attempt-v1/executed-v1.pine",
    "sha256": "85b7efc61a1bb6da6dbee286efc3037d7f3ed1ac360c072a302b522a032799e5",
    "refused": true
  },
  {
    "probe": "v60-map-reassign-v5-untyped-v1",
    "source": "v60/captures/v60/v60-map-reassign-v5-untyped-v1/attempt-v1/executed-v1.pine",
    "sha256": "fb39f250f1cf6efac3f0ade4e1e9fa8543c024bcb63b63e13786cc1369e473fb",
    "refused": false,
    "csv": "v60/captures/v60/v60-map-reassign-v5-untyped-v1/attempt-v1/native-v1.csv"
  },
  {
    "probe": "v60-map-reassign-v5-typed-v1",
    "source": "v60/captures/v60/v60-map-reassign-v5-typed-v1/attempt-v1/executed-v1.pine",
    "sha256": "cd1002844ecdaa1f886e9f5d6d40856fab38158e2cabc2d29313d7a535e79b6c",
    "refused": false,
    "csv": "v60/captures/v60/v60-map-reassign-v5-typed-v1/attempt-v1/native-v1.csv"
  },
  {
    "probe": "v60-map-reassign-v6-untyped-v1",
    "source": "v60/captures/v60/v60-map-reassign-v6-untyped-v1/attempt-v1/executed-v1.pine",
    "sha256": "9109e6bc99b89a545cadd06771c969fc7e134e3e98b789f508cbea7100e9001b",
    "refused": true
  },
  {
    "probe": "v60-map-reassign-v6-typed-v1",
    "source": "v60/captures/v60/v60-map-reassign-v6-typed-v1/attempt-v1/executed-v1.pine",
    "sha256": "9a0052aea3bc1982e6cba6c522661f311ce702fe1aa0fe502f1e3b2a6ebf2ecf",
    "refused": true
  }
];
const read = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
const bars = Array.from({ length: 32 }, (_, i) => ({ time: Date.UTC(2026, 9, 1) + i * 120000, open: 41, high: 44, low: 40, close: 43, volume: 100 }));
describe('v60 native collection reassignment 2x2', () => {
  for (const entry of cases) it(entry.probe, () => {
    const source = read(entry.source);
    expect(createHash('sha256').update(source).digest('hex')).toBe(entry.sha256);
    const observation = JSON.parse(read(entry.source.replace('executed-v1.pine', 'observation-v4.json')));
    expect(observation.executedSha256).toBe(entry.sha256);
    const ast = parse(source);
    const errors = checkProgram(ast).diagnostics.filter(d => d.severity === 'error');
    if (entry.refused) {
      expect(observation.status).toBe('COMPILE-ERROR');
      expect(errors).toContainEqual(expect.objectContaining({ code: 'type-mismatch', line: 7, column: 5, message: observation.markers.find((marker: { code: string }) => marker.code === 'CE10173').message }));
    } else {
      expect(observation.status).toBe('RUNS');
      const rows = read(entry.csv!).trim().split(/\r?\n/).slice(1).map(row => row.split(','));
      const closed = rows.filter(row => Number(row[0]) <= Number(observation.closedBarCutoff));
      expect(closed.length).toBeGreaterThan(0);
      expect(closed.every(row => row[6] === '20')).toBe(true);
      expect(errors).toEqual([]);
      const compiled = tryCompile(ast);
      expect(compiled.success).toBe(true);
      const result = executeCompiled(compiled, bars)!;
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.plots[0]!.values).toEqual(bars.map(() => 20));
    }
  });
});


describe('v64 native persistent collection aliases', () => {
  for (const kind of ['array', 'map']) for (const mode of ['var', 'varip']) {
    for (const control of [false, true]) it(`${mode} ${kind} ${control ? 'control' : 'natural'}`, () => {
      const id = `v61-${kind}-reassign-${mode}-${control ? 'control' : 'natural'}-v2`;
      const prefix = `v64/captures/v64/${id}/attempt-v1/`;
      const source = read(`${prefix}executed-v1.pine`);
      const observation = JSON.parse(read(`${prefix}observation-v3.json`));
      expect(observation.executedSource).toBe(source);
      const ast = parse(source);
      const errors = checkProgram(ast).diagnostics.filter(d => d.severity === 'error');
      if (!control) {
        expect(observation.status).toBe('COMPILE-ERROR');
        expect(observation.markers).toContainEqual(expect.objectContaining({ code: 'CE10173', startLineNumber: 5, startColumn: 5 }));
        expect(errors).toContainEqual(expect.objectContaining({ code: 'type-mismatch', line: 5, column: 5, message: observation.markers.find((marker: { code: string }) => marker.code === 'CE10173').message }));
      } else {
        expect(observation.status).toBe('RUNS');
        const rows = read(`${prefix}native-v1.csv`).trim().split(/\r?\n/).slice(1).map(row => row.split(','));
        const closed = rows.filter(row => Number(row[0]) <= Number(observation.closedBarCutoff));
        expect(closed.length).toBeGreaterThanOrEqual(32);
        expect(closed.every(row => row[6] === '3')).toBe(true);
        expect(errors).toEqual([]);
        const compiled = tryCompile(ast);
        expect(compiled.success).toBe(true);
        const result = executeCompiled(compiled, bars)!;
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.plots[0]!.values).toEqual(bars.map(() => 3));
      }
    });
  }
});
