import { afterEach, describe, expect, it, vi } from 'vitest';

import { InMemoryRequestDatafeed, TealscriptEngine } from '../../src/runtime';
import type { Bar } from '../../src/runtime';
import { parse } from '../../src/parser';
import type {
  FromWorkerMessage,
  RequestDataMessage,
  RequestDataResultMessage,
  ResultMessage,
  ToWorkerMessage,
  WorkerRequestDataKind,
  WorkerRequestDataValue,
} from '../../src/worker/protocol';

function makeBars(closes: number[], startTime = Date.UTC(2024, 0, 1), intervalMs = 60000): Bar[] {
  return closes.map((close, index) => ({
    time: startTime + index * intervalMs,
    open: close - 0.5,
    high: close + 1,
    low: close - 1,
    close,
    volume: 1000 + index,
  }));
}

function isRequestDataMessage(message: FromWorkerMessage): message is RequestDataMessage {
  return message.type === 'requestData';
}

function isResultMessage(message: FromWorkerMessage): message is ResultMessage {
  return message.type === 'result';
}

describe('worker requestData bridge', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('preloads request.security OHLC bars and keeps compiled execution enabled', async () => {
    const posted: FromWorkerMessage[] = [];
    const workerGlobal = {
      onmessage: null as ((event: MessageEvent<ToWorkerMessage>) => void) | null,
      postMessage: (message: FromWorkerMessage) => {
        posted.push(message);
      },
    };
    vi.stubGlobal('self', workerGlobal);

    await import('../../src/worker/worker');

    const chartBars = makeBars([10, 11, 12, 13, 14, 15]);
    const requestedBars = [
      { time: chartBars[1]!.time, open: 20, high: 23, low: 19, close: 22, volume: 2000 },
      { time: chartBars[3]!.time, open: 30, high: 35, low: 29, close: 34, volume: 2100 },
    ];
    const script = `//@version=6
indicator("Worker Request Bridge")
reqOpen = request.security("TEST", "D", open, lookahead=barmerge.lookahead_on)
reqClose = request.security("TEST", "D", close, lookahead=barmerge.lookahead_on)
plot(reqOpen, "Requested Open")
plot(reqClose, "Requested Close")`;

    workerGlobal.onmessage?.({
      data: {
        type: 'init',
        scriptId: 'study-request-bridge',
        script,
        bars: chartBars,
        inputs: {},
        metadata: { generation: 1, requestId: 1, requestKind: 'full' },
      },
    } as MessageEvent<ToWorkerMessage>);

    const request = posted.find((message): message is RequestDataMessage => message.type === 'requestData');
    expect(request).toMatchObject({
      type: 'requestData',
      scriptId: 'study-request-bridge',
      generation: 1,
      kind: 'bars',
      query: { symbol: 'TEST', timeframe: 'D' },
    });
    expect(posted.some((message) => message.type === 'result')).toBe(false);

    const response: RequestDataResultMessage = {
      type: 'requestDataResult',
      scriptId: 'study-request-bridge',
      requestId: request!.requestId,
      generation: request!.generation,
      kind: 'bars',
      ok: true,
      value: {
        symbol: 'TEST',
        timeframe: 'D',
        bars: requestedBars,
      },
    };
    workerGlobal.onmessage?.({ data: response } as MessageEvent<ToWorkerMessage>);

    const result = posted.find((message) => message.type === 'result');
    expect(result?.profile?.executionMode).toBe('compiled');
    expect(result?.profile?.fallbackReason).toBeUndefined();
    expect(result?.plots.map((plot) => plot.title)).toEqual(['Requested Open', 'Requested Close']);
    expect(result?.plots[0]?.values).toEqual([null, 20, 20, 30, 30, 30]);
    expect(result?.plots[1]?.values).toEqual([null, 22, 22, 34, 34, 34]);
  });

  it('selects closure execution through worker runtime options', async () => {
    const posted: FromWorkerMessage[] = [];
    const workerGlobal = {
      onmessage: null as ((event: MessageEvent<ToWorkerMessage>) => void) | null,
      postMessage: (message: FromWorkerMessage) => {
        posted.push(message);
      },
    };
    vi.stubGlobal('self', workerGlobal);

    await import('../../src/worker/worker');

    workerGlobal.onmessage?.({
      data: {
        type: 'init',
        scriptId: 'study-closure-backend',
        script: 'indicator("Closure Backend")\nplot(close + 1)',
        bars: makeBars([10, 11, 12]),
        inputs: {},
        runtime: {
          backend: {
            enableClosureBackend: true,
          },
        },
        metadata: { generation: 1, requestId: 1, requestKind: 'full' },
      },
    } as MessageEvent<ToWorkerMessage>);

    const result = posted.find(isResultMessage);
    expect(result?.profile?.executionMode).toBe('closure');
    expect(result?.profile?.selectedBackend).toBe('closure');
    expect(result?.profile?.backendSelectionSource).toBe('flag');
    expect(result?.plots[0]?.values).toEqual([11, 12, 13]);
  });

  it('preloads every supported request family and keeps compiled execution enabled', async () => {
    const posted: FromWorkerMessage[] = [];
    const workerGlobal = {
      onmessage: null as ((event: MessageEvent<ToWorkerMessage>) => void) | null,
      postMessage: (message: FromWorkerMessage) => {
        posted.push(message);
      },
    };
    vi.stubGlobal('self', workerGlobal);

    await import('../../src/worker/worker');

    const baseTime = Date.UTC(2024, 0, 1);
    const chartBars = makeBars([10, 11, 12, 13, 14, 15], baseTime);
    const twoMinuteBars = makeBars([10, 12, 14], baseTime, 120000);
    const requestedBars = [
      { time: chartBars[1]!.time, open: 20, high: 23, low: 19, close: 22, volume: 2000 },
      { time: chartBars[3]!.time, open: 30, high: 35, low: 29, close: 34, volume: 2100 },
    ];
    const pointValues = [
      { time: chartBars[0]!.time, value: 1 },
      { time: chartBars[3]!.time, value: 2 },
    ];

    const runCase = (
      name: string,
      script: string,
      expectedKind: WorkerRequestDataKind,
      value: WorkerRequestDataValue,
      assertResult: (result: ResultMessage) => void,
      bars: Bar[] = chartBars,
    ): void => {
      const start = posted.length;
      const generation = start + 1;
      workerGlobal.onmessage?.({
        data: {
          type: 'init',
          scriptId: `study-${name}`,
          script,
          bars,
          inputs: {},
          runtime: {
            syminfo: { ticker: 'TEST', tickerid: 'TEST', currency: 'USD' },
            timeframe: { period: bars === twoMinuteBars ? '2' : '60' },
          },
          metadata: { generation, requestId: generation, requestKind: 'full' },
        },
      } as MessageEvent<ToWorkerMessage>);

      const requests = posted.slice(start).filter(isRequestDataMessage);
      expect(
        requests.map((request) => request.kind),
        `${name}: ${JSON.stringify(posted.slice(start))}`,
      ).toContain(expectedKind);
      expect(posted.slice(start).some((message) => message.type === 'result'), name).toBe(false);
      for (const request of requests) {
        const response: RequestDataResultMessage = {
          type: 'requestDataResult',
          scriptId: request.scriptId,
          requestId: request.requestId,
          generation: request.generation,
          kind: request.kind,
          ok: true,
          value: request.kind === expectedKind ? value : null,
        };
        workerGlobal.onmessage?.({ data: response } as MessageEvent<ToWorkerMessage>);
      }

      const result = posted.slice(start).find(isResultMessage);
      expect(result?.profile?.executionMode, name).toBe('compiled');
      expect(result?.profile?.fallbackReason, name).toBeUndefined();
      assertResult(result!);
    };

    runCase(
      'security-lower-tf',
      `//@version=6
indicator("Lower TF", timeframe="2")
intrabars = request.security_lower_tf("TEST", "1", close)
plot(array.size(intrabars), "Lower Count")`,
      'bars',
      { symbol: 'TEST', timeframe: '1', bars: chartBars },
      (result) => expect(result.plots[0]?.values).toEqual([2, 2, 2]),
      twoMinuteBars,
    );

    runCase(
      'seed',
      `//@version=6
indicator("Seed")
seedClose = request.seed("tradingview-pine-seeds/demo", "BTC_DEV", close)
plot(seedClose, "Seed Close")`,
      'bars',
      { symbol: 'seed\u0000tradingview-pine-seeds/demo\u0000BTC_DEV', timeframe: '60', bars: requestedBars },
      (result) => expect(result.plots[0]?.values).toEqual([null, null, null, 22, 22, 22]),
    );

    runCase(
      'currency-rate',
      `//@version=6
indicator("Currency")
plot(request.currency_rate("USD", "GBP"), "USDGBP")`,
      'currency_rate',
      pointValues,
      (result) => expect(result.plots[0]?.values).toEqual([1, 1, 1, 2, 2, 2]),
    );

    runCase(
      'economic',
      `//@version=6
indicator("Economic")
plot(request.economic("US", "GDP"), "GDP")`,
      'economic',
      pointValues,
      (result) => expect(result.plots[0]?.values).toEqual([1, 1, 1, 2, 2, 2]),
    );

    runCase(
      'dividends',
      `//@version=6
indicator("Dividends")
plot(request.dividends("NASDAQ:AAPL", dividends.gross, currency="USD"), "Dividend")`,
      'corporate_action',
      [
        { time: chartBars[0]!.time, value: { kind: 'dividends', gross: 0.24 } },
        { time: chartBars[3]!.time, value: { kind: 'dividends', gross: 0.25 } },
      ],
      (result) => expect(result.plots[0]?.values).toEqual([0.24, 0.24, 0.24, 0.25, 0.25, 0.25]),
    );

    runCase(
      'splits',
      `//@version=6
indicator("Splits")
plot(request.splits("NASDAQ:AAPL", splits.denominator), "Split")`,
      'corporate_action',
      [{ time: chartBars[3]!.time, value: { kind: 'splits', denominator: 4 } }],
      (result) => expect(result.plots[0]?.values).toEqual([null, null, null, 4, 4, 4]),
    );

    runCase(
      'earnings',
      `//@version=6
indicator("Earnings")
plot(request.earnings("NASDAQ:AAPL", earnings.actual, currency="USD"), "Earnings")`,
      'corporate_action',
      [
        { time: chartBars[0]!.time, value: { kind: 'earnings', actual: 1.5 } },
        { time: chartBars[3]!.time, value: { kind: 'earnings', actual: 1.8 } },
      ],
      (result) => expect(result.plots[0]?.values).toEqual([1.5, 1.5, 1.5, 1.8, 1.8, 1.8]),
    );

    runCase(
      'financial',
      `//@version=6
indicator("Financial")
plot(request.financial("NASDAQ:AAPL", "TOTAL_REVENUE", "FQ", currency="USD"), "Revenue")`,
      'financial',
      pointValues,
      (result) => expect(result.plots[0]?.values).toEqual([1, 1, 1, 2, 2, 2]),
    );

    runCase(
      'quandl',
      `//@version=6
indicator("Quandl")
plot(request.quandl("MULTPL/SP500_PE_RATIO_MONTH", index=1), "Quandl")`,
      'quandl',
      pointValues,
      (result) => expect(result.plots[0]?.values).toEqual([1, 1, 1, 2, 2, 2]),
    );

    runCase(
      'footprint',
      `//@version=6
indicator("Footprint")
fp = request.footprint(10, 70)
rows = na(fp) ? array.new<float>() : fp.rows()
pocRow = na(fp) ? na : fp.poc()
firstRow = array.size(rows) > 0 ? array.get(rows, 0) : na
firstBuyImbalance = na(firstRow) ? false : firstRow.has_buy_imbalance()
plot(na(fp) ? na : fp.total_volume(), "Total")
plot(na(fp) ? na : footprint.delta(fp), "Delta")
plot(na(pocRow) ? na : pocRow.total_volume(), "POC Volume")
plot(firstBuyImbalance ? 1 : 0, "First Buy Imbalance")`,
      'footprint',
      [{
        time: chartBars[0]!.time,
        totalVolume: 100,
        buyVolume: 65,
        sellVolume: 35,
        pointOfControl: 11,
        rows: [
          { downPrice: 10, upPrice: 11, totalVolume: 40, buyVolume: 18, sellVolume: 22 },
          { downPrice: 11, upPrice: 12, totalVolume: 60, buyVolume: 47, sellVolume: 13, hasBuyImbalance: true },
        ],
      }],
      (result) => {
        expect(result.plots[0]?.values).toEqual([100, 100, 100, 100, 100, 100]);
        expect(result.plots[1]?.values).toEqual([30, 30, 30, 30, 30, 30]);
        expect(result.plots[2]?.values).toEqual([40, 40, 40, 40, 40, 40]);
        expect(result.plots[3]?.values).toEqual([0, 0, 0, 0, 0, 0]);
      },
    );
  });

  it('treats unseeded requestData results as na without falling back from compiled mode', async () => {
    const posted: FromWorkerMessage[] = [];
    const workerGlobal = {
      onmessage: null as ((event: MessageEvent<ToWorkerMessage>) => void) | null,
      postMessage: (message: FromWorkerMessage) => {
        posted.push(message);
      },
    };
    vi.stubGlobal('self', workerGlobal);

    await import('../../src/worker/worker');

    const chartBars = makeBars([10, 11, 12]);
    const script = `//@version=6
indicator("Unseeded")
sec = request.security("NOPE", "D", close)
ltf = request.security_lower_tf("NOPE", "1", close, ignore_invalid_symbol=true)
seeded = request.seed("missing/repo", "MISSING", close, ignore_invalid_symbol=true)
rate = request.currency_rate("USD", "EUR")
econ = request.economic("ZZ", "GDP")
dividend = request.dividends("NOPE", dividends.gross)
split = request.splits("NOPE", splits.denominator)
earn = request.earnings("NOPE", earnings.actual)
fin = request.financial("NOPE", "TOTAL_REVENUE", "FQ")
quandl = request.quandl("NOPE", index=1)
fp = request.footprint(10, 70)
missingFootprintTotal = na(fp) ? na : fp.total_volume()
plot(na(sec) ? 1 : 0, "Security NA")
plot(array.size(ltf), "Lower Empty")
plot(na(seeded) ? 1 : 0, "Seed NA")
plot(na(rate) ? 1 : 0, "Rate NA")
plot(na(econ) ? 1 : 0, "Economic NA")
plot(na(dividend) ? 1 : 0, "Dividend NA")
plot(na(split) ? 1 : 0, "Split NA")
plot(na(earn) ? 1 : 0, "Earnings NA")
plot(na(fin) ? 1 : 0, "Financial NA")
plot(na(quandl) ? 1 : 0, "Quandl NA")
plot(na(fp) ? 1 : 0, "Footprint NA")
plot(na(missingFootprintTotal) ? 1 : 0, "Footprint Accessor NA")`;

    workerGlobal.onmessage?.({
      data: {
        type: 'init',
        scriptId: 'study-unseeded',
        script,
        bars: chartBars,
        inputs: {},
        runtime: {
          syminfo: { ticker: 'TEST', tickerid: 'TEST', currency: 'USD' },
          timeframe: { period: '60' },
        },
        metadata: { generation: 1, requestId: 1, requestKind: 'full' },
      },
    } as MessageEvent<ToWorkerMessage>);

    const requests = posted.filter(isRequestDataMessage);
    expect(requests.map((request) => request.kind).sort()).toEqual([
      'bars',
      'bars',
      'bars',
      'corporate_action',
      'corporate_action',
      'corporate_action',
      'currency_rate',
      'economic',
      'financial',
      'footprint',
      'quandl',
    ]);

    for (const request of requests) {
      workerGlobal.onmessage?.({
        data: {
          type: 'requestDataResult',
          scriptId: request.scriptId,
          requestId: request.requestId,
          generation: request.generation,
          kind: request.kind,
          ok: true,
          value: null,
        } satisfies RequestDataResultMessage,
      } as MessageEvent<ToWorkerMessage>);
    }

    const result = posted.find(isResultMessage);
    expect(result?.profile?.executionMode).toBe('compiled');
    expect(result?.profile?.fallbackReason).toBeUndefined();
    expect(result?.plots.map((plot) => plot.values)).toEqual([
      [1, 1, 1],
      [0, 0, 0],
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ]);
  });

  it('treats failed requestData results as na without surfacing script errors', async () => {
    const posted: FromWorkerMessage[] = [];
    const workerGlobal = {
      onmessage: null as ((event: MessageEvent<ToWorkerMessage>) => void) | null,
      postMessage: (message: FromWorkerMessage) => {
        posted.push(message);
      },
    };
    vi.stubGlobal('self', workerGlobal);

    await import('../../src/worker/worker');

    const chartBars = makeBars([10, 11, 12]);
    const script = `//@version=6
indicator("Failed Provider Miss")
sec = request.security("NOPE", "D", close)
rate = request.currency_rate("USD", "EUR")
plot(na(sec) ? 1 : 0, "Security NA")
plot(na(rate) ? 1 : 0, "Rate NA")`;

    workerGlobal.onmessage?.({
      data: {
        type: 'init',
        scriptId: 'study-provider-failure',
        script,
        bars: chartBars,
        inputs: {},
        metadata: { generation: 1, requestId: 1, requestKind: 'full' },
      },
    } as MessageEvent<ToWorkerMessage>);

    const requests = posted.filter(isRequestDataMessage);
    expect(requests.map((request) => request.kind).sort()).toEqual(['bars', 'currency_rate']);

    for (const request of requests) {
      workerGlobal.onmessage?.({
        data: {
          type: 'requestDataResult',
          scriptId: request.scriptId,
          requestId: request.requestId,
          generation: request.generation,
          kind: request.kind,
          ok: false,
          error: {
            code: request.kind === 'bars' ? 'not-found' : 'provider-error',
            message: request.kind === 'bars'
              ? 'No seeded bars for NOPE D'
              : 'currency cache failed',
          },
        } satisfies RequestDataResultMessage,
      } as MessageEvent<ToWorkerMessage>);
    }

    const result = posted.find(isResultMessage);
    expect(posted.some((message) => message.type === 'error')).toBe(false);
    expect(result?.profile?.executionMode).toBe('compiled');
    expect(result?.plots.map((plot) => plot.values)).toEqual([
      [1, 1, 1],
      [1, 1, 1],
    ]);
  });

  it('discovers series-varying request arguments at runtime and keeps compiled execution enabled', async () => {
    const posted: FromWorkerMessage[] = [];
    const workerGlobal = {
      onmessage: null as ((event: MessageEvent<ToWorkerMessage>) => void) | null,
      postMessage: (message: FromWorkerMessage) => {
        posted.push(message);
      },
    };
    vi.stubGlobal('self', workerGlobal);

    await import('../../src/worker/worker');

    const chartBars = makeBars([10, 11, 12]);
    const script = `//@version=6
indicator("Dynamic Request Discovery")
dynSymbol = close > 11 ? "EXT" : "ALT"
dynTimeframe = close > 11 ? "D" : "W"
securityValue = request.security(dynSymbol, dynTimeframe, close, ignore_invalid_symbol=true, lookahead=barmerge.lookahead_on)
financialValue = request.financial(dynSymbol, "TOTAL_REVENUE", "FQ", ignore_invalid_symbol=true)
if bar_index == 1
    log.info("discovery side effect")
    alert("discovery alert", alert.freq_once_per_bar)
plot(securityValue, "Security")
plot(financialValue, "Financial")`;

    workerGlobal.onmessage?.({
      data: {
        type: 'init',
        scriptId: 'study-dynamic-request-discovery',
        script,
        bars: chartBars,
        inputs: {},
        runtime: {
          syminfo: { ticker: 'TEST', tickerid: 'TEST', currency: 'USD' },
          timeframe: { period: '60' },
        },
        metadata: { generation: 1, requestId: 1, requestKind: 'full' },
      },
    } as MessageEvent<ToWorkerMessage>);

    const requests = posted.filter(isRequestDataMessage);
    expect(requests.map((request) => [request.kind, request.query])).toEqual([
      ['bars', { symbol: 'ALT', timeframe: 'W' }],
      ['financial', { symbol: 'ALT', financialId: 'TOTAL_REVENUE', period: 'FQ', currency: undefined, time: 0 }],
      ['bars', { symbol: 'EXT', timeframe: 'D' }],
      ['financial', { symbol: 'EXT', financialId: 'TOTAL_REVENUE', period: 'FQ', currency: undefined, time: 0 }],
    ]);
    expect(posted.some(isResultMessage)).toBe(false);

    for (const request of requests) {
      const value: WorkerRequestDataValue = request.kind === 'bars'
        ? {
          symbol: (request.query as { symbol: string }).symbol,
          timeframe: (request.query as { timeframe: string }).timeframe,
          bars: (request.query as { symbol: string }).symbol === 'ALT'
            ? [{ time: chartBars[0]!.time, open: 40, high: 55, low: 35, close: 50, volume: 1000 }]
            : [{ time: chartBars[2]!.time, open: 190, high: 205, low: 185, close: 200, volume: 2000 }],
        }
        : (request.query as { symbol: string }).symbol === 'ALT'
          ? [{ time: chartBars[0]!.time, value: 7 }]
          : [{ time: chartBars[2]!.time, value: 9 }];
      workerGlobal.onmessage?.({
        data: {
          type: 'requestDataResult',
          scriptId: request.scriptId,
          requestId: request.requestId,
          generation: request.generation,
          kind: request.kind,
          ok: true,
          value,
        } satisfies RequestDataResultMessage,
      } as MessageEvent<ToWorkerMessage>);
    }

    const result = posted.find(isResultMessage);
    expect(result?.profile?.executionMode).toBe('compiled');
    expect(result?.profile?.fallbackReason).toBeUndefined();
    expect(result?.plots.map((plot) => plot.values)).toEqual([
      [50, 50, 200],
      [7, 7, 9],
    ]);
    expect(result?.logs?.map((log) => log.message)).toEqual(['discovery side effect']);
    expect(result?.alerts.flatMap((alert) => alert.events.map((event) => event.message))).toEqual(['discovery alert']);
  });

  it('keeps same-bar realtime updates compiled while reusing cached request data and libraries', async () => {
    const posted: FromWorkerMessage[] = [];
    const workerGlobal = {
      onmessage: null as ((event: MessageEvent<ToWorkerMessage>) => void) | null,
      postMessage: (message: FromWorkerMessage) => {
        posted.push(message);
      },
    };
    vi.stubGlobal('self', workerGlobal);

    await import('../../src/worker/worker');

    const librarySource = `//@version=6
library("RealtimeTools", true)
export midpoint(float highValue, float lowValue) =>
    (highValue + lowValue) / 2`;
    const libraries = new Map([['TestUser/RealtimeTools/1', parse(librarySource)]]);
    const chartBars = makeBars([10, 11, 12], Date.UTC(2024, 0, 1), 60000);
    const requestedContext = {
      symbol: 'TEST',
      timeframe: 'D',
      bars: [{ time: chartBars[0]!.time, open: 90, high: 110, low: 80, close: 100, volume: 5000 }],
    };
    const script = `//@version=6
indicator("Realtime Compiled Request Import")
import TestUser/RealtimeTools/1 as rt
remote = request.security("TEST", "D", close, lookahead=barmerge.lookahead_on)
plot(rt.midpoint(high, low) + remote, "Combined")`;

    const interpreter = new TealscriptEngine({
      libraries,
      requestDatafeed: new InMemoryRequestDatafeed([requestedContext]),
    });
    interpreter.execute(parse(script), chartBars);

    workerGlobal.onmessage?.({
      data: {
        type: 'init',
        scriptId: 'study-realtime-compiled',
        script,
        bars: chartBars,
        inputs: {},
        libraries,
        metadata: { generation: 1, requestId: 1, requestKind: 'full' },
      },
    } as MessageEvent<ToWorkerMessage>);

    const initialRequest = posted.find(isRequestDataMessage);
    expect(initialRequest).toMatchObject({
      type: 'requestData',
      kind: 'bars',
      query: { symbol: 'TEST', timeframe: 'D' },
    });
    workerGlobal.onmessage?.({
      data: {
        type: 'requestDataResult',
        scriptId: initialRequest!.scriptId,
        requestId: initialRequest!.requestId,
        generation: initialRequest!.generation,
        kind: initialRequest!.kind,
        ok: true,
        value: requestedContext,
      } satisfies RequestDataResultMessage,
    } as MessageEvent<ToWorkerMessage>);

    const initialResult = posted.find(isResultMessage);
    expect(initialResult?.profile?.executionMode).toBe('compiled');
    expect(initialResult?.plots[0]?.values).toEqual([110, 111, 112]);

    const firstUpdate = { ...chartBars[2]!, close: 13, high: 14 };
    const secondUpdate = { ...chartBars[2]!, close: 14, high: 15 };
    const updates = [
      { bar: firstUpdate, expected: [...(interpreter.updateBar(parse(script), firstUpdate)[0]?.values ?? [])] },
      { bar: secondUpdate, expected: [...(interpreter.updateBar(parse(script), secondUpdate)[0]?.values ?? [])] },
    ];

    for (const [index, update] of updates.entries()) {
      const start = posted.length;
      workerGlobal.onmessage?.({
        data: {
          type: 'updateBar',
          bar: update.bar,
          metadata: { generation: 1, requestId: index + 2, requestKind: 'incremental' },
        },
      } as MessageEvent<ToWorkerMessage>);

      const tickMessages = posted.slice(start);
      expect(tickMessages.some(isRequestDataMessage), `tick ${index + 1}`).toBe(false);
      const result = tickMessages.find(isResultMessage);
      expect(result?.profile?.executionMode, `tick ${index + 1}`).toBe('compiled');
      expect(result?.profile?.fallbackReason, `tick ${index + 1}`).toBeUndefined();
      expect(result?.plots[0]?.values, `tick ${index + 1}`).toEqual(update.expected);
    }

    expect(posted.filter(isRequestDataMessage)).toHaveLength(1);
  });
});
