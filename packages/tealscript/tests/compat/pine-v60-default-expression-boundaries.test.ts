import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const fixtureRoot = new URL('../../oracle-probes/', import.meta.url);
const cases = [
  {
    id: 'default-boundary-volume-multiply-v5-1x-v1',
    source: 'v60/captures/v60/default-boundary-volume-multiply-v5-1x-v1/attempt-v1/executed-v1.pine',
    observation: 'v60/captures/v60/default-boundary-volume-multiply-v5-1x-v1/attempt-v1/observation-v4.json',
    sha256: '8eb7cbd9f0fb73d9826af4e892cbb4931f1dd6830b6f1229fbebce5c12b87e9b',
    message:
      'The default value assigned to a parameter must be either a literal value (e.g., `5`) or a built-in variable (e.g., `close`).',
    line: 4,
    column: 3,
    nativeCode: null,
    shape: 'volume-calculation-declaration',
  },
  {
    id: 'default-boundary-volume-multiply-v6-1x-v1',
    source: 'v60/captures/v60/default-boundary-volume-multiply-v6-1x-v1/attempt-v1/executed-v1.pine',
    observation: 'v60/captures/v60/default-boundary-volume-multiply-v6-1x-v1/attempt-v1/observation-v4.json',
    sha256: '92e663b2b084004a3e790287439064307452c16f948fddbe01ce079a87f0ed0b',
    message:
      'The default value assigned to a parameter must be either a literal value (e.g., "5") or a built-in variable (e.g., "close").',
    line: 4,
    column: 3,
    nativeCode: 'CE10134',
    shape: 'volume-calculation-declaration',
  },
  {
    id: 'method-header-helper-default-function-v5-1x-v1',
    source: 'v60/captures/v60/method-header-helper-default-function-v5-1x-v1/attempt-v1/executed-v1.pine',
    observation: 'v60/captures/v60/method-header-helper-default-function-v5-1x-v1/attempt-v1/observation-v4.json',
    sha256: '647d3baa4bcfd9188d67b8229f284476e625beeeb2f62df298dcd90555239632',
    message: 'The default value cannot be a function, variable or calculation.',
    line: 4,
    column: 29,
    nativeCode: null,
    shape: 'method-helper-call-header',
  },
  {
    id: 'method-header-helper-default-receiver-v5-1x-v1',
    source: 'v60/captures/v60/method-header-helper-default-receiver-v5-1x-v1/attempt-v1/executed-v1.pine',
    observation: 'v60/captures/v60/method-header-helper-default-receiver-v5-1x-v1/attempt-v1/observation-v4.json',
    sha256: '2bdf6871b7fa4b16d4a0b47247f3de69f9012aa12d1381938f27463e94091bb4',
    message: 'The default value cannot be a function, variable or calculation.',
    line: 4,
    column: 29,
    nativeCode: null,
    shape: 'method-helper-call-header',
  },
  {
    id: 'method-header-helper-default-function-v6-1x-v1',
    source: 'v60/captures/v60/method-header-helper-default-function-v6-1x-v1/attempt-v1/executed-v1.pine',
    observation: 'v60/captures/v60/method-header-helper-default-function-v6-1x-v1/attempt-v1/observation-v4.json',
    sha256: '09e5963f587a7134e3f87acee3383a457e7cf97ab5f30299c3b38301d5f5fcf0',
    message: 'The default value cannot be a function, variable or calculation.',
    line: 4,
    column: 29,
    nativeCode: 'CE10133',
    shape: 'method-helper-call-header',
  },
  {
    id: 'method-header-helper-default-receiver-v6-1x-v1',
    source: 'v60/captures/v60/method-header-helper-default-receiver-v6-1x-v1/attempt-v1/executed-v1.pine',
    observation: 'v60/captures/v60/method-header-helper-default-receiver-v6-1x-v1/attempt-v1/observation-v4.json',
    sha256: '0629dc27c435b29899425fb6d97d8b3a040698effffbc0c69e74ff49249180cb',
    message: 'The default value cannot be a function, variable or calculation.',
    line: 4,
    column: 29,
    nativeCode: 'CE10133',
    shape: 'method-helper-call-header',
  },
] as const;

const sourceFor = (entry: (typeof cases)[number]) => readFileSync(new URL(entry.source, fixtureRoot), 'utf8');
const errorsFor = (source: string) =>
  checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

describe('v60 captured default expression boundaries', () => {
  for (const entry of cases) {
    it(`${entry.id} retains the exact native declaration refusal`, () => {
      const source = sourceFor(entry);
      const observation = JSON.parse(readFileSync(new URL(entry.observation, fixtureRoot), 'utf8'));
      expect(createHash('sha256').update(source).digest('hex')).toBe(entry.sha256);
      expect(observation.executedSha256).toBe(entry.sha256);
      expect(observation.status).toBe('COMPILE-ERROR');
      expect(observation.markers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: entry.message,
            startLineNumber: entry.line,
            startColumn: entry.column,
            ...(entry.nativeCode ? { code: entry.nativeCode } : {}),
          }),
        ]),
      );
      expect(errorsFor(source)).toEqual([
        expect.objectContaining({
          code: 'invalid-parameter-default',
          message: entry.message,
          line: entry.line,
          column: entry.column,
        }),
      ]);
    });
    for (const [name, value] of [
      ['literal', '6.0'],
      ['builtin', 'close'],
    ] as const) {
      it(`${entry.id} keeps the ${name} default control admitted`, () => {
        const source = sourceFor(entry);
        const control =
          entry.shape === 'volume-calculation-declaration'
            ? source.replace('volume*2', value)
            : source.replace('value=seed()', `value=${value}`);
        expect(control).not.toBe(source);
        expect(errorsFor(control)).toEqual([]);
      });
    }
  }
});
