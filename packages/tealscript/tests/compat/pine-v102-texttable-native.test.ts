import type { BoxDrawingOutput } from '../../src/runtime/drawings/types';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

interface Proof { path: string; bytes: number; sha256: string }
interface Pointer { csvSha256: string; rowOrdinal: number; columnOrdinal: number; headerRaw: string; valueRaw: string }
interface Block {
  csv: Proof; columnBindings: Proof; closureMask: Proof; primaryRowOrdinals: number[];
  completePrimaryCertificate: boolean; uniqueVisualAnchorRowOrdinal: number;
  rows: { rowOrdinal: number; phase: number; cells: Record<string, Pointer> }[];
}
interface Property { title: string; verdict: string; expectedRawByPhase: (string | null)[];
  comparisonRows: { rowOrdinal: number; phase: number; expectedRaw: string | null; actualPointer: string; cellVerdict: string }[] }
interface Numeric { sourceSha256: string; primaryRows: number[]; uniquePrimaryPlotCells: number; properties: Property[];
  numericAlternatives: { id: string; verdict: string; supportedVariants?: string[]; variants: { id: string; verdict: string }[] }[] }
interface Facet { caseId: string; verdict: string; supportedCandidate?: string; notObservedCause?: string;
  subproperties?: { property: string; verdict: string; cause?: string; regionsPx?: number[][] }[];
  visibleLinesByRegion?: Record<string, string[]> }
const root = 'v102/captures/v102/';
const revision = 'f47a4e34ce33441ad37add124d9572119826138d';
const bytes = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const read = (path: string) => bytes(path).toString('utf8');
const json = <T>(path: string): T => JSON.parse(read(path)) as T;
const hash = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { revision: string; files: Proof[] };
function csv(path: string) {
  return read(path).trimEnd().split(/\r?\n/).map((l) => l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((c) => c.startsWith('"') ? c.slice(1, -1).replaceAll('""', '"') : c));
}
function verify(p: Proof) {
  expect(lock.files.find((f) => f.path === p.path), p.path).toEqual(p);
  expect(bytes(p.path).length, p.path).toBe(p.bytes);
  expect(hash(bytes(p.path)), p.path).toBe(p.sha256);
}
const entries = ['box-text-layout', 'table-relocation'].flatMap((family) => [5, 6].map((version) => {
  const id = `v102-${family}-v${version}`, folder = root + id + '/';
  const block = json<Block>(folder + 'native-cell-block-v1.json');
  const numeric = json<Numeric>(folder + 'numeric-results-v1.json');
  const [headers, ...rows] = csv(block.csv.path), [maskHeaders, ...mask] = csv(block.closureMask.path);
  const cell = (i: number, title: string) => rows[i][headers.indexOf(title)];
  const firstIndex = Number(cell(0, 'INPUT_INDEX'));
  const source = read(folder + 'attempt-v1/executed-v1.pine');
  const start = block.primaryRowOrdinals[0] - 1;
  const origin = Number(cell(start, 'INPUT_INDEX'));
  // Replay starts on the native phase0 block; coordinates translate together without inventing a prefix.
  const compiled = tryCompile(parse(source));
  const result = executeCompiled(compiled, rows.slice(start).map((r) => ({ time: Number(r[0]) * 1000, open: Number(r[1]), high: Number(r[2]),
    low: Number(r[3]), close: Number(r[4]), volume: Number(r[5]) })), undefined, { realtimeLastBar: { isNew: true },
    runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } } });
  if (!result) throw new Error(`${id}: exact-source coordinate translation failed to compile`);
  const output = (title: string) => result.plots.find((p) => p.title === title)!.values;
  const map = json<{ originalPng: Proof; originalCsv: Proof; sourceSha256: string; facets: Facet[];
    visualAnchor: Record<string, Pointer>; derivedCalibration: { coordinateUncertaintyPx: { x: number; y: number } } }>(folder + 'derived-region-map-v1.json');
  return { id, family, version, folder, block, numeric, headers, rows, maskHeaders, mask, cell, firstIndex, start, origin, source, compiled, result, output, map };
}));

