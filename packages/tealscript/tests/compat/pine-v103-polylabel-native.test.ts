import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { capture, drawingTypes, entries, executePolylabel, json, lock, raw, revision, sourceIds, table } from '../fixtures/v103Polylabel';

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

describe('v103 polyline-label: independent native versions and exact closed context', () => {
  it('binds its own revision literal, immutable models and the complete round dependencies', () => {
    expect(lock.revision).toBe(revision);
    const integrity = json(capture + 'artifact-integrity-v13.json');
    expect(integrity.artifacts).toHaveLength(769);
    for (const proof of integrity.artifacts) {
      expect(lock.files.find(p => p.path === proof.path)).toEqual(proof);
      expect({ path: proof.path, bytes: raw(proof.path).length, sha256: hash(raw(proof.path)) }).toEqual(proof);
    }
    expect(json(capture + 'validation-result-v13.json').status).toBe('PASS');
    expect(entries.map(e => e.id)).toEqual(sourceIds);
    expect(entries).toHaveLength(7);
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

    it('replays unchanged source over real phase-aligned inputs; absolute indices stay translated context', () => {
      const { result, start, origin } = executePolylabel(entry);
      let exact = 0, indexContext = 0;
      for (const row of entry.nativeBlock.rows) for (const [title, pointer] of Object.entries(row.cells) as [string, any][]) {
        const actual = result.plots.find(plot => plot.title === title)!.values[row.rowOrdinal - start];
        if (title === 'INPUT_INDEX' || (title === 'VISUAL_ANCHOR_INDEX' && pointer.valueRaw !== '')) {
          expect(Number(actual) + origin).toBe(Number(pointer.valueRaw));
          indexContext++;
        } else {
          expect(actual, `${entry.id} row${row.rowOrdinal} ${title}`).toBe(pointer.valueRaw === '' ? null : Number(pointer.valueRaw));
          if (pointer.valueRaw !== '') expect(String(actual)).toBe(pointer.valueRaw);
          exact++;
        }
      }
      expect(exact).toBe(223);
      expect(indexContext).toBe(33);
      expect(entry.report.uniquePrimaryPlotCells).toBe(256);
      for (const title of ['VISUAL_ANCHOR_INDEX', 'VISUAL_ANCHOR_TIME']) {
        const cells = entry.nativeBlock.rows.map((r: any) => r.cells[title].valueRaw);
        expect(cells.filter((v: string) => v === '')).toHaveLength(31);
        expect(cells.filter((v: string) => v !== '')).toHaveLength(1);
      }
      expect(result.drawings.map(d => d.type)).toEqual(drawingTypes(entry.id));
      if (entry.id.includes('polyline-label')) {
        expect(result.drawings.filter(d => d.type === 'label').map(d => [d.y, d.text, d.color])).toEqual([[30, 'MMMMMM', '#2962FF'], [70, 'MMMMMM', '#2962FF']]);
      }
      expect(entry.report.properties).toHaveLength(8);
      expect(entry.report.properties.every((p: any) => p.verdict === 'SUPPORTED')).toBe(true);
    });

    it('binds SUPPORTED_A to this original PNG/map and both frozen model definitions', () => {
      const model = json('v103/CASE-MATRIX-v1.json').sourceCases.find((s: any) => s.sourceId === entry.id);
      const manifest = json('v103/bundle-manifest-v1.json').sources.find((s: any) => s.sourceId === entry.id);
      expect(model.sourceSha256).toBe(hash(raw(entry.sourcePath)));
      expect(manifest.sha256).toBe(model.sourceSha256);
      expect(manifest.visualFacets).toEqual(model.visualFacets);
      const frozen = model.visualFacets[0];
      expect(frozen.modelA).toBe(entry.id.includes('polyline-label') ? 'opaque labels cover orange stripe in both lanes'
        : 'opaque blue table covers the subject at its own registered intersection');
      expect(frozen.modelB).toBe(entry.id.includes('polyline-label') ? 'orange stripe covers label center in both lanes' : 'subject paints above blue table');
      const region = entry.regions;
      expect(region.facets).toHaveLength(1);
      expect(region.facets[0]).toMatchObject({ facetId: frozen.facetId, frozenModels: { A: frozen.modelA, B: frozen.modelB },
        frozenPixelWindow: frozen.pixelWindow, verdict: 'SUPPORTED', outcome: 'SUPPORTED_A', modelBVerdict: 'REFUTED' });
      expect(entry.assessment.facets[0]).toMatchObject({ facetId: frozen.facetId, outcome: 'SUPPORTED_A', modelA: frozen.modelA, modelB: frozen.modelB });
      expect(region.sourceSha256).toBe(hash(raw(entry.sourcePath)));
      expect(region.nativePrivateId).toBe(entry.nativeBlock.nativePrivateId);
      expect(region.originalCsv).toEqual(entry.nativeBlock.csv);
      const png = raw(region.originalPng.path);
      expect(hash(png)).toBe(region.originalPng.sha256);
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([region.originalDimensionsPx.width, region.originalDimensionsPx.height]);
      expect(region.retainedAnchor).toEqual({ time: entry.nativeBlock.visualAnchor.chartTime,
        ...Object.fromEntries(['INPUT_INDEX', 'INPUT_TIME', 'CASE_ID', 'CHART_CONFIRMED', 'VISUAL_ANCHOR_INDEX', 'VISUAL_ANCHOR_TIME']
          .map(title => [title, entry.nativeBlock.visualAnchor.cells[title]])) });
      expect(region.nativeFrameId).toBeNull();
      expect(region.exposedAppearanceMetadata).toMatchObject({ zoom: null, dpi: null, resolvedFont: null });
      expect(entry.assessment.held).toContain('historical holds');
      if (entry.id.includes('table-over-label')) expect(region.facets[0].manualFinding.middleLineLiteralStatus).toBe('UNOBSERVED / obscured; never completed from source text');
    });
  });
});
