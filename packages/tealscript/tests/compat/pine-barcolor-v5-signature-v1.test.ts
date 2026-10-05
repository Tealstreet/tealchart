import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { getPlot, runCompatScript } from './fixtures';

// Official v5 concepts/bar-coloring lists six parameters and no transp slot.
// Keep earlier-version signatures outside this witness's authority scope.
describe('documented v5 barcolor signature', () => {
  it('refuses the unsupported transp keyword', () => {
    const source = '//@version=5\nindicator("Bar tint")\nbarcolor(color.red, transp=50)';
    const errors = checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining('transp') })]),
    );
  });

  it('binds all six documented positional slots consistently with runtime', () => {
    const source = '//@version=5\nindicator("Bar tint")\nbarcolor(color.red, 2, false, 7, "Tint", display.none)';
    expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Tint')).toMatchObject({
      type: 'barcolor',
      offset: 2,
      editable: false,
      showLast: 7,
      display: 0,
    });
  });
});
