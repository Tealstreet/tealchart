import { describe, expect, it } from 'vitest';
import { dashBlock, dashCsv, dashRegions, dashReport, dashRows, dashSource, executeDash } from '../fixtures/v104Dash';
import { json, raw } from '../fixtures/v104Fixture';

describe('v104 retained dashed lanes: exact closed cells, appearance independently held', () => {
  it('binds original admission, supported width scaling and immutable PNG/CSV/source evidence', () => {
    expect(dashReport.sourceObservation.nativeCompileSuccess).toBe(true);
    expect(dashRegions.facets[0]).toMatchObject({ outcome: 'SUPPORTED_B', modelAVerdict: 'REFUTED', modelBVerdict: 'SUPPORTED' });
    for (const proof of [dashRegions.originalPng, dashRegions.originalCsv, dashRegions.pixelCertificate,
      dashBlock.rowSet, dashBlock.columnBindings, dashBlock.closureMask]) expect(raw(proof.path).length).toBe(proof.bytes);
    expect(json('v104/captures/v104/validation-result-v5.json').status).toBe('PASS');
    expect(dashSource).toContain('width=1, style=line.style_dashed');
    expect(dashSource).toContain('width=4, style=line.style_dashed');
    expect(dashSource).toContain('width=8, style=line.style_dashed');
  });
  it('replays 288 exact primary values/blanks plus 64 translated absolute-index cells; no seed credit', () => {
    const { result, firstRowOrdinal, firstNativeIndex } = executeDash();
    const primary = dashRows.selectedPrimaryClosedRowOrdinals as number[];
    expect(primary).toHaveLength(32);
    expect(dashRows.originalClosedPredecessorRowOrdinals).toHaveLength(8);
    for (const row of [...dashRows.originalClosedPredecessorRowOrdinals, ...primary]) {
      expect(dashRows.independentlyClosedRowOrdinals).toContain(row);
      expect(dashCsv.raw(row, 'CHART_CONFIRMED')).toBe('1');
      expect(Number(dashCsv.raw(row, 'time')) * 1000 + 120000).toBeLessThanOrEqual(Date.parse(dashRows.nativeExportUtc));
    }
    expect(primary).toEqual(Array.from({ length: 32 }, (_, i) => dashRows.uniqueVisualAnchorRowOrdinal - 31 + i));
    let exact = 0, translated = 0;
    for (const property of dashReport.properties) for (const comparison of property.comparisonRows) {
      const pointer = comparison.actual;
      expect(primary).toContain(pointer.rowOrdinal);
      expect(dashCsv.raw(pointer.rowOrdinal, pointer.headerRaw)).toBe(pointer.valueRaw);
      const plot = result.plots[property.sourcePlotOrdinal];
      expect(plot.title).toBe(property.title);
      const value = plot.values[pointer.rowOrdinal - firstRowOrdinal];
      const expected = pointer.valueRaw === '' ? null : Number(pointer.valueRaw);
      if (['INPUT_INDEX', 'VISUAL_ANCHOR_INDEX'].includes(property.title)) {
        expect(value == null ? null : value + firstNativeIndex).toBe(expected); translated++;
      } else { expect(value == null || Number.isNaN(value) ? null : value).toBe(expected); exact++; }
    }
    expect(exact).toBe(288); expect(translated).toBe(64);
    expect(result.drawings.filter(d => d.type === 'line')).toMatchObject([
      { y1: 85, y2: 85, width: 1, style: 'dashed' }, { y1: 65, y2: 65, width: 4, style: 'dashed' },
      { y1: 40, y2: 40, width: 8, style: 'dashed' },
    ]);
  });
});
