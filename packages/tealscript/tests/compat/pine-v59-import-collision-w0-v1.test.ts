import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

function read(path: string) {
  return readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
}

for (const version of [5, 6]) {
  const prefix = `v59/captures/v59/local-import-collision-v${version}-v59-v1/attempt-v1/`;
  const libPrefix = `v59/captures/v59/local-import-collision-library-v${version}-v59-v1/attempt-v1/`;
  const source = read(prefix + 'executed-v1.pine');
  const observation = JSON.parse(read(prefix + 'observation-v4.json'));
  const librarySource = read(libPrefix + 'executed-v1.pine');
  const libraryObservation = JSON.parse(read(libPrefix + 'observation-v4.json'));
  const importPath = `sours-lat/Minimal/${version === 5 ? 1 : 2}`;
  const csv = read(prefix + 'native-v1.csv');
  const lines = csv
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(','));
  const rows = lines.slice(1).filter((row) => Number(row[0]) <= Number(observation.closedBarCutoff));
  const bars = rows.map((row) => ({
    time: Number(row[0]) * 1000,
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  }));
  const libraries = new Map([[importPath, parse(librarySource)]]);
  function run(program: string) {
    const ast = parse(program);
    expect(checkProgram(ast, { libraries }).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const compiled = tryCompile(ast, undefined, { libraries });
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, bars)!;
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(result.plots).toHaveLength(2);
    for (const plot of result.plots) expect(plot.values).toHaveLength(rows.length);
    return result.plots.map((plot) => plot.values);
  }
  describe(`v${version} native imported bool and local float own coexist`, () => {
    it('authenticates immutable library, exact executed source and raw duplicate Plot headers', () => {
      expect(source).toBe(observation.executedSource);
      expect(createHash('sha256').update(source).digest('hex')).toBe(observation.executedSha256);
      expect(observation.status).toBe('RUNS');
      expect(librarySource).toBe(libraryObservation.executedSource);
      const hash = createHash('sha256').update(librarySource).digest('hex');
      expect(hash).toBe(libraryObservation.executedSha256);
      expect(hash).toBe(observation.publication.publishedSourceSha256);
      expect(observation.publication.importPath).toBe(importPath);
      expect(createHash('sha256').update(csv).digest('hex')).toBe(observation.csv.sha256);
      expect(lines[0]!.slice(6)).toEqual(['Plot', 'Plot']);
      expect(rows).toHaveLength(observation.csv.closedRowCount);
      expect(bars.some((bar) => bar.close > bar.open)).toBe(true);
      expect(bars.some((bar) => bar.close <= bar.open)).toBe(true);
    });
    it('matches every closed positional native plot cell', () => {
      const plots = run(source);
      expect(plots).toEqual([rows.map((row) => Number(row[6])), rows.map((row) => Number(row[7]))]);
      expect(plots).toEqual([bars.map((bar) => (bar.close > bar.open ? 31 : 37)), bars.map((bar) => bar.close + 100)]);
    });
    it('renaming the incompatible local method preserves both values', () => {
      const renamed = source
        .replace('method own(float self)', 'method localOwn(float self)')
        .replace('plot(close.own())', 'plot(close.localOwn())');
      expect(renamed).not.toBe(source);
      expect(run(renamed)).toEqual(run(source));
    });
    it('an all-local distinct-receiver control has the same values', () => {
      const local = source.replace(`import ${importPath} as lib`, 'method own(bool self)=>self?31:37');
      expect(local).not.toBe(source);
      expect(run(local)).toEqual(run(source));
    });
  });
}
