import { lock } from '../fixtures/v102Fixture';
import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { executeStyle, styleCapture, styleEntries, styleJson, styleRaw, styleRefusedIds, styleRevision, styleStoppedIds, styleTable } from '../fixtures/v102Style';

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const savedSource = (path: string) => styleRaw(path).toString('utf8').replaceAll('\r\n', '\n').split('name="source"\n\n')[1].split(/\n------WebKitFormBoundary/)[0];

describe('v102 style: source ownership, closure and exact screen-aligned CSV observations', () => {
  it('binds the immutable pin and full round integrity dependencies without credit for other families', () => {
    expect(lock.revision).toBe(styleRevision);
    expect(styleEntries.map(e => e.id).sort()).toEqual(['v102-extend-stroke-v6', 'v102-gap-style-geometry-v6']);
    const path = styleCapture + 'artifact-integrity-v26.json';
    const artifacts = styleJson(path).artifacts;
    expect(artifacts).toHaveLength(1048);
    for (const proof of [...artifacts, { path, bytes: styleRaw(path).length, sha256: hash(styleRaw(path)) }]) {
      expect(lock.files.find((p: { path: string }) => p.path === proof.path)).toEqual(proof);
      expect({ path: proof.path, bytes: styleRaw(proof.path).length, sha256: hash(styleRaw(proof.path)) }).toEqual(proof);
    }
    expect(styleJson(styleCapture + 'validation-result-v26.json').status).toBe('PASS');
  });
  for (const entry of styleEntries) {
    it(`${entry.id}: exact source/Save/Add/column ownership and independently selected closed primary block`, () => {
      const { block, csv, report } = entry;
      const observation = report.sourceObservation;
      const source = styleRaw(entry.sourcePath);
      expect(source).toEqual(styleRaw(observation.executed.path));
      expect(hash(source)).toBe(block.sourceSha256);
      expect(savedSource(observation.sourceForm.path)).toBe(source.toString('utf8'));
      const binding = styleJson(block.columnBindings.path);
      for (const body of [observation.saveBody, observation.addBody]) {
        const native = styleJson(body.path);
        expect(native.success).toBe(true);
        expect(native.result.metaInfo.scriptIdPart).toBe(block.nativePrivateId);
        for (const column of binding.columns.filter((c: { sourceSha256?: string }) => c.sourceSha256)) {
          expect(column).toMatchObject({ sourceSha256: hash(source), owner: block.nativePrivateId, privateVersion: block.nativePrivateVersion });
          expect(csv.headers[column.columnOrdinal - 1]).toBe(column.originalHeader);
          expect(native.result.metaInfo.styles[column.nativePlotId].title).toBe(column.originalHeader);
        }
      }
      const session = observation.executed.path.replace('executed-v1.pine', 'session-mode0-v1/');
      const rowObservation = styleJson(session + 'row-set-observation-v1.json');
      const closed = csv.rows.map(row => csv.get(row, 'CHART_CONFIRMED') === '1' && (Number(csv.get(row, 'time')) + 120) * 1000 <= Date.parse(rowObservation.nativeExportUtc));
      const anchors = csv.rows.flatMap((row, index) => closed[index] && csv.get(row, 'VISUAL_ANCHOR_TIME') !== '' ? [index + 1] : []);
      expect(anchors).toEqual([block.uniqueVisualAnchorRowOrdinal]);
      const first = csv.rows.findIndex((row, index) => Number(csv.get(row, 'INPUT_INDEX')) >= 200 && Number(csv.get(row, 'INPUT_INDEX')) % 8 === 0
        && index + 32 < anchors[0] && closed.slice(index, index + 32).length === 32 && closed.slice(index, index + 32).every(Boolean));
      expect(block.primaryRowOrdinals).toEqual(Array.from({ length: 32 }, (_, i) => first + i + 1));
      const mask = styleTable(block.closureMask.path);
      for (const [index, row] of csv.rows.entries()) {
        expect(mask.get(mask.rows[index], 'independently_closed')).toBe(closed[index] ? '1' : '0');
        expect(mask.get(mask.rows[index], 'primary_scoring_eligible')).toBe(index >= first && index < first + 32 ? '1' : '0');
        expect(csv.get(row, 'INPUT_TIME')).toBe(String(Number(csv.get(row, 'time')) * 1000));
        expect(Number(csv.get(row, 'CASE_ID'))).toBe(Number(csv.get(row, 'INPUT_INDEX')) % 8);
        if (index) expect(Number(csv.get(row, 'time'))).toBeGreaterThan(Number(csv.get(csv.rows[index - 1], 'time')));
        if (index > first && index < first + 32) expect(Number(csv.get(row, 'INPUT_INDEX'))).toBe(Number(csv.get(csv.rows[index - 1], 'INPUT_INDEX')) + 1);
      }
      for (const row of block.rows) for (const p of Object.values(row.cells) as { csvSha256: string; columnOrdinal: number; rowOrdinal: number; headerRaw: string; valueRaw: string }[]) {
        expect(p.csvSha256).toBe(hash(styleRaw(block.csv.path)));
        expect(csv.headers[p.columnOrdinal - 1]).toBe(p.headerRaw);
        expect(csv.rows[p.rowOrdinal - 1][p.columnOrdinal - 1]).toBe(p.valueRaw);
      }
      expect(block.completePrimaryCertificate).toBe(true);
      expect(block.rows).toHaveLength(32);
    });
    it(`${entry.id}: original-source replay matches every non-index primary cell exactly`, () => {
      const { result } = executeStyle(entry);
      let compared = 0;
      for (const [i, row] of entry.block.rows.entries()) for (const [title, pointer] of Object.entries(row.cells) as [string, { valueRaw: string }][]) {
        if (title === 'INPUT_INDEX') continue;
        const plot = result.plots.find(p => p.title === title)!;
        const sourceIndex = i - (plot.offset ?? 0);
        const actual = sourceIndex < 0 ? null : plot.values[sourceIndex];
        expect(actual, `${entry.id} row${row.rowOrdinal} ${title}`).toBe(pointer.valueRaw === '' ? null : Number(pointer.valueRaw));
        if (pointer.valueRaw !== '') expect(String(actual)).toBe(pointer.valueRaw);
        compared++;
      }
      expect(compared).toBe((entry.block.ownedTitles.length - 1) * 32);
      for (const property of entry.report.properties) {
        expect(property.verdict).toBe('SUPPORTED');
        for (const row of entry.block.rows) expect(row.cells[property.title].valueRaw).toBe(property.expectedRawByPhase[row.phase]);
      }
      if (entry.id.includes('gap')) {
        const alternative = entry.report.numericAlternatives[0];
        expect(alternative.id).toBe('offset-export-policy');
        expect(alternative.supportedVariantIds).toEqual(['SCREEN_ALIGNED']);
        expect(alternative.observation).toBe('ONLY_REGISTERED_VARIANT');
        expect(alternative.variants.map((v: { id: string; verdict: string }) => [v.id, v.verdict])).toEqual([['SOURCE_SERIES', 'REFUTED'], ['SCREEN_ALIGNED', 'SUPPORTED']]);
        const offset = result.plots.find(p => p.title === 'OFFSET_PLUS_ONE')!;
        expect(offset.offset).toBe(1);
        expect(offset.values.slice(0, 8)).toEqual([90, null, null, null, null, null, null, null]);
        expect(entry.block.rows[0].cells.OFFSET_PLUS_ONE.valueRaw).toBe('');
        expect(entry.csv.get(entry.csv.rows[entry.block.primaryRowOrdinals[0] - 2], 'CASE_ID')).toBe('7');
        expect(entry.csv.get(entry.csv.rows[entry.block.primaryRowOrdinals[0] - 2], 'OFFSET_ZERO')).toBe('');
      }
    });
    it(`${entry.id}: PNG provenance and every held visual facet stay separate from numeric credit`, () => {
      const region = entry.regions;
      expect(region.sourceSha256).toBe(hash(styleRaw(entry.sourcePath)));
      expect(region.nativePrivateId).toBe(entry.block.nativePrivateId);
      expect(region.originalCsv).toEqual(entry.block.csv);
      const png = styleRaw(region.originalPng.path);
      expect(hash(png)).toBe(region.originalPng.sha256);
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([region.originalDimensionsPx.width, region.originalDimensionsPx.height]);
      expect(region.visualAnchor).toEqual(entry.block.visualAnchor.cells);
      expect(region.exportAndPngClockBarUnchanged).toBe(true);
      styleJson(region.sourceObservation.path);
      styleJson(region.sessionReceipt.path);
      expect(region.nativeFrameId).toBeNull();
      expect(region.exposedAppearanceMetadata).toMatchObject({ zoom: null, dpi: null, resolvedFont: null });
      if (entry.id.includes('gap')) {
        expect(region.facets).toHaveLength(4);
        for (const facet of region.facets) {
          expect(facet.verdict).toBe('UNDECIDED');
          expect(facet.supportedCandidate).toBeUndefined();
          expect(facet.notObservedCause).toContain('outside the unchanged viewport');
          expect(facet.notObservedCause).toContain('zero primary pixel scoring credit');
        }
      } else {
        expect(region.facets.map((f: { verdict: string; supportedCandidate: string }) => [f.verdict, f.supportedCandidate])).toEqual([
          ['SUPPORTED', 'FOUR_REGISTERED_EXTENSION_MODES_APPLIED'], ['SUPPORTED', 'FOUR_REGISTERED_LINE_STROKES_VISIBLE'], ['SUPPORTED', 'SETTER_STROKES_HAVE_CONSTRUCTOR_WIDTH4_CLASS'],
        ]);
      }
    });
  }
});

