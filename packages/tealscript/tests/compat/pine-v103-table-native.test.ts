import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { capture, entries, executeTable, json, lock, raw, revision, table } from '../fixtures/v103Table';

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const absoluteIndexCause = 'OBSERVED / EXCLUDED: native absolute index and missing own-origin prefix are not replay context';

describe('v103 original table lifecycle and auto dimensions', () => {
  it('binds an independent immutable revision, all v4 integrity dependencies and validation', () => {
    expect(revision).toBe('1faebe5ac656714b4177c9acbdb5e1e411e8e9b2');
    expect(lock.revision).toBe(revision);
    const path = capture + 'artifact-integrity-v4.json';
    for (const proof of [...json(path).artifacts, { path, bytes: raw(path).length, sha256: hash(raw(path)) }]) {
      expect(lock.files.find(p => p.path === proof.path)).toEqual(proof);
      expect({ path: proof.path, bytes: raw(proof.path).length, sha256: hash(raw(proof.path)) }).toEqual(proof);
    }
    expect(json(capture + 'validation-result-v4.json').status).toBe('PASS');
    const models = json('v103/CASE-MATRIX-v1.json').sourceCases;
    for (const entry of entries) {
      const frozen = models.find((c: { sourceId: string }) => c.sourceId === entry.id);
      expect(frozen.sourceSha256).toBe(hash(raw(entry.sourcePath)));
      expect(entry.regions.facets.map((f: { outcome: string }) => f.outcome)).toEqual(frozen.visualFacets.map(() => 'SUPPORTED_A'));
      for (const facet of entry.regions.facets) {
        const model = frozen.visualFacets.find((f: { facetId: string }) => f.facetId === facet.facetId);
        expect(facet.frozenModels).toEqual({ A: model.modelA, B: model.modelB });
        expect(facet.frozenPixelWindow).toEqual(model.pixelWindow);
      }
    }
  });
  for (const entry of entries) {
    it(`${entry.id}: owns exact source/columns and independently selects the retained A-31..A block`, () => {
      const { block, csv, rowSet, report, regions } = entry;
      const obs = report.sourceObservation;
      const source = raw(entry.sourcePath);
      expect(source).toEqual(raw(obs.executed.path));
      expect(source).toEqual(raw(obs.fullEditorUi.path));
      expect(json(obs.fullEditorVerification.path).exact).toBe(true);
      expect(hash(source)).toBe(block.sourceSha256);
      expect(raw(obs.sourceForm.path).toString('utf8').replaceAll('\r\n', '\n').split('name="source"\n\n')[1].split(/\n------WebKitFormBoundary/)[0]).toBe(source.toString('utf8'));
      const bindings = json(block.columnBindings.path);
      for (const path of [obs.saveBody.path, obs.addBody.path]) {
        const body = json(path);
        expect(body.success).toBe(true);
        expect(body.result.metaInfo.scriptIdPart).toBe(block.nativePrivateId);
        for (const column of bindings.columns.filter((c: { sourceSha256?: string }) => c.sourceSha256)) {
          expect(csv.headers[column.columnOrdinal - 1]).toBe(column.originalHeader);
          expect(column).toMatchObject({ sourceSha256: hash(source), owner: block.nativePrivateId, privateVersion: block.nativePrivateVersion });
          expect(body.result.metaInfo.styles[column.nativePlotId].title).toBe(column.originalHeader);
        }
      }
      const closed = csv.rows.map(row => csv.get(row, 'CHART_CONFIRMED') === '1' && (Number(csv.get(row, 'time')) + 120) * 1000 <= Date.parse(rowSet.nativeExportUtc));
      const anchors = csv.rows.flatMap((row, i) => closed[i] && csv.get(row, 'VISUAL_ANCHOR_TIME') !== '' ? [i + 1] : []);
      expect(anchors).toEqual([rowSet.uniqueVisualAnchorRowOrdinal]);
      const last = anchors[0];
      const primary = Array.from({ length: 32 }, (_, i) => last - 31 + i);
      expect(rowSet.selectedPrimaryClosedRowOrdinals).toEqual(primary);
      expect(block.primaryCertificate).toBe(true);
      expect(block.rows.map((r: { rowOrdinal: number }) => r.rowOrdinal)).toEqual(primary);
      expect(block.predecessors.map((r: { rowOrdinal: number }) => r.rowOrdinal)).toEqual(Array.from({ length: 8 }, (_, i) => last - 39 + i));
      expect(closed.slice(last - 40, last).every(Boolean)).toBe(true);
      const phases = primary.map(n => Number(csv.raw(n, 'CASE_ID')));
      for (let phase = 0; phase < 8; phase++) expect(phases.filter(n => n === phase)).toHaveLength(4);
      expect(Number(csv.raw(last, 'INPUT_INDEX'))).toBeGreaterThanOrEqual(240);
      const mask = table(block.closureMask.path);
      for (const [i, row] of csv.rows.entries()) {
        expect(mask.get(mask.rows[i], 'independently_closed')).toBe(closed[i] ? '1' : '0');
        const selected = primary.includes(i + 1);
        expect(mask.get(mask.rows[i], 'primary_scoring_eligible')).toBe(selected ? '1' : '0');
        expect(mask.get(mask.rows[i], 'primary_exclusion_cause')).toBe(selected ? '' : closed[i] ? i + 1 >= last - 39 && i + 1 <= last - 32 ? 'RESERVED_ORIGINAL_CLOSED_PREDECESSOR' : 'OUTSIDE_FIXED_PRIMARY_BLOCK' : 'PHYSICALLY_OPEN_OR_SOURCE_CONFIRMATION_CONTEXT_UNAVAILABLE');
        expect(csv.get(row, 'INPUT_TIME')).toBe(String(Number(csv.get(row, 'time')) * 1000));
        expect(Number(csv.get(row, 'CASE_ID'))).toBe(Number(csv.get(row, 'INPUT_INDEX')) % 8);
        if (i) {
          expect(Number(csv.get(row, 'INPUT_INDEX'))).toBe(Number(csv.get(csv.rows[i - 1], 'INPUT_INDEX')) + 1);
          expect(Number(csv.get(row, 'time'))).toBeGreaterThan(Number(csv.get(csv.rows[i - 1], 'time')));
        }
      }
      for (const row of [...block.rows, ...block.predecessors]) for (const pointer of [row.chartTime, ...Object.values(row.cells)] as { csvSha256: string; rowOrdinal: number; columnOrdinal: number; headerRaw: string; valueRaw: string }[]) {
        expect(pointer.csvSha256).toBe(hash(raw(block.csv.path)));
        expect(csv.headers[pointer.columnOrdinal - 1]).toBe(pointer.headerRaw);
        expect(csv.rows[pointer.rowOrdinal - 1][pointer.columnOrdinal - 1]).toBe(pointer.valueRaw);
      }
      expect(regions.originalCsv).toEqual(block.csv);
      for (const [title, pointer] of Object.entries(regions.retainedAnchor)) expect(pointer).toEqual(title === 'time' ? block.visualAnchor.chartTime : block.visualAnchor.cells[title]);
      expect(regions.nativeFrameId).toBeNull();
      expect(regions.exposedAppearanceMetadata).toMatchObject({ zoom: null, dpi: null, resolvedFont: null });
    });
    it(`${entry.id}: exact replay, one build event and31 intentional blanks; absolute indices remain observed exclusions`, () => {
      const { result, firstRowOrdinal, firstNativeIndex, bars } = executeTable(entry);
      expect(firstNativeIndex % 8).toBe(0);
      expect(bars.length - 1).toBeGreaterThanOrEqual(240);
      let exact = 0, excluded = 0;
      for (const row of entry.block.rows) for (const [title, pointer] of Object.entries(row.cells) as [string, { valueRaw: string }][]) {
        const actual = result.plots.find(p => p.title === title)!.values[row.rowOrdinal - firstRowOrdinal];
        const isAbsolute = title === 'INPUT_INDEX' || title === 'VISUAL_ANCHOR_INDEX' && pointer.valueRaw !== '';
        if (isAbsolute) {
          expect(absoluteIndexCause).toContain('missing own-origin prefix');
          expect(Number(pointer.valueRaw) - firstNativeIndex).toBe(actual);
          excluded++;
        } else {
          expect(actual, `${entry.id} row${row.rowOrdinal} ${title}`).toBe(pointer.valueRaw === '' ? null : Number(pointer.valueRaw));
          if (pointer.valueRaw !== '') expect(String(actual)).toBe(pointer.valueRaw);
          exact++;
        }
      }
      expect(excluded).toBe(33);
      expect(exact).toBe((entry.block.ownedTitles.length * 32) - 33);
      for (const title of entry.id.includes('survival') ? ['OLD_NA', 'COUNT'] : ['COUNT']) {
        const values = entry.block.rows.map((row: { cells: Record<string, { valueRaw: string }> }) => row.cells[title].valueRaw);
        expect(values.slice(0, 31)).toEqual(Array(31).fill(''));
        expect(values[31]).toBe(title === 'OLD_NA' ? '1' : entry.id.includes('survival') ? '2' : '3');
      }
    });
  }
  it('holds the v5 survival pre-Save stop with zero compiler/runtime/visual credit', () => {
    const report = json(capture + 'v103-table-survival-v5/numeric-results-v1.json');
    const facets = json(capture + 'v103-table-survival-v5/facet-assessment-v1.json');
    const obs = report.sourceObservation;
    expect(obs.nativeCompileSuccess).toBeNull();
    expect(obs.saveBody).toBeNull();
    expect(obs.addBody).toBeNull();
    expect(report.uniquePrimaryPlotCells).toBe(0);
    expect(json(report.nativeBlock.path).rows).toEqual([]);
    expect(facets.nativeAdmission).toBeNull();
    expect(facets.facets).toHaveLength(4);
    for (const facet of facets.facets) {
      expect(facet).toMatchObject({ verdict: 'UNDECIDED', outcome: 'UNDECIDED', visualMap: null });
      expect(facet.notObservedCauses.length).toBeGreaterThan(0);
    }
    expect(report.properties.every((p: { verdict: string }) => p.verdict === 'UNDECIDED')).toBe(true);
  });
});
