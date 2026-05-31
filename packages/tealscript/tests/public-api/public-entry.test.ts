import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { describe, expect, it } from 'vitest';

import {
  executeScript,
  createResultMessage,
  getResultOutput,
  InMemoryRequestDatafeed,
  parse,
  requestDatafeedKey,
  TealscriptEngine,
  TealscriptWorker,
  validate,
  type Expression,
  type ParseOptions,
  type ParseResult,
  type ParseStartRule,
  type Statement,
  type ToWorkerMessage,
  type NormalizedWorkerOutputBundle,
  type RequestDatafeed,
  type WorkerOutputBundle,
} from '../../src';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('public package entrypoints', () => {
  it('keeps root parser, runtime, and worker wrapper exports available', () => {
    const expressionOptions: ParseOptions<'Expression'> = { startRule: 'Expression' };
    const expression: ParseResult<'Expression'> = parse('close + 1', expressionOptions);
    const statement: Statement = parse('plot(close)', { startRule: 'Statement' });
    const startRule: ParseStartRule = 'Program';
    const message: ToWorkerMessage = { type: 'dispose' };
    const output: WorkerOutputBundle = { plots: [], drawings: [], alerts: [], logs: [], inputs: [] };
    const datafeed: RequestDatafeed = new InMemoryRequestDatafeed();
    const resultMessage = createResultMessage('script-1', output);
    const normalizedOutput: NormalizedWorkerOutputBundle = getResultOutput(resultMessage);

    expect(typeof parse).toBe('function');
    expect(typeof validate).toBe('function');
    expect(typeof executeScript).toBe('function');
    expect(typeof TealscriptEngine).toBe('function');
    expect(typeof TealscriptWorker).toBe('function');
    expect(typeof InMemoryRequestDatafeed).toBe('function');
    expect(requestDatafeedKey('A', '1D')).toBe('A\u00001D');
    expect(datafeed.getBars({ symbol: 'A', timeframe: '1D' }).ok).toBe(false);
    expect(normalizedOutput).toEqual(output);
    expect((expression as Expression).type).toBe('BinaryExpression');
    expect(statement.type).toBe('ExpressionStatement');
    expect(startRule).toBe('Program');
    expect(message.type).toBe('dispose');
  });

  it('documents the compatibility export map', () => {
    const packageJson = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8')) as {
      exports: Record<string, string>;
    };

    expect(packageJson.exports['.']).toBe('./src/index.ts');
    expect(packageJson.exports['./worker']).toBe('./src/worker/worker.ts');
    expect(packageJson.exports['./src/*']).toBe('./src/*');
  });
});
