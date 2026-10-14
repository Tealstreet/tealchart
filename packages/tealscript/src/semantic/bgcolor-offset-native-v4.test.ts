import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, it } from 'vitest';

import { parse } from '../parser/parser';
import { checkProgram } from './checker';

it('matches v4 attempt1 trace-bgcolor-offset-v5-series complete warning list', () => {
  const name = 'trace-bgcolor-offset-v5-series.pine';
  const source = readFileSync(new URL(`../../oracle-probes/v4/${name}`, import.meta.url), 'utf8');
  const rows = JSON.parse(readFileSync(new URL('../../oracle-probes/v4/captures/v4/outcomes-v4.json', import.meta.url), 'utf8'));
  const capture = rows.find((row: { script: string; attempt: number }) => row.script === name && row.attempt === 1);
  expect(capture.status).toBe('RUNS');
  expect(createHash('sha256').update(source).digest('hex')).toBe(capture.source_sha256);
  const native = [...new Map(capture.native_editor_markers.map((marker: {
    message: string; severity: number; startLineNumber: number; startColumn: number; code?: string;
  }) => {
    const value = { message: marker.message, severity: marker.severity === 8 ? 'error' : 'warning',
      line: marker.startLineNumber, column: marker.startColumn, code: marker.code ?? null };
    return [JSON.stringify(value), value] as const;
  })).values()];
  expect(checkProgram(parse(source)).diagnostics.map((diagnostic) => ({
    message: diagnostic.message, severity: diagnostic.severity, line: diagnostic.line, column: diagnostic.column,
    code: diagnostic.nativeCode ?? (diagnostic.code === 'PINE_VERSION_OUTDATED' ? diagnostic.code : null),
  }))).toEqual(native);
});
