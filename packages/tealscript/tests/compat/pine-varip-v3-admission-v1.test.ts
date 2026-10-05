import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Reference: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json, keyword varip (keywords9).
// Admission conflict settled by v3-adjudicated-v2.json, varip-01 through varip-06, and native TV CSVs.
const cases = [
  ['chart.point', 'varip chart.point value = chart.point.now(close)', 'value.price', compatibilityBars[0].close],
  ['footprint', 'varip footprint value = na', '1', 1],
  ['volume_row', 'varip volume_row value = na', '1', 1],
  ['enum', 'enum V3Enum\n    member\nvarip V3Enum value = V3Enum.member', 'value == V3Enum.member ? 1 : 0', 1],
  ['array<chart.point>', 'varip array<chart.point> value = array.new<chart.point>(0)', 'array.size(value)', 0],
  ['map<int,float>', 'varip map<int, float> value = map.new<int, float>()', 'map.size(value)', 0],
] as const;

describe('v3-settled varip declaration admissions', () => {
  it.each(cases)('admits %s and executes the captured declaration shape', (_, declaration, expression, expected) => {
    const source = `//@version=6\nindicator("V3 varip admission")\n${declaration}\nplot(${expression}, "OUTCOME")`;
    expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'OUTCOME').values).toEqual(compatibilityBars.map(() => expected));
  });
});
