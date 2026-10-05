import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const native = {
  source:
    '//@version=6\nindicator("silent-s3-max-lines-501-v20-v1", precision=16, max_lines_count=501)\nvar int completed = 0\nif barstate.islastconfirmedhistory\n    for i = 0 to 500\n        line.new(bar_index - 1, float(i), bar_index, float(i))\n    completed := 1\nplot(bar_index, title="CHART_INDEX", display=display.data_window)\nplot(time, title="CHART_TIME_MS", display=display.data_window)\nplot(501, title="DECLARED_MAX_LINES", display=display.data_window)\nplot(completed, title="CALL_COMPLETED", display=display.data_window)\nplot(array.size(line.all), title="LINE_ALL_SIZE", display=display.data_window)\n',
  sourceSha256: 'e4b87bc9e20903264fa5672925a063354b931c123c0276ad6883d4cea7fc6548',
  control:
    '//@version=6\nindicator("silent-s3-max-lines-500-v20-v1", precision=16, max_lines_count=500)\nvar int completed = 0\nif barstate.islastconfirmedhistory\n    for i = 0 to 500\n        line.new(bar_index - 1, float(i), bar_index, float(i))\n    completed := 1\nplot(bar_index, title="CHART_INDEX", display=display.data_window)\nplot(time, title="CHART_TIME_MS", display=display.data_window)\nplot(500, title="DECLARED_MAX_LINES", display=display.data_window)\nplot(completed, title="CALL_COMPLETED", display=display.data_window)\nplot(array.size(line.all), title="LINE_ALL_SIZE", display=display.data_window)\n',
  controlSourceSha256: '3d9fe86e8a23e1b29917240f1ec22b108bede5da44c11051071607e6c944e300',
};

// Exact v20 CE10178 at 2:75; runtime zero and valid500 retention are separate clauses.
describe('native v20 line declaration ceiling', () => {
  it('refuses exact native501 declaration before execution', () => {
    expect(createHash('sha256').update(native.source).digest('hex')).toBe(native.sourceSha256);
    const errors = checkProgram(parse(native.source)).diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toEqual([
      expect.objectContaining({
        message: 'indicator max_lines_count must be a non-negative integer no greater than 500',
        line: 2,
        column: 75,
      }),
    ]);
  });
  it('retains compile admission of the exact native500 control', () => {
    expect(createHash('sha256').update(native.control).digest('hex')).toBe(native.controlSourceSha256);
    expect(checkProgram(parse(native.control)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });
});
