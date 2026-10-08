import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Native CF009: oracle-probes/v2/captures/v2/conflicts-batch-1-v1.csv,
// CF009_blue_r/g/b = 41/98/255 on all 24,143 historical rows.
// https://www.tradingview.com/pine-script-reference/v6/#const_color.blue
describe('native v6 blue constant (CF009)', () => {
  it('matches captured RGB channels and literal identity', () => {
    const result = runCompatScript(`//@version=6
indicator("Native blue")
plot(color.r(color.blue), "CF009_blue_r")
plot(color.g(color.blue), "CF009_blue_g")
plot(color.b(color.blue), "CF009_blue_b")
plot(color.blue == #2962FF ? 1 : 0, "identity")
`);
    expect(result.errors).toEqual([]);
    for (const [title, value] of [
      ['CF009_blue_r', 41],
      ['CF009_blue_g', 98],
      ['CF009_blue_b', 255],
      ['identity', 1],
    ] as const) {
      expect(getPlot(result, title).values).toEqual(Array(compatibilityBars.length).fill(value));
    }
  });

  it('carries the native constant through input defaults and transparency', () => {
    const result = runCompatScript(`//@version=6
indicator("Native blue values")
selected = input.color(color.blue, "Blue")
plot(close, "paint", color=selected)
plot(close, "shade", color=color.new(selected, 50))
`);
    expect(result.errors).toEqual([]);
    expect(result.inputs.find((input) => input.title === 'Blue')?.defval).toBe('#2962FF');
    expect(getPlot(result, 'paint').color).toEqual(Array(compatibilityBars.length).fill('#2962FF'));
    expect(getPlot(result, 'shade').color).toEqual(Array(compatibilityBars.length).fill('#2962FF80'));
  });

  it('matches the v5 blue literal control captured in the native v4 drawing grid', () => {
    const result = runCompatScript(`//@version=5
indicator("Legacy blue control")
plot(color.blue == #2962FF ? 1 : 0, "identity")
plot(color.r(color.blue), "r")
`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'identity').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'r').values).toEqual(Array(compatibilityBars.length).fill(41));
  });
});
