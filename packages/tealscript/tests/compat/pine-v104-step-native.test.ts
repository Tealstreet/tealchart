import { describe, expect, it } from 'vitest';

import { bound, entries, executeStep, json, text } from '../fixtures/v104Step';

for (const entry of entries) describe(`${entry.id} unchanged retained source`, () => {
  it('binds native admission, original source/CSV/PNG and two distinct phase witnesses', () => {
    expect(entry.report.sourceObservation.nativeCompileSuccess).toBe(true);
    expect(text(entry.sourcePath)).toBe(text(entry.report.sourceObservation.executed.path));
    expect(entry.regions.facets[0]).toMatchObject({ outcome: 'SUPPORTED_B', modelAVerdict: 'REFUTED' });
    for (const proof of [entry.regions.originalPng, entry.regions.originalCsv, entry.regions.pixelCertificate,
      entry.block.rowSet, entry.block.columnBindings, entry.block.closureMask, entry.certificate.originalPng,
      entry.certificate.originalCsv, entry.certificate.pixelCertificate, entry.certificate.rowSet]) bound(proof);
    expect(json('v104/captures/v104/validation-result-v8.json').status).toBe('PASS');
    expect(entry.certificate.transitions.map((t: any) => t.phase)).toEqual([8, 24]);
    expect(entry.certificate.transitions.map((t: any) => t.ownIndex)).toEqual([20040, 20056]);
    for (const t of entry.certificate.transitions) {
      for (const cell of [t.chartTime, t.inputIndex, t.phase32, t.step, t.previousStep, t.anchorRulerDelta]) {
        expect(cell.csvSha256).toBe(entry.block.csv.sha256);
        expect(entry.csv.headers[cell.columnOrdinal - 1]).toBe(cell.headerRaw);
        expect(entry.csv.raw(cell.rowOrdinal, cell.headerRaw)).toBe(cell.valueRaw);
      }
      expect(Number(t.inputIndex.valueRaw)).toBe(t.ownIndex);
      expect(t.ownIndex % 32).toBe(t.phase);
      expect(entry.certificate.anchorOwnIndex + Number(t.anchorRulerDelta.valueRaw)).toBe(t.ownIndex);
      expect(t.step.valueRaw).toBe(t.phase === 8 ? '75' : '25');
      expect(t.previousStep.valueRaw).toBe(t.phase === 8 ? '25' : '75');
      expect(t.candidateIntervalsPx.B[1]).toBeLessThan(t.candidateIntervalsPx.A[0]);
      expect(t.observedTurnXPx).toBeGreaterThanOrEqual(t.candidateIntervalsPx.B[0]);
      expect(t.observedTurnXPx).toBeLessThanOrEqual(t.candidateIntervalsPx.B[1]);
    }
  });
  it('scores 320 exact values/blanks and separately checks 64 translated index context cells', () => {
    const { result, bars } = executeStep(entry);
    expect(entry.primary).toEqual(Array.from({ length: 32 }, (_, i) => entry.anchor - 31 + i));
    expect(entry.first).toBeLessThanOrEqual(entry.primary[0] - 8);
    expect(entry.indexDelta % 32).toBe(0);
    for (const row of entry.primary) {
      expect(entry.closure.raw(row, 'independently_closed')).toBe('1');
      expect(Number(entry.csv.raw(row, 'time')) * 1000 + 120000).toBeLessThanOrEqual(Date.parse(entry.closure.raw(row, 'export_utc')));
      expect(entry.csv.raw(row, 'CHART_CONFIRMED')).toBe('1');
    }
    let exact = 0, translated = 0;
    for (const property of entry.report.properties) for (const comparison of property.comparisonRows) {
      const cell = comparison.actual;
      expect(entry.primary).toContain(cell.rowOrdinal);
      expect(entry.csv.raw(cell.rowOrdinal, cell.headerRaw)).toBe(cell.valueRaw);
      const plot = result.plots[property.sourcePlotOrdinal];
      expect(plot.title).toBe(property.title);
      const actual = plot.values[cell.rowOrdinal - entry.first];
      const value = actual == null || Number.isNaN(actual) ? null : actual;
      const expected = cell.valueRaw === '' ? null : Number(cell.valueRaw);
      if (['INPUT_INDEX', 'VISUAL_ANCHOR_INDEX'].includes(property.title)) {
        expect(value === null ? null : value + entry.indexDelta).toBe(expected); translated++;
      } else { expect(value).toBe(expected); exact++; }
    }
    expect(exact).toBe(320); expect(translated).toBe(64);
    for (const title of ['RULER8_DELTA', 'RULER24_DELTA', 'VISUAL_ANCHOR_INDEX', 'VISUAL_ANCHOR_TIME']) {
      const values = result.plots.find(p => p.title === title)!.values.slice(-32);
      expect(values.filter(v => v != null && Number.isFinite(v))).toHaveLength(1);
      expect(values.slice(0, 31).every(v => v == null || Number.isNaN(v))).toBe(true);
    }
    expect(bars.at(-1)!.time).toBe(Number(entry.csv.raw(entry.anchor, 'time')) * 1000);
    expect(Number(entry.csv.raw(entry.anchor + 1, 'CHART_CONFIRMED'))).toBe(0);
    expect(result.drawings.filter(d => d.type === 'line').map(d => d.x1)).toEqual(
      entry.certificate.transitions.map((t: any) => t.ownIndex - entry.indexDelta));
  });
});
