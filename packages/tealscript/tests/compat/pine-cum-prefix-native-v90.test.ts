import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

interface Source {
  id: number;
  path: string;
  sha256: string;
  rows: number;
  headers: string[];
  observedAtUtc: string;
}
interface PrefixTable {
  sources: Source[];
  records: {
    timeRaw: string;
    variants: {
      ohlcvAndPlotRaw: string[];
      observations: { sourceId: number; dataRowOrdinal: number; closedEligible: boolean }[];
    }[];
  }[];
  frontiers: {
    nativeFirstFields: unknown;
    fullPrefixStatus: string;
    firstIndexBeforeAdd: null;
    lastIndexBeforeAdd: null;
  }[];
  commonClosedRows: number;
  croppedObserverExport: { csv: string; missingPhysicalPrefixBars: number; status: string };
}
interface Binding {
  path: string;
  sha256: string;
  headers: string[];
  rows: number;
  executedSourceSha256: string;
  closureMask: string;
  closureReasons: Record<string, number>;
  confirmationReferences: Record<string, { csv: string; sha256: string; columnOrdinal: number }>;
}
const root = 'v90/captures/v90/';
const read = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
const json = <T>(path: string): T => JSON.parse(read(path)) as T;
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
function csv(path: string) {
  const [header, ...lines] = read(path).trimEnd().split(/\r?\n/);
  const headers = header.split(',');
  return { headers, rows: lines.map((line) => line.split(',')) };
}
const prefix = json<PrefixTable>(root + 'prefix-table-v1.json');
const prefixesByTime = new Map(prefix.records.map((record) => [record.timeRaw, record]));
const inputs = json<{
  sources: Source[];
  records: {
    timeRaw: string;
    ohlcvVariants: { valuesRaw: string[]; observations: { sourceId: number; dataRowOrdinal: number }[] }[];
  }[];
}>(root + 'chart2m-inputs-v1.json');
const inputsByTime = new Map(
  inputs.records
    .map((record) => [
      record.timeRaw,
      record.ohlcvVariants.filter((variant) =>
        variant.observations.some(
          (observation) =>
            Number(record.timeRaw) * 1000 + 120000 <= Date.parse(inputs.sources[observation.sourceId].observedAtUtc),
        ),
      ),
    ])
    .filter(([, variants]) => variants.length > 0) as [string, { valuesRaw: string[] }[]][],
);
const tables = new Map(prefix.sources.map((source) => [source.path, csv(source.path)]));
const closedCounts = [22751, 22751, 22749, 22752, 22752, 22752, 22752, 22752];
const same = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

