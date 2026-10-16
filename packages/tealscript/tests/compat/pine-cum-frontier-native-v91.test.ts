import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

interface FileEntry {
  path: string;
  bytes: number;
  sha256: string;
}
interface Frontier extends FileEntry {
  headers: string[];
  rows: number;
  observedAtUtc: string;
  nativeFirstPhysicalRowRaw: string[];
  nativeLastPhysicalRowRaw: string[];
  companionFrontierStatus: string;
  missingPrefixBarsInThisExportRaw: string;
  companionOwnedFields: Record<string, { columnOrdinal: number; firstRaw: string; lastRaw: string }>;
  originalOwnedFrontierFields: null;
  originalNativeBeforeAddFrontier: null;
  originalNativeAfterAddFrontier: null;
  originalVerdict: string;
  targetColumnOrdinal: number;
  targetSource: string;
  companionSource: string;
  historySessionsNeverSpliced: boolean;
  noSeedInferred: boolean;
}
interface Binding extends FileEntry {
  headers: string[];
  rows: number;
  rowClosureMask: string;
  closureReasonCounts: Record<string, number>;
  executionBinding: string;
  sourceOwnedExecutionFrontier: string;
  plotBindings: {
    nativePlotTitle: string;
    columnOrdinal: number;
    sourceProbe: string;
    executedSourceSha256: string;
    privateScriptId: string;
  }[];
}
const base = 'v91/captures/v91/';
const read = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
const json = <T>(path: string): T => JSON.parse(read(path)) as T;
const hash = (source: string) => createHash('sha256').update(source).digest('hex');
function csv(path: string) {
  const [header, ...lines] = read(path).trimEnd().split(/\r?\n/);
  return { headers: header.split(','), rows: lines.map((line) => line.split(',')) };
}
const frontiers = json<{
  exports: Frontier[];
  oldHolds7and8: string;
  sourceOwnedAndCompanionOwnedMetadataKeptSeparate: boolean;
}>(base + 'cumulative-frontier-v1.json');
const comparison = json<{
  status: string;
  closedCommonRows: number;
  closedFirstTimeRaw: string;
  closedLastTimeRaw: string;
  differingClosedKeys: number;
  allDifferencesIncludingExcluded: {
    timeRaw: string;
    closedAtBoth: boolean;
    observations: {
      csv: string;
      sha256: string;
      dataRowOrdinal: number;
      columnOrdinals: number[];
      rawOhlcvAndTarget: string[];
    }[];
  }[];
}>(base + 'cumulative-pair-comparison-v1.json');
const tables = new Map(frontiers.exports.map((frontier) => [frontier.path, csv(frontier.path)]));
const complete = frontiers.exports.filter(
  (frontier) => frontier.companionFrontierStatus === 'COMPLETE-INDEX0-OBSERVED',
);
const openReason = 'PHYSICAL_OPEN_OR_NATIVE_CONFIRMATION_UNOBSERVED; PRESENT_VALUES_OBSERVED';

it('authenticates every consumed v91 artifact, including integrity and validation, at the immutable oracle pin', () => {
  const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
    files: FileEntry[];
  };
  // The lock supplies immutable bytes/SHA bindings; allow later composed revisions to retain this evidence.
  const inventory = json<{ files: FileEntry[] }>(base + 'artifact-integrity-v1.json');
  const byPath = new Map(inventory.files.map((file) => [file.path, file]));
  const consumed = lock.files.filter((file) => file.path.startsWith('v91/'));
  expect(consumed.length).toBeGreaterThanOrEqual(36);
  for (const file of consumed) {
    const source = read(file.path);
    expect(Buffer.byteLength(source), file.path).toBe(file.bytes);
    expect(hash(source), file.path).toBe(file.sha256);
    if (!file.path.endsWith('/artifact-integrity-v1.json')) expect(file, file.path).toEqual(byPath.get(file.path));
  }
  expect(json<{ status: string }>(base + 'validation-result-v1.json').status).toBe('PASS');
});

