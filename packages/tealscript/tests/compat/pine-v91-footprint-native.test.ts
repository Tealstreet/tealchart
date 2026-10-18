import type { Bar } from '../../src/runtime/context';
import type { RequestDatafeed, RequestFootprintData, RequestVolumeRowData } from '../../src/runtime/requestDatafeed';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const directory = 'v91/captures/v91/';
// Checkout pin advances with oracle-fixtures.json; all v91 artifact hashes remain unchanged.
const revision = '1faebe5ac656714b4177c9acbdb5e1e411e8e9b2';
const read = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
const hash = (raw: string) => createHash('sha256').update(raw).digest('hex');
const json = <T,>(path: string): T => JSON.parse(read(directory + path)) as T;
const csv = (path: string) => {
  const [columns, ...rows] = read(path).trimEnd().split(/\r?\n/).map(line => line.split(','));
  return { columns, rows };
};
const keys = ['1791966600', '1791966720', '1791966840'];
const summaryTitles = ['FP_TOTAL_VOLUME', 'FP_BUY_VOLUME', 'FP_SELL_VOLUME', 'FP_DELTA'];
interface Provenance {
  csv: string;
  sha256: string;
  dataRowOrdinal: number;
  columnOrdinals: number[];
  observedAtUtc: string;
}
interface DecimalRelations {
  status: string;
  totalMinusBuyPlusSellDecimal: string;
  deltaMinusBuyMinusSellDecimal: string;
  rawGetterStrings: string[];
  noRepairOrToleranceApplied: boolean;
}
interface Facet {
  probe: string;
  attempt: string;
  privateScriptId: string;
  sourceSha256: string;
  key: { symbol: string; interval: string; footprintParameters: number[]; timeSecondsRaw: string };
  rawFields: Record<string, string>;
  originalHeaderOrdinals: Record<string, number>;
  provenance: Provenance;
  closedEligible: boolean;
  valueStatus: string;
  providerState: string;
  rawDecimalRelations?: DecimalRelations;
}
interface Role {
  role: 'LOWEST' | 'POC' | 'HIGHEST';
  rawFields: Record<string, string>;
  provenance: Provenance;
  rawDecimalRelations: DecimalRelations;
}
interface RowRecord {
  probe: string;
  attempt: string;
  privateScriptId: string;
  sourceSha256: string;
  timeSecondsRaw: string;
  nativeRowCountRaw: string;
  roles: Role[];
  rolesNotDeduplicated: boolean;
  rowCountProvenance: Provenance;
  capability: string;
}
interface Export {
  probe: string;
  attempt: string;
  path: string;
  sha256: string;
  bytes: number;
  headers: string[];
  rows: number;
  observedAtUtc: string;
  stateCounts: Record<string, number>;
  unavailableObserved: number;
  availableZeroTotalObserved: number;
  candleVolumeNotUsedForPresence: boolean;
}
const facets = json<{
  records: Facet[];
  summaryVariantsByKey: { timeSecondsRaw: string; rawVariantCount: number; variants: {
    totalBuySellDeltaRaw: string[];
    observations: { probe: string; attempt: string; provenance: Provenance }[];
  }[] }[];
  comparison: string;
  v90Drift: string;
  historic1934KeyHold: string;
}>('footprint-repeat-facets-v1.json');
const priceRows = json<{
  records: RowRecord[];
  nativeRowExportCapability: string;
  fullNativeRowExport: null;
  fullNativeRowExportStatus: string;
  capabilityEvidence: string[];
  duplicateRolesRetained: boolean;
}>('native-price-rows-v1.json');
const presence = json<{
  exports: Export[];
  statesNotObserved: string[];
  semanticFacets: string;
  originalOnlySource: string;
}>('presence-state-observations-v1.json');
const exports = presence.exports.map(source => ({
  source,
  prefix: source.path.slice(0, -'chart-native-v1.csv'.length),
  data: csv(source.path),
  mask: csv(source.path.replace('chart-native-v1.csv', 'chart-row-closure-mask-v1.csv')),
}));
const perExportFiles = ['executed-v1.pine', 'observation-v1.json', 'chart-native-v1.csv',
  'chart-row-closure-mask-v1.csv', 'chart-column-bindings-v1.json', 'save-request-v1.txt',
  'save-response-v1.json', 'add-response-v1.json'];
const paths = ['RESPONSE-v91-v1.md', 'artifact-integrity-v1.json', 'validation-result-v1.json',
  'attempt-inventory-v1.json', 'footprint-repeat-facets-v1.json', 'native-price-rows-v1.json',
  'presence-state-observations-v1.json'].map(path => directory + path)
  .concat(exports.flatMap(entry => perExportFiles.map(file => entry.prefix + file)), priceRows.capabilityEvidence);

