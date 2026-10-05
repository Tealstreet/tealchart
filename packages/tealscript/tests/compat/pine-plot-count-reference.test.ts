import { describe, expect, it } from 'vitest';

import { runCompatScript } from './fixtures';

function plots(count: number): string {
  return Array.from({ length: count }, (_, index) => `p${index} = plot(close, "P${index}", display=display.none)`).join('\n');
}

describe('documented fill plot-count exemption', () => {
  // The official limit counts fills only when their color is series-qualified.
  // https://www.tradingview.com/pine-script-docs/writing/limitations/#plot-limits
  it('allows 64 plots plus a constant-color fill', () => {
    const result = runCompatScript(`//@version=6
indicator("Constant fill count")
${plots(64)}
fill(p0, p1, color.red)
`);
    expect(result.errors).toEqual([]);
    expect(result.plots).toHaveLength(65);
  });

  it.each(['input.color(color.red)', 'color.red'])('allows a named fill color %s', (color) => {
    const result = runCompatScript(`//@version=6
indicator("Named fill count")
c = ${color}
${plots(64)}
fill(p0, p1, color=c)
`);
    expect(result.errors).toEqual([]);
  });

  it('counts hidden ordinary plots', () => {
    const result = runCompatScript(`//@version=6
indicator("Hidden plot count")
${plots(65)}
`);
    expect(result.errors[0]?.message).toContain('maximum is 64');
  });

  it('counts a series-color fill', () => {
    const result = runCompatScript(`//@version=6
indicator("Series fill count")
${plots(64)}
fill(p0, p1, close > open ? color.red : color.blue)
`);
    expect(result.errors[0]?.message).toContain('maximum is 64');
  });
});
