import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { describe, expect, it } from 'vitest';

import {
  executeScript,
  createResultMessage,
  corporateActionRequestKey,
  currencyRateRequestKey,
  economicRequestKey,
  financialRequestKey,
  getResultOutput,
  InMemoryRequestDatafeed,
  parse,
  requestDatafeedKey,
  requestSeriesKey,
  seedRequestSymbol,
  TealscriptEngine,
  TealscriptWorker,
  validate,
  type Expression,
  type ParseOptions,
  type ParseResult,
  type ParseStartRule,
  type Statement,
  type TealscriptEngineOptions,
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
    const engineOptions: TealscriptEngineOptions = { requestDatafeed: datafeed };
    const resultMessage = createResultMessage('script-1', output);
    const normalizedOutput: NormalizedWorkerOutputBundle = getResultOutput(resultMessage);

    expect(typeof parse).toBe('function');
    expect(typeof validate).toBe('function');
    expect(typeof executeScript).toBe('function');
    expect(typeof TealscriptEngine).toBe('function');
    expect(typeof TealscriptWorker).toBe('function');
    expect(typeof InMemoryRequestDatafeed).toBe('function');
    expect(requestDatafeedKey('A', '1D')).toBe('A\u00001D');
    expect(requestSeriesKey('currency_rate', currencyRateRequestKey('USD', 'EUR'))).toBe('currency_rate\u0000USD\u0000EUR');
    expect(requestSeriesKey('earnings', corporateActionRequestKey('A', 'earnings.actual'))).toBe('earnings\u0000A\u0000earnings.actual\u0000');
    expect(requestSeriesKey('financial', financialRequestKey('A', 'TOTAL_REVENUE', 'FY', 'USD'))).toBe('financial\u0000A\u0000TOTAL_REVENUE\u0000FY\u0000USD');
    expect(requestSeriesKey('economic', economicRequestKey('US', 'GDP'))).toBe('economic\u0000US\u0000GDP');
    expect(requestDatafeedKey(seedRequestSymbol('seed/repo', 'DATA'), '1D')).toBe('seed\u0000seed/repo\u0000DATA\u00001D');
    expect(engineOptions.requestDatafeed).toBe(datafeed);
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
