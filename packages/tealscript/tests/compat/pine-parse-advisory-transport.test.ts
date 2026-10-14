import type { FromWorkerMessage, ParseErrorMessage, ToWorkerMessage } from '../../src/worker/protocol';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPineParseSemanticStageOutcomes } from '../../src/compat/sourceStages';
import { parse, TealscriptParseError } from '../../src/parser';

import { createWorkerTestModule } from '../helpers/workerTestModule';

const workerModule = createWorkerTestModule();
const cases = [
  ...[4, 5].flatMap(version => ['[true, false]', '[1, 2]', '["a", "b"]', '[a, b]'].map(rhs => ({
    version, body: `a = 1\nb = 2\n[x, y] = ${rhs}`, line: 5, column: version === 4 ? 1 : 10,
    message: version === 4 ? "Syntax error at input '['." : "Syntax error at input '['",
  }))),
  ...['[f(1), f(2.5)]', '[f(2.5), f(1)]', '[f(1), 2]'].map(rhs => ({
    version: 5, body: `f(x) => x\n[x, y] = ${rhs}`, line: 4, column: 10, message: "Syntax error at input '['",
  })),
  ...['var', 'varip'].flatMap(kind => [
    { version: 5, body: `f() => [1, 2]\n${kind} [a, b] = f()`, line: 4, column: 1,
      message: `'${kind}' cannot be used as a variable or function name.` },
    { version: 5, body: `type Probe\n    int value\nmethod f(Probe self) => [self.value, self.value + 1]\nholder = Probe.new(1)\n${kind} [a, b] = holder.f()`,
      line: 7, column: 1, message: `'${kind}' cannot be used as a variable or function name.` },
  ]),
];
const sourceFor = (row: typeof cases[number]) => `//@version=${row.version}\n${row.version === 4 ? 'study' : 'indicator'}("Parse list")\n${row.body}\nplot(1)`;
const diagnosticsFor = (row: typeof cases[number]) => [
  { code: 'PINE_VERSION_OUTDATED', severity: 'warning', line: 1, column: 3,
    message: `Version ${row.version} of Pine Script® is outdated. We recommend using the current version, which is 6.` },
  { code: 'parse.error', severity: 'error', message: row.message, line: row.line, column: row.column },
];
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
    type: 'init', scriptId: 'advisory-list', script: source, bars: [], inputs: {},
    metadata: { generation: 1, requestId: 2, requestKind: 'full' },
  } }));
  expect(messages).toHaveLength(1);
  expect(messages[0].type).toBe('parseError');
  return messages[0] as ParseErrorMessage;
}
afterEach(() => vi.unstubAllGlobals());

// V84 repeats bind advisory-first order to these fourteen tuple syntax shapes.
describe('captured legacy tuple parse lists', () => {
  it.each(cases)('parser preserves refusal and advisory-first order: v$version $body', row => {
    const error = refusal(sourceFor(row));
    expect(error.message).toBe(row.message);
    expect(error.location.start).toMatchObject({ line: row.line, column: row.column });
    expect(error).not.toHaveProperty('nativeCode');
    expect(error.diagnostics).toEqual(diagnosticsFor(row));
  });
  it.each(cases)('compatibility carries the complete list: v$version $body', row => {
    expect(createPineParseSemanticStageOutcomes(sourceFor(row))).toEqual([{
      stage: 'parse', status: 'failed', failureClass: 'parse_gap', message: row.message, diagnostics: diagnosticsFor(row),
    }]);
  });
  it.each(cases)('worker preserves scalar fields and complete list: v$version $body', async row => {
    expect(await workerRefusal(sourceFor(row))).toEqual({
      type: 'parseError', scriptId: 'advisory-list', message: row.message, line: row.line, column: row.column,
      metadata: { generation: 1, requestId: 2, requestKind: 'full' }, diagnostics: diagnosticsFor(row),
    });
  });
  it.each([
    '//@version=3\nstudy("Earlier")\n[a, b] = [f(1), f(2)]',
    '//@version=4\nstudy("Uncaptured")\n[a, b] = [f(1), f(2)]',
    '//@version=5\nindicator("Arity")\n[a, b, c] = [1, 2, 3]',
    '//@version=5\r\nindicator("Directive")\r\n[a, b] = [1, 2]',
    '//@version=4\nstudy("Persistent")\nvar [a, b] = [1, 2]',
    '//@version=5\nindicator("Typed")\nfloat [a, b] = [1, 2]',
    '//@version=5\nindicator("Syntax")\nplot(',
    '//@version=5\nindicator("Modifier")\nvar [a, b] = [1, 2]',
  ])('keeps uncaptured scalar error transport: %s', async source => {
    const error = refusal(source);
    expect(error).not.toHaveProperty('diagnostics');
    expect(await workerRefusal(source)).not.toHaveProperty('diagnostics');
    expect(createPineParseSemanticStageOutcomes(source)[0].diagnostics).toEqual([{
      code: 'parse.error', message: error.message, line: error.location.start.line, column: error.location.start.column,
    }]);
  });
  it('keeps valid tuple-call declarations admitted', () => {
    expect(createPineParseSemanticStageOutcomes('//@version=5\nindicator("Valid")\nf() => [1, 2]\n[a, b] = f()\nplot(a)'))
      .toEqual([{ stage: 'parse', status: 'passed' }, { stage: 'semantic', status: 'passed' }]);
  });
});