function verifyProvenance(provenance: Provenance, time: string, fields: Record<string, string>) {
  const entry = exports.find(item => item.source.path === provenance.csv)!;
  expect(entry).toBeDefined();
  expect([provenance.sha256, provenance.observedAtUtc]).toEqual([entry.source.sha256, entry.source.observedAtUtc]);
  const row = entry.data.rows[provenance.dataRowOrdinal - 1];
  expect(row[0]).toBe(time);
  expect(provenance.columnOrdinals.map(ordinal => row[ordinal - 1])).toEqual(Object.values(fields));
  expect(provenance.columnOrdinals.map(ordinal => entry.data.columns[ordinal - 1])).toEqual(Object.keys(fields));
  return entry;
}

function roleInput(role: Role): RequestVolumeRowData {
  const field = (name: string) => Number(role.rawFields[`ROW_${role.role}_${name}`]);
  return { downPrice: field('DOWN_PRICE'), upPrice: field('UP_PRICE'), totalVolume: field('TOTAL'),
    buyVolume: field('BUY'), sellVolume: field('SELL'),
    hasBuyImbalance: field('BUY_IMBALANCE') === 1, hasSellImbalance: field('SELL_IMBALANCE') === 1 };
}

function replay(entry: typeof exports[number]) {
  const ast = parse(read(entry.prefix + 'executed-v1.pine'));
  expect(checkProgram(ast).diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  expect(compiled.success).toBe(true);
  if (!compiled.success) throw new Error('Captured footprint source must compile');
  // These sources read pointwise getters. Only the three drift keys are scored;
  // chart index/frontier/observation-clock values are observed, without replay credit.
  const native = entry.data.rows.filter(row => keys.includes(row[0]));
  const bars: Bar[] = native.map(row => ({ time: Number(row[0]) * 1000,
    open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: Number(row[5]) }));
  const requestDatafeed: RequestDatafeed = {
    getBars: () => ({ ok: false, code: 'missing_context', message: 'These sources use no requested OHLC context' }),
    getFootprint: (query): RequestFootprintData => {
      expect([query.symbol, query.timeframe, query.ticksPerRow, query.valueAreaPercent, query.imbalancePercent])
        .toEqual(['BINANCE:BTCUSDT', '2', 100, 70, 300]);
      const facet = facets.records.find(record => record.provenance.csv === entry.source.path
        && record.key.timeSecondsRaw === String(query.time / 1000))!;
      expect(facet).toBeDefined();
      // The original observes only presence; never borrow another run's total.
      if (entry.source.probe === 'v91-footprint-original') return { time: query.time };
      const sampled = priceRows.records.find(record => record.probe === entry.source.probe
        && record.attempt === entry.source.attempt && record.timeSecondsRaw === facet.key.timeSecondsRaw);
      return { time: query.time, totalVolume: Number(facet.rawFields.FP_TOTAL_VOLUME),
        buyVolume: Number(facet.rawFields.FP_BUY_VOLUME), sellVolume: Number(facet.rawFields.FP_SELL_VOLUME),
        // Exactly three observed roles; no fabricated interior rows. This projection
        // exercises accessors/role selection, never full-distribution reconstruction.
        rows: sampled?.roles.map(roleInput),
        pointOfControl: sampled ? roleInput(sampled.roles.find(role => role.role === 'POC')!).downPrice : undefined };
    },
  };
  const result = executeCompiled(compiled, bars, undefined, { requestDatafeed,
    runtime: { syminfo: { tickerid: 'BINANCE:BTCUSDT' },
      timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } } })!;
  expect(result.errors).toEqual([]);
  const output = (title: string, index: number) => {
    const ordinal = entry.data.columns.indexOf(title) - 6;
    expect(ordinal).toBeGreaterThanOrEqual(0);
    return result.plots[ordinal].values[index];
  };
  expect(result.plots).toHaveLength(entry.data.columns.length - 6);
  expect(native.map(row => row[0])).toEqual(keys);
  let scored = 0;
  native.forEach((row, index) => {
    const mask = entry.mask.rows.find(item => item[2] === row[0])!;
    expect(mask[3]).toBe('1');
    const titles = entry.source.probe === 'v91-footprint-original' ? ['Plot']
      : [...summaryTitles, ...(entry.source.probe === 'v91-footprint-provider' ? ['Plot']
        : [...entry.data.columns.filter(title => title.startsWith('ROW_')), 'FP_AVAILABLE', 'FP_AVAILABLE_ZERO_TOTAL'])];
    for (const title of titles) {
      const raw = row[entry.data.columns.indexOf(title)];
      expect(raw).not.toBe('');
      expect(output(title, index), `${entry.source.path}:${row[0]}:${title}`).toBe(Number(raw));
      scored++;
    }
    if (entry.source.probe === 'v91-footprint-price-rows') {
      // Native counts 54/45/31 are OBSERVED, but this provider has only the three
      // captured roles. Count/distribution parity is explicitly not scored.
      expect(output('FP_ROW_COUNT', index)).toBe(3);
      expect(row[entry.data.columns.indexOf('FP_ROW_COUNT')]).toBe(['54', '45', '31'][index]);
    }
  });
  return scored;
}

