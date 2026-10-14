import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const cases = [
  {
    attempt: 'v4/captures/v4/outcomes-v4.json#trace-bgcolor-offset-v3-series.pine/attempt-1',
    sourcePath: 'v4/trace-bgcolor-offset-v3-series.pine',
    observationPath: 'v4/captures/v4/outcomes-v4.json',
    sourceSha256: '605ab6938f7b6f0940c5300c11f9efe5c6ac710dd5c9d862e1bff02b60f557fe',
    rank: 6,
    native: {
      text: 'Undeclared identifier `bar_index`;',
      line: 3,
      column: 0,
      code: null,
      class: 'error',
    },
  },
  {
    attempt: 'v4/captures/v4/outcomes-v4.json#trace-bgcolor-offset-v3-zero-control.pine/attempt-1',
    sourcePath: 'v4/trace-bgcolor-offset-v3-zero-control.pine',
    observationPath: 'v4/captures/v4/outcomes-v4.json',
    sourceSha256: '1be260a87df772d3d4e2bb92b0f7cfe4b24043a378b423bf7dfee999ac38ceec',
    rank: 6,
    native: {
      text: 'Undeclared identifier `bar_index`;',
      line: 3,
      column: 0,
      code: null,
      class: 'error',
    },
  },
  {
    attempt: 'v4/captures/v4/outcomes-v4.json#input-generic-computed-source-v1.pine/attempt-1',
    sourcePath: 'v4/input-generic-computed-source-v1.pine',
    observationPath: 'v4/captures/v4/outcomes-v4.json',
    sourceSha256: '3840cb602b73d6c19a612009e4a7087194038d484cd00812ed902726050ff369',
    rank: 9,
    native: {
      text: 'Arguments of input function must be of constant type, or "source" builtin variables.',
      line: 3,
      column: 10,
      code: 'CE10212',
      class: 'error',
    },
  },
  {
    attempt: 'v2/captures/v2/outcomes-v2.json#coverage-time-2-v1.pine/attempt-1',
    sourcePath: 'v2/coverage-time-2-v1.pine',
    observationPath: 'v2/captures/v2/outcomes-v2.json',
    sourceSha256: 'b1fed12979092b139cf07956609d9bdc2c0e38d93059421213709f3761cff703',
    rank: 15,
    native: {
      text: 'resolution.trim is not a function',
      line: 33,
      column: 6,
      code: 'CE10294',
      class: 'error',
    },
  },
  {
    attempt: 'v2/captures/v2/outcomes-v2.json#coverage-time-2-v1.pine/attempt-2',
    sourcePath: 'v2/coverage-time-2-v1.pine',
    observationPath: 'v2/captures/v2/outcomes-v2.json',
    sourceSha256: 'b1fed12979092b139cf07956609d9bdc2c0e38d93059421213709f3761cff703',
    rank: 15,
    native: {
      text: 'resolution.trim is not a function',
      line: 33,
      column: 6,
      code: 'CE10294',
      class: 'error',
    },
  },
  {
    attempt: 'v58/captures/v58/consumers/g03-v6-map-chain-after-reassign-float-int-int-first-typed/default/attempt-v1',
    sourcePath:
      'v58/captures/v58/consumers/g03-v6-map-chain-after-reassign-float-int-int-first-typed/default/attempt-v1/executed-v1.pine',
    observationPath:
      'v58/captures/v58/consumers/g03-v6-map-chain-after-reassign-float-int-int-first-typed/default/attempt-v1/observation-v1.json',
    sourceSha256: 'c0bb6afaaf337e858a97010b61c7ef83cf0ead6ae06fea0a9afa631176b5f6ff',
    rank: 25,
    native: {
      code: 'CW10011',
      text: 'Shadowing built-in variable "second"',
      line: 8,
      column: 5,
    },
  },
  {
    attempt: 'v60/captures/v60/optional-only-overloads-v5-omitted-v60-v1/attempt-v1',
    sourcePath: 'v60/optional-only-overloads-v5-omitted-v60-v1.pine',
    observationPath: 'v60/captures/v60/optional-only-overloads-v5-omitted-v60-v1/attempt-v1/observation-v4.json',
    sourceSha256: '390685126b245b19ff22c8762efb053a02d8ec08c3d5d115296db94eed0a457f',
    rank: 26,
    native: {
      text: "The 'read' function has overloads with the same required parameters. The type of required parameters must be different in overloaded versions of functions.",
      line: 4,
      column: 5,
      code: null,
      class: 'error',
    },
  },
  {
    attempt: 'v58/captures/v58/consumers/g04-v6-matrix-for-shadow-int-float-int-first-untyped/default/attempt-v1',
    sourcePath:
      'v58/captures/v58/consumers/g04-v6-matrix-for-shadow-int-float-int-first-untyped/default/attempt-v1/executed-v1.pine',
    observationPath:
      'v58/captures/v58/consumers/g04-v6-matrix-for-shadow-int-float-int-first-untyped/default/attempt-v1/observation-v2.json',
    sourceSha256: 'cafdd242a6a895400ae4e73d449ead112566b52844bd5d46992f0e93e6af1562',
    rank: 27,
    native: {
      code: 'CW10013',
      text: 'Shadowing variable "copied" which exists in parent scope. Did you want to use the ":=" operator instead of "=" ?',
      line: 8,
      column: 9,
    },
  },
] as const;

