import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';
import { expectedVersionAdvisories } from '../helpers/expectedVersionAdvisory';

interface Observation {
  executedSource: string;
  executedSha256: string;
  templateSha256: string;
  status: 'RUNS' | 'COMPILE-ERROR';
  diagnostics: { class: string; code: string | null; text: string; line: number; column: number }[];
  closedBarCutoff: string | null;
  csv?: { sha256: string; closedRowCount: number };
}

const fixture = (path: string) => new URL(`../../oracle-probes/v78/${path}`, import.meta.url);
const probes = [5, 6].flatMap((version) => ['every', 'some'].flatMap((method) =>
  ['int', 'float', 'string'].flatMap((kind) => ['named', 'positional'].map((form) =>
    `v78-v${version}-${method}-${kind}-${form}-tk-v1`))));
const compilerResponseProbes = new Set([
  'v78-v5-every-string-positional-tk-v1',
  'v78-v5-some-string-named-tk-v1',
  'v78-v5-some-string-positional-tk-v1',
]);

function uniqueMarkers<T extends {
  severity: string; code?: string; message: string; line?: number; column?: number;
}>(markers: readonly T[]): T[] {
  const unique = new Map<string, T>();
  for (const row of markers) {
    const key = JSON.stringify([row.severity, row.code, row.message, row.line, row.column]);
    if (!unique.has(key)) unique.set(key, row);
  }
  return [...unique.values()];
}

describe('v78 named and positional array predicate arguments', () => {
  it.each(probes)('matches captured admission, diagnostic and closed output: %s', (probe) => {
    const source = readFileSync(fixture(`${probe}.pine`), 'utf8');
    const directory = `captures/v78/${probe}/attempt-v1/`;
    const observation = JSON.parse(readFileSync(fixture(`${directory}observation-v3.json`), 'utf8')) as Observation;
    expect(source).toBe(observation.executedSource);
    const sourceHash = createHash('sha256').update(source).digest('hex');
    expect(sourceHash).toBe(observation.executedSha256);
    expect(sourceHash).toBe(observation.templateSha256);
    // The attempt above supplies the complete marker list, including the header advisory.
    const native = observation.diagnostics.map((row) => ({
      severity: row.class, message: row.text, line: row.line, column: row.column,
      ...(row.code ? { code: row.code } : {}),
    }));
    let unique;
    if (compilerResponseProbes.has(probe)) {
      // This attempt's compiler response has one error and no combined advisory/error order.
      // Batch 59's ruling requires exactly [advisory, error], independent of duplicate UI markers.
      const responses = JSON.parse(readFileSync(fixture(`${directory}native-compiler-responses-v1.json`), 'utf8')) as {
        nativeRequest: string; requestBody: string; responseBody: string;
      }[];
      const response = responses.find((row) => row.nativeRequest.includes('/translate_light?'))!;
      expect(response.requestBody).toContain(source.replace(/\n/g, '\r\n'));
      const result = JSON.parse(response.responseBody) as {
        result: { errors: { message: string; start: { line: number; column: number } }[] };
      };
      expect(result.result.errors).toHaveLength(1);
      const error = result.result.errors[0];
      const advisories = native.filter((row) => row.code === 'PINE_VERSION_OUTDATED');
      expect(advisories).toHaveLength(1);
      unique = [advisories[0], {
        severity: 'error', message: error.message, line: error.start.line, column: error.start.column,
      }];
    } else unique = uniqueMarkers(native);
    expect(unique).toHaveLength(probe.startsWith('v78-v5-') ? 2 : 1);
    const checked = checkProgram(parse(source));
    expect(checked.diagnostics).toHaveLength(unique.length);
    expect(checked.diagnostics).toEqual(unique.map((row) => expect.objectContaining(row)));
    expect(checked.diagnostics.filter((row) => row.severity === 'error')).toHaveLength(
      observation.status === 'COMPILE-ERROR' ? 1 : 0,
    );
    if (observation.status !== 'RUNS') return;
    expect(observation.csv).toBeDefined();
    const csv = readFileSync(fixture(`${directory}native-v1.csv`), 'utf8');
    expect(createHash('sha256').update(csv).digest('hex')).toBe(observation.csv!.sha256);
    const lines = csv.trim().split(/\r?\n/);
    expect(lines.shift()!.split(',')).toEqual(['time', 'open', 'high', 'low', 'close', 'Volume', 'RESULT']);
    const rows = lines.map((line) => line.split(','));
    const bars = rows.map(([time, open, high, low, close, volume]) => ({
      time: Number(time) * 1000, open: Number(open), high: Number(high), low: Number(low),
      close: Number(close), volume: Number(volume),
    }));
    const execution = executeCompiledScript(parse(source), bars, new Map());
    expect(execution.status).toBe('success');
    if (execution.status !== 'success') throw new Error(execution.reason);
    expect(execution.result.errors).toEqual([]);
    expect(execution.result.profile.compiledBarErrors).toBeUndefined();
    expect(execution.result.plots).toHaveLength(1);
    const values = execution.result.plots[0].values;
    expect(values).toHaveLength(rows.length);
    const closed = rows.map((row, index) => ({ row, index })).filter(({ row }) =>
      Number(row[0]) <= Number(observation.closedBarCutoff));
    expect(closed).toHaveLength(observation.csv!.closedRowCount);
    expect(closed).toHaveLength(2008);
    for (const { row, index } of closed) expect(values[index], `${probe} ${row[0]}`).toBe(Number(row[6]));
  });

  it.each([5, 6])('retains bool namespace and receiver controls in v%i', (version) => {
    for (const method of ['every', 'some']) {
      for (const call of [`array.${method}(items)`, `array.${method}(id=items)`, `items.${method}()`]) {
        const source = `//@version=${version}\nindicator("Bool controls")\nitems = array.from(false, true)\nplot(${call} ? 1 : 0)\n`;
        // Class 17's 211 native sources witness the v4/v5 header advisory at 1:3.
        // See pine-outdated-version-advisory-v1.test.ts for the authenticated attempt set.
        expect(checkProgram(parse(source)).diagnostics).toEqual(expectedVersionAdvisories(version));
      }
    }
  });
});