describe('v102 exact omitted-formatting Save refusals and consumed entry stops', () => {
  for (const id of styleRefusedIds) it(`${id}: same source, ordered diagnostics, no runtime or appearance credit`, () => {
    const report = styleJson(styleCapture + id + '/numeric-results-v1.json');
    const observation = report.sourceObservation;
    const source = styleRaw(observation.requested.path);
    expect(source).toEqual(styleRaw(observation.executed.path));
    expect(hash(source)).toBe(report.sourceSha256);
    expect(savedSource(observation.sourceForm.path)).toBe(source.toString('utf8'));
    expect(observation.nativeCompileSuccess).toBe(false);
    expect(observation.addBody).toBeNull();
    const native = styleJson(styleCapture + id + '/attempt-v1/compiler-diagnostics-v1.json').transports[0];
    expect(native.nativeSuccess).toBe(false);
    expect(native.structuredErrorChannelStatus).toBe('EXPOSED');
    expect(native.nativeEditorMarkerArrays).toBeNull();
    const body = styleJson(observation.saveBody.path);
    expect(body.success).toBe(false);
    expect(body.reason2.errors).toEqual(native.nativeStructuredErrors);
    expect(body.reason2.warnings).toEqual(native.nativeWarnings);
    const diagnostics = checkProgram(parse(source.toString('utf8'))).diagnostics;
    expect(diagnostics.map(d => ({ code: d.nativeCode, message: d.message, line: d.line, column: d.column, severity: d.severity }))).toEqual(
      native.nativeStructuredErrors.map((e: { code: string; message: string; ctx: Record<string, string>; start: { line: number; column: number } }) => ({
        code: e.code, message: e.message.replaceAll('{name}', e.ctx.name).replaceAll('{functionName}', e.ctx.functionName), line: e.start.line, column: e.start.column, severity: 'error',
      })),
    );
    const facets = styleJson(styleCapture + id + '/facet-assessment-v3.json');
    expect(facets.cases.map((c: { verdict: string }) => c.verdict)).toEqual(['SUPPORTED', 'UNDECIDED']);
    expect(facets.cases[0].admission).toMatchObject({ verdict: 'SUPPORTED', supportedCandidate: 'REQUIREDNESS_FOR_THIS_EXACT_CALL', nativeRefusal: true });
    expect(facets.cases[1].visual).toMatchObject({ verdict: 'UNDECIDED' });
    expect(facets.cases[1].visual.cause).toBeTruthy();
    expect(native.nativeWarnings).toEqual([]);
    expect(report.uniquePrimaryPlotCells).toBe(0);
    expect(report.renderAssessment).toBeNull();
    expect(report.properties.every((p: { verdict: string; comparisonRows: unknown[] }) => p.verdict === 'UNDECIDED' && p.comparisonRows.length === 0)).toBe(true);
    expect(styleJson(report.nativeBlock.path).rows).toEqual([]);
  });
  for (const id of styleStoppedIds) it(`${id}: partial entry supplies no admission, execution or visual parity credit`, () => {
    const report = styleJson(styleCapture + id + '/numeric-results-v1.json');
    expect(report.sourceObservation.nativeCompileSuccess).toBeNull();
    expect(report.sourceObservation.saveBody).toBeNull();
    expect(report.sourceObservation.addBody).toBeNull();
    expect(report.uniquePrimaryPlotCells).toBe(0);
    expect(report.renderAssessment).toBeNull();
    expect(styleJson(report.nativeBlock.path).rows).toEqual([]);
    const facets = styleJson(styleCapture + id + '/facet-assessment-v3.json');
    expect(facets.cases.every((c: { verdict: string }) => c.verdict === 'UNDECIDED')).toBe(true);
    expect(facets.held).toContain('All native backend token explanations, universal raster/font metrics and historical holds');
    expect(report.properties.every((p: { verdict: string }) => p.verdict === 'UNDECIDED')).toBe(true);
  });
});
