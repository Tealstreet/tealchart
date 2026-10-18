import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { capture, entries, executePoints, json, lock, pointGeometry, raw, revision, sourceIds, table } from '../fixtures/v103Points';

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

describe('v103 noncoincident points: independent native versions and exact closed context', () => {
  it('binds its own revision literal, immutable models and the complete round dependencies', () => {
    expect(lock.revision).toBe(revision);
    const integrity = json(capture + 'artifact-integrity-v18.json');
    expect(integrity.artifacts).toHaveLength(1217);
    for (const proof of integrity.artifacts) {
      expect(lock.files.find(p => p.path === proof.path)).toEqual(proof);
      expect({ path: proof.path, bytes: raw(proof.path).length, sha256: hash(raw(proof.path)) }).toEqual(proof);
    }
    expect(json(capture + 'validation-result-v18.json').status).toBe('PASS');
    expect(entries.map(e => e.id)).toEqual(sourceIds);
    expect(entries).toHaveLength(2);
  });

  for (const entry of entries) describe(entry.id, () => {
    it('authenticates the exact requested/editor/Save/Add source and raw CSV ownership', () => {
      const source = raw(entry.sourcePath);
      const observation = entry.report.sourceObservation;
      expect(hash(source)).toBe(entry.nativeBlock.sourceSha256);
      expect(source).toEqual(raw(observation.executed.path));
      expect(source).toEqual(raw(observation.fullEditorUi.path));
      expect(source.toString('utf8')).toContain(`//@version=${entry.version}\n`);
      const saved = raw(observation.sourceForm.path).toString('utf8').replaceAll('\r\n', '\n')
        .split('name="source"\n\n')[1].split(/\n------WebKitFormBoundary/)[0];
      expect(saved).toBe(source.toString('utf8'));
      for (const proof of [observation.saveBody, observation.addBody]) {
        const body = json(proof.path);
        expect(body.success).toBe(true);
        expect(body.result.metaInfo.scriptIdPart).toBe(entry.nativeBlock.nativePrivateId);
        for (const column of json(entry.nativeBlock.columnBindings.path).columns.filter((c: any) => c.sourceSha256)) {
          expect(column).toMatchObject({ sourceSha256: hash(source), owner: entry.nativeBlock.nativePrivateId, privateVersion: entry.nativeBlock.nativePrivateVersion });
          expect(entry.csv.headers[column.columnOrdinal - 1]).toBe(column.originalHeader);
          expect(body.result.metaInfo.styles[column.nativePlotId].title).toBe(column.originalHeader);
        }
      }
      for (const row of [...entry.nativeBlock.rows, ...entry.nativeBlock.predecessors]) {
        for (const pointer of Object.values(row.cells) as any[]) {
          expect(pointer.csvSha256).toBe(hash(raw(entry.nativeBlock.csv.path)));
          expect(entry.csv.headers[pointer.columnOrdinal - 1]).toBe(pointer.headerRaw);
          expect(entry.csv.rows[pointer.rowOrdinal - 1][pointer.columnOrdinal - 1]).toBe(pointer.valueRaw);
        }
      }
    });

    it('independently derives A-31..A, all eight original predecessors and every excluded row', () => {
      const { csv, rowSet } = entry;
      const closed = csv.rows.map(row => csv.get(row, 'CHART_CONFIRMED') === '1'
        && (Number(csv.get(row, 'time')) + 120) * 1000 <= Date.parse(rowSet.nativeExportUtc));
      const anchors = csv.rows.flatMap((row, i) => closed[i] && csv.get(row, 'VISUAL_ANCHOR_TIME') !== '' ? [i + 1] : []);
      expect(anchors).toEqual([rowSet.uniqueVisualAnchorRowOrdinal]);
      const anchor = anchors[0];
      const primary = Array.from({ length: 32 }, (_, i) => anchor - 31 + i);
      const predecessors = Array.from({ length: 8 }, (_, i) => anchor - 39 + i);
      expect(rowSet.selectedPrimaryClosedRowOrdinals).toEqual(primary);
      expect(rowSet.originalClosedPredecessorRowOrdinals).toEqual(predecessors);
      expect(entry.nativeBlock.rows.map((r: any) => r.rowOrdinal)).toEqual(primary);
      expect(entry.nativeBlock.predecessors.map((r: any) => r.rowOrdinal)).toEqual(predecessors);
      expect(rowSet.primaryInputCertificateValid).toBe(true);
      expect(entry.nativeBlock.primaryCertificate).toBe(true);
      expect(Number(csv.raw(anchor, 'INPUT_INDEX'))).toBeGreaterThanOrEqual(240);
      const mask = table(entry.nativeBlock.closureMask.path);
      for (const [i, row] of csv.rows.entries()) {
        expect(mask.get(mask.rows[i], 'independently_closed')).toBe(closed[i] ? '1' : '0');
        expect(mask.get(mask.rows[i], 'primary_scoring_eligible')).toBe(primary.includes(i + 1) ? '1' : '0');
        if (!primary.includes(i + 1)) expect(mask.get(mask.rows[i], 'primary_exclusion_cause')).toBeTruthy();
        expect(csv.get(row, 'INPUT_TIME')).toBe(String(Number(csv.get(row, 'time')) * 1000));
        expect(Number(csv.get(row, 'CASE_ID'))).toBe(Number(csv.get(row, 'INPUT_INDEX')) % 8);
        if (i) {
          expect(Number(csv.get(row, 'time'))).toBeGreaterThan(Number(csv.get(csv.rows[i - 1], 'time')));
          expect(Number(csv.get(row, 'INPUT_INDEX'))).toBe(Number(csv.get(csv.rows[i - 1], 'INPUT_INDEX')) + 1);
        }
      }
      expect(primary.every(ordinal => closed[ordinal - 1])).toBe(true);
      expect(predecessors.every(ordinal => closed[ordinal - 1])).toBe(true);
      expect(closed.filter(Boolean)).toHaveLength(csv.rows.length - 1);
      expect(closed.filter(v => !v)).toHaveLength(1);
      expect(primary.map(ordinal => csv.raw(ordinal, 'CASE_ID')).sort()).toEqual(Array.from({ length: 32 }, (_, i) => String(Math.floor(i / 4))));
    });

    it('replays all 512 original cells exactly, with 33 absolute-index cells as translated context', () => {
      const { result, start, origin } = executePoints(entry);
      let exact = 0, context = 0;
      for (const row of entry.nativeBlock.rows) for (const [title, cell] of Object.entries(row.cells) as [string, any][]) {
        const actual = result.plots.find(p => p.title === title)!.values[row.rowOrdinal - start];
        if (title === 'INPUT_INDEX' || (title === 'VISUAL_ANCHOR_INDEX' && cell.valueRaw !== '')) {
          expect(Number(actual) + origin).toBe(Number(cell.valueRaw));
          context++;
        } else {
          expect(actual, `${entry.id} ${row.rowOrdinal} ${title}`).toBe(cell.valueRaw === '' ? null : Number(cell.valueRaw));
          if (cell.valueRaw !== '') expect(String(actual)).toBe(cell.valueRaw);
          exact++;
        }
      }
      expect([exact, context, entry.report.uniquePrimaryPlotCells]).toEqual([479, 33, 512]);
      expect(entry.report.properties).toHaveLength(16);
      const contracts = json(capture + 'numeric-contracts-v1.json');
      const frozen = contracts.sources.find((s: any) => s.sourceId === entry.id);
      expect(frozen.sourceSha256).toBe(entry.nativeBlock.sourceSha256);
      for (const property of entry.report.properties) {
        expect(property.frozenContract).toEqual(frozen.contracts[property.sourcePlotOrdinal]);
        expect(property.verdict).toBe('SUPPORTED');
        expect(property.comparisonRows).toHaveLength(32);
        for (const row of property.comparisonRows) {
          expect(row.comparison).toBe('S');
          expect(row.actual).toEqual(entry.nativeBlock.rows.find((r: any) => r.rowOrdinal === row.rowOrdinal).cells[property.title]);
          if (row.expectedRaw === null) expect(['INPUT_INDEX', 'VISUAL_ANCHOR_INDEX']).toContain(property.title);
          else expect(row.expectedRaw).toBe(row.actual.valueRaw);
        }
      }
      const titles = ['TIME_DELTA', 'ROUNDTRIP_X', 'LINE_X', 'LINE_Y', 'BOX_LEFT', 'BOX_TOP', 'LABEL_X', 'LABEL_Y'];
      expect(titles.map(title => entry.csv.raw(entry.block.uniqueVisualAnchorRowOrdinal, title)))
        .toEqual(['0', '-12', '-85', '75', '-65', '85', '-25', '80']);
      for (const title of [...titles, 'VISUAL_ANCHOR_INDEX', 'VISUAL_ANCHOR_TIME']) {
        const values = entry.nativeBlock.rows.map((r: any) => r.cells[title].valueRaw);
        expect(values.filter((v: string) => v === '')).toHaveLength(31);
        expect(values.filter((v: string) => v !== '')).toHaveLength(1);
      }
      expect(pointGeometry(entry).geometry).toEqual([
        [-85, 75, -75, 85, 'bar_index'], [-65, 85, -50, 65, 'bar_index'],
        [-25, 80, 'POINT', 'bar_index'], [-12, 45, 'MODE', 'bar_index'],
      ]);
    });

    it('binds all six frozen alternatives to the original PNG/map and preserves the unobserved scope', () => {
      const model = json('v103/CASE-MATRIX-v1.json').sourceCases.find((s: any) => s.sourceId === entry.id);
      const manifest = json('v103/bundle-manifest-v1.json').sources.find((s: any) => s.sourceId === entry.id);
      expect(model.sourceSha256).toBe(hash(raw(entry.sourcePath)));
      expect(manifest.sha256).toBe(model.sourceSha256);
      expect(manifest.visualFacets).toEqual(model.visualFacets);
      expect(model.visualFacets).toHaveLength(6);
      const region = entry.regions;
      expect(region.sourceSha256).toBe(model.sourceSha256);
      expect(region.nativePrivateId).toBe(entry.nativeBlock.nativePrivateId);
      expect(region.originalCsv).toEqual(entry.nativeBlock.csv);
      for (const [i, frozen] of model.visualFacets.entries()) {
        expect(region.facets[i]).toMatchObject({ facetId: frozen.facetId,
          frozenModels: { A: frozen.modelA, B: frozen.modelB }, frozenPixelWindow: frozen.pixelWindow,
          outcome: 'SUPPORTED_A', verdict: 'SUPPORTED', modelBVerdict: 'REFUTED' });
        expect(entry.assessment.facets[i]).toMatchObject({ facetId: frozen.facetId,
          outcome: 'SUPPORTED_A', modelA: frozen.modelA, modelB: frozen.modelB });
      }
      const png = raw(region.originalPng.path);
      expect(hash(png)).toBe(region.originalPng.sha256);
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([region.originalDimensionsPx.width, region.originalDimensionsPx.height]);
      expect(region.retainedAnchor).toEqual({ time: entry.nativeBlock.visualAnchor.chartTime,
        ...Object.fromEntries(['INPUT_INDEX', 'INPUT_TIME', 'CASE_ID', 'CHART_CONFIRMED', 'VISUAL_ANCHOR_INDEX', 'VISUAL_ANCHOR_TIME']
          .map(title => [title, entry.nativeBlock.visualAnchor.cells[title]])) });
      const [left, right] = region.registration.xTicks;
      for (const tick of [left, right]) {
        expect(entry.csv.raw(tick.time.rowOrdinal, 'time')).toBe(tick.time.valueRaw);
        expect(entry.csv.raw(tick.ownIndex.rowOrdinal, 'INPUT_INDEX')).toBe(tick.ownIndex.valueRaw);
      }
      const dx = (right.xPx - left.xPx) / (Number(right.ownIndex.valueRaw) - Number(left.ownIndex.valueRaw));
      expect(region.registration.pixelsPerOwnBar).toBe(dx);
      expect(region.registration.anchorXPx).toBe(left.xPx + dx * (Number(region.retainedAnchor.INPUT_INDEX.valueRaw) - Number(left.ownIndex.valueRaw)));
      expect(region.nativeFrameId).toBeNull();
      expect(region.exposedAppearanceMetadata).toMatchObject({ zoom: null, dpi: null, resolvedFont: null });
      expect(entry.assessment.held).toContain('historical holds');
      expect(region.facets.every((f: any) => f.manualFinding.scope.includes('numeric-only'))).toBe(true);
      expect(entry.assessment.numericScope).toContain('one observation plus31 intentional blanks');
    });
  });
});
