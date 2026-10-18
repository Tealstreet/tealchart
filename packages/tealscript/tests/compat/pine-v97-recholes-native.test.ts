import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

interface Proof {
  path: string;
  bytes: number;
  sha256: string;
}
interface Pointer {
  rowOrdinal: number;
  columnOrdinal: number;
  headerRaw: string;
  valueRaw: string;
}
interface RecordEntry {
  model: string;
  property: string;
  verdict: string;
  nativeCell: Pointer;
  inputCells: Pointer[];
  dependencyCells?: Pointer[];
  closedScoringEligible: boolean;
  completePriorInputBlock?: {
    csvSha256: string;
    firstDataRowOrdinal: number;
    lastDataRowOrdinal: number;
    ownIndexRange: number[];
  };
}
interface Numeric {
  sourceId: string;
  sourceSha256: string;
  csv: Proof;
  columnBindings: Proof;
  closureMask: Proof;
  sourceFrontier: Proof;
  records: RecordEntry[];
  comparisonCounts: Record<string, number>;
  selectedBlockDataRowOrdinals: number[];
  selectedBlockOwnIndices: number[];
  strictOwnIndexZeroPrefixAvailable: boolean;
  nativeVectorPresenceSummary: { property: string; firstFiniteOwnIndex: number; primary128BlankOwnIndices: number[] }[];
  facets: { facet: string; captureStatus: string; hypothesisVerdict: string }[];
}
const revision = '528e23e9b8d5068bc079aaeb5bf6ab6a826e3d5c';
const base = 'v97/captures/v97/';
const bytes = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const text = (path: string) => bytes(path).toString();
const json = <T>(path: string): T => JSON.parse(text(path)) as T;
const hash = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
function csv(path: string) {
  const lines = text(path)
    .trimEnd()
    .split(/\r?\n/)
    .map((line) => {
      const fields: string[] = [];
      let value = '',
        quoted = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
          if (quoted && line[i + 1] === '"') {
            value += '"';
            i++;
          } else quoted = !quoted;
        } else if (line[i] === ',' && !quoted) {
          fields.push(value);
          value = '';
        } else value += line[i];
      }
      if (quoted) throw new Error(`Unclosed CSV quote: ${path}`);
      fields.push(value);
      return fields;
    });
  return { headers: lines[0], rows: lines.slice(1) };
}
const targets = ['EMA_CLEAN', 'EMA_HOLE', 'RMA_CLEAN', 'RMA_HOLE', 'RSI_CLEAN', 'RSI_HOLE', 'TSI_CLEAN', 'TSI_HOLE'];
const firstFinite = [2, 5, 2, 5, 3, 6, 7, 10];
const firstRaw = ['-4', '-1', '-4', '-1', '100', '100', '1', '1'];
const entries = [5, 6].map((version) => {
  const id = `v97-recursive-holes-v${version}`,
    folder = base + id + '/attempt-v1/';
  const numeric = json<Numeric>(folder + 'numeric-results-v1.json');
  const data = csv(numeric.csv.path),
    mask = csv(numeric.closureMask.path);
  const source = text(folder + 'executed-v1.pine');
  const ast = parse(source);
  const compiled = tryCompile(ast);
  if (!compiled.success) throw new Error(compiled.unsupported.join('\n'));
  const get = (row: number, title: string) => data.rows[row][data.headers.indexOf(title)];
  // Replay the exact source from its own index0 using only captured chart inputs.
  // No replacement source, absolute-index rebind or output-derived seed is used.
  const result = executeCompiled(
    compiled,
    data.rows.slice(0, 128).map((_, i) => ({
      time: Number(get(i, 'time')) * 1000,
      open: Number(get(i, 'open')),
      high: Number(get(i, 'high')),
      low: Number(get(i, 'low')),
      close: Number(get(i, 'close')),
      volume: Number(get(i, 'Volume')),
    })),
    undefined,
    { runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } } },
  )!;
  return { version, id, folder, numeric, data, mask, source, ast, get, result };
});

