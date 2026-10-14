import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const fixture = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
const attempt = (name: string) => `v61/captures/v61/${name}/attempt-v1`;
const publication = (name: string) => `v61/captures/v61/${name}/publication-v1`;
const libraries = new Map([
  ['sours-lat/PrivateTransitBase5v61/1', parse(fixture(`${publication('private-transitive-base-v5-v61-v1')}/published-source-v1.pine`))],
  ['sours-lat/R2Nsaa411cdaddab/1', parse(fixture('v58/root2-library-aa411cdaddab-v58-v1.pine'))],
]);
const errors = (source: string, imported = libraries) => checkProgram(parse(source), { libraries: imported }).diagnostics.filter((d) => d.severity === 'error');

function observed(name: string) {
  const path = attempt(name);
  const source = fixture(`${path}/executed-v1.pine`);
  const observation = JSON.parse(fixture(`${path}/observation-v3.json`));
  expect(observation.executedSource).toBe(source);
  expect(createHash('sha256').update(source).digest('hex')).toBe(observation.executedSha256);
  return { path, source, observation };
}

describe('native v61 transitive private method visibility', () => {
  for (const version of [5, 6]) {
    const suffix = version === 5 ? 'v5-private-v2' : 'v6-private-v1';
    const message = version === 5 ? "Could not find method or method reference 'pick' for 'x'" : "Could not find method or method reference 'x.pick'";

    it(`matches the v${version} dependent-library Save refusal at 4:24`, () => {
      const { source, observation } = observed(`private-transitive-${suffix}`);
      expect(observation.phase).toBe('DEPENDENT-LIBRARY-SAVE-COMPILATION');
      expect(observation.compilationStatus).toBe('REFUSED');
      const markers = observation.markers.filter((marker: { severity: number }) => marker.severity === 8);
      expect(markers).toHaveLength(1);
      expect(markers[0]).toMatchObject({ message, startLineNumber: 4, startColumn: 24 });
      expect(markers[0].code).toBe(version === 6 ? 'CE10271' : undefined);
      expect(errors(source)).toEqual([{ code: 'private-library-method', ...(version === 6 ? { nativeCode: 'CE10271' } : {}), severity: 'error', message, line: 4, column: 24 }]);
      const compiled = tryCompile(parse(source), undefined, { libraries });
      expect(compiled.success).toBe(false);
      expect(compiled.unsupported).toEqual([message]);
    });

    it(`retains the v${version} native refusal when checking a selected transitive body`, () => {
      const { source } = observed(`private-transitive-${suffix}`);
      const imported = new Map([...libraries, ['QA/Dependent/1', parse(source)]]);
      const consumer = `//@version=${version}\nindicator("private dependent")\nimport QA/Dependent/1 as b\nplot(b.read(3.5))`;
      expect(errors(consumer, imported)).toEqual([{ code: 'private-library-method', ...(version === 6 ? { nativeCode: 'CE10271' } : {}), severity: 'error', message, line: 4, column: 24 }]);
      expect(tryCompile(parse(consumer), undefined, { libraries: imported }).success).toBe(false);
    });

    it(`matches the v${version} exported forwarding control on every closed native row`, () => {
      const name = version === 5 ? 'private-transitive-v5-control-v2' : 'private-transitive-v6-control-v1';
      const binding = JSON.parse(fixture(`${publication(name)}/publication-v2.json`));
      const published = fixture(`${publication(name)}/published-source-v1.pine`);
      expect(createHash('sha256').update(published).digest('hex')).toBe(binding.publishedSourceSha256);
      expect(errors(published)).toEqual([]);
      const imported = new Map([...libraries, [binding.importPath, parse(published)]]);
      const { path, source, observation } = observed(`${name}-indicator-v1`);
      const csv = fixture(`${path}/native-v1.csv`);
      expect(createHash('sha256').update(csv).digest('hex')).toBe(observation.csv.sha256);
      const [header, ...lines] = csv.trim().split(/\r?\n/);
      expect(header).toBe('time,open,high,low,close,Volume,Plot');
      expect(lines).toHaveLength(983);
      const closed = lines.map((line) => line.split(',')).filter((row) => Number(row[0]) <= Number(observation.closedBarCutoff));
      expect(closed).toHaveLength(982);
      expect(closed.every((row) => row[6] === '13.5')).toBe(true);
      expect(errors(source, imported)).toEqual([]);
      const compiled = tryCompile(parse(source), undefined, { libraries: imported });
      expect(compiled.success).toBe(true);
      const bars = closed.map(([time, open, high, low, close, volume]) => ({ time: Number(time) * 1000, open: Number(open), high: Number(high), low: Number(low), close: Number(close), volume: Number(volume) }));
      const result = executeCompiled(compiled, bars, undefined, { libraries: imported });
      expect(result?.errors).toEqual([]);
      expect(result?.plots.map((plot) => plot.values)).toEqual([closed.map((row) => Number(row[6]))]);
    });
  }
});
