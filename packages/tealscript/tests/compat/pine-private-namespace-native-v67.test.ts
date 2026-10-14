import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const fixture = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
const hash = (source: string) => createHash('sha256').update(source).digest('hex');
const attempt = (name: string) => `v67/captures/v67/${name}/attempt-v1`;

function publishedLibrary(version: number) {
  const path = `v67/captures/v67/private-function-library-v${version}-g6-v1/publication-v1`;
  const source = fixture(`${path}/published-source-v1.pine`);
  const binding = JSON.parse(fixture(`${path}/publication-v2.json`));
  expect(hash(source)).toBe(binding.publishedSourceSha256);
  expect(binding.importPath).toBe(`sours-lat/PrivateFunctionQA${version}/1`);
  return new Map([[binding.importPath, parse(source)]]);
}

function observed(name: string) {
  const path = attempt(name);
  const source = fixture(`${path}/executed-v1.pine`);
  const observation = JSON.parse(fixture(`${path}/observation-v3.json`));
  expect(observation.executedSource).toBe(source);
  expect(hash(source)).toBe(observation.executedSha256);
  return { path, source, observation };
}

describe('native v67 private ordinary-function namespace visibility', () => {
  for (const version of [5, 6]) {
    it(`matches the v${version} private namespace compile refusal at 4:9`, () => {
      const libraries = publishedLibrary(version);
      const { source, observation } = observed(`private-function-namespace-private-v${version}-g6-v1`);
      const message = version === 5 ? "Could not find method or method reference 'pick' for 'lib'" : "Could not find method or method reference 'lib.pick'";
      expect(observation.phase).toBe('INDICATOR-COMPILATION');
      expect(observation.compilationStatus).toBe('REFUSED');
      const diagnostics = observation.diagnostics.filter((diagnostic: { class: string }) => diagnostic.class === 'error');
      expect(diagnostics.length).toBeGreaterThan(0);
      for (const diagnostic of diagnostics) {
        expect(diagnostic).toMatchObject({ text: message, line: 4, column: 9, code: version === 6 ? 'CE10271' : null });
      }
      const errors = checkProgram(parse(source), { libraries }).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
      expect(errors).toEqual([{ code: 'private-library-function', ...(version === 6 ? { nativeCode: 'CE10271' } : {}), severity: 'error', message, line: 4, column: 9 }]);
    });

    it(`matches the v${version} exported forward on all 1003 closed native rows`, () => {
      const libraries = publishedLibrary(version);
      const { path, source, observation } = observed(`private-function-namespace-exported-control-v${version}-g6-v1`);
      expect(observation.phase).toBe('INDICATOR-RUNTIME');
      const csv = fixture(`${path}/native-v1.csv`);
      expect(hash(csv)).toBe(observation.csv.sha256);
      const [header, ...lines] = csv.trim().split(/\r?\n/);
      expect(header).toBe('time,open,high,low,close,Volume,RESULT');
      expect(lines).toHaveLength(1004);
      const closed = lines.map((line) => line.split(',')).filter((row) => Number(row[0]) <= Number(observation.closedBarCutoff));
      expect(closed).toHaveLength(1003);
      expect(closed.every((row) => row[6] === '13.5')).toBe(true);
      const compiled = tryCompile(parse(source), undefined, { libraries });
      expect(compiled.success).toBe(true);
      const bars = closed.map(([time, open, high, low, close, volume]) => ({ time: Number(time) * 1000, open: Number(open), high: Number(high), low: Number(low), close: Number(close), volume: Number(volume) }));
      const result = executeCompiled(compiled, bars, undefined, { libraries });
      expect(result?.errors).toEqual([]);
      expect(result?.plots.map((plot) => plot.values)).toEqual([closed.map((row) => Number(row[6]))]);
    });

    it(`retains the v${version} unknown-name diagnostic`, () => {
      const libraries = publishedLibrary(version);
      const { source } = observed(`private-function-namespace-private-v${version}-g6-v1`);
      const errors = checkProgram(parse(source.replace('lib.pick', 'lib.absent')), { libraries }).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
      expect(errors).toEqual([{ code: 'unknown-function', severity: 'error', message: 'Unknown library function: lib.absent', line: 4, column: 6 }]);
    });
  }
});