describe('captured census compile diagnostics', () => {
  it.each(cases)('$attempt', ({ attempt, sourcePath, observationPath, sourceSha256, rank, native }) => {
    const root = new URL('../../oracle-probes/', import.meta.url);
    const source = readFileSync(new URL(sourcePath, root), 'utf8');
    const observation = JSON.parse(readFileSync(new URL(observationPath, root), 'utf8'));
    expect(createHash('sha256').update(source).digest('hex')).toBe(sourceSha256);
    if (Array.isArray(observation)) {
      const script = attempt.split('#')[1].split('/attempt-')[0];
      const record = observation.find((entry: { script: string }) => entry.script === script);
      expect(record.source_sha256).toBe(sourceSha256);
      expect(record.diagnostic).toEqual(
        expect.objectContaining({
          text: native.text,
          line: native.line,
          column: native.column,
          code: native.code,
        }),
      );
    } else if (observation.outcomes) {
      const script = attempt.split('#')[1].split('/attempt-')[0];
      const attemptNumber = Number(attempt.split('/attempt-')[1]);
      const record = observation.outcomes.find(
        (entry: { probe: string; attempt: number }) => entry.probe === script && entry.attempt === attemptNumber,
      );
      const editorError = record.runtime.error.editorError;
      expect(editorError.ctx.message).toBe(native.text);
      expect(editorError.start).toEqual({ line: native.line, column: native.column });
      expect(editorError.code).toBe(native.code);
    } else {
      expect(observation.executedSha256).toBe(sourceSha256);
      expect(observation.markers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: native.text,
            startLineNumber: native.line,
            startColumn: native.column,
            ...(native.code ? { code: native.code } : {}),
          }),
        ]),
      );
    }
    const diagnostics = checkProgram(parse(source)).diagnostics;
    expect(
      diagnostics.some((entry) => entry.severity === 'error'),
      attempt,
    ).toBe(rank !== 27);
    const severity = rank === 25 || rank === 27 ? 'warning' : 'error';
    const target = diagnostics.filter((entry) => entry.severity === severity);
    const actual = target.map((entry) => ({
      text: entry.message,
      line: entry.line,
      column: entry.column,
      code: 'nativeCode' in entry ? entry.nativeCode : null,
    }));
    const expected = { text: native.text, line: native.line, column: native.column, code: native.code };
    if (rank === 26) expect(actual, attempt).toEqual([expected]);
    else expect(actual[0], attempt).toEqual(expected);
  });
});