describe.each(frontiers.exports)('v91 cumulative $path', (frontier) => {
  const table = tables.get(frontier.path)!;
  const binding = json<Binding>(frontier.path.replace('native-v1.csv', 'column-bindings-v1.json'));
  const mask = csv(binding.rowClosureMask);
  const cell = (row: string[], name: string) => row[mask.headers.indexOf(name)];
  const closed = table.rows.filter((_, index) => cell(mask.rows[index], 'closed_eligible') === '1');
  const full = frontier.companionFrontierStatus === 'COMPLETE-INDEX0-OBSERVED';
  const version = frontier.path.includes('pair-v5/') ? 5 : 6;

  it('binds all physical rows, closure reasons and separately owned native frontier fields', () => {
    expect(hash(read(frontier.path))).toBe(frontier.sha256);
    expect(binding.path).toBe(frontier.path);
    expect(binding.sha256).toBe(frontier.sha256);
    expect(table.headers).toEqual(frontier.headers);
    expect(binding.headers).toEqual(table.headers);
    expect(table.rows).toHaveLength(full ? 23086 : 1593);
    expect(binding.rows).toBe(frontier.rows);
    expect(table.rows).toHaveLength(frontier.rows);
    expect(mask.rows).toHaveLength(frontier.rows);
    expect(table.rows[0]).toEqual(frontier.nativeFirstPhysicalRowRaw);
    expect(table.rows.at(-1)).toEqual(frontier.nativeLastPhysicalRowRaw);
    const reasons: Record<string, number> = {};
    expect(
      table.rows.every((row, index) => {
        const closure = mask.rows[index];
        const reason = cell(closure, 'reason');
        reasons[reason] = (reasons[reason] ?? 0) + 1;
        return (
          row.length === 19 &&
          row.every((value) => value !== '' && Number.isFinite(Number(value))) &&
          cell(closure, 'csv_sha256') === frontier.sha256 &&
          cell(closure, 'data_row_ordinal_1based_excluding_header') === String(index + 1) &&
          cell(closure, 'time_raw') === row[0] &&
          cell(closure, 'observed_plot_cell_count') === '13' &&
          cell(closure, 'blank_plot_cell_count') === '0' &&
          cell(closure, 'closed_eligible') === (index === table.rows.length - 1 ? '0' : '1') &&
          reason === (index === table.rows.length - 1 ? openReason : 'NATIVE_CHART_CONFIRMED') &&
          row[11] === cell(closure, 'closed_eligible') &&
          Number(row[0]) === Number(table.rows[0][0]) + index * 120 &&
          (index === table.rows.length - 1 || Number(row[0]) * 1000 + 120000 <= Date.parse(frontier.observedAtUtc))
        );
      }),
    ).toBe(true);
    expect(reasons).toEqual(binding.closureReasonCounts);
    expect(closed).toHaveLength(full ? 23085 : 1592);
    expect(closed).toEqual(table.rows.slice(0, -1));
    for (const [name, field] of Object.entries(frontier.companionOwnedFields)) {
      expect(table.headers[field.columnOrdinal - 1]).toBe(name);
      expect(table.rows[0][field.columnOrdinal - 1]).toBe(field.firstRaw);
      expect(table.rows.at(-1)![field.columnOrdinal - 1]).toBe(field.lastRaw);
    }
    expect(frontier.targetColumnOrdinal).toBe(7);
    expect(frontier.originalOwnedFrontierFields).toBeNull();
    expect(frontier.originalNativeBeforeAddFrontier).toBeNull();
    expect(frontier.originalNativeAfterAddFrontier).toBeNull();
    expect(frontier.originalVerdict).toBe(
      'SAME-SESSION-TARGET-CELLS-OBSERVED; ORIGINAL-EXECUTION-FRONTIER-CONTEXT-UNMET',
    );
    expect(binding.sourceOwnedExecutionFrontier).toBe(
      'UNOBSERVED for unchanged cumulative original; companion fields are separately owned',
    );
    expect(binding.executionBinding).toBe('SAME-SESSION-ONLY');
    expect(frontier.historySessionsNeverSpliced && frontier.noSeedInferred).toBe(true);
  });

  it('authenticates original and companion source identities without transferring frontier ownership', () => {
    for (const role of ['original', 'frontier']) {
      const probe = `v91-cum-${role}-v${version}`;
      const attempt = role === 'original' && version === 5 ? 2 : 1;
      const directory = `${base}${probe}/attempt-v${attempt}/`;
      const source = read(directory + 'executed-v1.pine');
      const observation = json<{
        sourceMatchesRequest: boolean;
        requestedSourceSha256: string;
        executedSourceSha256: string;
        privateScriptId: string;
        saveCompilerSuccess: boolean;
        addCompilerSuccess: boolean;
        nativeBeforeAddSourceOwnedFrontier: null;
      }>(directory + 'observation-v1.json');
      expect(source).toBe(read(`v91/sources/${probe}.pine`));
      expect(observation.sourceMatchesRequest).toBe(true);
      expect(hash(source)).toBe(observation.requestedSourceSha256);
      expect(hash(source)).toBe(observation.executedSourceSha256);
      expect(observation.saveCompilerSuccess && observation.addCompilerSuccess).toBe(true);
      for (const stage of ['save', 'add']) {
        expect(json<{ success: boolean }>(`${directory}${stage}-response-v1.json`).success).toBe(true);
      }
      const receipt = json<
        Record<
          string,
          {
            sourceSha256: string;
            savedReceipt: { sourceBinding: { exact: boolean; executedSha256: string } };
          }
        >
      >(`${base}cumulative-pair-v${version}/pair-receipt-v1.json`)[role === 'original' ? role : 'companion'];
      expect(receipt.sourceSha256).toBe(hash(source));
      expect(receipt.savedReceipt.sourceBinding.exact).toBe(true);
      expect(receipt.savedReceipt.sourceBinding.executedSha256).toBe(hash(source));
      expect(observation.privateScriptId).toBe(role === 'original' ? frontier.targetSource : frontier.companionSource);
      if (role === 'original') expect(observation.nativeBeforeAddSourceOwnedFrontier).toBeNull();
      const plots = binding.plotBindings.filter((plot) => plot.sourceProbe === probe);
      expect(plots).toHaveLength(role === 'original' ? 1 : 12);
      for (const plot of plots) {
        expect(plot.executedSourceSha256).toBe(hash(source));
        expect(plot.privateScriptId).toBe(observation.privateScriptId);
        expect(plot.nativePlotTitle).toBe(table.headers[plot.columnOrdinal - 1]);
      }
    }
  });

  if (full)
    it('matches all 23,085 closed target rows and companion plots exactly from index0 without a seed', () => {
      expect(table.rows[0].slice(0, 1)).toEqual(['1789344000']);
      expect(table.rows[0].slice(9, 14)).toEqual(['0', '1', '1', '1789344000000', '0']);
      expect(frontier.missingPrefixBarsInThisExportRaw).toBe('0');
      const bars = closed.map((row) => ({
        time: Number(row[0]) * 1000,
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: Number(row[5]),
      }));
      // Each export starts independently. Never inject the historical 620335 state, splice sessions or replay ticks.
      for (const role of ['original', 'frontier']) {
        const source = read(`v91/sources/v91-cum-${role}-v${version}.pine`);
        expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual(
          [],
        );
        const compiled = tryCompile(parse(source));
        expect(compiled.success).toBe(true);
        const result = executeCompiled(compiled, bars, undefined, {
          runtime: {
            syminfo: { tickerid: 'BINANCE:BTCUSDT', timezone: 'Etc/UTC' },
            timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
          },
        })!;
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.plots).toHaveLength(role === 'original' ? 1 : 12);
        for (const [index, plot] of result.plots.entries()) {
          const column = role === 'original' ? 6 : index + 7;
          if (role === 'frontier') expect(plot.title).toBe(table.headers[column]);
          expect(plot.values, table.headers[column]).toEqual(closed.map((row) => Number(row[column])));
        }
        if (role === 'original') expect(result.plots[0].values[0]).toBe(27);
      }
    });
});

