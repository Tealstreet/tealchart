import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
const cases = [
  {
    "probe": "footprint-annotation-v5-natural-v1",
    "prefix": "v77/captures/v77/footprint-annotation-v5-natural-v1/attempt-v1/",
    "nativeStatus": "COMPILE-ERROR",
    "context": "annotation"
  },
  {
    "probe": "footprint-annotation-v5-renamed-control-v1",
    "prefix": "v77/captures/v77/footprint-annotation-v5-renamed-control-v1/attempt-v1/",
    "nativeStatus": "COMPILE-ERROR",
    "context": "annotation"
  },
  {
    "probe": "footprint-annotation-v5-grammar-control-v1",
    "prefix": "v77/captures/v77/footprint-annotation-v5-grammar-control-v1/attempt-v1/",
    "nativeStatus": "RUNS",
    "context": "annotation"
  },
  {
    "probe": "footprint-annotation-v6-natural-v1",
    "prefix": "v77/captures/v77/footprint-annotation-v6-natural-v1/attempt-v1/",
    "nativeStatus": "COMPILE-ERROR",
    "context": "annotation"
  },
  {
    "probe": "footprint-annotation-v6-renamed-control-v1",
    "prefix": "v77/captures/v77/footprint-annotation-v6-renamed-control-v1/attempt-v1/",
    "nativeStatus": "RUNS",
    "context": "annotation"
  },
  {
    "probe": "footprint-annotation-v6-grammar-control-v1",
    "prefix": "v77/captures/v77/footprint-annotation-v6-grammar-control-v1/attempt-v1/",
    "nativeStatus": "RUNS",
    "context": "annotation"
  },
  {
    "probe": "footprint-parameter-v5-natural-v1",
    "prefix": "v77/captures/v77/footprint-parameter-v5-natural-v1/attempt-v1/",
    "nativeStatus": "COMPILE-ERROR",
    "context": "parameter"
  },
  {
    "probe": "footprint-parameter-v5-renamed-control-v1",
    "prefix": "v77/captures/v77/footprint-parameter-v5-renamed-control-v1/attempt-v1/",
    "nativeStatus": "COMPILE-ERROR",
    "context": "parameter"
  },
  {
    "probe": "footprint-parameter-v5-grammar-control-v1",
    "prefix": "v77/captures/v77/footprint-parameter-v5-grammar-control-v1/attempt-v1/",
    "nativeStatus": "RUNS",
    "context": "parameter"
  },
  {
    "probe": "footprint-parameter-v6-natural-v1",
    "prefix": "v77/captures/v77/footprint-parameter-v6-natural-v1/attempt-v1/",
    "nativeStatus": "RUNS",
    "context": "parameter"
  },
  {
    "probe": "footprint-parameter-v6-renamed-control-v1",
    "prefix": "v77/captures/v77/footprint-parameter-v6-renamed-control-v1/attempt-v1/",
    "nativeStatus": "RUNS",
    "context": "parameter"
  },
  {
    "probe": "footprint-parameter-v6-grammar-control-v1",
    "prefix": "v77/captures/v77/footprint-parameter-v6-grammar-control-v1/attempt-v1/",
    "nativeStatus": "RUNS",
    "context": "parameter"
  },
  {
    "probe": "footprint-var-v5-natural-v1",
    "prefix": "v77/captures/v77/footprint-var-v5-natural-v1/attempt-v1/",
    "nativeStatus": "COMPILE-ERROR",
    "context": "var"
  },
  {
    "probe": "footprint-var-v5-renamed-control-v1",
    "prefix": "v77/captures/v77/footprint-var-v5-renamed-control-v1/attempt-v1/",
    "nativeStatus": "COMPILE-ERROR",
    "context": "var"
  },
  {
    "probe": "footprint-var-v5-grammar-control-v1",
    "prefix": "v77/captures/v77/footprint-var-v5-grammar-control-v1/attempt-v1/",
    "nativeStatus": "RUNS",
    "context": "var"
  },
  {
    "probe": "footprint-var-v6-natural-v1",
    "prefix": "v77/captures/v77/footprint-var-v6-natural-v1/attempt-v1/",
    "nativeStatus": "COMPILE-ERROR",
    "context": "var"
  },
  {
    "probe": "footprint-var-v6-renamed-control-v1",
    "prefix": "v77/captures/v77/footprint-var-v6-renamed-control-v1/attempt-v1/",
    "nativeStatus": "RUNS",
    "context": "var"
  },
  {
    "probe": "footprint-var-v6-grammar-control-v1",
    "prefix": "v77/captures/v77/footprint-var-v6-grammar-control-v1/attempt-v1/",
    "nativeStatus": "RUNS",
    "context": "var"
  },
  {
    "probe": "footprint-request-call-v5-natural-v1",
    "prefix": "v77/captures/v77/footprint-request-call-v5-natural-v1/attempt-v1/",
    "nativeStatus": "COMPILE-ERROR",
    "context": "request-call"
  },
  {
    "probe": "footprint-request-call-v5-renamed-control-v1",
    "prefix": "v77/captures/v77/footprint-request-call-v5-renamed-control-v1/attempt-v1/",
    "nativeStatus": "COMPILE-ERROR",
    "context": "request-call"
  },
  {
    "probe": "footprint-request-call-v5-grammar-control-v1",
    "prefix": "v77/captures/v77/footprint-request-call-v5-grammar-control-v1/attempt-v1/",
    "nativeStatus": "RUNS",
    "context": "request-call"
  },
  {
    "probe": "footprint-request-call-v6-natural-v1",
    "prefix": "v77/captures/v77/footprint-request-call-v6-natural-v1/attempt-v1/",
    "nativeStatus": "COMPILE-ERROR",
    "context": "request-call"
  },
  {
    "probe": "footprint-request-call-v6-renamed-control-v1",
    "prefix": "v77/captures/v77/footprint-request-call-v6-renamed-control-v1/attempt-v1/",
    "nativeStatus": "RUNS",
    "context": "request-call"
  },
  {
    "probe": "footprint-request-call-v6-grammar-control-v1",
    "prefix": "v77/captures/v77/footprint-request-call-v6-grammar-control-v1/attempt-v1/",
    "nativeStatus": "RUNS",
    "context": "request-call"
  }
];
const read = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
describe('v77 native footprint version/context boundaries', () => {
  for (const entry of cases) it(entry.probe, () => {
    const source = read(`${entry.prefix}executed-v1.pine`);
    const observation = JSON.parse(read(`${entry.prefix}observation-v3.json`));
    expect(observation.executedSource).toBe(source);
    const ast = parse(source);
    const errors = checkProgram(ast).diagnostics.filter(d => d.severity === 'error');
    if (observation.status === 'COMPILE-ERROR') {
      const marker = observation.markers.find((m: { severity: number }) => m.severity === 8);
      expect(errors).toContainEqual(expect.objectContaining({ message: marker.message, line: marker.startLineNumber, column: marker.startColumn }));
      expect(tryCompile(ast).success).toBe(false);
    } else {
      expect(errors).toEqual([]);
      const compiled = tryCompile(ast);
      expect(compiled.success).toBe(true);
      const rows = read(`${entry.prefix}native-v1.csv`).trim().split(/\r?\n/).slice(1).map(row => row.split(','));
      const closed = rows.filter(row => Number(row[0]) <= Number(observation.closedBarCutoff));
      expect(closed.length).toBeGreaterThanOrEqual(32);
      expect(closed.every(row => row[6] === (entry.context === 'request-call' ? '1' : '7'))).toBe(true);
      if (entry.context !== 'request-call') {
        const bars = Array.from({ length: 32 }, (_, i) => ({ time: Date.UTC(2026, 9, 1) + i * 120000, open: 41, high: 44, low: 40, close: 43, volume: 100 }));
        const result = executeCompiled(compiled, bars)!;
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.plots[0]!.values).toEqual(bars.map(() => 7));
      }
    }
  });
});
