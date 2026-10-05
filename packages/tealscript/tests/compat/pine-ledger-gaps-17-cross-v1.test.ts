import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authorities: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json, ta.cross;
// migration-guides/to-pine-version-5/#ta-namespace-for-technical-analysis-functions-and-variables.
const source = (version: number, call: string) => `//@version=${version}
${version === 4 ? 'study' : 'indicator'}("Cross names")
a = bar_index % 2 == 0 ? 1 : -1
plot(${call} ? 1 : 0, title="Cross")`;
const errors = (script: string) => checkProgram(parse(script)).diagnostics.filter((d) => d.severity === 'error');

describe('ledger gaps656–658 cross migration', () => {
  // Rows657/658: old x/y slots retain their positions and become source1/source2 in v5.
  it.each([
    ['x', 'cross(x=a, 0)', 'ta.cross(source1=a, 0)', 'ta.cross(x=a, source2=0)'],
    ['y', 'cross(a, y=0)', 'ta.cross(a, source2=0)', 'ta.cross(source1=a, y=0)'],
  ])('cross binds legacy %s to its renamed modern slot', (_slot, legacy, modern, invalid) => {
    expect(errors(source(4, legacy))).toEqual([]);
    expect(errors(source(5, modern))).toEqual([]);
    expect(errors(source(5, invalid))).not.toEqual([]);
    for (const [version, call] of [[4, legacy], [5, modern]] as const) {
      const result = runCompatScript(source(version, call));
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Cross').values.slice(1)).toEqual(compatibilityBars.slice(1).map(() => 1));
    }
  });
});
