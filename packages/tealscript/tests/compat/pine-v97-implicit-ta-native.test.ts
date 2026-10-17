import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

interface Proof { path: string; bytes: number; sha256: string }
interface Cell { rowOrdinal: number; columnOrdinal: number; headerRaw: string; valueRaw: string }
interface Report {
  sourceSha256: string;
  csv: Proof;
  closureMask: Proof;
  columnBindings: Proof;
  sourceFrontier: Proof;
  selectedBlockDataRowOrdinals: number[];
  strictOwnIndexZeroPrefixAvailable: boolean;
  records: { nativeCell: Cell; inputCells: Cell[]; verdict: string }[];
  comparisonCounts: Record<string, number>;
  allClosedDirectionTransitions: { previous: Cell; current: Cell }[];
}
const pin = 'bc913c6cc44b40611f84fabc362975df0aa73574';
const base = 'v97/captures/v97/';
const raw = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const text = (path: string) => raw(path).toString();
const json = <T>(path: string): T => JSON.parse(text(path)) as T;
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
function csv(path: string) {
  const all = text(path).trimEnd().split(/\r?\n/).map((line) => {
    const fields: string[] = [];
    let field = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"' && quoted && line[i + 1] === '"') { field += '"'; i++; }
      else if (line[i] === '"') quoted = !quoted;
      else if (line[i] === ',' && !quoted) { fields.push(field); field = ''; }
      else field += line[i];
    }
    if (quoted) throw new Error(`Unclosed quote: ${path}`);
    fields.push(field);
    return fields;
  });
  const headers = all[0];
  return { headers, rows: all.slice(1), objects: all.slice(1).map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i]]))) };
}
const entries = [5, 6].map((version) => {
  const folder = `${base}v97-implicit-ta-v${version}/attempt-v1/`;
  const report = json<Report>(folder + 'numeric-results-v1.json');
  const data = csv(report.csv.path);
  const source = text(folder + 'executed-v1.pine');
  const compiled = tryCompile(parse(source));
  if (!compiled.success) throw new Error(compiled.unsupported.join('\n'));
  // Exact original first128 rows, not a suffix and not target-fed TA state.
  const bars = data.objects.slice(0, 128).map((r) => ({
    time: Number(r.time) * 1000, open: Number(r.open), high: Number(r.high),
    low: Number(r.low), close: Number(r.close), volume: Number(r.Volume),
  }));
  const result = executeCompiled(compiled, bars)!;
  return { version, folder, report, data, source, result };
});

