import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const fixtures = new URL('../../oracle-probes/', import.meta.url);
const cases = [
  { version: 6, id: '7c5a88f50ae8', sha256: '95b551a470131a4208bffb0dab2e6ed8811efa9176f6079a685015e6952ad882' },
  { version: 5, id: '02604ebe1288', sha256: '6534235978261522d77f6244fb96bc7c6c3c7479e040909297d7f17191f5cb86' },
];

describe('v58 exported duplicate float-method signatures', () => {
  for (const { version, id, sha256 } of cases) {
    it(`matches the witnessed v${version} refusal text, site and exposed code`, () => {
      const prefix = `v58/captures/v58/prerequisites/root2-library-${id}-v58-v1/attempt-v1/`;
      const source = readFileSync(new URL(`${prefix}executed-v1.pine`, fixtures), 'utf8');
      const observation = JSON.parse(readFileSync(new URL(`${prefix}observation-v1.json`, fixtures), 'utf8'));
      expect(createHash('sha256').update(source).digest('hex')).toBe(sha256);
      expect(observation.executedSource).toBe(source);
      expect(observation.status).toBe('COMPILE-ERROR');
      const markers = observation.markers.filter((marker: { severity: number }) => marker.severity === 8)
        .map((marker: { message: string; startLineNumber: number; startColumn: number; code?: string }) => ({
          message: marker.message, line: marker.startLineNumber, column: marker.startColumn,
          severity: 'error', nativeCode: marker.code,
        }));
      const native = [...new Map(markers.map((marker: object) => [JSON.stringify(marker), marker])).values()];
      expect(native).toHaveLength(1);
      const diagnostics = checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
      expect(diagnostics.map(({ message, line, column, severity, nativeCode }) => ({ message, line, column, severity, nativeCode }))).toEqual(native);
    });
  }

  it('retains the parent outcome for an unversioned exported duplicate pair', () => {
    const source = 'library("Implicit")\nexport method pick(float self) => self\nexport method pick(float self) => self + 1';
    const program = parse(source);
    expect(program.explicitVersion).toBe(false);
    expect(checkProgram(program).diagnostics).toEqual([]);
  });

  it('retains distinct exported receiver types', () => {
    const source = '//@version=6\nlibrary("Distinct")\nexport method pick(int self) => self\nexport method pick(float self) => self + 1';
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('retains non-exported v6 duplicate-method policy', () => {
    const source = '//@version=6\nlibrary("Private")\nmethod pick(float self) => self\nmethod pick(float self) => self + 1\nexport keep(float x) => x';
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('retains local indicator v6 duplicate-method policy', () => {
    const source = '//@version=6\nindicator("Local")\nmethod pick(float self) => self\nmethod pick(float self) => self + 1\nplot(close)';
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('retains the existing v5 local duplicate site', () => {
    const source = '//@version=5\nindicator("Local")\nmethod pick(float self) => self\nmethod pick(float self) => self + 1\nplot(close)';
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toContainEqual(expect.objectContaining({
      code: 'invalid-overload', line: 4, column: 19,
    }));
  });
});
