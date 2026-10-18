import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { capture, entries, executeMisc, json, lock, raw, revision, table } from '../fixtures/v103V5Misc';

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

describe('v103 v5 extension/stroke and v5/v6 retained linefill native evidence', () => {
  it('pins the independently reviewed revision, v21/v22 integrity/validation and exact frozen models', () => {
    expect(revision).toBe('735d1b508a36ce359bcdfb837e995acaeb1d0af8');
    expect(lock.revision).toBe(revision);
    for (const version of [21, 22]) {
      const integrity = capture + `artifact-integrity-v${version}.json`;
      for (const proof of [...json(integrity).artifacts, { path: integrity, bytes: raw(integrity).length, sha256: hash(raw(integrity)) }]) {
        expect(lock.files.find(p => p.path === proof.path)).toEqual(proof);
        expect({ path: proof.path, bytes: raw(proof.path).length, sha256: hash(raw(proof.path)) }).toEqual(proof);
      }
      expect(json(capture + `validation-result-v${version}.json`).status).toBe('PASS');
    }
    const models = json('v103/CASE-MATRIX-v1.json').sourceCases;
    for (const entry of entries) {
      const frozen = models.find((s: { sourceId: string }) => s.sourceId === entry.id);
      expect(frozen.sourceSha256).toBe(hash(raw(entry.sourcePath)));
      expect(raw(entry.sourcePath).toString('utf8')).toMatch(new RegExp(`^//@version=${entry.id.endsWith('v6') ? 6 : 5}\\n`));
      expect(entry.regions.facets).toHaveLength(3);
      for (const facet of entry.regions.facets) {
        const model = frozen.visualFacets.find((f: { facetId: string }) => f.facetId === facet.facetId);
        expect(facet.frozenModels).toEqual({ A: model.modelA, B: model.modelB });
        expect(facet.frozenPixelWindow).toEqual(model.pixelWindow);
        expect(facet).toMatchObject({ outcome: 'SUPPORTED_A', verdict: 'SUPPORTED', modelBVerdict: 'REFUTED', notObservedCauses: [] });
      }
    }
  });
  for (const entry of entries) {
    it(`${entry.id}: authenticates unchanged source, ownership, original closure and the fixed retained block`, () => {
      const { block, rowSet, csv, report, regions } = entry;
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
      for (let phase = 0; phase < 8; phase++) expect(primary.filter(n => Number(csv.raw(n, 'CASE_ID')) === phase)).toHaveLength(4);
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
    it(`${entry.id}: exact original non-index cells; missing origin receives no absolute-index parity credit`, () => {
      const { result, firstRowOrdinal, firstNativeIndex, bars } = executeMisc(entry);
      expect(firstNativeIndex % 8).toBe(0);
      expect(bars.length - 1).toBeGreaterThanOrEqual(240);
      let exact = 0, excluded = 0, blanks = 0;
      for (const row of entry.block.rows) for (const [title, pointer] of Object.entries(row.cells) as [string, { valueRaw: string }][]) {
        const actual = result.plots.find(p => p.title === title)!.values[row.rowOrdinal - firstRowOrdinal];
        if (title === 'INPUT_INDEX' || title === 'VISUAL_ANCHOR_INDEX' && pointer.valueRaw !== '') {
          expect(Number(pointer.valueRaw) - firstNativeIndex).toBe(actual);
          excluded++;
        } else {
          expect(actual, `${entry.id} row${row.rowOrdinal} ${title}`).toBe(pointer.valueRaw === '' ? null : Number(pointer.valueRaw));
          if (pointer.valueRaw !== '') expect(String(actual)).toBe(pointer.valueRaw);
          else blanks++;
          exact++;
        }
      }
      expect(excluded).toBe(33);
      expect(exact).toBe(entry.id.includes('extend') ? 223 : 319);
      expect(blanks).toBe(entry.id.includes('extend') ? 62 : 155);
      if (entry.id.includes('replacement')) for (const [title, value] of [['COUNT', '1'], ['PARENT_A', '30'], ['PARENT_B', '50']]) {
        const values = entry.block.rows.map((row: { cells: Record<string, { valueRaw: string }> }) => row.cells[title].valueRaw);
        expect(values.slice(0, 31)).toEqual(Array(31).fill(''));
        expect(values[31]).toBe(value);
      }
    });
  }
  it('keeps the old v102 v5 entry stop held and binds each returned v103 version separately', () => {
    const old = json('v102/captures/v102/v102-extend-stroke-v5/numeric-results-v1.json');
    expect(old.uniquePrimaryPlotCells).toBe(0);
    expect(old.sourceObservation).toMatchObject({ nativeCompileSuccess: null, saveBody: null, addBody: null });
    expect(entries.map(e => e.id)).toEqual(['v103-extend-stroke-v5', 'v103-retained-replacement-v5', 'v103-retained-replacement-v6']);
  });
});
