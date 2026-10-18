import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { bound, capture, entries, executeGap, json, lock, raw, revision, table, text } from '../fixtures/v103Gap';

const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
describe('v103 exact visible-gap sources and native observations', () => {
  it('binds independent v103 revision and all immutable round dependencies', () => {
    expect(lock.revision).toBe(revision);
    expect(entries.map(e => e.id)).toEqual(['v103-visible-gap-v5', 'v103-visible-gap-v6']);
    const integrity = capture + 'artifact-integrity-v6.json';
    const proofs = json(integrity).artifacts;
    expect(proofs).toHaveLength(400);
    for (const proof of proofs) expect({ bytes: bound(proof).length, sha256: hash(raw(proof.path)) }).toEqual({ bytes: proof.bytes, sha256: proof.sha256 });
    expect(json(capture + 'validation-result-v6.json').status).toBe('PASS');
  });
  for (const e of entries) {
    it(`${e.id}: source/Save/Add/manifest ordinals and main-chart inputs are independently owned`, () => {
      const { sourceObservation: obs } = e.report;
      const source = raw(e.sourcePath);
      expect(hash(source)).toBe(e.spec.sha256);
      expect(source).toEqual(bound(obs.executed));
      expect(source).toEqual(bound(obs.fullEditorUi));
      expect(text(obs.sourceForm.path).replaceAll('\r\n', '\n').split('name="source"\n\n')[1].split(/\n------WebKitFormBoundary/)[0]).toBe(source.toString());
      const columns = json(e.block.columnBindings.path).columns;
      expect(columns.slice(0, 5).map((c: any) => [c.columnOrdinal, c.originalHeader, c.owner])).toEqual(
        ['time', 'open', 'high', 'low', 'close'].map((title, i) => [i + 1, title, 'Native main chart']));
      const owned = columns.filter((c: any) => c.sourceSha256);
      expect(owned).toHaveLength(e.spec.plots.length);
      for (const proof of [obs.saveBody, obs.addBody]) {
        const body = JSON.parse(bound(proof).toString());
        expect(body.success).toBe(true);
        expect(body.result.metaInfo.scriptIdPart).toBe(e.block.nativePrivateId);
        for (const [i, c] of owned.entries()) {
          expect(c).toMatchObject({ owner: e.block.nativePrivateId, privateVersion: e.block.nativePrivateVersion, sourceSha256: e.spec.sha256, sourceLiteralPlotOrdinal: i });
          expect(e.spec.plots[i]).toEqual({ sourcePlotOrdinal: i, title: c.originalHeader });
          expect(e.csv.headers[c.columnOrdinal - 1]).toBe(c.originalHeader);
          expect(body.result.metaInfo.styles[c.nativePlotId].title).toBe(c.originalHeader);
        }
      }
    });
    it(`${e.id}: unique retained anchor selects A-31..A, eight predecessors and physical closure without output filtering`, () => {
      const rowset = json(e.block.rowSet.path);
      const closed = e.csv.rows.map(row => e.csv.get(row, 'CHART_CONFIRMED') === '1'
        && (Number(e.csv.get(row, 'time')) + 120) * 1000 <= Date.parse(rowset.nativeExportUtc));
      const anchors = e.csv.rows.flatMap((row, i) => closed[i] && e.csv.get(row, 'VISUAL_ANCHOR_INDEX') !== '' ? [i + 1] : []);
      expect(anchors).toEqual([e.anchor]);
      expect(e.primary).toEqual(Array.from({ length: 32 }, (_, i) => e.anchor - 31 + i));
      expect(e.block.predecessors.map((r: any) => r.rowOrdinal)).toEqual(Array.from({ length: 8 }, (_, i) => e.anchor - 39 + i));
      expect(Number(e.csv.raw(e.anchor, 'INPUT_INDEX'))).toBeGreaterThanOrEqual(240);
      expect(e.block.primaryCertificate).toBe(true);
      const mask = table(e.block.closureMask.path);
      for (const [i, row] of e.csv.rows.entries()) {
        const ordinal = i + 1;
        expect(mask.get(mask.rows[i], 'independently_closed')).toBe(closed[i] ? '1' : '0');
        expect(mask.get(mask.rows[i], 'primary_scoring_eligible')).toBe(e.primary.includes(ordinal) ? '1' : '0');
        expect(e.csv.get(row, 'INPUT_TIME')).toBe(String(Number(e.csv.get(row, 'time')) * 1000));
        expect(Number(e.csv.get(row, 'CASE_ID'))).toBe(Number(e.csv.get(row, 'INPUT_INDEX')) % 8);
        if (i) expect(Number(e.csv.get(row, 'time'))).toBeGreaterThan(Number(e.csv.get(e.csv.rows[i - 1], 'time')));
      }
      expect(closed.filter(Boolean)).toHaveLength(e.version === 5 ? 309 : 310);
      expect(e.csv.rows).toHaveLength(e.version === 5 ? 310 : 311);
      for (const r of [...e.block.predecessors, ...e.block.rows]) {
        expect(closed[r.rowOrdinal - 1]).toBe(true);
        for (const [title, p] of Object.entries(r.cells) as [string, any][]) {
          expect(p.csvSha256).toBe(e.block.csv.sha256);
          expect(e.csv.headers[p.columnOrdinal - 1]).toBe(title);
          expect(e.csv.rows[p.rowOrdinal - 1][p.columnOrdinal - 1]).toBe(p.valueRaw);
        }
      }
    });
    it(`${e.id}: unchanged-source numeric replay is exact, with explicit screen alignment and zero absolute-index credit`, () => {
      const { result, source, bars } = executeGap(e);
      expect(source).toBe(text(e.sourcePath));
      expect(e.indexDelta % 8).toBe(0);
      expect(e.anchor - e.first).toBeGreaterThanOrEqual(240);
      expect(bars[0].close).toBe(Number(e.csv.raw(e.first, 'close')));
      let scored = 0;
      for (const r of e.block.rows) {
        const local = r.rowOrdinal - e.first;
        for (const [title, p] of Object.entries(r.cells) as [string, any][]) {
          const plot = result.plots.find(p => p.title === title)!;
          const actual = plot.values[local - (plot.offset ?? 0)];
          const expected = p.valueRaw === '' ? null : Number(p.valueRaw);
          if (title === 'INPUT_INDEX' || title === 'VISUAL_ANCHOR_INDEX') {
            expect(actual === null ? null : Number(actual) + e.indexDelta).toBe(expected);
            continue;
          }
          expect(actual, `${e.id} row${r.rowOrdinal} ${title}`).toBe(expected);
          if (expected !== null) expect(String(actual)).toBe(p.valueRaw);
          scored++;
        }
      }
      expect(scored).toBe((e.spec.plots.length - 2) * 32);
      const offset = result.plots.find(p => p.title === 'OFFSET1')!;
      expect(offset.offset).toBe(1);
      const policy = e.report.numericAlternatives[0];
      expect(policy.supportedVariantIds).toEqual(['SCREEN_ALIGNED']);
      expect(policy.variants.map((v: any) => [v.id, v.verdict])).toEqual([['SOURCE_SERIES', 'REFUTED'], ['SCREEN_ALIGNED', 'SUPPORTED']]);
      expect(e.report.properties.find((p: any) => p.title === 'OFFSET1').verdict).toBe('REFUTED');
      for (const r of e.block.rows) {
        const phase = Number(r.cells.CASE_ID.valueRaw);
        const hole = phase === 3 || phase === 4;
        for (const [title, add] of [['LINE', 0], ['BREAK', 15], ['AREA', 30], ['AREA_BREAK', 45], ...(e.version === 6 ? [['DASH', 75]] : [])] as [string, number][]) {
          expect(r.cells[title].valueRaw).toBe(hole ? '' : String(10 + phase + add));
        }
        expect(r.cells.OFFSET1.valueRaw).toBe(phase === 1 ? '94' : '');
      }
    });
    it(`${e.id}: original PNG/map/frozen model bindings retain the step hold and unexposed metadata`, () => {
      const region = e.regions;
      expect(region.sourceSha256).toBe(e.spec.sha256);
      expect(region.nativePrivateId).toBe(e.block.nativePrivateId);
      expect(region.originalCsv).toEqual(e.block.csv);
      const png = bound(region.originalPng);
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([region.originalDimensionsPx.width, region.originalDimensionsPx.height]);
      bound(region.sourceObservation); bound(region.sessionReceipt); bound(region.manualInspection);
      expect(region.retainedAnchor).toEqual({ time: e.block.visualAnchor.chartTime, ...Object.fromEntries(['INPUT_INDEX', 'INPUT_TIME', 'CASE_ID', 'CHART_CONFIRMED', 'VISUAL_ANCHOR_TIME', 'VISUAL_ANCHOR_INDEX'].map(k => [k, e.block.visualAnchor.cells[k]])) });
      expect(region.nativeFrameId).toBeNull();
      expect(region.exposedAppearanceMetadata).toMatchObject({ dpi: null, zoom: null, resolvedFont: null });
      for (const facet of region.facets) {
        const spec = e.spec.visualFacets.find((f: any) => f.facetId === facet.facetId);
        const frozen = json('v103/CASE-MATRIX-v1.json').sourceCases.find((s: any) => s.sourceId === e.id).visualFacets.find((f: any) => f.facetId === facet.facetId);
        expect(spec).toEqual(frozen);
        expect(facet.frozenModels).toEqual({ A: frozen.modelA, B: frozen.modelB });
        expect(facet.frozenPixelWindow).toEqual(frozen.pixelWindow);
        const assessment = e.assessment.facets.find((f: any) => f.facetId === facet.facetId);
        expect(assessment.outcome).toBe(facet.outcome);
        bound(assessment.visualMap);
        if (facet.facetId.endsWith(':step-half-bar')) {
          expect(facet).toMatchObject({ verdict: 'UNDECIDED', modelAVerdict: 'UNDECIDED', modelBVerdict: 'UNDECIDED' });
          expect(facet.notObservedCauses.join(' ')).toContain('three pixels apart');
          expect(region.registration.uncertaintyPx).toEqual({ x: 2, y: 3, strokeEdge: 1 });
        } else expect(facet).toMatchObject({ outcome: 'SUPPORTED_A', verdict: 'SUPPORTED', modelBVerdict: 'REFUTED' });
      }
      expect(region.facets.filter((f: any) => f.verdict === 'SUPPORTED')).toHaveLength(e.version === 5 ? 3 : 4);
    });
  }
});
