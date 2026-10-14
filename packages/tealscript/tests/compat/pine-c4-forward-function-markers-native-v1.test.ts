import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const read = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error');
const source = read('v9/w8-exact-source-compile-corpus-v56-494-v1.pine');
const raw = read('v9/captures/v9/outcomes-v9.json');
const native = (JSON.parse(raw) as {
  script: string; source_sha256: string; native_editor_markers: {
    severity: number; code: string | { value: string }; message: string; startLineNumber: number; startColumn: number;
  }[];
}[])[30];

describe('native v9 forward function secondary markers', () => {
  it('matches the whole captured function-reference error channel', () => {
    expect(createHash('sha256').update(source).digest('hex')).toBe('55cccc9a7b55364a6bd129d4dd7fddd8949c3fc6b467cff708a58bbe966d9961');
    expect(native.source_sha256).toBe(createHash('sha256').update(source).digest('hex'));
    expect(native.script).toBe('w8-exact-source-compile-corpus-v56-494-v1.pine');
    expect(createHash('sha256').update(raw).digest('hex')).toBe('43cf9618afc2e1c2ec69ff5681dccf93ae5b92db723cdb4f79b0d19245682970');
    const expected = native.native_editor_markers.filter(m => m.severity === 8 && m.code === 'CE10271').map(m => ({
      code: 'unknown-function', nativeCode: 'CE10271', message: m.message, severity: 'error',
      line: m.startLineNumber, column: m.startColumn,
    }));
    expect(expected.length).toBe(15);
    const actual = errors(source);
    expect(actual.filter(d => d.code === 'unknown-function' || d.nativeCode === 'CE10271')).toEqual(expected);
    expect(actual.length).toBe(41);
    expect(actual.filter(d => d.code === 'unknown-identifier').length).toBe(26);
  });

  it.each([5, 6])('keeps accepted forward calls admitted in v%s', version => {
    expect(errors(`//@version=${version}\nindicator("Control")\nplot(later())\nlater() => 7`)).toEqual([]);
  });

  it.each([5, 6])('keeps previously declared calls unchanged in v%s', version => {
    expect(errors(`//@version=${version}\nindicator("Control")\nearlier() => 7\nplot(earlier())\nplot(missing)`)).toEqual([{
      code: 'unknown-identifier', message: 'Unknown identifier: missing', severity: 'error', line: 5, column: 6,
    }]);
  });

  it('keeps v5 refused forward calls on the parent diagnostic policy', () => {
    expect(errors('//@version=5\nindicator("Control")\nplot(later())\nlater() => 7\nplot(missing)')).toEqual([{
      code: 'unknown-identifier', message: 'Unknown identifier: missing', severity: 'error', line: 5, column: 6,
    }]);
  });

  it('keeps genuinely absent function diagnostics unchanged', () => {
    expect(errors('//@version=6\nindicator("Control")\nplot(nonexistent())')).toEqual([{
      code: 'unknown-function', message: 'Unknown function: nonexistent', severity: 'error', line: 3, column: 6,
    }]);
  });
});