describe('v97 item4: own index0..127 recursive seeds, holes and recovery', () => {
  it('binds both complete returns, unchanged v95 sources and the v14 checkpoint', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as {
      revision: string;
      files: Proof[];
    };
    expect(lock.revision).toBe(revision);
    const common = ['REQUEST-v97-v1.md', 'SOURCE-INVENTORY-v1.md', 'bundle-manifest-v1.json', 'SHA256SUMS']
      .map((p) => 'v97/' + p)
      .concat(
        [
          'RESPONSE-v97-v14.md',
          'selection-inventory-v1.json',
          'attempt-inventory-v14.json',
          'numeric-controls-v14.json',
          'facet-capabilities-v14.json',
          'account-actions-v14.json',
          'artifact-integrity-v14.json',
          'validation-result-v14.json',
        ].map((p) => base + p),
      );
    const pinned = lock.files.filter((f) => common.includes(f.path) || f.path.includes('/v97-recursive-holes-v'));
    expect(pinned).toHaveLength(88);
    const inventory = json<{ files: Proof[] }>(base + 'artifact-integrity-v14.json');
    for (const f of pinned) {
      const raw = bytes(f.path);
      expect({ path: f.path, bytes: raw.length, sha256: hash(raw) }).toEqual(f);
      if (!f.path.endsWith('/artifact-integrity-v14.json'))
        expect(inventory.files.find((p) => p.path === f.path)).toEqual(f);
    }
    for (const e of entries) {
      const path = `v95/sources/v95-recursive-holes-v${e.version}.pine`,
        raw = bytes(path);
      expect(lock.files.find((f) => f.path === path)).toEqual({ path, bytes: raw.length, sha256: hash(raw) });
      expect(text(path)).toBe(e.source);
    }
    expect(json(base + 'validation-result-v14.json')).toMatchObject({ status: 'PASS' });
  });

  for (const e of entries) {
    it(`${e.id}: retains exact source/Save/Add and private source ownership`, () => {
      expect(hash(Buffer.from(e.source))).toBe(e.numeric.sourceSha256);
      const saved = text(e.folder + 'save-request-v1.txt')
        .replace(/\r\n/g, '\n')
        .split('name="source"\n\n')[1]
        ?.split(/\n------WebKitFormBoundary/)[0];
      expect(saved).toBe(e.source);
      for (const f of ['save-response-v1.json', 'add-response-v1.json'])
        expect(json<{ success: boolean }>(e.folder + f).success).toBe(true);
      const frontier = json<{ privateId: string; privateVersion: string }>(e.numeric.sourceFrontier.path);
      const binding = json<{
        columns: {
          columnOrdinal: number;
          originalHeader: string;
          owner: string;
          sourceSha256?: string;
          privateVersion?: string;
        }[];
        missingOrAmbiguousRequestedTitles: unknown[];
      }>(e.numeric.columnBindings.path);
      expect(binding.missingOrAmbiguousRequestedTitles).toEqual([]);
      for (const c of binding.columns) {
        expect(e.data.headers[c.columnOrdinal - 1]).toBe(c.originalHeader);
        if (c.columnOrdinal > 6)
          expect(c).toMatchObject({
            owner: frontier.privateId,
            sourceSha256: e.numeric.sourceSha256,
            privateVersion: frontier.privateVersion,
          });
      }
      expect(checkProgram(e.ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(e.result.errors).toEqual([]);
    });

    it(`${e.id}: independently checks the full single-export origin, closure and all physical blanks`, () => {
      const f = json<{
        dataRows: number;
        strictOwnIndexZeroPrefixAvailable: boolean;
        prefixCriterion: string;
        noCrossSessionStitching: boolean;
        physicalFirstRow: { raw: string[] };
        physicalLastRow: { raw: string[] };
        independentlyClosedRows: number;
        nativeExportUtc: string;
        eligibleDataRowOrdinals: number[];
        ownPrefixIndexGapsOrDuplicates: unknown[];
        originContextViolationRowOrdinals: unknown[];
      }>(e.numeric.sourceFrontier.path);
      expect(f).toMatchObject({
        strictOwnIndexZeroPrefixAvailable: true,
        prefixCriterion: 'CAPTURED / COMPLETE_OWN_INDEX_ZERO_PREFIX',
        noCrossSessionStitching: true,
        ownPrefixIndexGapsOrDuplicates: [],
        originContextViolationRowOrdinals: [],
      });
      expect(e.data.rows).toHaveLength(e.version === 5 ? 23761 : 23763);
      expect(e.mask.rows).toHaveLength(e.data.rows.length);
      expect([e.data.rows[0], e.data.rows.at(-1)]).toEqual([f.physicalFirstRow.raw, f.physicalLastRow.raw]);
      const eligible: number[] = [];
      for (const [i, row] of e.data.rows.entries()) {
        const m = Object.fromEntries(e.mask.headers.map((h, j) => [h, e.mask.rows[i][j]]));
        const closed =
          e.get(i, 'CHART_CONFIRMED') === '1' && (Number(row[0]) + 120) * 1000 <= Date.parse(f.nativeExportUtc);
        expect([
          e.get(i, 'INPUT_INDEX'),
          e.get(i, 'IS_FIRST'),
          e.get(i, 'FIRST_INDEX'),
          e.get(i, 'FIRST_TIME'),
        ]).toEqual([String(i), i === 0 ? '1' : '0', '0', e.get(0, 'INPUT_TIME')]);
        expect(Number(e.get(i, 'INPUT_TIME'))).toBe(Number(row[0]) * 1000);
        if (i > 0) expect(Number(row[0]) > Number(e.data.rows[i - 1][0])).toBe(true);
        expect([m.csv_sha256, m.row_ordinal, m.closed_numeric_eligible]).toEqual([
          e.numeric.csv.sha256,
          String(i + 1),
          closed ? '1' : '0',
        ]);
        expect(JSON.parse(m.blank_column_ordinals)).toEqual(row.flatMap((v, j) => (v === '' ? [j + 1] : [])));
        if (closed) eligible.push(i + 1);
        else
          expect(m).toMatchObject({
            present_cell_status: 'OBSERVED / EXCLUDED',
            exclusion_cause: 'PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_UNMET',
          });
      }
      expect(eligible).toEqual(f.eligibleDataRowOrdinals);
      expect(eligible).toHaveLength(f.independentlyClosedRows);
      expect(e.data.rows.length - eligible.length).toBe(1);
      expect(e.numeric.selectedBlockDataRowOrdinals).toEqual(Array.from({ length: 128 }, (_, i) => i + 1));
      expect(e.numeric.selectedBlockOwnIndices).toEqual([0, 127]);
      expect(e.numeric.strictOwnIndexZeroPrefixAvailable).toBe(true);
    });

    it(`${e.id}: authenticates every frozen candidate and keeps model/precision verdicts separate`, () => {
      const counts: Record<string, number> = {};
      for (const r of e.numeric.records) {
        for (const p of [r.nativeCell, ...r.inputCells, ...(r.dependencyCells ?? [])]) {
          expect(e.data.headers[p.columnOrdinal - 1]).toBe(p.headerRaw);
          expect(e.get(p.rowOrdinal - 1, p.headerRaw)).toBe(p.valueRaw);
        }
        expect(r.closedScoringEligible).toBe(true);
        expect(r.nativeCell.rowOrdinal).toBeLessThanOrEqual(128);
        counts[r.verdict] = (counts[r.verdict] ?? 0) + 1;
        if (r.completePriorInputBlock)
          expect(r.completePriorInputBlock).toMatchObject({
            csvSha256: e.numeric.csv.sha256,
            firstDataRowOrdinal: 1,
            lastDataRowOrdinal: r.nativeCell.rowOrdinal,
            ownIndexRange: [0, r.nativeCell.rowOrdinal - 1],
          });
      }
      expect(counts).toEqual({ UNDECIDED: 5163, REFUTED: 629, SUPPORTED: 1760 });
      expect(e.numeric.comparisonCounts).toEqual(counts);
      expect(e.numeric.facets.find((f) => f.facet.startsWith('RSI3 and TSI3/5'))).toMatchObject({
        captureStatus: 'CAPTURED',
        hypothesisVerdict: 'UNDECIDED',
      });
      expect(e.numeric.facets.find((f) => f.facet.startsWith('Generic consume-slot'))).toMatchObject({
        captureStatus: 'NOT OBSERVED',
        hypothesisVerdict: 'UNDECIDED',
      });
    });

    for (const title of e.data.headers.slice(6)) {
      it(`${e.id}: exactly matches all 128 own-prefix ${title} cells, including blanks`, () => {
        const actual = e.result.plots.find((p) => p.title === title)!.values;
        expect(actual).toHaveLength(128);
        for (let i = 0; i < 128; i++) {
          const raw = e.get(i, title);
          if (raw === '') expect(actual[i], `${title}:own${i}:blank`).toBeNull();
          else {
            expect(actual[i], `${title}:own${i}`).toBe(Number(raw));
            expect(String(actual[i])).toBe(raw);
          }
        }
      });
    }

    it(`${e.id}: witnesses every first finite seed and all leading/interior recovery masks`, () => {
      for (const [j, title] of targets.entries()) {
        const values = e.result.plots.find((p) => p.title === title)!.values;
        expect(values.findIndex((v) => v !== null)).toBe(firstFinite[j]);
        expect(e.get(firstFinite[j], title)).toBe(firstRaw[j]);
        const blanks = Array.from({ length: 128 }, (_, i) => i).filter((i) => e.get(i, title) === '');
        const summary = e.numeric.nativeVectorPresenceSummary.find((p) => p.property === title)!;
        expect(Number(summary.firstFiniteOwnIndex)).toBe(firstFinite[j]);
        expect(summary.primary128BlankOwnIndices).toEqual(blanks);
        expect(values.flatMap((v, i) => (v === null ? [i] : []))).toEqual(blanks);
      }
      const holes = Array.from({ length: 128 }, (_, i) => i).filter(
        (i) => i < 3 || [12, 13, 32, 33, 34].includes(i % 64),
      );
      expect(holes).toEqual([0, 1, 2, 12, 13, 32, 33, 34, 76, 77, 96, 97, 98]);
      expect(holes.every((i) => e.get(i, 'X') === '' && e.get(i, 'X_NA') === '1')).toBe(true);
      for (const family of ['EMA', 'RMA', 'RSI', 'TSI']) {
        const target = e.result.plots.find((p) => p.title === family + '_HOLE')!.values;
        const mask = e.result.plots.find((p) => p.title === family + '_HOLE_NA')!.values;
        expect(mask).toEqual(target.map((v) => (v === null ? 1 : 0)));
      }
    });
  }
});
