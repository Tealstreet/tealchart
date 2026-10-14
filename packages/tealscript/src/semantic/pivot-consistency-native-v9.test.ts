import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, it } from 'vitest';

import { parse } from '../parser/parser';
import { checkProgram } from './checker';

const parentMarkers = [
  {
    "message": "Undeclared identifier \"pivotsToKeep\"",
    "severity": "error",
    "line": 1255,
    "column": 34,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"pivotsToKeep\"",
    "severity": "error",
    "line": 1283,
    "column": 38,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"showZigZag\"",
    "severity": "error",
    "line": 1291,
    "column": 8,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"colorUp\"",
    "severity": "error",
    "line": 1298,
    "column": 36,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"colorDown\"",
    "severity": "error",
    "line": 1298,
    "column": 46,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"momentumType\"",
    "severity": "error",
    "line": 1391,
    "column": 12,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"rsiSeries\"",
    "severity": "error",
    "line": 1392,
    "column": 25,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"momentumType\"",
    "severity": "error",
    "line": 1393,
    "column": 17,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"macdHist\"",
    "severity": "error",
    "line": 1394,
    "column": 25,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"momentumType\"",
    "severity": "error",
    "line": 1404,
    "column": 16,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"momentumType\"",
    "severity": "error",
    "line": 1406,
    "column": 21,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"momentumType\"",
    "severity": "error",
    "line": 1409,
    "column": 16,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"momentumType\"",
    "severity": "error",
    "line": 1411,
    "column": 21,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"thrAbs\"",
    "severity": "error",
    "line": 2206,
    "column": 39,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"barsSince\"",
    "severity": "error",
    "line": 2208,
    "column": 39,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"retracement\"",
    "severity": "error",
    "line": 2210,
    "column": 39,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"src\"",
    "severity": "error",
    "line": 2473,
    "column": 22,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"src\"",
    "severity": "error",
    "line": 2475,
    "column": 22,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"src\"",
    "severity": "error",
    "line": 2480,
    "column": 24,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"src\"",
    "severity": "error",
    "line": 2481,
    "column": 23,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"src\"",
    "severity": "error",
    "line": 2485,
    "column": 24,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"src\"",
    "severity": "error",
    "line": 2486,
    "column": 23,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"src\"",
    "severity": "error",
    "line": 2491,
    "column": 30,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"thrAbs\"",
    "severity": "error",
    "line": 2493,
    "column": 36,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"src\"",
    "severity": "error",
    "line": 2507,
    "column": 23,
    "code": "CE10272"
  },
  {
    "message": "Undeclared identifier \"src\"",
    "severity": "error",
    "line": 2509,
    "column": 23,
    "code": "CE10272"
  }
];
it('matches v9/captures/v9/outcomes-v9.json#30 target warnings while preserving unrelated parent markers', () => {
  const name = "w8-exact-source-compile-corpus-v56-494-v1.pine";
  const source = readFileSync(new URL(`../../oracle-probes/v9/${name}`, import.meta.url), 'utf8');
  const rows = JSON.parse(readFileSync(new URL('../../oracle-probes/v9/captures/v9/outcomes-v9.json', import.meta.url), 'utf8'));
  const capture = rows.find((row: { script: string; attempt: number }) => row.script === name && row.attempt === 1);
  expect(capture.status).toBe('COMPILE-ERROR');
  expect(createHash('sha256').update(source).digest('hex')).toBe(capture.source_sha256);
  const markers = capture.native_editor_markers as Array<{
    message: string; severity: number; startLineNumber: number; startColumn: number; code?: string | { value: string };
  }>;
  const captured = [...new Map(markers.map((marker) => {
    const value = { message: marker.message, severity: marker.severity === 8 ? 'error' : 'warning',
      line: marker.startLineNumber, column: marker.startColumn, code: (typeof marker.code === 'string' ? marker.code : marker.code?.value) ?? null };
    return [JSON.stringify(value), value] as const;
  })).values()];
  const native = captured.filter((marker) => ["CW10003", "CW10004"].includes(marker.code ?? ''));
  const forwardReferences = captured.filter((marker) => marker.code === "CE10271");
  expect(forwardReferences).toHaveLength(15);
  expect(native).toHaveLength(4);
  // v86/captures/v86/v86-mixed-error-order-1x-v1/attempt-v1..v3 repeat this complete v9 list.
  expect(captured.filter((marker) => marker.code === "CE10272")).toEqual(parentMarkers);
  expect(checkProgram(parse(source)).diagnostics.map((diagnostic) => ({
    message: diagnostic.message, severity: diagnostic.severity, line: diagnostic.line, column: diagnostic.column,
    code: diagnostic.nativeCode ?? (/^(CE|CW)\d+$/.test(diagnostic.code) || diagnostic.code === 'PINE_VERSION_OUTDATED' ? diagnostic.code : null),
  }))).toEqual(captured);
});
