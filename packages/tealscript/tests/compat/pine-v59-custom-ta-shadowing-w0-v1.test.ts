import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

function read(path: string) {
  return readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
}

function errors(source: string) {
  return checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
}

for (const version of [5, 6]) {
  for (const method of ['sma', 'ema', 'w0Value']) {
    const prefix = `v59/captures/v59/ns-param-naming-ta-custom-${method}-v${version}-v59-v1/attempt-v1/`;
    const source = read(prefix + 'executed-v1.pine');
    const observation = JSON.parse(read(prefix + 'observation-v4.json'));
    describe(`v${version} captured ta.${method}`, () => {
      it('authenticates exact native source and outcome', () => {
        expect(createHash('sha256').update(source).digest('hex')).toBe(observation.executedSha256);
        expect(source).toBe(observation.executedSource);
        expect(observation.status).toBe(method === 'w0Value' ? 'RUNS' : 'COMPILE-ERROR');
      });
      it('matches the captured call-site refusal or closed plot', () => {
        if (method !== 'w0Value') {
          const native = observation.markers.find((m: { severity: number }) => m.severity === 8);
          expect(native.startLineNumber).toBe(8);
          expect(native.startColumn).toBe(5);
          if (version === 6) expect(native.code).toBe('CE10195');
          expect(errors(source)).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                code: 'builtin-shadowing',
                line: 8,
                column: 5,
              }),
            ]),
          );
          return;
        }
        const csv = read(prefix + 'native-v1.csv');
        expect(createHash('sha256').update(csv).digest('hex')).toBe(observation.csv.sha256);
        const rows = csv
          .trim()
          .split(/\r?\n/)
          .slice(1)
          .map((line) => line.split(','))
          .filter((row) => Number(row[0]) <= Number(observation.closedBarCutoff));
        expect(rows).toHaveLength(observation.csv.closedRowCount);
        const bars = rows.map((row) => ({
          time: Number(row[0]) * 1000,
          open: Number(row[1]),
          high: Number(row[2]),
          low: Number(row[3]),
          close: Number(row[4]),
          volume: Number(row[5]),
        }));
        expect(errors(source)).toEqual([]);
        const compiled = tryCompile(parse(source));
        expect(compiled.success).toBe(true);
        const result = executeCompiled(compiled, bars)!;
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.plots).toHaveLength(1);
        expect(result.plots[0]!.values).toEqual(rows.map((row) => Number(row[6])));
        expect(result.plots[0]!.values).toEqual(rows.map(() => 41));
      });
    });
  }
  for (const method of ['sma', 'ema', 'w0Value']) {
    it(`v${version} renamed receiver preserves custom ${method}`, () => {
      const source = `//@version=${version}\nindicator("Control")\ntype Holder\n    int value\nmethod ${method}(Holder self, int n)=>self.value+n\nf(Holder receiver)=>receiver.${method}(13)*2+1\nplot(f(Holder.new(7)))`;
      expect(errors(source)).toEqual([]);
      const compiled = tryCompile(parse(source));
      expect(compiled.success).toBe(true);
      const result = executeCompiled(compiled, [{ time: 0, open: 1, high: 2, low: 0, close: 1, volume: 5 }])!;
      expect(result.errors).toEqual([]);
      expect(result.plots.map((plot) => plot.values)).toEqual([[41]]);
    });
  }
  it(`v${version} real ta builtins and a bare ta function coexist`, () => {
    const source = `//@version=${version}\nindicator("Builtin control")\nta(float x)=>x+1\nplot(ta(close))\nplot(ta.sma(close,2))\nplot(ta.ema(close,2))`;
    expect(errors(source)).toEqual([]);
    const bars = [1, 3, 8].map((close, index) => ({
      time: index * 60000,
      open: close,
      high: close + 1,
      low: close - 1,
      close,
      volume: 10,
    }));
    const compiled = tryCompile(parse(source));
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, bars)!;
    expect(result.errors).toEqual([]);
    expect(result.plots).toHaveLength(3);
    expect(result.plots[0]!.values).toEqual([2, 4, 9]);
    expect(result.plots[1]!.values).toEqual([null, 2, 5.5]);
    expect(result.plots[2]!.values).toHaveLength(3);
    expect(result.plots[2]!.values).toEqual([null, 2, 6]);
  });
}
