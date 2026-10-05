import { createHash } from 'node:crypto';

import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { runCompatScript } from './fixtures';

const source =
  '//@version=6\nindicator("silent-s3-max-lines-0-v20-v1", precision=16, max_lines_count=0)\nvar int completed = 0\nif barstate.islastconfirmedhistory\n    for i = 0 to 500\n        line.new(bar_index - 1, float(i), bar_index, float(i))\n    completed := 1\nplot(bar_index, title="CHART_INDEX", display=display.data_window)\nplot(time, title="CHART_TIME_MS", display=display.data_window)\nplot(0, title="DECLARED_MAX_LINES", display=display.data_window)\nplot(completed, title="CALL_COMPLETED", display=display.data_window)\nplot(array.size(line.all), title="LINE_ALL_SIZE", display=display.data_window)\n';

it('reports the captured zero line-limit runtime refusal after admission', () => {
  expect(createHash('sha256').update(source).digest('hex')).toBe(
    'bd4ccc9b82e2a896277e8109a9fd4393e654f3376c69d9bc5287ad8bf86f43d2',
  );
  expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const result = runCompatScript(source);
  expect(result.errors.map((error) => error.message)).toEqual([
    "Invalid value of the 'max_lines_count' argument (0) in the 'study' function. It must be > 0.",
  ]);
  expect(result.drawings).toEqual([]);
});

it.each([1, 500])('retains valid line-limit %i execution', (limit) => {
  expect(runCompatScript(source.replace('max_lines_count=0', `max_lines_count=${limit}`)).errors).toEqual([]);
});
