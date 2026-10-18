import { copy6, copyRevision } from '../fixtures/v103Copy';
import type { CopyPointer } from '../fixtures/v103Copy';
import { executeEntry, raw as bytes, text, json, lock, table as csv, revision } from '../fixtures/v102Fixture';
import type { BoxDrawingOutput, LabelDrawingOutput, LineDrawingOutput } from '../../src/runtime/drawings/types';

import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';


interface Proof { path: string; bytes: number; sha256: string }
interface Pointer { csvSha256: string; rowOrdinal: number; columnOrdinal: number; headerRaw: string; valueRaw: string }
interface Property {
  title: string; verdict: string; nativeTargets: Proof; contractArtifact: Proof; contractPointer: string;
  expectedRawByPhase: string[]; comparisonRows: { rowOrdinal: number; phase: number; expectedRaw: string; actualPointer: string; cellVerdict: string; cause: null }[];
}
interface Block {
  sourceId: string; sourceSha256: string; nativePrivateId: string; nativePrivateVersion: string;
  csv: Proof; columnBindings: Proof; closureMask: Proof; ownedTitles: string[];
  primaryRowOrdinals: number[]; testedRowOrdinals: number[]; completePrimaryCertificate: boolean;
  uniqueVisualAnchorRowOrdinal: number; originalClosedPredecessorRows: number[];
  rows: { rowOrdinal: number; phase: number; cells: Record<string, Pointer> }[];
}
interface RegionMap {
  sourceId: string; sourceSha256: string; nativePrivateId: string; nativePrivateVersion: string;
  originalPng: Proof; originalCsv: Proof; sourceObservation: Proof; sessionReceipt: Proof; renderContext: Proof; manualInspection: Proof;
  originalDimensionsPx: { width: number; height: number };
  nativeFrameId: null; anchorCertificate: string; visualAnchor: Record<string, Pointer>;
  exportAndPngClockBarUnchanged: boolean;
  derivedCalibration: {
    coordinateUncertaintyPx: { x: number; y: number }; pixelsPerOwnIndex: number; anchorXPx: number;
    primaryXPx: { rowOrdinal: number; xPx: number; visible: boolean }[];
    xTicks: { xPx: number; originalOwnIndex: Pointer; originalTime: Pointer }[];
  };
  facets: { caseId: string; verdict: string; supportedCandidate: string; scope: string;
    regions: { role: string; originalPngRectPx: number[]; visible: string }[]; visibleTextLiterals?: string[] }[];
  exposedAppearanceMetadata: { zoom: null; dpi: null; resolvedFont: null }; preservedUnobserved: string[]; scope: string;
}
const round = 'v102/captures/v102/';
const hash = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
const controls = json<{ sources: { sourceId: string; report: Proof; primaryRows: number[] }[] }>(round + 'numeric-controls-v14.json');
const sourceIds = controls.sources.filter(s => /^v102-copy-appearance-v[56]$/.test(s.sourceId) && s.primaryRows.length > 0).map(s => s.sourceId);
function assertBound(proof: Proof) {
  expect(lock.files.find(f => f.path === proof.path), proof.path).toEqual(proof);
  const raw = bytes(proof.path);
  expect({ path: proof.path, bytes: raw.length, sha256: hash(raw) }, proof.path).toEqual(proof);
}
function assertPointer(data: ReturnType<typeof csv>, block: Block, pointer: Pointer) {
  expect(pointer.csvSha256).toBe(block.csv.sha256);
  expect(data.headers[pointer.columnOrdinal - 1]).toBe(pointer.headerRaw);
  expect(data.rows[pointer.rowOrdinal - 1][pointer.columnOrdinal - 1]).toBe(pointer.valueRaw);
}
const bits = (value: number) => { const b = Buffer.alloc(8); b.writeDoubleBE(value); return b.toString('hex'); };
const entries = sourceIds.map(id => {
  const folder = round + id + '/';
  const report = json<{ sourceSha256: string; properties: Property[]; nativeBlock: Proof; primaryInputCertificateValid: boolean;
    uniquePrimaryPlotCells: number; observedWithoutPrediction: unknown[] }>(folder + 'numeric-results-v1.json');
  const block = json<Block>(report.nativeBlock.path), data = csv(block.csv.path), mask = csv(block.closureMask.path);
  const entry = { sourcePath: `v102/sources/${id}.pine`, csv: data, block };
  const first = block.primaryRowOrdinals[0];
  // The unchanged source has no carried state; relative fields are translation invariant.
  // One actual following closed row keeps the scored block before the local history frontier.
  const { result: primary, source } = executeEntry(entry, {
    startRowOrdinal: first, endRowOrdinal: first + 32, executionOptions: {},
  });
  const { result: anchor } = executeEntry(entry, {
    startRowOrdinal: 1, endRowOrdinal: block.uniqueVisualAnchorRowOrdinal, executionOptions: {},
  });
  return { id, folder, source, report, block, data, mask, primary, anchor,
    regions: json<RegionMap>(folder + 'derived-region-map-v1.json') };
});

