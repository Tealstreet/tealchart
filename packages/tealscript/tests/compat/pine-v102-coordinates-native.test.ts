import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic';

interface Proof { path: string; bytes: number; sha256: string }
interface Cell { csvSha256: string; rowOrdinal: number; columnOrdinal: number; headerRaw: string; valueRaw: string }
interface Block {
  sourceSha256: string; nativePrivateId: string; nativePrivateVersion: string;
  csv: Proof; closureMask: Proof; columnBindings: Proof; completePrimaryCertificate: boolean;
  primaryRowOrdinals: number[]; originalClosedPredecessorRows: number[]; uniqueVisualAnchorRowOrdinal: number;
  rows: { rowOrdinal: number; phase: number; cells: Record<string, Cell> }[];
  visualAnchor: { rowOrdinal: number; cells: Record<string, Cell> };
}
interface Property {
  title: string; verdict: string; sourcePlotOrdinal: number; contractArtifact: Proof; contractPointer: string;
  expectedRawByPhase: string[]; nativeTargets: Proof;
  comparisonRows: { rowOrdinal: number; phase: number; expectedRaw: string; actualPointer: string; cellVerdict: string }[];
}
interface Numeric {
  sourceSha256: string; primaryInputCertificateValid: boolean; primaryRows: number[]; uniquePrimaryPlotCells: number;
  properties: Property[]; nativeBlock: Proof;
}
interface Facet {
  caseId: string; verdict: string; supportedCandidate: string; scope?: string; notExercised?: string;
  aliasLimit?: string; notObservedCause?: string; visibleTextLiterals?: string[];
  regions: { originalPngRectPx?: number[]; setterRectPx?: number[]; constructorRectPx?: number[] }[];
}
interface Region {
  sourceSha256: string; originalPng: Proof; originalDimensionsPx: { width: number; height: number };
  originalCsv: Proof; sessionReceipt: Proof; visualAnchor: Record<string, Cell>; facets: Facet[];
  anchorCertificate: string; nativeFrameId: null; nativeFrameIdStatus: string; preservedUnobserved: string[];
  derivedCalibration: { anchorXPx: number; pixelsPerOwnIndex: number; xTicks: { xPx: number; originalOwnIndex: Cell; originalTime: Cell }[];
    yTicks: { value: number; yPx: number }[]; coordinateUncertaintyPx: { x: number; y: number } };
}
const capture = 'v102/captures/v102/';
const versions = [5];
const raw = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url));
const text = (path: string) => raw(path).toString('utf8');
const json = <T,>(path: string): T => JSON.parse(text(path)) as T;
const proof = (path: string): Proof => ({ path, bytes: raw(path).length, sha256: createHash('sha256').update(raw(path)).digest('hex') });
const lock = JSON.parse(readFileSync(new URL('../../oracle-fixtures.json', import.meta.url), 'utf8')) as { revision: string; files: Proof[] };
const table = (path: string) => {
  const [headers, ...rows] = text(path).trimEnd().split(/\r?\n/).map(line => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(v => v.startsWith('"') ? v.slice(1, -1).replaceAll('""', '"') : v));
  return { headers, rows };
};
function pointer<T>(value: unknown, path: string): T {
  return path.slice(1).split('/').reduce((node, part) => (node as Record<string, unknown>)[part.replaceAll('~1', '/').replaceAll('~0', '~')], value) as T;
}
function sameRaw(value: number | null, expected: string) {
  if (expected === '') expect(value).toBeNull();
  else { expect(Object.is(value, Number(expected))).toBe(true); expect(String(value)).toBe(expected); }
}

