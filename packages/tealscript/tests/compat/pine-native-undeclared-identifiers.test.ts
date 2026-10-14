import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { createPineParseSemanticStageOutcomes } from '../../src/compat/sourceStages';
import { parse } from '../../src/parser';
import { tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

interface Marker {
  severity: number; message: string; startLineNumber: number; startColumn: number; code?: string;
}
interface Observation {
  script: string; attempt: number; source_sha256: string; status: string; native_editor_markers: Marker[];
}
const fixture = (path: string) => new URL(`../../oracle-probes/${path}`, import.meta.url);
const captures = [
  [6, 'v9', 'w8-exact-source-compile-corpus-v56-494-v1.pine'],
  [6, 'v9', 'w8-exact-source-compile-corpus-v56-580-v1.pine'],
  [3, 'v4', 'trace-bgcolor-offset-v3-series.pine'],
  [3, 'v4', 'trace-bgcolor-offset-v3-zero-control.pine'],
] as const;

describe('captured undeclared value identifiers', () => {
  it.each(captures)('v%i %s/%s', (version, round, script) => {
    const source = readFileSync(fixture(`${round}/${script}`), 'utf8');
    const outcomes = JSON.parse(readFileSync(fixture(`${round}/captures/${round}/outcomes-${round}.json`), 'utf8')) as Observation[];
    const matches = outcomes.filter((row) => row.script === script && row.attempt === 1);
    expect(matches).toHaveLength(1);
    const native = matches[0];
    expect(createHash('sha256').update(source).digest('hex')).toBe(native.source_sha256);
    expect(native.status).toBe('COMPILE-ERROR');
    const markers = native.native_editor_markers.filter((marker) =>
      marker.severity === 8 && marker.message.startsWith('Undeclared identifier') &&
      (version !== 3 || !marker.message.includes('`bar_index`')));
    const diagnostics = checkProgram(parse(source)).diagnostics;
    const actual = diagnostics.filter((diagnostic) => diagnostic.code === 'unknown-identifier' &&
      (version !== 3 || !diagnostic.message.includes('`bar_index`')));
    expect(actual.map(({ message, line, column, nativeCode }) => ({ message, line, column, nativeCode }))).toEqual(
      markers.map((marker) => ({ message: marker.message, line: marker.startLineNumber,
        column: marker.startColumn, nativeCode: marker.code })),
    );
    expect(markers.length).toBeGreaterThan(0);
    expect(createPineParseSemanticStageOutcomes(source).find(({ stage }) => stage === 'semantic')?.status).toBe('failed');
    if (version === 3) {
      expect(diagnostics.filter(({ message }) => message === 'Undeclared identifier `bar_index`;')
        .map(({ line, column }) => ({ line, column }))).toEqual([{ line: 3, column: 0 }, { line: 8, column: 0 }]);
    }
  });

  it('formats an ordinary unresolved v6 value with the witnessed code', () => {
    const errors = checkProgram(parse('//@version=6\nindicator("Unresolved")\nplot(relVol)'))
      .diagnostics.filter(({ severity }) => severity === 'error');
    expect(errors).toEqual([{ code: 'unknown-identifier', nativeCode: 'CE10272',
      message: 'Undeclared identifier "relVol"', severity: 'error', line: 3, column: 6 }]);
  });

  it('propagates unavailable v3 initializer dependencies without duplicate same-line markers', () => {
    const errors = checkProgram(parse('//@version=3\nstudy("Dependencies")\na = bar_index\nb = a + a\nplot(b)'))
      .diagnostics.filter(({ severity }) => severity === 'error');
    expect(errors).toEqual([
      { code: 'unknown-identifier', message: 'Undeclared identifier `bar_index`;', severity: 'error', line: 3, column: 0 },
      { code: 'unknown-identifier', message: 'Undeclared identifier `a`;', severity: 'error', line: 4, column: 1 },
      { code: 'unknown-identifier', message: 'Undeclared identifier `b`', severity: 'error', line: 5, column: 1 },
    ]);
  });

  it.each([5, undefined])('preserves prior unknown-value diagnostics with version %s', (version) => {
    const directive = version === undefined ? '' : `//@version=${version}\n`;
    const errors = checkProgram(parse(`${directive}indicator("Unresolved")\nplot(relVol)`))
      .diagnostics.filter(({ severity }) => severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Unknown identifier: relVol');
    expect(errors[0]).not.toHaveProperty('nativeCode');
  });

  it('preserves valid v3 bindings', () => {
    const program = parse('//@version=3\nstudy("Bindings")\na = close\nb = a + 1\nplot(b)');
    expect(checkProgram(program).diagnostics.filter(({ severity }) => severity === 'error')).toEqual([]);
    expect(tryCompile(program).success).toBe(true);
  });

  it('keeps unrelated v3 unknown-initializer behavior', () => {
    const errors = checkProgram(parse('//@version=3\nstudy("Other")\na = missing\nb = a + 1\nplot(b)'))
      .diagnostics.filter(({ severity }) => severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Unknown identifier: missing');
  });
});
