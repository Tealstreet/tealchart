import { describe, expect, it } from 'vitest';
import { compatibilityBars, runCompatScript } from './fixtures';

describe('native v4/v5 bgcolor global offset capture', () => {
  it.each([4,5])('retains four bands and final global -3 offset in v%s', version => {
    const result = runCompatScript(`//@version=${version}
${version === 4 ? 'study' : 'indicator'}("Native background", overlay=false)
phase = bar_index % 32
source_code = phase == 8 ? 1 : phase == 9 ? 2 : phase == 11 ? 3 : phase == 12 ? 4 : 0
series_offset = phase < 10 ? 2 : phase < 12 ? -1 : -3
tint = source_code == 1 ? color.red : source_code == 2 ? color.blue : source_code == 3 ? color.lime : source_code == 4 ? color.orange : na
bgcolor(tint, offset=series_offset)
`, { bars: Array.from({length:32}, (_, i) => ({...compatibilityBars[0], time:compatibilityBars[0].time+i*60000})) });
    expect(result.errors).toEqual([]);
    const background = result.plots.find(plot => plot.type === 'bgcolor')!;
    expect(background.offset).toBe(-3);
    const slots = (background.color as unknown[]).flatMap((color, i) => color == null ? [] : [i]);
    expect(slots).toEqual([8,9,11,12]);
    expect(slots.map(i => i + background.offset!)).toEqual([5,6,8,9]);
  });
});