for (const version of versions) {
  const id = `v102-coordinate-render-v${version}`, prefix = capture + id + '/', attempt = prefix + 'attempt-v1/';
  const block = json<Block>(prefix + 'native-cell-block-v1.json');
  const numeric = json<Numeric>(prefix + 'numeric-results-v1.json');
  const region = json<Region>(prefix + 'derived-region-map-v1.json');
  const data = table(block.csv.path), mask = table(block.closureMask.path);
  const cell = (p: Cell) => {
    expect(p.csvSha256).toBe(proof(block.csv.path).sha256);
    expect(data.headers[p.columnOrdinal - 1]).toBe(p.headerRaw);
    expect(data.rows[p.rowOrdinal - 1][p.columnOrdinal - 1]).toBe(p.valueRaw);
    return p.valueRaw;
  };
  let replayed: ReturnType<typeof executeCompiled>;
  const start = block.originalClosedPredecessorRows[0], end = block.uniqueVisualAnchorRowOrdinal;
  const offset = Number(data.rows[start - 1][data.headers.indexOf('INPUT_INDEX')]);
  function replay() {
    if (!replayed) {
      const program = parse(text(attempt + 'executed-v1.pine'));
      expect(checkProgram(program).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
      const compiled = tryCompile(program);
      expect(compiled.success, compiled.unsupported.join('\n')).toBe(true);
      const bars = data.rows.slice(start - 1, end).map(row => ({ time: Number(row[0]) * 1000,
        open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: Number(row[5]) }));
      replayed = executeCompiled(compiled, bars);
      expect(replayed!.errors).toEqual([]);
      expect(replayed!.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(replayed!.profile.swallowedErrors ?? []).toEqual([]);
    }
    return replayed!;
  }
  function actual(title: string, ordinal: number) {
    return replay().plots.find(p => p.title === title)!.values[ordinal - start];
  }
  function geometry() {
    const drawings = replay().drawings!;
    expect(drawings.map(d => d.type)).toEqual(['line', 'box', 'label', 'line', 'box', 'label']);
    return drawings.map(d => {
      expect('xloc' in d ? d.xloc : undefined).toBe('bar_index');
      const at = end - start;
      if (d.type === 'line') return [d.x1! - at, d.y1, d.x2! - at, d.y2];
      if (d.type === 'box') return [d.left! - at, d.top, d.right! - at, d.bottom];
      if (d.type === 'label') return [d.x! - at, d.y, d.text];
      throw new Error('Unexpected coordinate drawing');
    });
  }

  describe(`${id}: bounded native coordinate and final-geometry evidence`, () => {
    it('binds the original source, native bodies, CSV/closure, PNG, contracts and derived verdicts', () => {
      expect(lock.revision).toBe('f47a4e34ce33441ad37add124d9572119826138d');
      const integrity = json<{ artifacts: Proof[] }>(capture + 'artifact-integrity-v6.json');
      const shared = ['CAPTURE-TOOLING-LICENSE-v1.md', 'RESPONSE-v102-v6.md', 'account-actions-v6.json',
        'attempt-inventory-v6.json', 'facet-capabilities-v6.json', 'numeric-contracts-v1.json',
        'numeric-controls-v6.json', 'validation-result-v6.json'].map(path => capture + path);
      const paths = [...integrity.artifacts.filter(f => f.path.startsWith(prefix) || f.path === `v102/sources/${id}.pine`
        || shared.includes(f.path) || ['v102/REQUEST-v102-v1.md', 'v102/CASE-MATRIX-v1.json'].includes(f.path)), proof(capture + 'artifact-integrity-v6.json')];
      expect(paths).toHaveLength(50);
      for (const entry of paths) {
        expect(proof(entry.path)).toEqual(entry);
        expect(lock.files.find(f => f.path === entry.path)).toEqual(entry);
      }
      expect(proof(attempt + 'executed-v1.pine').sha256).toBe(block.sourceSha256);
      expect(text(attempt + 'executed-v1.pine')).toBe(text(`v102/sources/${id}.pine`));
      expect(text(attempt + 'save-request-v1.txt').replaceAll('\r\n', '\n')).toContain(text(attempt + 'executed-v1.pine').trimEnd());
      const columns = json<{ sourceSha256: string; nativePrivateId: string; columns: { columnOrdinal: number; originalHeader: string; sourceSha256?: string; owner: string; nativePlotId?: string }[] }>(block.columnBindings.path);
      expect(columns.sourceSha256).toBe(block.sourceSha256);
      expect(columns.nativePrivateId).toBe(block.nativePrivateId);
      for (const [index, c] of columns.columns.entries()) {
        expect([c.columnOrdinal, c.originalHeader]).toEqual([index + 1, data.headers[index]]);
        if (index < 6) continue;
        expect([c.owner, c.sourceSha256, c.nativePlotId]).toEqual([block.nativePrivateId, block.sourceSha256, `plot_${index - 6}`]);
        for (const body of ['save-response-v1.json', 'add-response-v1.json']) {
          const meta = json<{ success: boolean; result: { metaInfo: { styles: Record<string, { title: string }> } } }>(attempt + body);
          expect(meta.success).toBe(true);
          expect(meta.result.metaInfo.styles[c.nativePlotId!].title).toBe(c.originalHeader);
        }
      }
      const png = raw(region.originalPng.path);
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([region.originalDimensionsPx.width, region.originalDimensionsPx.height]);
      expect(proof(region.originalPng.path)).toEqual(region.originalPng);
      expect(region.originalCsv).toEqual(block.csv);
      expect(region.sourceSha256).toBe(block.sourceSha256);
      const [left, right] = region.derivedCalibration.xTicks;
      for (const tick of [left, right]) { cell(tick.originalTime); cell(tick.originalOwnIndex); }
      const dx = (right.xPx - left.xPx) / (Number(right.originalOwnIndex.valueRaw) - Number(left.originalOwnIndex.valueRaw));
      expect(region.derivedCalibration.pixelsPerOwnIndex).toBe(dx);
      expect(region.derivedCalibration.anchorXPx).toBe(left.xPx + dx * (Number(cell(region.visualAnchor.INPUT_INDEX)) - Number(left.originalOwnIndex.valueRaw)));
      expect(json<{ status: string }>(capture + 'validation-result-v6.json').status).toBe('PASS');
    });

    it('re-derives every closure/phase/mask and preserves all excluded raw observations', () => {
      expect([numeric.primaryInputCertificateValid, block.completePrimaryCertificate]).toEqual([true, true]);
      expect(numeric.primaryRows).toEqual(block.primaryRowOrdinals);
      expect(numeric.uniquePrimaryPlotCells).toBe(512);
      expect([start, offset % 8, block.originalClosedPredecessorRows.length]).toEqual([5, 0, 8]);
      expect(block.primaryRowOrdinals).toEqual(Array.from({ length: 32 }, (_, i) => i + 13));
      let closed = 0, primary = 0, excluded = 0;
      for (const [index, row] of data.rows.entries()) {
        const record = mask.rows[index], at = (name: string) => row[data.headers.indexOf(name)];
        const endTime = Number(row[0]) + 120;
        const isClosed = at('CHART_CONFIRMED') === '1' && endTime * 1000 <= Date.parse(record[7]);
        const selected = block.primaryRowOrdinals.includes(index + 1);
        const phaseValid = Number(at('CASE_ID')) === Number(at('INPUT_INDEX')) % 8 && at('INPUT_TIME') === String(Number(row[0]) * 1000);
        const eligible = isClosed && phaseValid && Number(at('INPUT_INDEX')) >= 200;
        expect(record.slice(0, 7)).toEqual([block.csv.sha256, String(index + 1), row[0], at('INPUT_TIME'), at('INPUT_INDEX'), at('CASE_ID'), at('CHART_CONFIRMED')]);
        expect([record[8], record[9], record[10], record[11]]).toEqual([String(endTime), isClosed ? '1' : '0', phaseValid ? '1' : '0', eligible ? '1' : '0']);
        expect(JSON.parse(record[12])).toEqual(row.flatMap((v, i) => v === '' ? [i + 1] : []));
        expect([record[13], record[14]]).toEqual([selected ? '1' : '0', selected ? 'OBSERVED' : 'OBSERVED / EXCLUDED']);
        expect(Number(at('CASE_ID'))).toBe(Number(at('INPUT_INDEX')) % 8);
        expect(at('INPUT_TIME')).toBe(String(Number(row[0]) * 1000));
        if (selected) { expect(isClosed).toBe(true); primary++; } else { expect(record[15]).toBe(!isClosed ? 'PHYSICALLY_OPEN_OR_SOURCE_CONFIRMATION_CONTEXT_UNAVAILABLE'
          : index + 1 === end ? 'VISUAL_ANCHOR_ROW' : block.originalClosedPredecessorRows.includes(index + 1) ? 'RESERVED_ORIGINAL_CLOSED_PREDECESSOR' : 'OUTSIDE_FIXED_PRIMARY_BLOCK'); excluded++; }
        closed += Number(isClosed);
      }
      expect([data.rows.length, closed, primary, excluded]).toEqual([311, 310, 32, 279]);
      for (const ordinal of block.originalClosedPredecessorRows) expect(mask.rows[ordinal - 1][15]).toBe('RESERVED_ORIGINAL_CLOSED_PREDECESSOR');
      expect(mask.rows.at(-1)![14]).toBe('OBSERVED / EXCLUDED');
    });

    for (const property of numeric.properties) it(`matches supported numeric property ${property.title} exactly`, () => {
      expect(property.verdict).toBe('SUPPORTED');
      expect(proof(property.contractArtifact.path)).toEqual(property.contractArtifact);
      const contract = pointer<{ title: string }>(json<unknown>(property.contractArtifact.path), property.contractPointer);
      expect(contract.title).toBe(property.title);
      expect(proof(property.nativeTargets.path)).toEqual(property.nativeTargets);
      expect(property.comparisonRows).toHaveLength(32);
      for (const comparison of property.comparisonRows) {
        const target = pointer<Cell>(block, comparison.actualPointer);
        expect([target.rowOrdinal, target.headerRaw, cell(target), comparison.cellVerdict]).toEqual([comparison.rowOrdinal, property.title, comparison.expectedRaw, 'S']);
        expect(comparison.expectedRaw).toBe(property.expectedRawByPhase[comparison.phase]);
        sameRaw(actual(property.title, comparison.rowOrdinal), target.valueRaw);
      }
    });

    it('asserts the 64 index/time input cells as context only, and the separately owned visual anchor', () => {
      let comparisons = 0;
      for (const row of block.rows) for (const title of ['INPUT_INDEX', 'INPUT_TIME']) {
        const value = actual(title, row.rowOrdinal)! + (title === 'INPUT_INDEX' ? offset : 0);
        sameRaw(value, cell(row.cells[title])); comparisons++;
      }
      expect([comparisons, numeric.properties.length * 32]).toEqual([64, 448]);
      expect(block.visualAnchor.rowOrdinal).toBe(end);
      for (const [title, target] of Object.entries(region.visualAnchor)) {
        cell(target);
        if (title === 'time') continue;
        const value = actual(title, end)! + (['INPUT_INDEX', 'VISUAL_ANCHOR_INDEX'].includes(title) ? offset : 0);
        sameRaw(value, target.valueRaw);
      }
      expect(region.anchorCertificate).toBe('OWNED / unique closed source marker');
    });

    for (const [index, facet] of region.facets.entries()) it(`encodes supported visual property ${facet.caseId} from its original PNG/map`, () => {
      expect(facet.verdict).toBe('SUPPORTED');
      const geometries = geometry();
      const targets = [[-20, 30, -12, 50], [-60, 30, -40, 10], [-90, 15, 'POINT'], [-20, 70, -12, 90], [-60, 70, -40, 50], [-90, 55, 'CONTROL']];
      if (index < 3) expect(geometries[index]).toEqual(targets[index]);
      else expect(geometries).toEqual(targets);
      const calibration = region.derivedCalibration;
      const y0 = calibration.yTicks.find(t => t.value === 0)!.yPx;
      const dy = (y0 - calibration.yTicks.find(t => t.value === 100)!.yPx) / 100;
      const project = (x: number, y: number) => [calibration.anchorXPx + x * calibration.pixelsPerOwnIndex, y0 - y * dy];
      for (const [pair, area] of facet.regions.entries()) {
        const drawingIndex = index < 3 ? index + (pair === 1 ? 3 : 0) : pair;
        const g = geometries[drawingIndex];
        const points = drawingIndex % 3 === 2 ? [[g[0], g[1]]] : [[g[0], g[1]], [g[2], g[3]]];
        const rect = area.originalPngRectPx ?? area.setterRectPx!;
        for (const [x, y] of points) {
          const [px, py] = project(Number(x), Number(y));
          expect(px).toBeGreaterThanOrEqual(rect[0]); expect(px).toBeLessThanOrEqual(rect[2]);
          expect(py).toBeGreaterThanOrEqual(rect[1]); expect(py).toBeLessThanOrEqual(rect[3]);
        }
        if (index === 3) {
          const control = geometries[pair + 3];
          expect(control[0]).toBe(g[0]); expect(Number(control[1]) - Number(g[1])).toBe(40);
        }
      }
    });

    it('keeps unsupported intermediate modes, coincident-setter alternatives and raster/identity claims held', () => {
      const assessment = json<{ cases: { verdict: string; v5BoxXlocCredit?: number; unobservedIntermediateLabelTimeTransition?: string }[]; held: string[] }>(prefix + 'facet-assessment-v2.json');
      expect(assessment.cases.map(c => c.verdict)).toEqual(['SUPPORTED', 'SUPPORTED', 'SUPPORTED', 'SUPPORTED']);
      expect(assessment.cases[1].v5BoxXlocCredit).toBe(0);
      expect(assessment.cases[2].unobservedIntermediateLabelTimeTransition).toContain('No getter observes the transient label bar_time state');
      expect(region.facets[1].notExercised).toContain('No box.set_xloc call exists');
      expect(region.facets[1].aliasLimit).toContain('ignored box-point setter is not distinguished');
      expect(region.facets[2].notObservedCause).toContain('ignored point/time setters are not separated');
      expect(assessment.held).toEqual(['Any absent/unreadable/nonintersecting/already obscured/precision-ambiguous pixel region',
        'All native backend token explanations, universal raster/font metrics and historical holds']);
      expect(region.preservedUnobserved).toEqual(['Unexposed zoom/DPI/resolved-font metrics and native frame ID',
        'Every absent, clipped, already occluded, nonintersecting or precision-ambiguous region',
        'All historical v93 appearance/context holds and universal raster/color/identity contracts']);
      expect(region.nativeFrameId).toBeNull();
      expect(region.nativeFrameIdStatus).toContain('UNOBSERVED');
      expect(region.derivedCalibration.coordinateUncertaintyPx).toEqual({ x: 2, y: 3 });
      expect(numeric.properties.find(p => p.title === 'BOX_TIME_DELTA')!.expectedRawByPhase).toEqual(Array(8).fill(''));
    });
  });
}
