import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { tryCompile } from '../../src/runtime/codegen/execute';
import { getPlot, runCompatScript } from './fixtures';

// Native v3 adjudicated runtime refusals on bar0:
// oracle-probes/v3/captures/v3/evidence/
// bounds-07-ta-pivot-point-levels-invalid-type-attempt1-error.png (RE10005)
// scalar-05-ta-pivot-point-levels-Woodie-developing-attempt1-error.png (RE10128)
// We pin phase/condition, not exact numeric diagnostic codes.
const bars = [4, 6].map((close, i) => ({
  time: i * 60000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 1,
}));
const script = (type: string, developing: boolean) => `//@version=6
indicator("Native pivot refusal")
plot(array.size(ta.pivot_point_levels("${type}", true, ${developing})), "OUTCOME")`;
describe('native v3 pivot runtime refusal conditions', () => {
  it.each([
    ['INVALID', false, /Invalid.*INVALID.*type/],
    ['Woodie', true, /Woodie.*developing|developing.*Woodie/],
  ] as const)('%s/%s compiles then refuses bar0', (type, developing, message) => {
    const source = script(type, developing);
    expect(tryCompile(parse(source)).success).toBe(true);
    const result = runCompatScript(source, { bars });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.message).toMatch(message);
    expect(result.profile.bars).toBe(1);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
  });
  it.each([
    ['Woodie', false],
    ['Traditional', true],
  ] as const)('%s/%s remains executable', (type, developing) => {
    const result = runCompatScript(script(type, developing), { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'OUTCOME').values).toEqual([11, 11]);
  });
});
