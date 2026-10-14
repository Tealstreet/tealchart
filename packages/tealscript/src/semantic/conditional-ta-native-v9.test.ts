import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, it } from 'vitest';

import { parse } from '../parser/parser';
import { checkProgram } from './checker';

const parentMarkers = [
  {
    "message": "The shorttitle is too long (11 characters). It should be 10 characters or less.",
    "severity": "warning",
    "line": 24,
    "column": 53,
    "code": "SHORT_TITLE_TOO_LONG"
  },
  {
    "message": "Undeclared identifier \"relVol\"",
    "severity": "error",
    "line": 311,
    "column": 84,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"relVol\"",
    "severity": "error",
    "line": 312,
    "column": 87,
    "code": "CE10272"
  },
  // v9/captures/v9/outcomes-v9.json#32, attempt 1 omits the f_jma warning at 261:18.
];
it('matches v9/captures/v9/outcomes-v9.json#32 target warnings while preserving unrelated parent markers', () => {
  const name = "w8-exact-source-compile-corpus-v56-580-v1.pine";
  const source = readFileSync(new URL(`../../oracle-probes/v9/${name}`, import.meta.url), 'utf8');
  const rows = JSON.parse(readFileSync(new URL('../../oracle-probes/v9/captures/v9/outcomes-v9.json', import.meta.url), 'utf8'));
  const capture = rows.find((row: { script: string; attempt: number }) => row.script === name && row.attempt === 1);
  expect(capture.status).toBe('COMPILE-ERROR');
  expect(createHash('sha256').update(source).digest('hex')).toBe(capture.source_sha256);
  const markers = capture.native_editor_markers as Array<{
    message: string; severity: number; startLineNumber: number; startColumn: number; code?: string;
  }>;
  const native = [...new Map(markers.map((marker) => {
    const value = { message: marker.message, severity: marker.severity === 8 ? 'error' : 'warning',
      line: marker.startLineNumber, column: marker.startColumn, code: marker.code ?? null };
    return [JSON.stringify(value), value] as const;
  })).values()].filter((marker) => ["CW10002"].includes(marker.code ?? ''));
  expect(native).toHaveLength(6);
  expect(checkProgram(parse(source)).diagnostics.map((diagnostic) => ({
    message: diagnostic.message, severity: diagnostic.severity, line: diagnostic.line, column: diagnostic.column,
    code: diagnostic.nativeCode ?? (/^(CE|CW)\d+$/.test(diagnostic.code) || diagnostic.code === 'PINE_VERSION_OUTDATED' ? diagnostic.code : null),
  }))).toEqual([...parentMarkers, ...native]);
});
