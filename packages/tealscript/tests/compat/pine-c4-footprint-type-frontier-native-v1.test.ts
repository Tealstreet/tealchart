import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const cases = [
  {
    "attempt": "v71/captures/v71/unused-builtin-footprint-v5-control-v2/attempt-v1",
    "sourcePath": "v71/captures/v71/unused-builtin-footprint-v5-control-v2/attempt-v1/executed-v1.pine",
    "observation": "v71/captures/v71/unused-builtin-footprint-v5-control-v2/attempt-v1/observation-v3.json",
    "sourceSha256": "0b1da371815bc1049d141aef492bfece1d8abff9f8043cbd4a766672bec38aa4",
    "observationSha256": "2604d0a5f60fd813daf5ae0c70c4d7af5140caa89d817826f747628b22cc067f"
  },
  {
    "attempt": "v71/captures/v71/unused-builtin-footprint-v5-natural-v2/attempt-v1",
    "sourcePath": "v71/captures/v71/unused-builtin-footprint-v5-natural-v2/attempt-v1/executed-v1.pine",
    "observation": "v71/captures/v71/unused-builtin-footprint-v5-natural-v2/attempt-v1/observation-v3.json",
    "sourceSha256": "8a3f8666b5f30e03042cf4dd356146a94fe224700315e8f8695ae01de98e5fd2",
    "observationSha256": "ee199f24dbe5544aafffb4bf6297a1f088960915ce80a2edd6dca69376a9b7f3"
  }
];
const read = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter(d => d.severity === 'error');

describe('native v5 footprint receiver type frontier', () => {
  it.each(cases)('$attempt', row => {
    const source = read(row.sourcePath);
    const observation = read(row.observation);
    expect(sha(source)).toBe(row.sourceSha256);
    expect(sha(observation)).toBe(row.observationSha256);
    const markers = (JSON.parse(observation) as { markers: {
      severity: number; message: string; startLineNumber: number; startColumn: number;
    }[] }).markers;
    const nativeErrors = [...new Map(markers.filter(m => m.severity === 8).map(m => {
      const error = { message: m.message, line: m.startLineNumber, column: m.startColumn };
      return [JSON.stringify(error), error];
    })).values()];
    expect(nativeErrors).toEqual([{ message: "'footprint' is not a valid type keyword.", line: 3, column: 16 }]);
    expect(errors(source)).toEqual(nativeErrors.map(error => ({ ...error, code: 'invalid-type-annotation', severity: 'error' })));
  });

  it('keeps standalone v5 footprint annotations refused', () => {
    expect(errors('//@version=5\nindicator("Control")\nfootprint fp = na\nplot(7)')).toEqual([{
      code: 'invalid-type-annotation', severity: 'error', line: 3, column: 1,
      message: "'footprint' is not a valid type keyword.",
    }]);
  });

  it('keeps unrelated unavailable types visible', () => {
    expect(errors('//@version=5\nindicator("Control")\nmethod inspect(footprint self) => 7\nvoid value = na\nplot(7)')).toEqual([
      { code: 'invalid-type-annotation', severity: 'error', line: 3, column: 16, message: "'footprint' is not a valid type keyword." },
      { code: 'invalid-type-annotation', severity: 'error', line: 4, column: 1, message: 'void is not an available type annotation' },
    ]);
  });
});
