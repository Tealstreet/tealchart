import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const bundle = new URL('../../oracle-probes/v4/', import.meta.url);
const outcomes = JSON.parse(readFileSync(new URL('captures/v4/outcomes-v4.json', bundle), 'utf8')) as Array<{
  script: string;
  attempt: number;
  source_sha256: string;
  status: string;
  diagnostic: { text: string; line: number; column: number; code: string };
  native_editor_markers: Array<{
    message: string;
    code: string;
    severity: number;
    startLineNumber: number;
    startColumn: number;
  }>;
}>;
const cases = ['box', 'chart-point', 'polyline', 'table'].flatMap((family) =>
  ['eq', 'ne'].map((operation) => ({
    script: `drawing-${family}-${operation}-v2.pine`,
    kind: family.replace('-', '.'),
    operator: operation === 'eq' ? '==' : '!=',
  })),
);

describe('native v4 drawing equality admission', () => {
  it.each(cases)('refuses $script during semantic compilation', ({ script, kind, operator }) => {
    const source = readFileSync(new URL(script, bundle), 'utf8');
    const native = outcomes.find((outcome) => outcome.script === script && outcome.attempt === 1);
    expect(native?.source_sha256).toBe(createHash('sha256').update(source).digest('hex'));
    expect(native?.status).toBe('COMPILE-ERROR');
    expect(native?.diagnostic.text).toContain(`operator ${operator}`);
    expect(native?.diagnostic.text).toContain(kind);

    const errors = checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    // v4/captures/v4/outcomes-v4.json: each $script/attempt-1 records both operands of both comparisons.
    const nativeErrors = native?.native_editor_markers.filter((marker) => marker.severity === 8);
    expect(nativeErrors).toHaveLength(4);
    expect(errors).toHaveLength(4);
    expect(errors[0].column).toBe(native?.diagnostic.column);
    expect(errors.map(({ code, severity, line, column, message }) => ({ code, severity, line, column, message })))
      .toEqual(nativeErrors?.map((marker) => ({
        code: marker.code,
        severity: 'error',
        line: marker.startLineNumber,
        column: marker.startColumn,
        message: marker.message,
      })));
    for (const error of errors) expect(error.message).toContain(kind);
  });

  it('preserves line, label, and scalar equality admission', () => {
    const expressions = [
      'line.new(bar_index, high, bar_index + 1, low)',
      'label.new(bar_index, high)',
      '1',
      '1.5',
      'true',
      '"text"',
      'color.red',
    ];
    for (const expression of expressions) {
      const source = `//@version=6
indicator("equality control")
a = ${expression}
b = a
plot(a == b ? 1 : 0)
plot(a != b ? 1 : 0)`;
      expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual(
        [],
      );
    }
  });
});
