import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { checkProgram } from '../../src/semantic/checker';

// Native corpus-array-string-percentile: CE10123, literal string percentage.
// Evidence: oracle-probes/v3/captures/v3/evidence/corpus-array-string-percentile-attempt1-error.png.
describe('native array percentile percentage kind', () => {
  it('refuses the captured receiver string percentage while retaining numeric overloads', () => {
    const diagnostics = (call: string) => checkProgram(parse(`//@version=6\nindicator("Native percentile type")\nvalues = array.from(1.0, 2.0, 3.0)\nplot(${call}, "OUTCOME")`)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    expect(diagnostics('values.percentile_nearest_rank("50")')).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'type-mismatch', message: expect.stringMatching(/percentile_nearest_rank percentage.*number.*string/) }),
    ]));
    for (const call of [
      'values.percentile_nearest_rank(50)', 'values.percentile_nearest_rank(50.0)',
      'array.percentile_nearest_rank(values, percentage=50)',
      'values.percentile_linear_interpolation(50.0)',
    ]) expect(diagnostics(call)).toEqual([]);
  });
});
