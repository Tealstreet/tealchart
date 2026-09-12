import { describe, expect, it } from 'vitest';

import { getPineVisualNormalizationEntry, PINE_VISUAL_NORMALIZATION_REGISTER } from './pineVisualNormalizationRegister';

describe('Pine visual normalization register', () => {
  it('keeps trace-undetermined tealchart renderer normalizations inventoried', () => {
    expect(PINE_VISUAL_NORMALIZATION_REGISTER.map((entry) => entry.id)).toEqual([
      'tealchart.label-price-coordinate-clamp',
      'tealchart.area-fill-alpha-normalization',
      'tealchart.plotarrow-height-floor',
      'tealchart.plotarrow-height-reorder',
      'tealchart.table-explicit-dimension-normalization',
      'tealchart.plot-marker-textcolor-na-fallback',
    ]);
    expect(PINE_VISUAL_NORMALIZATION_REGISTER.every((entry) => entry.status === 'trace-undetermined')).toBe(true);
  });

  it('records enough evidence to route each entry to a trace probe', () => {
    for (const entry of PINE_VISUAL_NORMALIZATION_REGISTER) {
      expect(entry.code.length).toBeGreaterThan(0);
      expect(entry.currentBehavior.length).toBeGreaterThan(20);
      expect(entry.unresolvedQuestion).toMatch(/does not (specify|state)|not documented/);
      expect(entry.nextEvidence).toContain('TradingView');
      expect(getPineVisualNormalizationEntry(entry.id)).toBe(entry);
    }
  });
});
