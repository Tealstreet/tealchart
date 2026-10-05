import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { runCompatScript } from './fixtures';

// Text and shapes / Lines and boxes: garbage collection removes oldest objects.
describe('census declaration drawing retention', () => {
  it.each(['label', 'line'] as const)('retains the newest %s objects at the 500 ceiling (328/360)', (family) => {
    const create = family === 'label' ? 'label.new(i, i, str.tostring(i))' : 'line.new(i, i, i + 1, i + 1)';
    const result = runCompatScript(`//@version=6
indicator("Drawing ceiling", max_${family}s_count=500)
if barstate.islast
    for i = 0 to 500
        ${create}`);
    expect(result.errors).toEqual([]);
    const drawings = result.drawings.filter((drawing) => drawing.type === family);
    expect(drawings).toHaveLength(501);
    expect(
      drawings.map((drawing) => (drawing.type === 'label' ? drawing.x : drawing.type === 'line' ? drawing.x1 : null)),
    ).toEqual(Array.from({ length: 501 }, (_, index) => index));
  });

  it.each(['label', 'line'] as const)('refuses a %s declaration maximum above 500', (family) => {
    const result = checkProgram(
      parse(`//@version=6\nindicator("Over ceiling", max_${family}s_count=501)\nplot(close)`),
    );
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).not.toEqual([]);
  });
});
