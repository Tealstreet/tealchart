import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { arrowEntry as e, capture, certificate, executeArrow } from '../fixtures/v104Arrow';
import { json, lock, raw, revision, text } from '../fixtures/v104Fixture';

describe('v104 v6 own-sign arrow direction: finite native admission', () => {
  it('binds the original source, private Save/Add, CSV and PNG without transferring old holds', () => {
    expect(lock.revision).toBe(revision);
    for (const proof of json(capture + 'artifact-integrity-v11.json').artifacts) {
      const bytes = raw(proof.path);
      expect(bytes.length).toBe(proof.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(proof.sha256);
    }
    const obs = e.report.sourceObservation;
    expect(raw(e.sourcePath)).toEqual(raw(obs.executed.path));
    expect(raw(e.sourcePath)).toEqual(raw(obs.fullEditorUi.path));
    const columns = json(e.block.columnBindings.path).columns;
    expect(columns.slice(0, 5).map((c: any) => c.originalHeader)).toEqual(['time', 'open', 'high', 'low', 'close']);
    const owned = columns.filter((c: any) => c.sourceSha256);
    expect(owned).toHaveLength(13);
    for (const proof of [obs.saveBody, obs.addBody]) {
      const body = json(proof.path);
      expect(body.success).toBe(true);
      expect(body.result.metaInfo.scriptIdPart).toBe(e.block.nativePrivateId);
      for (const [i, c] of owned.entries()) {
        expect(c).toMatchObject({ owner: e.block.nativePrivateId, privateVersion: e.block.nativePrivateVersion,
          sourceSha256: e.spec.sha256, sourceLiteralPlotOrdinal: i });
        expect(e.csv.headers[c.columnOrdinal - 1]).toBe(e.spec.plots[i].title);
        expect(body.result.metaInfo.styles[c.nativePlotId].title).toBe(e.spec.plots[i].title);
      }
    }
    expect(e.assessment.facets).toHaveLength(1);
    expect(e.assessment.facets[0]).toMatchObject({ verdict: 'SUPPORTED', outcome: 'SUPPORTED_A',
      modelA: 'positive SIGN arrow tip is at top, negative SIGN arrow tip at bottom' });
    expect(certificate.originalCsv).toEqual(e.block.csv);
    expect(certificate.originalPng).toEqual(e.regions.originalPng);
    expect(certificate.sourceSha256).toBe(e.spec.sha256);
    expect(certificate.arrows.map((a: any) => [a.sign, a.headAt, a.tipNarrowingReadable, a.sourceJoin]))
      .toEqual([[1, 'top', true, true], [-1, 'bottom', true, true]]);
    expect(e.regions.nativeFrameId).toBeNull();
    expect(e.regions.exposedAppearanceMetadata).toMatchObject({ dpi: null, zoom: null, resolvedFont: null });
  });

  it('selects only the unique physically closed A-31..A block and preserves all exclusions', () => {
    const rowset = json(e.block.rowSet.path);
    const closed = e.csv.rows.map(row => e.csv.get(row, 'CHART_CONFIRMED') === '1'
      && (Number(e.csv.get(row, 'time')) + 120) * 1000 <= Date.parse(rowset.nativeExportUtc));
    expect(e.csv.rows.flatMap((r, i) => closed[i] && e.csv.get(r, 'VISUAL_ANCHOR_INDEX') !== '' ? [i + 1] : []))
      .toEqual([e.anchor]);
    expect(e.primary).toEqual(Array.from({ length: 32 }, (_, i) => e.anchor - 31 + i));
    expect(e.block.predecessors.map((r: any) => r.rowOrdinal)).toEqual(Array.from({ length: 8 }, (_, i) => e.anchor - 39 + i));
    expect(closed.filter(Boolean)).toHaveLength(315);
    expect(e.csv.rows).toHaveLength(316);
    for (const r of [...e.block.predecessors, ...e.block.rows]) {
      expect(closed[r.rowOrdinal - 1]).toBe(true);
      for (const [title, p] of Object.entries(r.cells) as [string, any][]) {
        expect(p.csvSha256).toBe(e.block.csv.sha256);
        expect(e.csv.headers[p.columnOrdinal - 1]).toBe(title);
        expect(e.csv.raw(p.rowOrdinal, title)).toBe(p.valueRaw);
      }
    }
  });

  it('replays 288 exact numeric/blank cells and 64 SOURCE_BOOL exports; 64 index cells earn zero credit', () => {
    const { result, source } = executeArrow();
    expect(source).toBe(text(e.sourcePath));
    expect(e.indexDelta % 32).toBe(0);
    expect(e.anchor - e.first).toBeGreaterThanOrEqual(240);
    let scored = 0, finite = 0, blanks = 0;
    for (const r of e.block.rows) for (const [title, p] of Object.entries(r.cells) as [string, any][]) {
      const plotValue = result.plots.find(plot => plot.title === title)!.values[r.rowOrdinal - e.first];
      const actual = ['UP_CONTROL', 'DOWN_CONTROL'].includes(title) ? Number(plotValue ?? 0) : plotValue;
      const expected = p.valueRaw === '' ? null : Number(p.valueRaw);
      if (['INPUT_INDEX', 'VISUAL_ANCHOR_INDEX'].includes(title)) {
        expect(actual === null ? null : Number(actual) + e.indexDelta).toBe(expected);
        continue;
      }
      expect(actual, `row ${r.rowOrdinal} ${title}`).toBe(expected);
      if (expected !== null) { expect(String(actual)).toBe(p.valueRaw); finite++; } else blanks++;
      scored++;
    }
    expect(scored).toBe(352);
    expect([finite, blanks]).toEqual([231, 121]);
    expect(finite + blanks).toBe(scored);
  });
});
