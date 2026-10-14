import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPineParseSemanticStageOutcomes } from '../../src/compat/sourceStages';
import { parse, TealscriptParseError } from '../../src/parser';
import type { FromWorkerMessage, ParseErrorMessage, ToWorkerMessage } from '../../src/worker/protocol';

import { createWorkerTestModule } from '../helpers/workerTestModule';

const workerModule = createWorkerTestModule();
const source = readFileSync(new URL('../../oracle-probes/v15/corpus-v56-1463-continuation-v15-v1.pine', import.meta.url), 'utf8');
const outcomes = JSON.parse(readFileSync(new URL('../../oracle-probes/v15/captures/v15/outcomes-v15.json', import.meta.url), 'utf8'));
const native = outcomes[34];
const expected = native.native_editor_markers.map((marker: {
  code?: string; message: string; severity: number; startLineNumber: number; startColumn: number;
}) => ({
  code: marker.severity === 8 ? 'parse.error' : marker.code,
  severity: marker.severity === 8 ? 'error' : 'warning',
  message: marker.message, line: marker.startLineNumber, column: marker.startColumn,
}));
function refusal(text: string) {
  try { parse(text); } catch (error) {
    expect(error).toBeInstanceOf(TealscriptParseError);
    return error as TealscriptParseError;
  }
  throw new Error('Expected parse refusal');
}
async function workerRefusal(text: string) {
  const messages: FromWorkerMessage[] = [];
  const worker = { onmessage: undefined as ((event: MessageEvent<ToWorkerMessage>) => void) | undefined,
    postMessage: (message: FromWorkerMessage) => messages.push(structuredClone(message)) };
  await workerModule.attach(worker);
  messages.length = 0;
  worker.onmessage!(new MessageEvent<ToWorkerMessage>('message', { data: {
    type: 'init', scriptId: 'parse-shorttitle', script: text, bars: [], inputs: {},
    metadata: { generation: 1, requestId: 1, requestKind: 'full' },
  } }));
  expect(messages).toHaveLength(1);
  expect(messages[0].type).toBe('parseError');
  return messages[0] as ParseErrorMessage;
}
afterEach(() => vi.unstubAllGlobals());

describe('captured continuation refusal carries declaration warnings', () => {
  it('parser retains all three native markers and their order', () => {
    expect(createHash('sha256').update(source).digest('hex')).toBe(native.source_sha256);
    expect(native.status).toBe('COMPILE-ERROR');
    expect(expected).toHaveLength(3);
    expect(expected.map((marker: { code: string }) => marker.code)).toEqual([
      'SHORT_TITLE_TOO_LONG', 'PINE_VERSION_OUTDATED', 'parse.error',
    ]);
    const error = refusal(source);
    expect(error.message).toBe(expected[2].message);
    expect(error.location.start).toMatchObject({ line: 43, column: 10 });
    expect(error).not.toHaveProperty('nativeCode');
    expect(error.diagnostics).toEqual(expected);
  });
  it('compatibility carries the complete native refusal list', () => {
    expect(createPineParseSemanticStageOutcomes(source)).toEqual([{
      stage: 'parse', status: 'failed', failureClass: 'parse_gap', message: expected[2].message, diagnostics: expected,
    }]);
  });
  it('worker retains scalar fields and the complete native list', async () => {
    expect(await workerRefusal(source)).toEqual({
      type: 'parseError', scriptId: 'parse-shorttitle', message: expected[2].message,
      line: 43, column: 10, metadata: { generation: 1, requestId: 1, requestKind: 'full' }, diagnostics: expected,
    });
  });
  it.each([
    '//@version=5\nindicator("Title", "12345678901")\nplot(',
    '//@version=5\nindicator("Title", "12345678901")\n[a, b] = [1, 2]',
    '//@version=5\nindicator("Title", "short")\nf() => "a" +\n    "b"\nplot(1)',
    '//@version=6\nindicator("Title", "12345678901")\nf() => "a" +\n    "b"\nplot(1)',
  ])('keeps other parse shapes on their existing transport: %s', text => {
    const error = refusal(text);
    expect(error.diagnostics?.some(marker => marker.code === 'SHORT_TITLE_TOO_LONG') ?? false).toBe(false);
  });
});
