import type { Bar } from '../../src/runtime/context';
import type { RequestDatafeed } from '../../src/runtime/requestDatafeed';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const directory = 'v90/captures/v90/';
const read = (path: string) => readFileSync(new URL(`../../oracle-probes/${directory}${path}`, import.meta.url), 'utf8');
const hash = (source: string) => createHash('sha256').update(source).digest('hex');
const csv = (path: string) => {
  const [columns, ...rows] = read(path).trimEnd().split(/\r?\n/).map(line => line.split(','));
  return { columns, rows };
};
interface Observation {
  sourceId: number;
  dataRowOrdinal: number;
  targetPresencePlotRaw: string;
  nativeGetterValuesRaw: string[] | null;
  providerStatus: string;
  closedEligible: boolean;
}
interface Source {
  id: number;
  path: string;
  sha256: string;
  rows: number;
}
const presence = JSON.parse(read('provider-presence-v1.json')) as {
  keyContext: { ticker: string; timeframe: string; requestFootprintParameters: number[] };
  sources: Source[];
  records: { timeRaw: string; observations: Observation[] }[];
  goodRepeatCommonClosedRows: number;
};
const facets = JSON.parse(read('footprint-provider-facets-v1.json')) as {
  status: string;
  closedGetterDriftKeys: { timeRaw: string; observations: {
    sourceCsv: string; dataRowOrdinal: number; valuesRaw: string[]; closedEligible: boolean;
  }[] }[];
  historic1934KeyClosure: string;
  unavailableObjectsObserved: number;
  availableZeroVolumeObjectsObserved: number;
};
const exports = presence.sources.map(source => {
  const prefix = source.path.slice(directory.length).replace('chart-native-v1.csv', '');
  const data = csv(prefix + 'chart-native-v1.csv');
  const mask = csv(prefix + 'chart-row-closure-mask-v1.csv');
  return { source, prefix, data, mask, closed: new Set(mask.rows.filter(row => row[3] === '1').map(row => row[2])) };
});
const records = new Map(presence.records.map(record => [record.timeRaw, record.observations]));
const bySource = (time: string, sourceId: number) => records.get(time)?.find(row => row.sourceId === sourceId);
const present = (time: string, sourceId: number) => {
  const observation = bySource(time, sourceId);
  return observation?.providerStatus === 'PRESENT'
    && observation.nativeGetterValuesRaw?.every(value => value !== '');
};
function replay(entry: typeof exports[number], supplyPresence = true) {
  const ast = parse(read(entry.prefix + 'executed-v1.pine'));
  expect(checkProgram(ast).diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  expect(compiled.success).toBe(true);
  if (!compiled.success) throw new Error('Captured footprint source must compile');
  const bars: Bar[] = entry.data.rows.map(row => ({
    time: Number(row[0]) * 1000, open: Number(row[1]), high: Number(row[2]),
    low: Number(row[3]), close: Number(row[4]), volume: Number(row[5]),
  }));
  const requestDatafeed: RequestDatafeed = {
    getBars: () => ({ ok: false, code: 'missing_context', message: 'No requested OHLC context is used by these sources' }),
    getFootprint: (query) => {
      expect([query.symbol, query.timeframe, query.ticksPerRow, query.valueAreaPercent, query.imbalancePercent])
        .toEqual(['BINANCE:BTCUSDT', '2', 100, 70, 300]);
      const time = String(query.time / 1000);
      const eligible = entry.source.id < 2 ? present(time, 3) && present(time, 4) : present(time, entry.source.id);
      if (!supplyPresence || !eligible) return undefined;
      if (entry.source.id < 2) return { time: query.time };
      const values = bySource(time, entry.source.id)!.nativeGetterValuesRaw!;
      // Each provider repeat keeps its own observed summaries, including the drift keys.
      return { time: query.time, totalVolume: Number(values[0]), buyVolume: Number(values[1]), sellVolume: Number(values[2]) };
    },
  };
  const result = executeCompiled(compiled, bars, undefined, {
    requestDatafeed,
    runtime: { syminfo: { tickerid: 'BINANCE:BTCUSDT' }, timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } },
  })!;
  expect(result.errors).toEqual([]);
  expect(result.plots).toHaveLength(entry.data.columns.length - 6);
  const values = result.plots[0].values;
  expect(values).toHaveLength(bars.length);
  const vectors = entry.data.columns.slice(6).map((title, index) =>
    (index === 0 ? result.plots[0] : result.plots.find(plot => plot.title === title)!).values);
  return entry.data.rows.flatMap((row, index) => entry.closed.has(row[0])
    ? [{ row, value: values[index], outputs: vectors.map(vector => vector[index]) }] : []);
}