it('rederives the timestamp join and retains both observed developing rows outside closed scoring', () => {
  expect(complete).toHaveLength(2);
  expect(comparison.status).toBe('OBSERVATION ONLY; no original execution-frontier closure');
  const [v5, v6] = complete.map((frontier) => tables.get(frontier.path)!);
  const v6ByTime = new Map(v6.rows.map((row) => [row[0], row]));
  const common = v5.rows.filter((row) => row[11] === '1' && v6ByTime.get(row[0])?.[11] === '1');
  expect(common).toHaveLength(23085);
  expect(common.length).toBe(comparison.closedCommonRows);
  expect(common[0][0]).toBe(comparison.closedFirstTimeRaw);
  expect(common.at(-1)![0]).toBe(comparison.closedLastTimeRaw);
  const differingClosed = common.filter(
    (row) => JSON.stringify(row.slice(1, 7)) !== JSON.stringify(v6ByTime.get(row[0])!.slice(1, 7)),
  );
  expect(differingClosed).toHaveLength(0);
  expect(differingClosed.length).toBe(comparison.differingClosedKeys);
  const differences = v5.rows.filter(
    (row) => JSON.stringify(row.slice(1, 7)) !== JSON.stringify(v6ByTime.get(row[0])!.slice(1, 7)),
  );
  expect(differences.map((row) => row[0])).toEqual(['1792114200']);
  expect(comparison.allDifferencesIncludingExcluded).toHaveLength(1);
  const difference = comparison.allDifferencesIncludingExcluded[0];
  expect(difference.timeRaw).toBe('1792114200');
  expect(difference.closedAtBoth).toBe(false);
  expect(difference.observations).toHaveLength(2);
  expect(difference.observations.map((observation) => observation.rawOhlcvAndTarget)).toEqual([
    ['82196.01', '82218.17', '82196', '82208.2', '4.64914', '600237'],
    ['82196.01', '82257.67', '82196', '82257.14', '8.53982', '600237'],
  ]);
  for (const [index, observation] of difference.observations.entries()) {
    expect(observation.csv).toBe(complete[index].path);
    expect(observation.sha256).toBe(complete[index].sha256);
    expect(observation.dataRowOrdinal).toBe(23086);
    expect(observation.columnOrdinals).toEqual([2, 3, 4, 5, 6, 7]);
    const row = tables.get(observation.csv)!.rows[observation.dataRowOrdinal - 1];
    expect(row.slice(1, 7)).toEqual(observation.rawOhlcvAndTarget);
    expect(row[11]).toBe('0');
    expect(row.slice(6)).toHaveLength(13);
  }
});

it('keeps the cropped v5 export context-unmet and holds7/8 held, with all present cells observed', () => {
  const crop = frontiers.exports[0];
  expect(crop.companionFrontierStatus).toBe('CONTEXT-UNMET-CROPPED-EXPORT');
  expect(crop.missingPrefixBarsInThisExportRaw).toBe('21493');
  const rows = tables.get(crop.path)!.rows;
  expect(rows[0][9]).toBe('21493');
  expect(rows[0][10]).toBe('0');
  expect(rows[0][6]).toBe('558845');
  expect(rows.at(-1)![6]).toBe('600237');
  expect(rows.every((row) => row.slice(6).every((value) => value !== ''))).toBe(true);
  // 20,709 cropped study cells plus 26 full-export developing cells: OBSERVED, zero parity credit.
  expect(rows.length * 13 + complete.length * 13).toBe(20735);
  expect(frontiers.sourceOwnedAndCompanionOwnedMetadataKeptSeparate).toBe(true);
  expect(frontiers.oldHolds7and8).toBe('HELD; original historical frontier/620335 not recreated or used as input');
});
