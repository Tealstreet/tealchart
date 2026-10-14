import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const fixture = (path: string) => readFileSync(new URL(`../../oracle-probes/v79/captures/v79/${path}`, import.meta.url), 'utf8');
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const publication = JSON.parse(fixture('v79-library-v5-v1/publication-v2/publication-v2.json'));
const librarySource = fixture('v79-library-v5-v1/attempt-v1/executed-v1.pine');
const libraries = new Map([[publication.importPath, parse(librarySource)]]);
const names = ['v79-library-v5-v1', 'v79-v5-exported-controls-v1', 'v79-v5-private-receiver-v1',
  'v79-v5-private-function-v1', 'v79-v6-exported-controls-v1', 'v79-v6-private-receiver-v1', 'v79-v6-private-function-v1'];

describe('native v79 private v5 publication visibility', () => {
  it.each(names)('matches the exact source outcome: %s', (name) => {
    expect(publication).toMatchObject({ status: 'PUBLISHED', visibility: 'PRIVATE', pineVersion: 5,
      importPath: 'sours-lat/P425PrivateV79v1/1', version: '1.0' });
    expect(hash(librarySource)).toBe(publication.sourceSha256);
    const path = `${name}/attempt-v1`;
    const source = fixture(`${path}/executed-v1.pine`);
    const observation = JSON.parse(fixture(`${path}/observation-v4.json`));
    expect(observation.executedSource).toBe(source);
    expect(hash(source)).toBe(observation.executedSha256);
    const ast = parse(source);
    const errors = checkProgram(ast, { libraries }).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    const compiled = tryCompile(ast, undefined, { libraries });
    if (observation.status === 'COMPILE-ERROR') {
      expect(observation).toMatchObject({ phase: 'INDICATOR-COMPILATION', compilationStatus: 'REFUSED' });
      const native = observation.markers.filter((marker: { severity: number }) => marker.severity === 8);
      expect(native.length).toBeGreaterThan(0);
      const first = native[0];
      for (const marker of native) expect(marker).toMatchObject({ message: first.message,
        startLineNumber: 4, startColumn: name.includes('receiver') ? 11 : 9 });
      expect(errors).toEqual([{ code: name.includes('receiver') ? 'private-library-method' : 'private-library-function',
        ...(first.code ? { nativeCode: first.code } : {}), message: first.message, severity: 'error',
        line: first.startLineNumber, column: first.startColumn }]);
      expect(first.code).toBe(name.includes('v6') ? 'CE10271' : undefined);
      expect(compiled.success).toBe(false);
      expect(compiled.unsupported).toEqual([first.message]);
      return;
    }
    expect(observation.status).toBe('RUNS');
    expect(errors).toEqual([]);
    expect(compiled.success).toBe(true);
    const csv = fixture(`${path}/native-v1.csv`);
    expect(hash(csv)).toBe(observation.csv.sha256);
    const [header, ...lines] = csv.trimEnd().split(/\r?\n/);
    const columns = header.split(',');
    expect(columns.slice(6)).toEqual(name === 'v79-library-v5-v1'
      ? ['INTERNAL_PRIVATE_METHOD', 'INTERNAL_PRIVATE_FUNCTION']
      : ['EXPORTED_METHOD', 'EXPORTED_FUNCTION', 'INTERNAL_PRIVATE_METHOD', 'INTERNAL_PRIVATE_FUNCTION']);
    const closed = lines.map((line) => line.split(',')).filter((row) => Number(row[0]) <= Number(observation.closedBarCutoff));
    expect(closed).toHaveLength(name === 'v79-library-v5-v1' ? 2074 : 2076);
    expect(closed).toHaveLength(observation.csv.closedRowCount);
    const bars = closed.map(([time, open, high, low, close, volume]) => ({ time: Number(time) * 1000,
      open: Number(open), high: Number(high), low: Number(low), close: Number(close), volume: Number(volume) }));
    const result = executeCompiled(compiled, bars, undefined, { libraries });
    expect(result?.errors).toEqual([]);
    expect(result?.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(result?.profile.swallowedErrors ?? []).toEqual([]);
    const values = columns.slice(6).map((_, index) => closed.map((row) => Number(row[index + 6])));
    expect(result?.plots.map((plot) => plot.values)).toEqual(values);
    expect(values.map((column) => new Set(column))).toEqual((name === 'v79-library-v5-v1'
      ? [13.5, 33.5] : [23.5, 43.5, 13.5, 33.5]).map((value) => new Set([value])));
  });
});
