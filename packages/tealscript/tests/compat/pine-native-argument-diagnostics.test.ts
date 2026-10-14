import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { expectedVersionAdvisories } from '../helpers/expectedVersionAdvisory';

interface NativeOutcome {
  script: string;
  attempt: number;
  source_sha256: string;
  status: string;
  diagnostic: { code: string | null; text: string; line: number; column: number };
  native_editor_markers?: { severity: number; code?: string; message: string; startLineNumber: number; startColumn: number }[];
}

const fixture = (path: string) => new URL(`../../oracle-probes/${path}`, import.meta.url);
const outcomes = (round: string) =>
  JSON.parse(readFileSync(fixture(`${round}/captures/${round}/outcomes-${round}.json`), 'utf8')) as NativeOutcome[];
const sources = [
  ...['every', 'some'].flatMap((method) =>
    ['namespace', 'receiver'].flatMap((form) =>
      [5, 6].map((version) => `v4/trace-array-string-${method}-${form}-v${version}.pine`),
    ),
  ),
  ...[
    'ema',
    'highest',
    'macd-fastlen',
    'macd-siglen',
    'macd-slowlen',
    'percentile-linear-interpolation',
    'sma',
    'wma',
  ].map((name) => `v4/v5-float-length-${name}-v1.pine`),
  ...[5, 6].map((version) => `v4/ledger-1094-asin-number-v${version}-v1.pine`),
];

describe('captured argument diagnostic contracts', () => {
  it.each(sources)('matches the exact native refusal for %s', (path) => {
    const source = readFileSync(fixture(path), 'utf8');
    const observation = outcomes('v4').find((row) => row.script === path.split('/').at(-1) && row.attempt === 1)!;
    expect(observation).toBeDefined();
    expect(createHash('sha256').update(source).digest('hex')).toBe(observation.source_sha256);
    expect(observation.status).toBe('COMPILE-ERROR');
    const native = observation.diagnostic;
    const actual = checkProgram(parse(source)).diagnostics.filter((row) => row.severity === 'error');
    if (path.includes('ledger-1094-asin-number')) {
      // v4 outcomes attempt 1: the full v5/v6 editor list includes missing angle.
      const captured = observation.native_editor_markers!.filter(({ severity }) => severity === 8);
      expect(captured).toHaveLength(2);
      expect(actual.map(({ message, severity, line, column, nativeCode, code }) => ({
        message, severity, line, column, nativeCode: nativeCode ?? (code.startsWith('CE') ? code : undefined),
      }))).toEqual(captured.map((marker) => ({
        message: marker.message, severity: 'error', line: marker.startLineNumber, column: marker.startColumn, nativeCode: marker.code,
      })));
    } else {
      expect(actual).toEqual([
        expect.objectContaining({
          message: native.text,
          line: native.line,
          column: native.column,
          ...(native.code ? { code: native.code } : {}),
        }),
      ]);
    }
  });

  it('matches all three numeric-array markers in the v2 attempt', () => {
    const path = 'v2/outcome-only/conflicts-batch-4-v1.pine';
    const source = readFileSync(fixture(path), 'utf8');
    const legacy = JSON.parse(readFileSync(fixture('v2/captures/v2/outcomes-v2.json'), 'utf8')) as {
      outcomes: { probe: string; runtime: { status: string } }[];
    };
    const attempts = legacy.outcomes.filter((row) => row.probe === 'conflicts-batch-4-v1.pine');
    expect(attempts).toHaveLength(2);
    for (const observation of attempts) {
      expect(observation.runtime.status).toBe('COMPILE-ERROR');
      expect(createHash('sha256').update(source).digest('hex')).toBe(
        'deb97f1b51ed444051045dfc240ea6621651d8d0e7056e57f939af7967b5adee',
      );
    }
    const evidence = readFileSync(fixture('v2/captures/v2/evidence/conflicts-batch-4-v1-attempt2-error.txt'), 'utf8');
    const captured = JSON.parse(evidence.slice(evidence.indexOf('{'))) as {
      compiler_markers: { code: string; message: string; startLineNumber: number; startColumn: number }[];
    };
    expect(captured.compiler_markers).toHaveLength(3);
    expect(checkProgram(parse(source)).diagnostics.filter((row) => row.severity === 'error')).toEqual(
      captured.compiler_markers.map((marker) =>
        expect.objectContaining({
          code: marker.code,
          message: marker.message,
          line: marker.startLineNumber,
          column: marker.startColumn,
        }),
      ),
    );
  });

  it.each([
    'array.every(array.from(false, true))',
    'array.some(array.from(false, true))',
    'ta.ema(close, 7)',
    'ta.sma(close, 7)',
    'ta.wma(close, 7)',
    'ta.highest(close, 7)',
    'ta.percentile_linear_interpolation(close, 2, 50)',
    'math.asin(angle=0.5)',
  ])('retains admitted argument control %s', (call) => {
    // Class 17's 211 native sources witness the v4/v5 header advisory at 1:3.
    // See pine-outdated-version-advisory-v1.test.ts for the authenticated attempt set.
    for (const version of [5, 6]) {
      expect(
        checkProgram(parse(`//@version=${version}\nindicator("Argument controls")\nvalue = ${call}\n`)).diagnostics,
      ).toEqual(expectedVersionAdvisories(version));
    }
  });

  it.each([
    [6, 'ta.ema(close, 7.5)', 'ta.ema length must be an integer, got float'],
    [5, 'ta.linreg(close, 7.5, 0)', 'ta.linreg length must be an integer, got float'],
    [5, 'ta.highest(close, 7.5)', 'ta.highest length must be an integer, got float'],
    [5, 'ta.ema(close, float(7))', 'ta.ema length must be an integer, got float'],
    [4, 'math.asin(number=0.5)', "Unknown argument 'number' for math.asin()"],
    [6, 'math.asin(other=0.5)', "Unknown argument 'other' for math.asin()"],
    [6, 'array.every(array.from(1, 2))', 'array.every requires bool array elements in Pine v6, got array<int>'],
  ] as const)('retains unwitnessed diagnostic path v%i %s', (version, call, message) => {
    expect(
      checkProgram(parse(`//@version=${version}\nindicator("Argument boundaries")\nvalue = ${call}\n`)).diagnostics,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ message })]));
  });
});