describe('v102 finite drawing-copy appearance and independent getters', () => {
  it('binds the append-only fixture pin and shared immutable validation/integrity', () => {
    expect(lock.revision).toBe(revision);
    expect(sourceIds).toEqual(['v102-copy-appearance-v5']);
    expect(json<{ status: string }>(round + 'validation-result-v14.json').status).toBe('PASS');
    for (const proof of json<{ artifacts: Proof[] }>(round + 'artifact-integrity-v14.json').artifacts) assertBound(proof);
    for (const name of ['artifact-integrity-v14.json', 'RESPONSE-v102-v14.md', 'validation-result-v14.json']) {
      const proof = lock.files.find(f => f.path === round + name)!; expect(proof).toBeDefined(); assertBound(proof);
    }
  });

  it('holds the consumed v6 entry stop, all14 numeric properties and all three appearance cases at zero credit', () => {
    const folder = round + 'v102-copy-appearance-v6/';
    const held = json<{ sourceSha256: string; primaryInputCertificateValid: boolean; primaryRows: number[];
      uniquePrimaryPlotCells: number; nativeBlock: Proof; properties: Property[]; renderAssessment: null;
      sourceObservation: { requested: Proof; executed: null; saveBody: null; addBody: null; nativeCompileSuccess: null;
        privateScriptId: null; sourceEntryStop: Proof; receipt: Proof; admissionStatus: string } }>(folder + 'numeric-results-v1.json');
    const observation = held.sourceObservation;
    expect(observation.requested.path).toBe('v102/sources/v102-copy-appearance-v6.pine');
    expect(held.sourceSha256).toBe(observation.requested.sha256);
    assertBound(observation.requested); assertBound(observation.sourceEntryStop); assertBound(observation.receipt); assertBound(held.nativeBlock);
    expect([observation.executed, observation.saveBody, observation.addBody, observation.nativeCompileSuccess, observation.privateScriptId])
      .toEqual([null, null, null, null, null]);
    expect(observation.admissionStatus).toBe('NOT OBSERVED; incomplete native entry consumed its slot before Save/Add');
    const stop = json<{ status: string; nativeSaves: number; nativeAdds: number; originalCsvs: number; nativeRenderingPngs: number; retries: number }>(observation.sourceEntryStop.path);
    expect(stop).toMatchObject({ sourceId: 'v102-copy-appearance-v6', requestedSourceSha256: held.sourceSha256,
      status: 'ENTRY_STOP / slot consumed before Save', nativeSaves: 0, nativeAdds: 0,
      originalCsvs: 0, nativeRenderingPngs: 0, retries: 0 });
    expect([held.primaryInputCertificateValid, held.uniquePrimaryPlotCells, held.renderAssessment]).toEqual([false, 0, null]);
    expect(held.primaryRows).toEqual([]); expect(held.properties).toHaveLength(14);
    for (const property of held.properties) {
      expect(property.verdict).toBe('UNDECIDED'); expect(property.comparisonRows).toEqual([]);
      assertBound(property.nativeTargets); expect(property.nativeTargets).toEqual(held.nativeBlock);
    }
    const block = json<{ rows: unknown[]; primaryRowOrdinals: number[]; ownedTitles: string[]; completePrimaryCertificate: boolean;
      nativePrivateId: null; uniqueVisualAnchorRowOrdinal: null }>(held.nativeBlock.path);
    expect(block).toMatchObject({ sourceId: 'v102-copy-appearance-v6', sourceSha256: held.sourceSha256,
      rows: [], primaryRowOrdinals: [], ownedTitles: [], completePrimaryCertificate: false,
      nativePrivateId: null, uniqueVisualAnchorRowOrdinal: null });
    const facets = json<{ cases: { verdict: string; numeric: { verdict: string }; visual: { verdict: string } }[]; held: string[] }>(folder + 'facet-assessment-v2.json');
    expect(facets.cases).toHaveLength(3);
    for (const facet of facets.cases) expect(facet).toMatchObject({ verdict: 'UNDECIDED', numeric: { verdict: 'UNDECIDED' }, visual: { verdict: 'UNDECIDED' } });
    expect(facets.held).toEqual(['Any absent/unreadable/nonintersecting/already obscured/precision-ambiguous pixel region',
      'All native backend token explanations, universal raster/font metrics and historical holds']);
    expect(entries.some(e => e.id === 'v102-copy-appearance-v6')).toBe(false);
  });

  for (const e of entries) describe(e.id, () => {
    const { block, data, report, regions } = e;
    const value = (title: string, index: number) => e.primary.plots.find(p => p.title === title)!.values[index];
    it('joins exact request, Saved/Add source ownership, every plot and raw-cell pointer', () => {
      const observation = json<{ requested: Proof; executed: Proof; sourceForm: Proof; saveBody: Proof; addBody: Proof;
        privateScriptId: string; privateVersion: string; nativeCompileSuccess: boolean; editorMarkerArrays: null }>(e.folder + 'attempt-v1/observation-v1.json');
      for (const proof of [observation.requested, observation.executed, observation.sourceForm, observation.saveBody, observation.addBody,
        block.csv, block.columnBindings, block.closureMask, report.nativeBlock]) assertBound(proof);
      expect(bytes(observation.requested.path)).toEqual(bytes(observation.executed.path));
      expect(hash(Buffer.from(e.source))).toBe(block.sourceSha256);
      expect([observation.requested.sha256, report.sourceSha256]).toEqual([block.sourceSha256, block.sourceSha256]);
      const form = text(observation.sourceForm.path).replaceAll('\r\n', '\n');
      expect(form.split('name="source"\n\n')[1].split(/\n------WebKitFormBoundary/)[0]).toBe(e.source);
      expect([observation.privateScriptId, observation.privateVersion, observation.nativeCompileSuccess, observation.editorMarkerArrays])
        .toEqual([block.nativePrivateId, '1.0', true, null]);
      const binding = json<{ columns: { columnOrdinal: number; originalHeader: string; sourceLiteralPlotOrdinal?: number;
        nativePlotId?: string; sourceSha256?: string; owner: string; privateVersion?: string }[];
        missingOrAmbiguousRequestedPlotTitles: unknown[] }>(block.columnBindings.path);
      expect(binding.missingOrAmbiguousRequestedPlotTitles).toEqual([]);
      const titles = [...e.source.matchAll(/^plot\([^\n]*?, "([^"]+)"/gm)].map(m => m[1]);
      expect([...titles].sort()).toEqual(block.ownedTitles);
      for (const path of [observation.saveBody.path, observation.addBody.path]) {
        const body = json<{ success: boolean; result: { metaInfo: { scriptIdPart: string; styles: Record<string, { title: string }> } } }>(path);
        expect(body.success).toBe(true); expect(body.result.metaInfo.scriptIdPart).toBe(block.nativePrivateId);
        for (const [i, title] of titles.entries()) {
          expect(body.result.metaInfo.styles[`plot_${i}`].title).toBe(title);
          expect(binding.columns.find(c => c.sourceLiteralPlotOrdinal === i)).toMatchObject({
            columnOrdinal: data.headers.indexOf(title) + 1, originalHeader: title, sourceSha256: block.sourceSha256,
            owner: block.nativePrivateId, privateVersion: '1.0', nativePlotId: `plot_${i}`,
          });
        }
      }
      expect(block.rows).toHaveLength(32);
      for (const row of block.rows) for (const pointer of Object.values(row.cells)) assertPointer(data, block, pointer);
      expect(report.properties).toHaveLength(14);
      expect(report.uniquePrimaryPlotCells).toBe(512);
      for (const property of report.properties) {
        expect(property.verdict).toBe('SUPPORTED'); assertBound(property.contractArtifact);
        assertBound(property.nativeTargets); expect(property.nativeTargets).toEqual(report.nativeBlock);
        expect(property.comparisonRows).toHaveLength(32);
        for (const [i, comparison] of property.comparisonRows.entries()) {
          expect(comparison).toEqual({ rowOrdinal: block.primaryRowOrdinals[i], phase: i % 8,
            expectedRaw: property.expectedRawByPhase[i % 8], actualPointer: `/rows/${i}/cells/${property.title}`, cellVerdict: 'S', cause: null });
          const pointer = block.rows[i].cells[property.title];
          expect(pointer.headerRaw).toBe(property.title); assertPointer(data, block, pointer);
          expect(pointer.valueRaw).toBe(comparison.expectedRaw);
        }
      }
    });

    it('re-derives physical closure and earliest complete four eight-phase cycles without value filtering', () => {
      const rowSet = json<{ nativeExportUtc: string; dataRows: number; independentlyClosedRows: number;
        selectedPrimaryClosedRowOrdinals: number[]; uniqueVisualAnchorRowOrdinal: number }>(e.folder + 'attempt-v1/session-mode0-v1/row-set-observation-v1.json');
      const closed = data.rows.map((r, i) => Number(r[0]) * 1000 + 120_000 <= Date.parse(rowSet.nativeExportUtc)
        && data.raw(i + 1, 'CHART_CONFIRMED') === '1');
      expect(closed.filter(Boolean)).toHaveLength(rowSet.independentlyClosedRows);
      const anchors = data.rows.flatMap((_, i) => data.raw(i + 1, 'VISUAL_ANCHOR_TIME') === data.raw(i + 1, 'INPUT_TIME')
        && data.raw(i + 1, 'VISUAL_ANCHOR_INDEX') === data.raw(i + 1, 'INPUT_INDEX') && closed[i] ? [i + 1] : []);
      expect(anchors).toEqual([block.uniqueVisualAnchorRowOrdinal]);
      const first = data.rows.findIndex((_, i) => closed[i] && i + 1 < anchors[0]
        && Number(data.raw(i + 1, 'INPUT_INDEX')) >= 200 && data.raw(i + 1, 'CASE_ID') === '0');
      expect(block.primaryRowOrdinals).toEqual(Array.from({ length: 32 }, (_, i) => first + i + 1));
      expect(block.testedRowOrdinals).toEqual(block.primaryRowOrdinals);
      expect(rowSet.selectedPrimaryClosedRowOrdinals).toEqual(block.primaryRowOrdinals);
      expect([report.primaryInputCertificateValid, block.completePrimaryCertificate]).toEqual([true, true]);
      const maskColumn = e.mask.headers.indexOf('independently_closed');
      expect(maskColumn).toBeGreaterThanOrEqual(0);
      for (const [i, r] of data.rows.entries()) {
        expect(e.mask.rows[i][maskColumn]).toBe(closed[i] ? '1' : '0');
        expect(data.raw(i + 1, 'INPUT_TIME')).toBe(String(Number(r[0]) * 1000));
        if (i) {
          expect(Number(r[0])).toBeGreaterThan(Number(data.rows[i - 1][0]));
          expect(Number(data.raw(i + 1, 'INPUT_INDEX'))).toBe(Number(data.raw(i, 'INPUT_INDEX')) + 1);
        }
      }
      expect(block.primaryRowOrdinals.map(n => data.raw(n, 'CASE_ID'))).toEqual(Array.from({ length: 32 }, (_, i) => String(i % 8)));
      expect(block.primaryRowOrdinals.every(n => closed[n - 1] && n < anchors[0])).toBe(true);
      expect(block.primaryRowOrdinals.every(n => !['VISUAL_ANCHOR_TIME', 'VISUAL_ANCHOR_INDEX'].some(t => data.raw(n, t) !== ''))).toBe(true);
      expect(e.primary.errors).toEqual([]); expect(e.anchor.errors).toEqual([]);
      expect(e.primary.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(e.anchor.profile.compiledBarErrors?.count ?? 0).toBe(0);
    });

    for (const property of report.properties) it(`exact native property: ${property.title}`, () => {
      for (const [i, ordinal] of block.primaryRowOrdinals.entries()) {
        const raw = data.raw(ordinal, property.title), actual = value(property.title, i);
        if (raw === '') expect(actual, `${ordinal}:${property.title}`).toBeNull();
        else {
          expect(actual, `${ordinal}:${property.title}`).toBe(Number(raw));
          expect(String(actual)).toBe(raw); expect(bits(actual as number)).toBe(bits(Number(raw)));
        }
      }
    });

    it('counts 448 property comparisons and 32 timestamp controls, excluding all absolute indices and other/developing rows', () => {
      expect(report.properties.length * block.primaryRowOrdinals.length).toBe(448);
      expect(e.primary.plots.find(p => p.title === 'INPUT_INDEX')!.values.slice(0, 32)).toEqual(Array.from({ length: 32 }, (_, i) => i));
      expect(block.primaryRowOrdinals.every((n, i) => data.raw(n, 'INPUT_INDEX') !== String(i))).toBe(true);
      for (const [i, n] of block.primaryRowOrdinals.entries()) expect(String(value('INPUT_TIME', i))).toBe(data.raw(n, 'INPUT_TIME'));
      expect(report.observedWithoutPrediction).toEqual([]);
    });

    it('binds every visible copy verdict to original PNG, session, source-owned anchor and derived regions', () => {
      for (const proof of [regions.originalPng, regions.originalCsv, regions.sourceObservation, regions.sessionReceipt, regions.renderContext, regions.manualInspection]) assertBound(proof);
      expect([regions.sourceId, regions.sourceSha256, regions.nativePrivateId, regions.nativePrivateVersion])
        .toEqual([e.id, block.sourceSha256, block.nativePrivateId, '1.0']);
      expect(regions.originalCsv).toEqual(block.csv);
      const png = bytes(regions.originalPng.path);
      expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1706, 993]);
      expect(regions.originalDimensionsPx).toEqual({ width: 1706, height: 993 });
      expect(regions.exportAndPngClockBarUnchanged).toBe(true);
      expect(regions.anchorCertificate).toBe('OWNED / unique closed source marker');
      for (const pointer of Object.values(regions.visualAnchor)) { assertPointer(data, block, pointer); expect(pointer.rowOrdinal).toBe(block.uniqueVisualAnchorRowOrdinal); }
      const facets = json<{ cases: { caseId: string; verdict: string; visual: { verdict: string; artifact: Proof; jsonPointer: string; supportedCandidate: string } }[] }>(e.folder + 'facet-assessment-v2.json');
      expect(facets.cases).toHaveLength(3); expect(regions.facets).toHaveLength(3);
      for (const [i, facet] of regions.facets.entries()) {
        expect(facet.verdict).toBe('SUPPORTED');
        expect(facets.cases[i]).toMatchObject({ caseId: facet.caseId, verdict: 'SUPPORTED', visual: {
          verdict: 'SUPPORTED', jsonPointer: `/facets/${i}`, supportedCandidate: facet.supportedCandidate } });
        assertBound(facets.cases[i].visual.artifact);
        expect(facets.cases[i].visual.artifact.path).toBe(e.folder + 'derived-region-map-v1.json');
        for (const region of facet.regions) {
          const [x1, y1, x2, y2] = region.originalPngRectPx;
          expect(x1).toBeGreaterThanOrEqual(0); expect(y1).toBeGreaterThanOrEqual(0);
          expect(x2).toBeLessThanOrEqual(1706); expect(y2).toBeLessThanOrEqual(993);
          expect(x2).toBeGreaterThan(x1); expect(y2).toBeGreaterThan(y1); expect(region.visible).not.toBe('');
        }
      }
      const [left, right] = regions.derivedCalibration.xTicks;
      for (const tick of [left, right]) { assertPointer(data, block, tick.originalTime); assertPointer(data, block, tick.originalOwnIndex); }
      const scale = (right.xPx - left.xPx) / (Number(right.originalOwnIndex.valueRaw) - Number(left.originalOwnIndex.valueRaw));
      expect(scale).toBe(regions.derivedCalibration.pixelsPerOwnIndex);
      expect(right.xPx + (Number(data.raw(block.uniqueVisualAnchorRowOrdinal, 'INPUT_INDEX')) - Number(right.originalOwnIndex.valueRaw)) * scale)
        .toBe(regions.derivedCalibration.anchorXPx);
    });

    it('PNG-bound line: retains the independent blue thick dashed copy and control against the changed red dotted source', () => {
      expect(regions.facets[0].supportedCandidate).toBe('INDEPENDENT_COPY_RETAINS_VISIBLE_ORIGINAL_LINE_APPEARANCE');
      const [source, copy, control] = e.anchor.drawings.filter((d): d is LineDrawingOutput => d.type === 'line');
      expect(source).toMatchObject({ color: '#FF5252', style: 'dotted', width: 2, y1: 75, y2: 75 });
      for (const line of [copy, control]) expect(line).toMatchObject({ color: '#2962FF', style: 'dashed', width: 6, y1: 85, y2: 85 });
      const localAnchor = block.uniqueVisualAnchorRowOrdinal - 1;
      expect([source.x1! - localAnchor, copy.x1! - localAnchor, control.x1! - localAnchor]).toEqual([-60, -30, -90]);
    });

    it('PNG-bound box: copy/control keep yellow fill, solid blue border and blue left text independently of source mutations', () => {
      expect(regions.facets[1].supportedCandidate).toBe('COPY_RETAINS_YELLOW_BLUE_SOLID_BORDER_AND_BLUE_TEXT');
      const [source, copy, control] = e.anchor.drawings.filter((d): d is BoxDrawingOutput => d.type === 'box');
      expect(source).toMatchObject({ bgcolor: '#00BCD4', borderStyle: 'dashed', textColor: '#FF5252', text: 'SOURCE' });
      for (const box of [copy, control]) expect(box).toMatchObject({ bgcolor: '#FFEB3B', borderColor: '#2962FF', borderWidth: 4,
        borderStyle: 'solid', textColor: '#2962FF', textHalign: 'left', top: 60, bottom: 40 });
      expect([copy.text, control.text]).toEqual(['COPY', 'CONTROL']);
      expect(regions.facets[1].visibleTextLiterals).toEqual(['CONTROL', 'SOURCE', 'COPY']);
    });

    it('PNG-bound label: copy/control keep blue center-label large appearance and white text while source becomes red square', () => {
      expect(regions.facets[2].supportedCandidate).toBe('COPY_RETAINS_BLUE_CENTER_LABEL_LARGE_APPEARANCE');
      const [source, copy, control] = e.anchor.drawings.filter((d): d is LabelDrawingOutput => d.type === 'label');
      expect(source).toMatchObject({ color: '#FF5252', style: 'square', text: 'SOURCE' });
      for (const label of [copy, control]) expect(label).toMatchObject({ color: '#2962FF', textColor: '#FFFFFF', style: 'label_center', size: 'large', y: 20 });
      expect([copy.text, control.text]).toEqual(['COPY', 'CONTROL']);
      expect(regions.facets[2].visibleTextLiterals).toEqual(['CONTROL', 'COPY', 'SOURCE']);
    });

    it('holds every unobserved region/metric/identity/history facet at zero credit', () => {
      const assessment = json<{ held: string[]; cases: { versionBoundary: string }[] }>(e.folder + 'facet-assessment-v2.json');
      expect(assessment.held).toEqual(['Any absent/unreadable/nonintersecting/already obscured/precision-ambiguous pixel region',
        'All native backend token explanations, universal raster/font metrics and historical holds']);
      expect(regions.preservedUnobserved).toEqual(['Unexposed zoom/DPI/resolved-font metrics and native frame ID',
        'Every absent, clipped, already occluded, nonintersecting or precision-ambiguous region',
        'All historical v93 appearance/context holds and universal raster/color/identity contracts']);
      expect(regions.nativeFrameId).toBeNull();
      expect(regions.exposedAppearanceMetadata).toMatchObject({ zoom: null, dpi: null, resolvedFont: null });
      expect(regions.derivedCalibration.coordinateUncertaintyPx).toEqual({ x: 2, y: 3 });
      expect(regions.derivedCalibration.primaryXPx.every(p => !p.visible)).toBe(true);
      expect(assessment.cases.every(c => c.versionBoundary.includes('no v5/v6 transfer'))).toBe(true);
    });
  });
});