describe('v102 native text and table finite contracts', () => {
  it('binds family captures, original PNGs, region maps and canonical v26 integrity/validation', () => {
    expect(lock.revision).toBe(revision);
    const common = ['v102/REQUEST-v102-v1.md', 'v102/CASE-MATRIX-v1.json', 'v102/bundle-manifest-v1.json',
      ...['RESPONSE-v102-v26.md', 'attempt-inventory-v26.json', 'numeric-controls-v26.json', 'facet-capabilities-v26.json',
        'numeric-contracts-v1.json', 'artifact-integrity-v26.json', 'validation-result-v26.json'].map((p) => root + p)];
    const integrity = json<{ artifacts: Proof[] }>(root + 'artifact-integrity-v26.json');
    const pinned = lock.files.filter((p) => common.includes(p.path) || entries.some((s) => p.path.startsWith(s.folder))
      || entries.some((s) => p.path === `v102/sources/${s.id}.pine`));
    const relevant = (p: Proof) => common.includes(p.path) || entries.some(e => p.path.startsWith(e.folder) || p.path === `v102/sources/${e.id}.pine`);
    expect(pinned.map(p => p.path).sort()).toEqual([...integrity.artifacts.filter(relevant).map(p => p.path), root + 'artifact-integrity-v26.json'].sort());
    for (const p of pinned) {
      verify(p);
      if (p.path !== root + 'artifact-integrity-v26.json') expect(integrity.artifacts.find((f) => f.path === p.path), p.path).toEqual(p);
    }
    expect(json(root + 'validation-result-v26.json')).toMatchObject({ status: 'PASS' });
    const inventory = json<{ attempts: { source: { sourceId: string } }[] }>(root + 'attempt-inventory-v26.json');
    for (const family of ['box-text-layout', 'table-relocation']) {
      expect(inventory.attempts.some((a) => a.source.sourceId === `v102-${family}-v6`)).toBe(true);
    }

  });

  for (const s of entries) describe(s.id, () => {
    it('authenticates Saved source/private version, literal plot ordinals and every original target pointer', () => {
      const obs = json<{ requested: Proof; executed: Proof; sourceForm: Proof; sourceSha256: string; privateScriptId: string;
        privateVersion: string; nativeCompileSuccess: boolean; saveBody: Proof; addBody: Proof; editorMarkerArrays: null;
        sourceSpecificExecutionId: null }>(s.folder + 'attempt-v1/observation-v1.json');
      expect(read(obs.requested.path)).toBe(s.source);
      [obs.requested, obs.executed, obs.sourceForm, obs.saveBody, obs.addBody, s.block.csv, s.block.columnBindings, s.block.closureMask,
        s.map.originalPng].forEach(verify);
      expect(hash(bytes(obs.executed.path))).toBe(obs.sourceSha256);
      expect(s.numeric.sourceSha256).toBe(obs.sourceSha256);
      expect(s.map.sourceSha256).toBe(obs.sourceSha256);
      expect(s.map.originalCsv).toEqual(s.block.csv);
      const form = read(obs.sourceForm.path).replaceAll('\r\n', '\n').split('name="source"\n\n')[1].split(/\n------WebKitFormBoundary/)[0];
      expect(form.trimEnd()).toBe(s.source.trimEnd());
      expect(obs).toMatchObject({ nativeCompileSuccess: true, editorMarkerArrays: null, sourceSpecificExecutionId: null });
      const binding = json<{ nativePrivateId: string; nativePrivateVersion: string; columns: { columnOrdinal: number; originalHeader: string;
        nativePlotId?: string; sourceSha256?: string; owner: string }[] }>(s.block.columnBindings.path);
      expect(binding).toMatchObject({ nativePrivateId: obs.privateScriptId, nativePrivateVersion: obs.privateVersion });
      expect(binding.columns.map((c) => [c.columnOrdinal, c.originalHeader])).toEqual(s.headers.map((h, i) => [i + 1, h]));
      for (const [i, c] of binding.columns.slice(6).entries()) {
        expect(c).toMatchObject({ nativePlotId: `plot_${i}`, sourceSha256: obs.sourceSha256, owner: obs.privateScriptId });
      }
      const pointer = (p: Pointer) => {
        expect(p.csvSha256).toBe(s.block.csv.sha256);
        expect(s.headers[p.columnOrdinal - 1]).toBe(p.headerRaw);
        expect(s.rows[p.rowOrdinal - 1][p.columnOrdinal - 1]).toBe(p.valueRaw);
      };
      for (const row of s.block.rows) Object.values(row.cells).forEach(pointer);
      Object.values(s.map.visualAnchor).forEach(pointer);
      expect(s.compiled.success).toBe(true);
      expect(s.result.errors).toEqual([]);
    });

    it('re-derives earliest32 phase0 closed rows before the unique anchor, retaining all other raw observations as excluded', () => {
      expect(s.rows).toHaveLength(s.version === 6 ? s.family === 'box-text-layout' ? 329 : 330 : s.family === 'box-text-layout' ? 312 : 313);
      const eligible = s.rows.map((_, i) => {
        const m = Object.fromEntries(s.maskHeaders.map((h, j) => [h, s.mask[i][j]]));
        const closed = Number(s.cell(i, 'time')) * 1000 + 120000 <= Date.parse(m.export_utc) && s.cell(i, 'CHART_CONFIRMED') === '1';
        expect(m.csv_sha256).toBe(s.block.csv.sha256);
        expect(m.row_ordinal).toBe(String(i + 1));
        expect(m.independently_closed).toBe(closed ? '1' : '0');
        expect(s.cell(i, 'INPUT_TIME')).toBe(String(Number(s.cell(i, 'time')) * 1000));
        expect(s.cell(i, 'INPUT_INDEX')).toBe(String(s.firstIndex + i));
        expect(s.cell(i, 'CASE_ID')).toBe(String((s.firstIndex + i) % 8));
        if (i) expect(Number(s.cell(i, 'time'))).toBeGreaterThan(Number(s.cell(i - 1, 'time')));
        return closed;
      });
      const anchors = s.rows.flatMap((_, i) => s.cell(i, 'VISUAL_ANCHOR_INDEX') !== '' ? [i] : []);
      expect(anchors).toEqual([s.rows.length - 2]);
      const start = s.rows.findIndex((_, i) => Number(s.cell(i, 'INPUT_INDEX')) >= 200 && s.cell(i, 'CASE_ID') === '0'
        && i + 32 <= anchors[0] && eligible.slice(i, i + 32).length === 32 && eligible.slice(i, i + 32).every(Boolean));
      expect(start).toBe(4);
      const selected = Array.from({ length: 32 }, (_, i) => start + i + 1);
      expect(s.block.primaryRowOrdinals).toEqual(selected);
      expect(s.numeric.primaryRows).toEqual(selected);
      expect(s.block.completePrimaryCertificate).toBe(true);
      for (let i = 0; i < s.rows.length; i++) {
        const m = Object.fromEntries(s.maskHeaders.map((h, j) => [h, s.mask[i][j]])), primary = selected.includes(i + 1);
        expect(m.primary_scoring_eligible).toBe(primary ? '1' : '0');
        expect(m.present_cell_status).toBe(primary ? 'OBSERVED' : 'OBSERVED / EXCLUDED');
        if (!primary) expect(m.primary_exclusion_cause).not.toBe('');
      }
      expect(eligible.filter(Boolean)).toHaveLength(s.rows.length - 1);
      expect(s.block.uniqueVisualAnchorRowOrdinal).toBe(anchors[0] + 1);
    });

    for (const title of s.headers.slice(6)) it(`matches all32 native ${title} cells with declared coordinate projection`, () => {
      const expected = s.block.primaryRowOrdinals.map((ordinal) => {
        const raw = s.cell(ordinal - 1, title);
        return raw === '' ? null : Number(raw) - (title === 'INPUT_INDEX' ? s.origin : 0);
      });
      const actual = s.block.primaryRowOrdinals.map((ordinal) => s.output(title)[ordinal - s.start - 1]);
      expect(actual).toEqual(expected);
      for (const [i, value] of actual.entries()) expect(value === null ? '' : String(value + (title === 'INPUT_INDEX' ? s.origin : 0))).toBe(s.cell(s.block.primaryRowOrdinals[i] - 1, title));
    });

    it('preserves each scoped numeric prediction and collision variant verdict independently of appearance', () => {
      expect(s.numeric.uniquePrimaryPlotCells).toBe(s.family === 'box-text-layout' ? 384 : 416);
      expect(s.numeric.properties).toHaveLength(s.family === 'box-text-layout' ? 10 : 8);
      for (const property of s.numeric.properties) {
        expect(property.verdict).toBe('SUPPORTED');
        expect(property.comparisonRows).toHaveLength(32);
        for (const r of property.comparisonRows) {
          expect(r.cellVerdict).toBe('S');
          expect(r.expectedRaw ?? '').toBe(s.cell(r.rowOrdinal - 1, property.title));
        }
      }
      if (s.version === 6 && s.family === 'table-relocation') {
        const observation = json<{ facets: { excludedDevelopingRow?: { targets: Record<string, Pointer>; status: string; primaryScoringCredit: number } }[] }>(s.folder + 'derived-region-map-v1.json').facets[0].excludedDevelopingRow!;
        expect(observation).toMatchObject({ status: 'OBSERVED / EXCLUDED', primaryScoringCredit: 0 });
        for (const [title, raw] of Object.entries({ CREATED_DELTA: '2', COLLISION_DELTA: '1', OLD_TABLE_NA: '1', FINAL_DELTA: '0', CHART_CONFIRMED: '0' })) {
          const target = observation.targets[title];
          expect(target.valueRaw).toBe(raw);
          expect(s.cell(target.rowOrdinal - 1, title)).toBe(raw);
          expect(s.block.primaryRowOrdinals).not.toContain(target.rowOrdinal);
        }
      }
      if (s.family === 'table-relocation') {
        const alternative = s.numeric.numericAlternatives[0];
        expect(alternative).toMatchObject({ id: 'table-collision-lifecycle', supportedVariantIds: ['INVALIDATE_REPLACE'], observation: 'ONLY_REGISTERED_VARIANT' });
        expect(alternative.variants.map((v) => [v.id, v.verdict])).toEqual([
          ['RETAIN', 'REFUTED'], ['INVALIDATE_REPLACE', 'SUPPORTED'],
        ]);
        for (const [title, value] of Object.entries({ CREATED_DELTA: 3, COLLISION_DELTA: 2, OLD_TABLE_NA: 1, FINAL_DELTA: 2 }))
          expect(s.block.primaryRowOrdinals.map((o) => s.output(title)[o - s.start - 1])).toEqual(Array(32).fill(value));
      }
    });

    it('keeps every UNDECIDED appearance property held with its native cause and zero credit', () => {
      const held = s.map.facets.filter((f) => f.verdict === 'UNDECIDED');
      expect(held).toHaveLength(s.family === 'box-text-layout' ? 2 : 4);
      for (const facet of held) {
        expect(facet.notObservedCause).toBeTruthy();
        expect(facet.supportedCandidate ?? null).toBeNull();
        expect({ verdict: facet.verdict, parityCredit: 0 }).toEqual({ verdict: 'UNDECIDED', parityCredit: 0 });
      }
      const assessment = json<{ cases: { caseId: string; visual: { verdict: string; cause: string | null } | null }[] }>(s.folder + (s.version === 6 ? 'facet-assessment-v3.json' : 'facet-assessment-v2.json'));
      for (const f of s.map.facets) {
        const visual = assessment.cases.find((c) => c.caseId === f.caseId)!.visual;
        if (visual) expect(visual.verdict).toBe(f.verdict);
        else {
          expect(f.caseId).toBe(`v102-table-relocation-v${s.version}:same-position-retain-vs-replace`);
          expect(f.verdict).toBe('UNDECIDED');
        }
      }
      if (s.version === 6 && s.family === 'box-text-layout') {
        const formatting = json<{ cases: { caseId: string; verdict: string; visual: { verdict: string; artifact: Proof; cause: string } }[] }>(s.folder + 'facet-assessment-v3.json').cases.find(c => c.caseId.endsWith(':bold-italic-explicit'))!;
        expect(formatting).toMatchObject({ verdict: 'UNDECIDED', visual: { verdict: 'UNDECIDED' } });
        verify(formatting.visual.artifact);
        expect(formatting.visual.cause).toContain('no independent same-word none-format control');
      }
      if (s.family === 'box-text-layout') {
        expect(s.map.facets[2].subproperties!.map((p) => [p.property, p.verdict])).toEqual([
          ['vertical top versus bottom', 'SUPPORTED'], ['horizontal left versus right', 'UNDECIDED'],
        ]);
        expect(s.map.facets[2].subproperties![1].cause).toBeTruthy();
      }
    });

    if (s.family === 'box-text-layout') {
      it('encodes PNG-supported complete setter/constructor text recipe equivalence', () => {
        expect(s.map.facets[0]).toMatchObject({ verdict: 'SUPPORTED', supportedCandidate: 'APPLIED_COMPLETE_TEXT_RECIPE_MATCHES_CONSTRUCTOR',
          visibleLinesByRegion: { setter: ['ALPHA BETA', 'OMEGA'], constructor: ['ALPHA BETA', 'OMEGA'] } });
        const boxes = s.result.drawings.filter((d): d is BoxDrawingOutput => d.type === 'box');
        const wide = boxes.filter((b) => b.top === 95);
        expect(wide).toHaveLength(2);
        for (const b of wide) expect(b).toMatchObject({ text: 'ALPHA BETA\nOMEGA', textColor: '#2962FF', textSize: 'normal',
          textHalign: 'left', textValign: 'top', textWrap: 'auto', textFontFamily: 'monospace' });
        if (s.version === 6) expect(wide[0].textFormatting).toBe(wide[1].textFormatting);
      });
      it('encodes the separately witnessed vertical top/bottom subfacet without horizontal/wrap credit', () => {
        const boxes = s.result.drawings.filter((d): d is BoxDrawingOutput => d.type === 'box' && d.top === 45);
        expect(boxes).toHaveLength(2);
        expect(boxes.map((b) => [b.text, b.textValign])).toEqual([['A B C D', 'top'], ['A B C D', 'bottom']]);
        expect(s.map.facets[2].subproperties![0]).toMatchObject({ verdict: 'SUPPORTED', supportedCandidate: 'TOP_AND_BOTTOM_DIFFER' });
        const [top, bottom] = s.map.facets[2].subproperties![0].regionsPx!;
        expect(bottom[1] - top[3]).toBeGreaterThan(2 * s.map.derivedCalibration.coordinateUncertaintyPx.y);
      });
    }
  });
});