describe('v90 native footprint presence, with numeric and historic context holds', () => {
  it('binds every consumed v3 artifact to the native integrity and source inventory', () => {
    const integrity = JSON.parse(read('artifact-integrity-v3.json'));
    const inventory = JSON.parse(read('attempt-inventory-v3.json'));
    const audit = JSON.parse(read('context-family-audit-v1.json'));
    expect([integrity.version, integrity.algorithm, integrity.selfExcluded]).toEqual(['v3', 'SHA256', true]);
    const paths = ['RESPONSE-v90-v3.md', 'provider-presence-v1.json', 'footprint-provider-facets-v1.json',
      'attempt-inventory-v3.json', 'context-family-audit-v1.json', ...exports.flatMap(entry =>
        ['executed-v1.pine', 'observation-v1.json', 'chart-native-v1.csv', 'chart-row-closure-mask-v1.csv']
          .map(file => entry.prefix + file))];
    expect(paths).toHaveLength(25);
    for (const path of paths) {
      const proof = integrity.files.find((file: { path: string }) => file.path === directory + path);
      expect(proof).toBeDefined();
      expect([Buffer.byteLength(read(path)), hash(read(path))]).toEqual([proof.bytes, proof.sha256]);
    }
    const captures = inventory.captures.filter((capture: { probe: string }) => capture.probe.startsWith('v90-footprint-'));
    expect(captures).toHaveLength(5);
    for (const entry of exports) {
      const captured = captures.find((capture: { observationPath: string }) => capture.observationPath === directory + entry.prefix + 'observation-v1.json');
      expect(captured.executedSourceSha256).toBe(hash(read(entry.prefix + 'executed-v1.pine')));
      expect(captured.observationSha256).toBe(hash(read(entry.prefix + 'observation-v1.json')));
    }
    expect([audit.footprintGetterCommonClosedRows, audit.footprintClosedGetterDifferenceTimestamps]).toEqual([22753, 3]);
  });

  it('records masked values as OBSERVED with zero parity credit, rather than unobserved', () => {
    const good = exports.filter(entry => entry.source.id !== 2);
    const observed = good.flatMap(entry => entry.data.rows.flatMap(row => row.slice(6))).filter(value => value !== '').length;
    const maskedObserved = good.flatMap(entry => entry.data.rows.filter(row => !entry.closed.has(row[0]))
      .flatMap(row => row.slice(6))).filter(value => value !== '').length;
    const closedHeldNumeric = good.filter(entry => entry.source.id >= 3)
      .reduce((count, entry) => count + entry.closed.size * 4, 0);
    expect([observed, maskedObserved, observed - maskedObserved, closedHeldNumeric]).toEqual([455098, 20, 455078, 182032]);
    expect(exports[2].data.rows.flatMap(row => row.slice(6)).filter(value => value === '')).toHaveLength(204786);
    const left = exports[3];
    const right = exports[4];
    const driftTimes = left.data.rows.filter(row => left.closed.has(row[0]) && right.closed.has(row[0]))
      .filter(row => {
        const other = right.data.rows[bySource(row[0], 4)!.dataRowOrdinal - 1];
        return row.slice(11, 15).some((value, index) => value !== other[index + 11]);
      }).map(row => row[0]);
    expect(driftTimes).toEqual(['1791966600', '1791966720', '1791966840']);
    expect(left.closed.size).toBe(22753);
  });

  it('authenticates each separate export, source and closure mask', () => {
    expect(presence.keyContext).toEqual({ ticker: 'BINANCE:BTCUSDT', timeframe: '2', requestFootprintParameters: [100, 70, 300] });
    expect(exports).toHaveLength(5);
    for (const entry of exports) {
      expect(hash(read(entry.prefix + 'chart-native-v1.csv'))).toBe(entry.source.sha256);
      const observation = JSON.parse(read(entry.prefix + 'observation-v1.json'));
      expect(hash(read(entry.prefix + 'executed-v1.pine'))).toBe(observation.sourceSha256);
      expect(observation.saveCompilerSuccess).toBe(true);
      expect(observation.addCompilerSuccess).toBe(true);
      expect(observation.actualContext).toMatchObject({ symbol: 'BINANCE:BTCUSDT', interval: '2' });
      expect(entry.data.rows).toHaveLength(entry.source.rows);
      expect(entry.mask.rows).toHaveLength(entry.data.rows.length);
      entry.mask.rows.forEach((mask, index) => {
        expect(mask.slice(0, 3)).toEqual([entry.source.sha256, String(index + 1), entry.data.rows[index][0]]);
        expect(mask[3] === '1').toBe(bySource(mask[2], entry.source.id)!.closedEligible);
      });
    }
  });

  it('retains the blank provider attempt as UNOBSERVED with no scored rows', () => {
    const entry = exports[2];
    expect(entry.prefix).toBe('v90-footprint-provider/attempt-v1/');
    expect(entry.closed.size).toBe(0);
    expect(entry.data.rows).toHaveLength(22754);
    expect(entry.data.rows.every(row => row.slice(6).every(value => value === ''))).toBe(true);
    expect(presence.records.flatMap(record => record.observations).filter(row => row.sourceId === 2)
      .every(row => row.providerStatus === 'UNOBSERVED')).toBe(true);
  });

  it('preserves every raw getter drift and keeps numeric, price-row and historical claims held', () => {
    expect(facets.status).toBe('PRESENCE-OBSERVED; NUMERIC-SUMMARY-STABILITY-HELD');
    expect(facets.closedGetterDriftKeys.map(key => key.timeRaw)).toEqual(['1791966600', '1791966720', '1791966840']);
    for (const key of facets.closedGetterDriftKeys) {
      expect(key.observations).toHaveLength(2);
      for (const observation of key.observations) {
        const entry = exports.find(item => item.source.path === observation.sourceCsv)!;
        const row = entry.data.rows[observation.dataRowOrdinal - 1];
        expect(row[0]).toBe(key.timeRaw);
        expect(entry.closed.has(row[0])).toBe(true);
        expect([row[6], ...row.slice(11, 15)]).toEqual(observation.valuesRaw);
        expect(present(row[0], entry.source.id)).toBe(true);
      }
      expect(key.observations[0].valuesRaw).not.toEqual(key.observations[1].valuesRaw);
    }
    expect(facets.historic1934KeyClosure).toContain('UNASSESSED');
    expect([facets.unavailableObjectsObserved, facets.availableZeroVolumeObjectsObserved]).toEqual([0, 0]);
    const summaries = presence.records.flatMap(record => record.observations)
      .filter(row => row.closedEligible && row.providerStatus === 'PRESENT');
    expect(summaries.some(row => row.nativeGetterValuesRaw![1] === '0' || row.nativeGetterValuesRaw![2] === '0')).toBe(true);
    expect(summaries.every(row => Number(row.nativeGetterValuesRaw![0]) > 0)).toBe(true);
    expect(read('RESPONSE-v90-v3.md')).toContain('No price-row distribution or blanket historic1,934-key closure');
  });

  for (const sourceId of [0, 1, 3, 4]) it(`scores closed presence only for ${presence.sources[sourceId].path}`, () => {
    const entry = exports[sourceId];
    const scored = replay(entry);
    expect(scored).toHaveLength(sourceId === 4 ? 22755 : 22753);
    for (const { row, value, outputs } of scored) {
      if (sourceId < 2) for (const companionId of [3, 4]) {
        const companion = exports[companionId];
        const observation = bySource(row[0], companionId)!;
        expect(companion.data.rows[observation.dataRowOrdinal - 1].slice(0, 6)).toEqual(row.slice(0, 6));
      }
      expect(value).toBe(Number(row[6]));
      // Getter transport is checked per export; cross-repeat numeric stability stays HELD.
      expect(outputs).toEqual(row.slice(6).map(Number));
    }
    expect(presence.goodRepeatCommonClosedRows).toBe(22753);
  });

  it('keeps the historic native values OBSERVED while their capture-time provider input stays held', () => {
    const path = 'v77/captures/v77/footprint-request-call-v6-renamed-control-v1/attempt-v1/native-v1.csv';
    const raw = readFileSync(new URL('../../oracle-probes/' + path, import.meta.url), 'utf8');
    expect(hash(raw)).toBe('27083f282c22f9a81c784a7647269b9d2cdb0673c91749a4131a57f8dd3da563');
    const [header, ...rows] = raw.trimEnd().split(/\r?\n/).map(line => line.split(','));
    const closed = rows.slice(0, -1);
    expect(closed).toHaveLength(1934);
    expect(closed.every(row => row[header.indexOf('Plot')] === '1')).toBe(true);
    expect(facets.historic1934KeyClosure).toContain('does not map or overwrite the historic receipt');
  });

  it('keeps unavailable host input distinct from candle volume (regression control only)', () => {
    const entry = exports[0];
    const scored = replay(entry, false);
    expect(scored).toHaveLength(22753);
    expect(scored.every(result => result.value === 0)).toBe(true);
  });
});
