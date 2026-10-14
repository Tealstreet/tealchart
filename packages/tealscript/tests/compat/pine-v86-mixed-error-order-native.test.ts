import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

type NativeMarker = {
  message: string; severity: number; startLineNumber: number; startColumn: number;
  code?: string | { value: string };
};
const fixture = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
const normalize = (marker: NativeMarker) => ({
  message: marker.message, severity: marker.severity === 8 ? 'error' : 'warning',
  line: marker.startLineNumber, column: marker.startColumn,
  nativeCode: typeof marker.code === 'object' ? marker.code.value : marker.code ?? null,
});
const diagnostics = (source: string) => checkProgram(parse(source)).diagnostics;
const sourceHash = '55cccc9a7b55364a6bd129d4dd7fddd8949c3fc6b467cff708a58bbe966d9961';

describe('v86 mixed-error diagnostic order', () => {
  it.each([1, 2, 3])('matches the complete settled native list from attempt %s', (attempt) => {
    const path = `v86/captures/v86/v86-mixed-error-order-1x-v1/attempt-v${attempt}`;
    const source = fixture(`${path}/executed-v1.pine`);
    const observation = JSON.parse(fixture(`${path}/observation-v1.json`));
    const settled = JSON.parse(fixture(`${path}/afterSettling-markers-v1.json`));
    expect(createHash('sha256').update(source).digest('hex')).toBe(sourceHash);
    expect(observation.executedSource).toBe(source);
    expect(observation.sourceSha256).toBe(sourceHash);
    expect(observation.status).toBe('COMPILE-ERROR');
    expect(settled.channelAvailability).toBe('OBSERVED');
    const expected = (settled.rawMarkers as NativeMarker[]).map(normalize);
    expect(expected).toHaveLength(45);
    expect(expected.filter(({ severity }) => severity === 'error')).toHaveLength(41);
    expect(expected.slice(41).map(({ severity }) => severity)).toEqual(['warning', 'warning', 'warning', 'warning']);
    expect(diagnostics(source).map(({ message, severity, line, column, nativeCode }) => ({
      message, severity, line, column, nativeCode: nativeCode ?? null,
    }))).toEqual(expected);
  });

  // Uncaptured control: preserve the parent rejection frontier before reordering deferred errors.
  it('keeps rejected local-history warning suppression with an earlier forward reference', () => {
    const source = "//@version=6\nindicator(\"frontier control\")\nlocal(float x)=>x[1]\nplot(late(close))\nplot(missingValue)\nlate(float x)=>x\nplot(bar_index %2==0 ? local(close):na)\n";
    const actual = diagnostics(source);
    expect(actual.filter(({ code }) => code === 'inconsistent-function-history' || code === 'inconsistent-local-history')).toEqual([]);
    expect(actual.filter(({ severity }) => severity === 'error')).toHaveLength(2);
  });

  it('authenticates three fresh background-analysis lists independently of full compilation', () => {
    const lists = [1, 2, 3].map((attempt) => {
      const path = `v86/captures/v86/v86-mixed-error-order-1x-v1/attempt-v${attempt}`;
      const requests = JSON.parse(fixture(`${path}/native-compiler-responses-v1.json`)) as {
        reqid: number; nativeRequest: string; requestBody: string | null; responseBody: string;
      }[];
      const request = requests.find(({ reqid }) => reqid === [23006, 23106, 23172][attempt - 1])!;
      expect(request.nativeRequest).toContain('translate_light?v=3 [200]');
      const source = request.requestBody!.match(/name="source"\r\n\r\n(.*?)\r\n--/s)![1].replace(/\r\n/g, '\n');
      expect(createHash('sha256').update(source).digest('hex')).toBe(sourceHash);
      const result = JSON.parse(request.responseBody).result as {
        errors: { message: string; ctx: Record<string, string>; code: string; start: { line: number; column: number } }[];
        warnings: { message: string; ctx: Record<string, string>; code: string; start: { line: number; column: number } }[];
      };
      expect(result.errors).toHaveLength(41);
      expect(result.warnings).toHaveLength(4);
      const render = (entry: (typeof result.errors)[number], severity: string) => ({
        message: Object.entries(entry.ctx).reduce((message, [key, value]) => message.replaceAll(`{${key}}`, value), entry.message),
        severity, line: entry.start.line, column: entry.start.column, nativeCode: entry.code,
      });
      const expected = [...result.errors.map((entry) => render(entry, 'error')), ...result.warnings.map((entry) => render(entry, 'warning'))];
      const settled = JSON.parse(fixture(`${path}/afterSettling-markers-v1.json`));
      expect(expected).toEqual((settled.rawMarkers as NativeMarker[]).map(normalize));
      return expected;
    });
    expect(lists[1]).toEqual(lists[0]);
    expect(lists[2]).toEqual(lists[0]);
  });
});