describe('v97 own-index-zero implicit TA startup; unchanged v95 sources', () => {
  it('binds the family, canonical return and append-only checkout revision', () => {
    const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { revision: string; files: Proof[] };
    expect(lock.revision).toBe(pin);
    const common = new Set(['v97/REQUEST-v97-v1.md', base + 'selection-inventory-v1.json', ...[
      'RESPONSE-v97-v14.md', 'attempt-inventory-v14.json', 'numeric-controls-v14.json', 'facet-capabilities-v14.json',
      'validation-result-v14.json', 'artifact-integrity-v14.json', 'CAPTURE-TOOLING-LICENSE-v1.md',
    ].map((p) => base + p)]);
    const files = lock.files.filter((f) => common.has(f.path) || [5, 6].some((v) => f.path.startsWith(base + `v97-implicit-ta-v${v}/`)));
    expect(files).toHaveLength(85);
    const inventory = json<{ files: Proof[] }>(base + 'artifact-integrity-v14.json');
    for (const proof of files) {
      const bytes = raw(proof.path);
      expect({ path: proof.path, bytes: bytes.length, sha256: hash(bytes) }).toEqual(proof);
      if (!proof.path.endsWith('/artifact-integrity-v14.json')) expect(inventory.files.find((p) => p.path === proof.path)).toEqual(proof);
    }
    expect(json<{ status: string }>(base + 'validation-result-v14.json').status).toBe('PASS');
  });
  for (const e of entries) {
    it(`v${e.version}: binds exact source, private ownership and every report pointer`, () => {
      expect(e.source).toBe(text(`v95/sources/v95-implicit-ta-v${e.version}.pine`));
      expect(hash(Buffer.from(e.source))).toBe(e.report.sourceSha256);
      const form = text(e.folder + 'save-request-v1.txt').replace(/\r\n/g, '\n');
      // Preserve exact source bytes through CRLF-only multipart transport.
      expect(form.split('name="source"\n\n')[1]?.split(/\n------WebKitFormBoundary/)[0]).toBe(e.source);
      expect(checkProgram(parse(e.source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      for (const action of ['save', 'add']) expect(json<{ success: boolean }>(e.folder + `${action}-response-v1.json`).success).toBe(true);
      const binding = json<{ columns: { columnOrdinal: number; originalHeader: string; owner: string; sourceSha256?: string; privateVersion?: string }[]; privateId: string; missingOrAmbiguousRequestedTitles: string[] }>(e.report.columnBindings.path);
      expect(binding.missingOrAmbiguousRequestedTitles).toEqual([]);
      for (const c of binding.columns) {
        expect(e.data.headers[c.columnOrdinal - 1]).toBe(c.originalHeader);
        if (c.columnOrdinal > 6) expect(c).toMatchObject({ owner: binding.privateId, sourceSha256: e.report.sourceSha256, privateVersion: '1.0' });
      }
      const check = (c: Cell) => {
        expect(e.data.headers[c.columnOrdinal - 1]).toBe(c.headerRaw);
        expect(e.data.rows[c.rowOrdinal - 1][c.columnOrdinal - 1]).toBe(c.valueRaw);
      };
      for (const r of e.report.records) { check(r.nativeCell); r.inputCells.forEach(check); }
      // These later transition witnesses are preserved, with zero out-of-block score.
      for (const r of e.report.allClosedDirectionTransitions) { check(r.previous); check(r.current); }
      expect(e.report.allClosedDirectionTransitions).toHaveLength(1790);
      expect(e.report.comparisonCounts).toEqual({ UNDECIDED: 3824, SUPPORTED: 1164, REFUTED: 4 });
    });
    it(`v${e.version}: independently verifies the whole own prefix and all excluded rows`, () => {
      const frontier = json<{ nativeExportUtc: string; independentlyClosedRows: number; strictOwnIndexZeroPrefixAvailable: boolean }>(e.report.sourceFrontier.path);
      const masks = csv(e.report.closureMask.path).objects;
      expect(e.report.strictOwnIndexZeroPrefixAvailable).toBe(true);
      expect(frontier.strictOwnIndexZeroPrefixAvailable).toBe(true);
      expect(masks).toHaveLength(e.data.rows.length);
      let closed = 0;
      for (const [i, r] of e.data.objects.entries()) {
        assert.equal(Number(r.INPUT_INDEX), i);
        assert.equal(r.IS_FIRST, i === 0 ? '1' : '0');
        assert.equal(r.FIRST_INDEX, '0');
        assert.equal(r.FIRST_TIME, e.data.objects[0].INPUT_TIME);
        assert.equal(Number(r.INPUT_TIME), Number(r.time) * 1000);
        if (i) assert.ok(Number(r.time) > Number(e.data.objects[i - 1].time));
        for (const k of ['OPEN', 'HIGH', 'LOW', 'CLOSE']) assert.equal(r['INPUT_' + k], r[k.toLowerCase()]);
        const eligible = r.CHART_CONFIRMED === '1' && (Number(r.time) + 120) * 1000 <= Date.parse(frontier.nativeExportUtc);
        assert.equal(masks[i].row_ordinal, String(i + 1));
        assert.equal(masks[i].csv_sha256, e.report.csv.sha256);
        assert.equal(masks[i].closed_numeric_eligible, eligible ? '1' : '0');
        assert.deepEqual(JSON.parse(masks[i].blank_column_ordinals), e.data.rows[i].flatMap((v, j) => v === '' ? [j + 1] : []));
        if (eligible) closed++;
        else {
          assert.equal(masks[i].present_cell_status, 'OBSERVED / EXCLUDED');
          assert.equal(masks[i].exclusion_cause, 'PHYSICALLY_OPEN_OR_NATIVE_CONFIRMATION_UNMET');
        }
      }
      expect(closed).toBe(frontier.independentlyClosedRows);
      expect(closed).toBe(e.version === 5 ? 23764 : 23765);
      expect(e.data.rows.length - closed).toBe(1);
      expect(e.report.selectedBlockDataRowOrdinals).toEqual(Array.from({ length: 128 }, (_, i) => i + 1));
      expect(masks.slice(0, 128).every((m) => m.closed_numeric_eligible === '1')).toBe(true);
    }, 30000);
    it(`v${e.version}: locks first-finite masks and source-derived startup controls`, () => {
      expect(e.result.errors).toEqual([]);
      const first = { TR: 0, ATR: 2, DI_PLUS: 3, DI_MINUS: 3, ADX: 5, SUPERTREND: 0, DIRECTION: 0 };
      for (const [field, index] of Object.entries(first)) {
        expect(e.data.objects.findIndex((r) => r[field] !== '')).toBe(index);
        expect(e.result.plots.find((p) => p.title === field)!.values.findIndex((v) => v !== null)).toBe(index);
      }
      expect(e.result.plots.find((p) => p.title === 'SUPERTREND')!.values.slice(0, 3)).toEqual([0, null, Number(e.data.objects[2].SUPERTREND)]);
    });
    for (const title of ['TR', 'ATR', 'DI_PLUS', 'DI_MINUS', 'ADX', 'SUPERTREND', 'DIRECTION']) {
      it(`v${e.version}: exact exported-number ${title} equality on every own index0..127`, () => {
        const actual = e.result.plots.find((p) => p.title === title)!.values;
        expect(actual).toHaveLength(128);
        for (let i = 0; i < 128; i++) {
          const original = e.data.objects[i][title];
          // Number parsing is explicit; this does not assert decimal-real identity
          // or resolve the archive's independent arithmetic/model verdicts.
          expect(actual[i], `${title}:own${i}:raw=${original}`).toBe(original === '' ? null : Number(original));
        }
      });
    }
    it(`v${e.version}: exact controls and NA witnesses; no credit outside primary block`, () => {
      const targets = ['TR', 'ATR', 'DI_PLUS', 'DI_MINUS', 'ADX', 'SUPERTREND', 'DIRECTION'];
      const fields = e.data.headers.slice(6).filter((h) => !targets.includes(h));
      expect(fields).toHaveLength(14);
      for (const title of fields) {
        const actual = e.result.plots.find((p) => p.title === title)!.values;
        for (let i = 0; i < 128; i++) expect(actual[i], `${title}:own${i}`).toBe(Number(e.data.objects[i][title]));
      }
      expect(128 * (targets.length + fields.length)).toBe(2688);
    });
  }
});
