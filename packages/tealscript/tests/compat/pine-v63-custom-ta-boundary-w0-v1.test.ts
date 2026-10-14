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
  for (const method of ['change', 'highest', 'crossover', 'rsi']) {
    const prefix = `v63/captures/v63/custom-ta-${method}-v${version}-v61-v1/attempt-v1/`;
    const source = read(prefix + 'executed-v1.pine');
    const observation = JSON.parse(read(prefix + 'observation-v4.json'));
    const refused = ['crossover', 'rsi'].includes(method);
    describe(`v${version} exact v63 ta.${method}`, () => {
      it('authenticates native source and observed outcome', () => {
        expect(createHash('sha256').update(source).digest('hex')).toBe(observation.executedSha256);
        expect(source).toBe(observation.executedSource);
        expect(observation.status).toBe(refused ? 'COMPILE-ERROR' : 'RUNS');
        if (!refused) {
          const csv = read(prefix + 'native-v1.csv');
          expect(createHash('sha256').update(csv).digest('hex')).toBe(observation.csv.sha256);
          const rows = csv
            .trim()
            .split(/\r?\n/)
            .slice(1)
            .map((line) => line.split(','))
            .filter((row) => Number(row[0]) <= Number(observation.closedBarCutoff));
          expect(rows).toHaveLength(observation.csv.closedRowCount);
          if (method === 'change') expect(rows.map((row) => row[6])).toEqual(rows.map(() => '1'));
        }
      });
      it('matches captured native admission', () => {
        if (refused) {
          const marker = observation.markers.find((m: { severity: number }) => m.severity === 8);
          expect(marker.startLineNumber).toBe(8);
          expect(marker.startColumn).toBe(5);
          expect(marker.message).toContain('cannot shadow existing built-in functions');
          if (version === 6) expect(marker.code).toBe('CE10195');
          expect(errors(source)).toEqual(
            expect.arrayContaining([expect.objectContaining({ code: 'builtin-shadowing', line: 8, column: 5 })]),
          );
        } else {
          expect(errors(source)).toEqual([]);
          expect(tryCompile(parse(source)).success).toBe(true);
        }
      });
    });
    if (!refused) {
      it(`v${version} ta.${method} executes the native builtin on reconstructed closed history`, () => {
        const rows = read(prefix + 'native-v1.csv')
          .trim()
          .split(/\r?\n/)
          .slice(1)
          .map((line) => line.split(','))
          .filter((row) => Number(row[0]) <= Number(observation.closedBarCutoff));
        expect(rows).toHaveLength(observation.csv.closedRowCount);
        const bridgePrefix = `v69/captures/v69/custom-ta-${method}-v${version}-v61-v1/attempt-v1/`;
        const bridge = JSON.parse(read(bridgePrefix + 'history-bridge-v1.json'));
        const bridgeCSV = read(bridgePrefix + 'native-v1.csv');
        expect(createHash('sha256').update(bridgeCSV).digest('hex')).toBe(bridge.bridgeCSVSha256);
        expect(read(bridgePrefix + 'executed-v1.pine')).toBe(source);
        const bridgeRows = bridgeCSV.trim().split(/\r?\n/).slice(1).map(line => line.split(','));
        const overlap = bridgeRows.filter(row => Number(row[0]) >= Number(rows[0]![0]) && Number(row[0]) <= Number(observation.closedBarCutoff));
        expect(overlap).toEqual(rows);
        const priorRows = bridgeRows.filter(row => Number(row[0]) >= 1791600720 && Number(row[0]) < Number(rows[0]![0]));
        expect(priorRows).toHaveLength(12);
        expect(priorRows.map(row => row.slice(0, 6))).toEqual(bridge.requiredPriorRows.rows);
        const inputRows = [...priorRows, ...rows];
        const bars = inputRows.map((row) => ({
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
        expect(result.plots[0]!.values).toHaveLength(inputRows.length);
        expect(result.plots[0]!.values.slice(12)).toEqual(
          rows.map((row) => Number(row[6])),
        );
      });
    }
    it(`v${version} renamed receiver keeps custom ${method} body`, () => {
      const renamed = source
        .replace('f(Holder ta)', 'f(Holder receiver)')
        .replace(`ta.${method}(13)`, `receiver.${method}(13)`);
      expect(errors(renamed)).toEqual([]);
      const compiled = tryCompile(parse(renamed));
      expect(compiled.success).toBe(true);
      const result = executeCompiled(compiled, [{ time: 0, open: 1, high: 2, low: 0, close: 1, volume: 5 }])!;
      expect(result.errors).toEqual([]);
      expect(result.plots).toHaveLength(1);
      expect(result.plots[0]!.values).toEqual([41]);
    });
  }
}