// This new execution does not promote the separate v102 v6 entry stop above.
describe('v103 v6 native copy execution, finite getters and original PNG', () => {
  const e = copy6;
  const { block, csv: data, rowSet, regions } = e;
  const primary = rowSet.selectedPrimaryClosedRowOrdinals;
  const at = (title: string, ordinal: number) => e.replay.result.plots.find(p => p.title === title)!.values[ordinal - e.startRowOrdinal];
  const pointer = (p: CopyPointer) => {
    expect(p.csvSha256).toBe(block.csv.sha256);
    expect(data.headers[p.columnOrdinal - 1]).toBe(p.headerRaw);
    expect(data.rows[p.rowOrdinal - 1][p.columnOrdinal - 1]).toBe(p.valueRaw);
  };
  it('binds the independent v103 pin, unchanged executed source, compiler bodies and complete v19 integrity', () => {
    expect(lock.revision).toBe(copyRevision);
    for (const proof of json<{ artifacts: Proof[] }>('v103/captures/v103/artifact-integrity-v19.json').artifacts) assertBound(proof);
    assertBound(lock.files.find(f => f.path === 'v103/captures/v103/artifact-integrity-v19.json')!);
    expect(hash(Buffer.from(e.source))).toBe(block.sourceSha256);
    expect(e.source).toBe(text(e.folder + 'attempt-v1/executed-v1.pine'));
    expect([regions.sourceSha256, regions.nativePrivateId, regions.nativePrivateVersion])
      .toEqual([block.sourceSha256, block.nativePrivateId, '1.0']);
    const compiler = json<{ transports: { success: boolean; originalBody: Proof }[]; sourceEntryStop: null }>(e.folder + 'compiler-diagnostics-v1.json');
    expect(compiler.sourceEntryStop).toBeNull(); expect(compiler.transports).toHaveLength(2);
    for (const transport of compiler.transports) { expect(transport.success).toBe(true); assertBound(transport.originalBody); }
    expect(e.replay.result.errors).toEqual([]);
  });
  it('independently derives A-31..A and eight predecessors, rejecting the developing row', () => {
    const closed = data.rows.flatMap((r, i) => data.raw(i + 1, 'CHART_CONFIRMED') === '1'
      && Number(r[0]) * 1000 + 120_000 <= Date.parse(rowSet.nativeExportUtc) ? [i + 1] : []);
    expect(closed).toEqual(rowSet.independentlyClosedRowOrdinals); expect(closed).toHaveLength(338);
    expect(data.rows).toHaveLength(339);
    const anchors = closed.filter(n => data.raw(n, 'VISUAL_ANCHOR_TIME') === data.raw(n, 'INPUT_TIME')
      && data.raw(n, 'VISUAL_ANCHOR_INDEX') === data.raw(n, 'INPUT_INDEX'));
    expect(anchors).toEqual([338]);
    expect(primary).toEqual(Array.from({ length: 32 }, (_, i) => anchors[0] - 31 + i));
    expect(rowSet.originalClosedPredecessorRowOrdinals).toEqual(Array.from({ length: 8 }, (_, i) => anchors[0] - 39 + i));
    expect(block.rows.map(r => r.rowOrdinal)).toEqual(primary);
    expect(block.predecessors.map(r => r.rowOrdinal)).toEqual(rowSet.originalClosedPredecessorRowOrdinals);
    expect([block.primaryCertificate, rowSet.primaryInputCertificateValid, rowSet.runtimeFailed]).toEqual([true, true, false]);
    const mask = csv(block.closureMask.path), col = mask.headers.indexOf('independently_closed');
    expect(col).toBeGreaterThanOrEqual(0);
    for (const [i, r] of data.rows.entries()) {
      expect(mask.rows[i][col]).toBe(closed.includes(i + 1) ? '1' : '0');
      expect(data.raw(i + 1, 'INPUT_TIME')).toBe(String(Number(r[0]) * 1000));
      if (i) {
        expect(Number(r[0])).toBeGreaterThan(Number(data.rows[i - 1][0]));
        expect(Number(data.raw(i + 1, 'INPUT_INDEX'))).toBe(Number(data.raw(i, 'INPUT_INDEX')) + 1);
      }
    }
    for (const row of [...block.rows, ...block.predecessors]) for (const p of Object.values(row.cells)) pointer(p);
    expect(e.startRowOrdinal).toBe(7);
    expect(Number(data.raw(e.startRowOrdinal, 'INPUT_INDEX'))).toBe(24400);
    expect(data.raw(339, 'CHART_CONFIRMED')).toBe('0');
  });
  for (const title of block.ownedTitles.filter(t => !['INPUT_INDEX', 'VISUAL_ANCHOR_INDEX'].includes(t))) {
    it(`v103 exact native strings and binary64: ${title}`, () => {
      for (const n of primary) {
        const expected = data.raw(n, title), actual = at(title, n);
        if (expected === '') expect(actual, `${n}:${title}`).toBeNull();
        else { expect(actual, `${n}:${title}`).toBe(Number(expected)); expect(String(actual)).toBe(expected); expect(bits(actual as number)).toBe(bits(Number(expected))); }
      }
    });
  }
  it('scores 288 direct cells; 64 index cells are translation/presence context, not native origin credit', () => {
    expect(block.ownedTitles).toHaveLength(11); expect(block.primaryScoringCells).toBe(352);
    expect(primary.length * (block.ownedTitles.length - 2)).toBe(288);
    const shift = Number(data.raw(e.startRowOrdinal, 'INPUT_INDEX'));
    for (const n of primary) {
      expect(at('INPUT_INDEX', n)).toBe(Number(data.raw(n, 'INPUT_INDEX')) - shift);
      const native = data.raw(n, 'VISUAL_ANCHOR_INDEX');
      if (native === '') expect(at('VISUAL_ANCHOR_INDEX', n)).toBeNull();
      else expect(at('VISUAL_ANCHOR_INDEX', n)).toBe(Number(native) - shift);
    }
    for (const [title, value] of [['LINE_SOURCE_X', -90], ['LINE_COPY_X', -60], ['LABEL_COPY_EXACT', 1]] as const) {
      expect(primary.filter(n => data.raw(n, title) !== '')).toEqual([338]);
      expect(primary.slice(0, 31).map(n => at(title, n))).toEqual(Array(31).fill(null));
      expect(at(title, 338)).toBe(value);
    }
  });
  it('binds three frozen visual models to original PNG, source/session, CSV anchor and readable subject/control windows', () => {
    for (const proof of [regions.originalPng, regions.originalCsv, regions.sourceObservation, regions.sessionReceipt, regions.manualInspection]) assertBound(proof);
    expect(regions.originalCsv).toEqual(block.csv);
    const png = bytes(regions.originalPng.path);
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1706, 993]);
    for (const p of Object.values(regions.retainedAnchor)) { pointer(p); expect(p.rowOrdinal).toBe(338); }
    const [a, b] = regions.registration.xTicks;
    for (const tick of [a, b]) { pointer(tick.time); pointer(tick.ownIndex); }
    const scale = (b.xPx - a.xPx) / (Number(b.ownIndex.valueRaw) - Number(a.ownIndex.valueRaw));
    expect(scale).toBe(6); expect(scale).toBe(regions.registration.pixelsPerOwnBar);
    expect(b.xPx + (Number(data.raw(338, 'INPUT_INDEX')) - Number(b.ownIndex.valueRaw)) * scale).toBe(regions.registration.anchorXPx);
    expect(regions.facets.map(f => f.frozenModels)).toEqual([
      { A: 'independent copy retains blue6 dashed y85', B: 'copy snapshots mutated source red2 dotted y65' },
      { A: 'copy retains yellow/blue solid and blue COPY', B: 'copy inherits mutated source recipe' },
      { A: 'blue center COPY body', B: 'copy inherits red square source recipe' },
    ]);
    const matrix = json<{ sourceCases: { sourceId: string; sourceSha256: string; visualFacets: { facetId: string; modelA: string; modelB: string; pixelWindow: unknown }[] }[] }>('v103/CASE-MATRIX-v1.json');
    const spec = matrix.sourceCases.find(c => c.sourceId === e.id)!;
    const manifest = json<{ sources: { sourceId: string; sha256: string; visualFacets: unknown[]; plots: { title: string; sourcePlotOrdinal: number }[] }[] }>('v103/bundle-manifest-v1.json').sources.find(c => c.sourceId === e.id)!;
    expect([spec.sourceSha256, manifest.sha256]).toEqual([block.sourceSha256, block.sourceSha256]);
    expect(spec.visualFacets).toEqual(manifest.visualFacets);
    expect(manifest.plots.map(p => p.title)).toEqual(e.replay.result.plots.map(p => p.title));
    expect(manifest.plots.map(p => p.sourcePlotOrdinal)).toEqual(Array.from({ length: 11 }, (_, i) => i));
    for (const [i, f] of regions.facets.entries()) {
      expect(f.frozenModels).toEqual({ A: spec.visualFacets[i].modelA, B: spec.visualFacets[i].modelB });
      expect(f.frozenPixelWindow).toEqual(spec.visualFacets[i].pixelWindow);
    }
    const assessment = json<{ facets: { facetId: string; outcome: string; visualMap: Proof }[]; held: string }>(e.folder + 'facet-assessment-v1.json');
    expect(assessment.facets).toHaveLength(3);
    for (const [i, f] of regions.facets.entries()) {
      expect([f.outcome, f.verdict, f.modelAVerdict, f.modelBVerdict]).toEqual(['SUPPORTED_A', 'SUPPORTED', 'SUPPORTED', 'REFUTED']);
      expect(f.notObservedCauses).toEqual([]);
      expect(assessment.facets[i]).toMatchObject({ facetId: f.facetId, outcome: 'SUPPORTED_A' }); assertBound(assessment.facets[i].visualMap);
      expect(f.manualFinding.actualSubjectRegionsPx).toHaveLength(1); expect(f.manualFinding.actualControlRegionsPx).toHaveLength(2);
      for (const [x1, y1, x2, y2] of [f.derivedWindowPx, ...f.manualFinding.actualSubjectRegionsPx, ...f.manualFinding.actualControlRegionsPx]) {
        expect(x1).toBeGreaterThanOrEqual(0); expect(y1).toBeGreaterThanOrEqual(0);
        expect(x2).toBeLessThanOrEqual(1706); expect(y2).toBeLessThanOrEqual(993);
        expect(x2).toBeGreaterThan(x1); expect(y2).toBeGreaterThan(y1);
      }
    }
    expect(assessment.held).toBe('All absent/clipped/overlapping/unreadable controls; native frame/font/DPI/zoom; historical holds and universal raster/API claims');
    expect(regions.nativeFrameId).toBeNull();
    expect(regions.exposedAppearanceMetadata).toMatchObject({ zoom: null, dpi: null, resolvedFont: null });
    expect(regions.registration.uncertaintyPx).toEqual({ x: 2, y: 3, strokeEdge: 1 });
  });
});