describe('v91 native footprint repeats and bounded price-row roles', () => {
  it('SHA-binds every consumed artifact, including the integrity inventory and validation result', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8'));
    const integrity = json<{ version: string; algorithm: string; selfExcluded: boolean;
      files: { path: string; bytes: number; sha256: string }[] }>('artifact-integrity-v1.json');
    expect(lock.revision).toBe(revision);
    expect([integrity.version, integrity.algorithm, integrity.selfExcluded]).toEqual(['v1', 'SHA256', true]);
    expect(paths).toHaveLength(65);
    expect(new Set(paths).size).toBe(65);
    for (const path of paths) {
      const raw = read(path);
      const pinned = lock.files.find((file: { path: string }) => file.path === path);
      expect(pinned).toEqual({ path, bytes: Buffer.byteLength(raw), sha256: hash(raw) });
      if (!path.endsWith('/artifact-integrity-v1.json')) {
        expect(integrity.files.find(file => file.path === path)).toEqual(pinned);
      }
    }
    const validation = json<{ status: string; checks: Record<string, number> }>('validation-result-v1.json');
    expect(validation.status).toBe('PASS');
    expect(validation.checks.boundedNativePriceRoles).toBe(27);
    expect(validation.checks.perKeyCrossRepeatVariantReferences).toBe(18);
  });

  it('authenticates seven separate source/compiler/plot/export/closure bindings', () => {
    const inventory = json<{ attempts: { observationPath: string; observationSha256: string;
      sourceMatchesRequest: boolean; privateScriptId: string }[] }>('attempt-inventory-v1.json');
    expect(exports).toHaveLength(7);
    for (const entry of exports) {
      const observation = JSON.parse(read(entry.prefix + 'observation-v1.json'));
      const source = read(entry.prefix + 'executed-v1.pine');
      const sourceHash = hash(source);
      expect([observation.requestedSourceSha256, observation.executedSourceSha256]).toEqual([sourceHash, sourceHash]);
      expect([observation.sourceMatchesRequest, observation.saveCompilerSuccess, observation.addCompilerSuccess]).toEqual([true, true, true]);
      expect(observation.nativeContext).toMatchObject({ symbol: 'BINANCE:BTCUSDT', interval: '2', chartStyle: 'Candles', chartTimezone: 'Etc/UTC' });
      expect(inventory.attempts.find(attempt => attempt.observationPath === entry.prefix + 'observation-v1.json'))
        .toMatchObject({ observationSha256: hash(read(entry.prefix + 'observation-v1.json')),
          sourceMatchesRequest: true, privateScriptId: observation.privateScriptId });
      const multipart = read(entry.prefix + 'save-request-v1.txt').replace(/\r\n/g, '\n');
      expect(multipart.split('name="source"\n\n')[1].split('\n------WebKitFormBoundary')[0]).toBe(source);
      const bindings = JSON.parse(read(entry.prefix + 'chart-column-bindings-v1.json'));
      expect([hash(read(entry.source.path)), Buffer.byteLength(read(entry.source.path))]).toEqual([entry.source.sha256, entry.source.bytes]);
      expect(entry.data.columns).toEqual(entry.source.headers);
      expect(entry.data.rows).toHaveLength(entry.source.rows);
      expect(entry.mask.rows).toHaveLength(entry.source.rows);
      expect(bindings.rowClosureMask).toBe(entry.prefix + 'chart-row-closure-mask-v1.csv');
      expect(bindings.allPresentMaskedCells).toBe('OBSERVED; closed-mask exclusion is not missing output');
      for (const file of ['save-response-v1.json', 'add-response-v1.json']) {
        const compiler = JSON.parse(read(entry.prefix + file));
        expect(compiler.success).toBe(true);
        for (const [index, binding] of bindings.plotBindings.entries()) {
          expect(binding).toMatchObject({ columnOrdinal: index + 7, nativePlotTitle: entry.data.columns[index + 6],
            executedSourceSha256: sourceHash, privateScriptId: observation.privateScriptId });
          expect(compiler.result.metaInfo.styles[binding.nativePlotId].title).toBe(binding.nativePlotTitle);
        }
      }
      entry.mask.rows.forEach((mask, index) => {
        expect(mask.slice(0, 3)).toEqual([entry.source.sha256, String(index + 1), entry.data.rows[index][0]]);
        expect(Number(mask[5])).toBe(entry.data.rows[index].slice(6).filter(value => value !== '').length);
        expect(Number(mask[6])).toBe(entry.data.rows[index].slice(6).filter(value => value === '').length);
      });
    }
  });

  it('joins all 21 per-key facets and all six getter repeats without rounding or convenient-repeat selection', () => {
    expect(facets.records).toHaveLength(21);
    for (const facet of facets.records) {
      const entry = verifyProvenance(facet.provenance, facet.key.timeSecondsRaw, facet.rawFields);
      expect(facet.key).toEqual({ symbol: 'BINANCE:BTCUSDT', interval: '2', footprintParameters: [100, 70, 300], timeSecondsRaw: facet.key.timeSecondsRaw });
      expect([facet.closedEligible, facet.valueStatus]).toEqual([true, 'OBSERVED for every present raw cell']);
      expect(entry.mask.rows[facet.provenance.dataRowOrdinal - 1][3]).toBe('1');
      expect(hash(read(entry.prefix + 'executed-v1.pine'))).toBe(facet.sourceSha256);
      expect(JSON.parse(read(entry.prefix + 'observation-v1.json')).privateScriptId).toBe(facet.privateScriptId);
      for (const [title, ordinal] of Object.entries(facet.originalHeaderOrdinals)) expect(entry.data.columns[ordinal - 1]).toBe(title);
      expect(facet.providerState).toBe(facet.probe === 'v91-footprint-original' ? 'PRESENT_TOTAL_UNOBSERVED' : 'PRESENT_NONZERO');
    }
    expect(facets.summaryVariantsByKey.map(key => key.timeSecondsRaw)).toEqual(keys);
    for (const key of facets.summaryVariantsByKey) {
      const records = facets.records.filter(record => record.key.timeSecondsRaw === key.timeSecondsRaw && record.rawDecimalRelations);
      expect(records).toHaveLength(6);
      expect(key.rawVariantCount).toBe(1);
      expect(key.variants).toHaveLength(1);
      expect(key.variants[0].observations).toHaveLength(6);
      expect(new Set(key.variants[0].observations.map(record => record.probe + '/' + record.attempt)).size).toBe(6);
      for (const record of records) {
        expect(summaryTitles.map(title => record.rawFields[title])).toEqual(key.variants[0].totalBuySellDeltaRaw);
        expect(record.rawDecimalRelations!.rawGetterStrings).toEqual(key.variants[0].totalBuySellDeltaRaw);
        expect(record.rawDecimalRelations!.status).toContain('NOT-A-NATIVE-GETTER');
        expect(record.rawDecimalRelations!.noRepairOrToleranceApplied).toBe(true);
        expect(key.variants[0].observations.find(item => item.probe === record.probe && item.attempt === record.attempt)!.provenance)
          .toEqual(record.provenance);
      }
    }
    expect(facets.summaryVariantsByKey[0].variants[0].totalBuySellDeltaRaw)
      .toEqual(['27.198850000000004', '5.0659', '22.13295', '-17.067050000000002']);
    expect(facets.records.find(record => record.rawDecimalRelations)!.rawDecimalRelations!.totalMinusBuyPlusSellDecimal).toBe('4E-15');
  });

  it('retains all 27 native roles, raw zeros, float residue, flags and native row counts as bounded observations', () => {
    expect(priceRows.records).toHaveLength(9);
    expect(priceRows.records.flatMap(record => record.roles)).toHaveLength(27);
    for (const record of priceRows.records) {
      expect(record.rolesNotDeduplicated).toBe(true);
      expect(record.roles.map(role => role.role)).toEqual(['LOWEST', 'POC', 'HIGHEST']);
      expect(record.nativeRowCountRaw).toBe(['54', '45', '31'][keys.indexOf(record.timeSecondsRaw)]);
      const entry = verifyProvenance(record.rowCountProvenance, record.timeSecondsRaw, { FP_ROW_COUNT: record.nativeRowCountRaw });
      expect([record.sourceSha256, record.privateScriptId]).toEqual([hash(read(entry.prefix + 'executed-v1.pine')),
        JSON.parse(read(entry.prefix + 'observation-v1.json')).privateScriptId]);
      for (const role of record.roles) {
        expect(Object.keys(role.rawFields)).toEqual(['DOWN_PRICE', 'UP_PRICE', 'TOTAL', 'BUY', 'SELL', 'DELTA', 'BUY_IMBALANCE', 'SELL_IMBALANCE']
          .map(field => `ROW_${role.role}_${field}`));
        expect(verifyProvenance(role.provenance, record.timeSecondsRaw, role.rawFields)).toBe(entry);
        expect(role.rawDecimalRelations.rawGetterStrings).toEqual(['TOTAL', 'BUY', 'SELL', 'DELTA'].map(field => role.rawFields[`ROW_${role.role}_${field}`]));
        expect(role.rawDecimalRelations.status).toContain('NOT-A-NATIVE-GETTER');
        expect(role.rawDecimalRelations.noRepairOrToleranceApplied).toBe(true);
      }
    }
    const roles = priceRows.records[0].roles;
    expect(roles[0].rawFields.ROW_LOWEST_SELL).toBe('0');
    expect(roles[2].rawFields.ROW_HIGHEST_BUY).toBe('0');
    expect(roles[1].rawFields.ROW_POC_SELL).toBe('0.8270900000000001');
    expect(roles[1].rawFields.ROW_POC_DELTA).toBe('-0.6687800000000002');
    expect(roles[1].rawDecimalRelations.totalMinusBuyPlusSellDecimal).toBe('-1E-16');
    expect(priceRows.nativeRowExportCapability).toBe('BOUNDED-ROW-PLOTS-CAPTURED');
    expect(priceRows.duplicateRolesRetained).toBe(true);
    expect(priceRows.fullNativeRowExport).toBeNull();
    expect(priceRows.fullNativeRowExportStatus).toContain('UNOBSERVED');
  });

  it('keeps masked nonblank values OBSERVED and unavailable/zero-total semantic states HELD', () => {
    let observed = 0;
    let blank = 0;
    let maskedObserved = 0;
    let physicalRows = 0;
    let closedRows = 0;
    for (const entry of exports) {
      const isOriginal = entry.source.probe === 'v91-footprint-original';
      const counts: Record<string, number> = {};
      for (const row of entry.data.rows) {
        expect(row[entry.data.columns.indexOf(isOriginal || entry.source.probe === 'v91-footprint-provider' ? 'Plot' : 'FP_AVAILABLE')]).toBe('1');
        if (!isOriginal) expect(Number(row[entry.data.columns.indexOf('FP_TOTAL_VOLUME')])).toBeGreaterThan(0);
        const state = isOriginal ? 'PRESENT_TOTAL_UNOBSERVED' : 'PRESENT_NONZERO';
        counts[state] = (counts[state] ?? 0) + 1;
      }
      expect(counts).toEqual(entry.source.stateCounts);
      expect([entry.source.unavailableObserved, entry.source.availableZeroTotalObserved, entry.source.candleVolumeNotUsedForPresence]).toEqual([0, 0, true]);
      const masked = entry.mask.rows.filter(mask => mask[3] === '0');
      expect(masked).toHaveLength(1);
      expect(masked[0][4]).toContain('OBSERVED');
      expect(Number(masked[0][5])).toBeGreaterThan(0);
      physicalRows += entry.data.rows.length;
      closedRows += entry.mask.rows.filter(mask => mask[3] === '1').length;
      observed += entry.data.rows.reduce((sum, row) => sum + row.slice(6).filter(value => value !== '').length, 0);
      blank += entry.data.rows.reduce((sum, row) => sum + row.slice(6).filter(value => value === '').length, 0);
      maskedObserved += Number(masked[0][5]);
    }
    expect([physicalRows, closedRows, observed, blank, maskedObserved]).toEqual([11130, 11123, 125859, 119075, 79]);
    expect(presence.statesNotObserved).toEqual(['UNAVAILABLE', 'AVAILABLE_ZERO_TOTAL']);
    expect(presence.semanticFacets).toContain('remain HELD');
    expect(presence.originalOnlySource).toContain('total-volume channel UNOBSERVED');
    expect(facets.v90Drift).toContain('v91 agreement does not erase them');
    expect(facets.historic1934KeyHold).toBe('HELD; not retroactively bound');
  });

  for (const entry of exports) it(`replays only captured presence/getters/roles at the three closed keys: ${entry.source.probe}/${entry.source.attempt}`, () => {
    expect(replay(entry)).toBe(entry.source.probe === 'v91-footprint-original' ? 3
      : entry.source.probe === 'v91-footprint-provider' ? 15 : 90);
  });
});