describe.each(prefix.sources)('v90 source $id ($path)', (source) => {
  const directory = source.path.slice(0, source.path.lastIndexOf('/'));
  const stage = source.path.slice(source.path.lastIndexOf('/') + 1).split('-')[0];
  const binding = json<Binding>(`${directory}/${stage}-column-bindings-v1.json`);
  const table = tables.get(source.path)!;
  const masks = csv(binding.closureMask);
  const mask = (row: string[], name: string) => row[masks.headers.indexOf(name)];
  const closed = table.rows.filter((_, index) => mask(masks.rows[index], 'closed_eligible') === '1');
  const observer = table.headers.includes('CHART_BAR_INDEX');
  const sourceText = read(`${directory}/executed-v1.pine`);

  it('authenticates the source, closure mask and complete independent physical prefix', () => {
    const observation = json<{
      sourceSha256: string;
      status: string;
      saveCompilerSuccess: boolean;
      addCompilerSuccess: boolean;
    }>(`${directory}/observation-v1.json`);
    expect(sourceText).toBe(read(`v90/sources/${directory.split('/').at(-2)}.pine`));
    expect(hash(sourceText)).toBe(observation.sourceSha256);
    expect(binding.executedSourceSha256).toBe(observation.sourceSha256);
    expect(observation.status).toBe('RUNS');
    expect(observation.saveCompilerSuccess && observation.addCompilerSuccess).toBe(true);
    expect(json<{ success: boolean }>(`${directory}/save-response-v1.json`).success).toBe(true);
    expect(json<{ success: boolean }>(`${directory}/add-response-v1.json`).success).toBe(true);
    expect(hash(read(source.path))).toBe(source.sha256);
    expect(binding.sha256).toBe(source.sha256);
    expect(binding.path).toBe(source.path);
    expect(binding.headers).toEqual(source.headers);
    expect(table.headers).toEqual(source.headers);
    expect(table.rows).toHaveLength(source.rows);
    expect(binding.rows).toBe(source.rows);
    expect(masks.rows).toHaveLength(source.rows);
    expect(closed).toHaveLength(closedCounts[source.id]);
    expect(source.rows - closed.length).toBe(1);
    expect(closed).toEqual(table.rows.slice(0, closed.length));
    expect(table.rows[0][0]).toBe('1789344000');
    expect(table.rows.every((row, index) => Number(row[0]) === 1789344000 + index * 120)).toBe(true);
    expect(table.rows.every((row) => row.length === table.headers.length)).toBe(true);
    expect(
      masks.rows.every(
        (row, index) =>
          mask(row, 'csv_sha256') === source.sha256 &&
          Number(mask(row, 'data_row_ordinal_1based_excluding_header')) === index + 1 &&
          mask(row, 'time_raw') === table.rows[index][0],
      ),
    ).toBe(true);
    const reasons: Record<string, number> = {};
    for (const row of masks.rows) reasons[mask(row, 'reason')] = (reasons[mask(row, 'reason')] ?? 0) + 1;
    expect(reasons).toEqual(binding.closureReasons);
    for (const reference of Object.values(binding.confirmationReferences)) {
      expect(hash(read(reference.csv))).toBe(reference.sha256);
      expect(tables.get(reference.csv)!.headers[reference.columnOrdinal - 1]).toBe('CHART_ISCONFIRMED');
    }
    expect(
      closed.every((row, index) => {
        const closure = masks.rows[index];
        if (Number(row[0]) * 1000 + 120000 > Date.parse(source.observedAtUtc)) return false;
        if (observer) return row[11] === '1' && mask(closure, 'reason') === 'NATIVE_CONFIRMED';
        const referenceId = mask(closure, 'confirmation_reference_id');
        const reference = binding.confirmationReferences[referenceId];
        if (!reference) return false;
        const companion = tables.get(reference.csv)!.rows[index];
        return companion[reference.columnOrdinal - 1] === '1' && same(companion.slice(0, 6), row.slice(0, 6));
      }),
    ).toBe(true);
    expect(
      closed.every((row, index) =>
        prefixesByTime
          .get(row[0])!
          .variants.some(
            (variant) =>
              same(variant.ohlcvAndPlotRaw, row.slice(1, 7)) &&
              variant.observations.some(
                (observation) =>
                  observation.sourceId === source.id &&
                  observation.dataRowOrdinal === index + 1 &&
                  observation.closedEligible,
              ),
          ),
      ),
    ).toBe(true);
    // This table corroborates OHLCV only; its daily-request mask does not replace this export's closure mask.
    expect(
      closed
        .filter((row) => inputsByTime.has(row[0]))
        .every((row) => inputsByTime.get(row[0])!.some((variant) => same(variant.valuesRaw, row.slice(1, 6)))),
    ).toBe(true);
    expect(closed.filter((row) => inputsByTime.has(row[0])).length).toBeGreaterThanOrEqual(22749);
  });

  it('matches every eligible absolute native plot from its own complete prefix without a seed or offset', () => {
    expect(checkProgram(parse(sourceText)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual(
      [],
    );
    const compiled = tryCompile(parse(sourceText));
    expect(compiled.success).toBe(true);
    const bars = closed.map((row) => ({
      time: Number(row[0]) * 1000,
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: row[5] === '' ? NaN : Number(row[5]),
    }));
    const result = executeCompiled(compiled, bars, undefined, {
      runtime: {
        syminfo: { tickerid: 'BINANCE:BTCUSDT', timezone: 'Etc/UTC' },
        timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
      },
    })!;
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(result.plots).toHaveLength(table.headers.length - 6);
    for (const [index, plot] of result.plots.entries()) {
      if (index > 0) expect(plot.title).toBe(table.headers[index + 6]);
      expect(plot.values).toHaveLength(closed.length);
      expect(plot.values, table.headers[index + 6]).toEqual(
        closed.map((row) => (row[index + 6] === '' ? null : Number(row[index + 6]))),
      );
    }
    expect(result.plots[0].values[0]).toBe(27);
    if (observer) {
      expect(result.plots.find((plot) => plot.title === 'CHART_BAR_INDEX')!.values[0]).toBe(0);
      expect(result.plots.find((plot) => plot.title === 'CHART_ISFIRST')!.values[0]).toBe(1);
      expect(result.plots.find((plot) => plot.title === 'FIRST_CHART_TIME')!.values[0]).toBe(1789344000000);
    }
  });
});

it('retains the common closed native table and the unobserved original-index and cropped-export holds', () => {
  expect(prefix.sources).toHaveLength(8);
  expect(prefix.commonClosedRows).toBe(22749);
  const common = prefix.records.filter((record) =>
    prefix.sources.every((source) =>
      record.variants.some((variant) =>
        variant.observations.some((observation) => observation.sourceId === source.id && observation.closedEligible),
      ),
    ),
  );
  expect(common).toHaveLength(22749);
  expect(
    common.every(
      (record) =>
        record.variants.filter((variant) => variant.observations.some((observation) => observation.closedEligible))
          .length === 1,
    ),
  ).toBe(true);
  for (const source of prefix.sources) {
    const frontier = prefix.frontiers[source.id];
    expect(frontier.firstIndexBeforeAdd).toBeNull();
    expect(frontier.lastIndexBeforeAdd).toBeNull();
    if (source.path.includes('cum-original')) {
      expect(frontier.nativeFirstFields).toBeNull();
      expect(frontier.fullPrefixStatus).toBe(
        'INDEPENDENT_COMPANION_INPUT_PREFIX_MATCHED; OWN_NATIVE_FRONTIER_UNOBSERVED',
      );
    } else expect(frontier.fullPrefixStatus).toBe('NATIVE_ZERO_FRONTIER_OBSERVED');
  }
  const crop = prefix.croppedObserverExport;
  expect(crop.missingPhysicalPrefixBars).toBe(22236);
  expect(crop.status).toBe('CONTEXT-UNMET for this cropped export alone; retained alongside separate full export');
  const cropped = csv(crop.csv);
  expect(cropped.rows).toHaveLength(513);
  expect(cropped.rows[0][cropped.headers.indexOf('CHART_BAR_INDEX')]).toBe('22236');
  const croppedMask = csv(crop.csv.replace('native-v1.csv', 'row-closure-mask-v1.csv'));
  expect(croppedMask.rows).toHaveLength(513);
  expect(croppedMask.rows.every((row) => row[croppedMask.headers.indexOf('closed_eligible')] === '0')).toBe(true);
});

it('binds the v3 provenance and integrity inventories and authenticates the independent OHLCV table', () => {
  const integrity = json<{ files: { path: string; bytes: number; sha256: string }[] }>(
    root + 'artifact-integrity-v3.json',
  );
  const entries = new Map(integrity.files.map((entry) => [entry.path, entry]));
  const lock = JSON.parse(
    readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8'),
  ) as typeof integrity;
  for (const entry of lock.files.filter(
    (entry) => entry.path.startsWith('v90/') && !entry.path.endsWith('artifact-integrity-v3.json'),
  )) {
    expect(entry, entry.path).toEqual(entries.get(entry.path));
    const text = read(entry.path);
    expect(Buffer.byteLength(text)).toBe(entry.bytes);
    expect(hash(text)).toBe(entry.sha256);
  }
  const inventory = json<{ captures: { probe: string; status: string }[] }>(root + 'attempt-inventory-v3.json');
  const captures = inventory.captures.filter((capture) => capture.probe.startsWith('v90-cum-'));
  expect(captures).toHaveLength(8);
  expect(captures.every((capture) => capture.status === 'RUNS')).toBe(true);
  const repetitions = json<{
    prefix: {
      closedCommonRows: number;
      differingTimestampCountClosedObservations: number;
      differingTimestampCountAllRows: number;
    };
  }>(root + 'strict-repetition-comparisons-v1.json');
  expect(repetitions.prefix.closedCommonRows).toBe(22749);
  expect(repetitions.prefix.differingTimestampCountClosedObservations).toBe(0);
  expect(repetitions.prefix.differingTimestampCountAllRows).toBe(3);
  for (const source of inputs.sources) {
    const table = csv(source.path);
    const directory = source.path.slice(0, source.path.lastIndexOf('/'));
    const binding = json<Binding>(directory + '/chart-column-bindings-v1.json');
    const observation = json<{ exports: { path: string; observedAtUtc: string }[] }>(
      directory + '/observation-v1.json',
    );
    expect(hash(read(source.path))).toBe(source.sha256);
    expect(binding.sha256).toBe(source.sha256);
    expect(table.rows).toHaveLength(source.rows);
    expect(table.headers).toEqual(source.headers);
    expect(observation.exports.find((entry) => entry.path === source.path)!.observedAtUtc).toBe(source.observedAtUtc);
    expect(
      inputs.records.every((record) =>
        record.ohlcvVariants.every((variant) =>
          variant.observations.every((observation) => {
            if (observation.sourceId !== source.id) return true;
            const row = table.rows[observation.dataRowOrdinal - 1];
            return row[0] === record.timeRaw && same(row.slice(1, 6), variant.valuesRaw);
          }),
        ),
      ),
    ).toBe(true);
  }
});

it('pins values in every masked full-export row and every context-held cropped row as observed, with zero parity credit', () => {
  const nativeTailPlots = ['591553', '591553', '591501', '591579', '591579', '591579', '591579', '591579'];
  let fullExportCells = 0;
  for (const source of prefix.sources) {
    const table = tables.get(source.path)!;
    const tail = table.rows.at(-1)!;
    expect(tail[6]).toBe(nativeTailPlots[source.id]);
    expect(tail.every((value) => value !== '' && Number.isFinite(Number(value)))).toBe(true);
    fullExportCells += tail.length - 6;
    expect(Number(tail[0]) * 1000 + 120000).toBeGreaterThan(Date.parse(source.observedAtUtc));
    if (table.headers.includes('CHART_ISCONFIRMED')) expect(tail[11]).toBe('0');
  }
  expect(fullExportCells).toBe(36);
  const crop = csv(prefix.croppedObserverExport.csv);
  expect(crop.rows.every((row) => row.every((value) => value !== '' && Number.isFinite(Number(value))))).toBe(true);
  expect(crop.rows.length * (crop.headers.length - 6)).toBe(4104);
  expect(crop.rows[0][6]).toBe('578163');
  expect(crop.rows.at(-1)![6]).toBe('591475');
  expect(crop.rows.filter((row) => row[11] === '1')).toHaveLength(512);
  expect(crop.rows.filter((row) => row[11] === '0')).toHaveLength(1);
  expect(fullExportCells + crop.rows.length * (crop.headers.length - 6)).toBe(4140);
});

it('explains every cropped closed-row difference by missing prefix state without awarding parity or replaying its developing row', () => {
  const crop = csv(prefix.croppedObserverExport.csv);
  const closed = crop.rows.filter((row) => row[11] === '1');
  expect(closed).toHaveLength(512);
  const source = read(root + 'v90-cum-prefix-v5/attempt-v1/executed-v1.pine');
  const compiled = tryCompile(parse(source));
  expect(compiled.success).toBe(true);
  // Isolated diagnostic replay: never splice in a full export or restore an accumulator.
  const result = executeCompiled(
    compiled,
    closed.map((row) => ({
      time: Number(row[0]) * 1000,
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    })),
    undefined,
    { runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } } },
  )!;
  expect(result.errors).toEqual([]);
  expect(result.plots).toHaveLength(8);
  const differences: Record<string, number> = {};
  for (const [index, plot] of result.plots.entries()) {
    expect(plot.values).toHaveLength(512);
    const column = crop.headers[index + 6];
    const deltas = plot.values.map((value, row) => Number(value) - Number(closed[row][index + 6]));
    differences[column] = deltas.filter((delta) => delta !== 0).length;
    if (column === 'Plot') expect(deltas).toEqual(Array(512).fill(-578136));
    else if (column === 'CHART_BAR_INDEX') expect(deltas).toEqual(Array(512).fill(-22236));
    else if (column === 'FIRST_CHART_TIME') expect(deltas).toEqual(Array(512).fill(2668320000));
    else if (column === 'CHART_ISFIRST') expect(deltas).toEqual([1, ...Array(511).fill(0)]);
    else expect(deltas).toEqual(Array(512).fill(0));
  }
  expect(differences).toEqual({
    Plot: 512,
    CHART_TIME: 0,
    CHART_TIME_CLOSE: 0,
    CHART_BAR_INDEX: 512,
    CHART_ISFIRST: 1,
    CHART_ISCONFIRMED: 0,
    FIRST_CHART_TIME: 512,
    FIRST_CHART_INDEX: 0,
  });
});
