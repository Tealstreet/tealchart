import { describe, expect, it } from 'vitest';

import { checkProgram } from '../../src/semantic/checker';
import { parse } from '../../src/parser/parser';
import { getPlot, runCompatScript } from './fixtures';

// Native v3 bounds01..04: RE10002 on bar0 for percentage -1/101.
// Evidence: oracle-probes/v3/captures/v3/evidence/bounds-0{1..4}-*-attempt1-error.png.
describe('native TA percentile percentage bounds', () => {
  it.each([
    ['nearest_rank', -1], ['nearest_rank', 101],
    ['linear_interpolation', -1], ['linear_interpolation', 101],
  ] as const)('%s refuses runtime percentage %s rather than clamping', (method, percentage) => {
    const source = `//@version=6\nindicator("Native percentile bounds", max_bars_back=256)\nplot(ta.percentile_${method}(close, 5, ${percentage}.0), "OUTCOME")`;
    expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const refused = runCompatScript(source);
    expect(refused.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringMatching(/percentage.*\[0[.,]+100\]/) }),
    ]));
    expect(refused.errors.map((error) => error.message).join(' ')).toContain(String(percentage));
    expect(refused.profile.swallowedErrors?.length ?? 0).toBe(0);
    const admitted = runCompatScript(`//@version=6\nindicator("Valid percentile bounds")\nplot(ta.percentile_${method}(close, 5, 0.0), "LOW")\nplot(ta.percentile_${method}(close, 5, 100.0), "HIGH")`);
    expect(admitted.errors).toEqual([]);
    expect(getPlot(admitted, 'LOW').values[4]).toBe(99);
    expect(getPlot(admitted, 'HIGH').values[4]).toBe(107);
  });
});
