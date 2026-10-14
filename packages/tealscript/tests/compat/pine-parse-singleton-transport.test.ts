import type { FromWorkerMessage, ParseErrorMessage, ToWorkerMessage } from '../../src/worker/protocol';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPineParseSemanticStageOutcomes } from '../../src/compat/sourceStages';
import { parse, TealscriptParseError } from '../../src/parser';

import { createWorkerTestModule } from '../helpers/workerTestModule';

const workerModule = createWorkerTestModule();
const header = '//@version=6\nindicator("Parse list")\n';
// Captured singleton categories: native rounds v60 (bracket) and v76 (modifier).
const cases = [
  { body: '[a, b] = [1, 2]\nplot(a)', message: 'Syntax error at input "["', line: 3, column: 10, nativeCode: 'CE10156' },
  { body: 'read() => [1, 2]\nvar [a, b] = read()\nplot(a)', message: '""var"" cannot be used as a variable or function name.', line: 4, column: 1, nativeCode: 'CE10150' },
  { body: 'read() => [1, 2]\nvarip [a, b] = read()\nplot(a)', message: '""varip"" cannot be used as a variable or function name.', line: 4, column: 1, nativeCode: 'CE10150' },
];
const diagnostic = (row: typeof cases[number]) => ({ code: 'parse.error', severity: 'error',
  message: row.message, line: row.line, column: row.column, nativeCode: row.nativeCode });
function refusal(source: string) {
  try { parse(source); } catch (error) {
    expect(error).toBeInstanceOf(TealscriptParseError);
    return error as TealscriptParseError;
  }
  throw new Error('Expected parse refusal');
}
async function workerRefusal(source: string) {
  const messages: FromWorkerMessage[] = [];
  const worker = { onmessage: undefined as ((event: MessageEvent<ToWorkerMessage>) => void) | undefined,
    postMessage: (message: FromWorkerMessage) => messages.push(structuredClone(message)) };
  await workerModule.attach(worker);
  messages.length = 0;
  worker.onmessage!(new MessageEvent<ToWorkerMessage>('message', { data: {
    type: 'init', scriptId: 'parse-list', script: source, bars: [], inputs: {},
    metadata: { generation: 1, requestId: 2, requestKind: 'full' },
  } }));
  expect(messages).toHaveLength(1);
  expect(messages[0].type).toBe('parseError');
  return messages[0] as ParseErrorMessage;
}
afterEach(() => vi.unstubAllGlobals());

describe('witnessed v6 singleton parse transport', () => {
  it.each(cases)('parser keeps one $nativeCode entry: $body', row => {
    const error = refusal(header + row.body);
    expect(error).toMatchObject({ message: row.message, nativeCode: row.nativeCode });
    expect((error as TealscriptParseError & { diagnostics?: unknown[] }).diagnostics).toEqual([diagnostic(row)]);
  });
  it.each(cases)('compatibility carries one $nativeCode entry: $body', row => {
    expect(createPineParseSemanticStageOutcomes(header + row.body)).toEqual([{
      stage: 'parse', status: 'failed', failureClass: 'parse_gap', message: row.message, diagnostics: [diagnostic(row)],
    }]);
  });
  it.each(cases)('worker carries one $nativeCode entry: $body', async row => {
    expect(await workerRefusal(header + row.body)).toEqual({
      type: 'parseError', scriptId: 'parse-list', message: row.message, line: row.line, column: row.column,
      metadata: { generation: 1, requestId: 2, requestKind: 'full' }, diagnostics: [diagnostic(row)],
    });
  });
  it.each([
    header + '[a, b, c] = [1, 2, 3]\nplot(a)',
  ])('preserves uncoded scalar refusals: %s', async source => {
    const error = refusal(source);
    expect(error).not.toHaveProperty('nativeCode');
    expect(error).not.toHaveProperty('diagnostics');
    const message = await workerRefusal(source);
    expect(message).not.toHaveProperty('diagnostics');
    expect(createPineParseSemanticStageOutcomes(source)[0].diagnostics).toEqual([{
      code: 'parse.error', message: error.message, line: error.location.start.line, column: error.location.start.column,
    }]);
  });
  // V84 v5-numeric-tuple-rhs attempts 1–5 supersede scalar-only transport.
  it('carries the witnessed legacy advisory before its parse refusal', async () => {
    const source = '//@version=5\nindicator("Legacy")\n[a, b] = [1, 2]\nplot(a)';
    const diagnostics = [
      { code: 'PINE_VERSION_OUTDATED', severity: 'warning', line: 1, column: 3,
        message: 'Version 5 of Pine Script® is outdated. We recommend using the current version, which is 6.' },
      { code: 'parse.error', severity: 'error', message: "Syntax error at input '['", line: 3, column: 10 },
    ];
    const error = refusal(source);
    expect(error).not.toHaveProperty('nativeCode');
    expect(error.message).toBe("Syntax error at input '['");
    expect(error.location.start).toMatchObject({ line: 3, column: 10 });
    expect(error.diagnostics).toEqual(diagnostics);
    expect(await workerRefusal(source)).toMatchObject({
      message: error.message, line: 3, column: 10, diagnostics,
    });
    expect(createPineParseSemanticStageOutcomes(source)[0].diagnostics).toEqual(diagnostics);
  });
  it('keeps valid tuple calls admitted', () => {
    expect(createPineParseSemanticStageOutcomes(header + 'read() => [1, 2]\n[a, b] = read()\nplot(a)'))
      .toEqual([{ stage: 'parse', status: 'passed' }, { stage: 'semantic', status: 'passed' }]);
  });
});
