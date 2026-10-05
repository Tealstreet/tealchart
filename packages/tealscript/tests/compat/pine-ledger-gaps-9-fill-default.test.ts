import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Rank346: version-rules-v1#68; reference/pine-v6-reference-v1.json functions[58]/[59].
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#deprecated-the-transp-parameter
const masks = [
  { name: 'plots', declarations: 'a = plot(2)\nb = plot(1)' },
  { name: 'hlines', declarations: 'a = hline(2)\nb = hline(1)' },
];

describe('V4-FILL-DEFAULT-TRANSPARENCY', () => {
  it.each(masks)('defaults $name fill transparency to90 only in v4', ({ declarations }) => {
    const run = (version: number, color: string, extra = '') =>
      runCompatScript(
        `//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("fill transparency")\n${declarations}\nfill(a, b, color=${color}, title="band"${extra})`,
      );
    const legacy = run(4, '#336699');
    expect(legacy.errors).toEqual([]);
    expect(getPlot(legacy, 'band').color).toEqual(Array(12).fill('#3366991A'));
    const explicitZero = run(4, '#336699', ', transp=0');
    expect(explicitZero.errors).toEqual([]);
    expect(getPlot(explicitZero, 'band').color).toEqual(Array(12).fill('#336699FF'));
    const migrated = run(5, 'color.new(#336699, 90)');
    expect(migrated.errors).toEqual([]);
    expect(getPlot(migrated, 'band').color).toEqual(getPlot(legacy, 'band').color);
    const modern = run(5, '#336699');
    expect(modern.errors).toEqual([]);
    expect(getPlot(modern, 'band').color).toEqual(Array(12).fill('#336699'));
  });
  // V4 colors authority: embedded alpha makes transp ineffective, including fill.
  // https://www.tradingview.com/pine-script-docs/v4/essential/colors/#constant-colors
  it.each(masks)('preserves embedded alpha for $name fills', ({ declarations }) => {
    for (const color of ['#33669980', 'color.new(#336699, 50)']) {
      for (const extra of ['', ', transp=0']) {
        const result = runCompatScript(
          `//@version=4\nstudy("alpha precedence")\n${declarations}\nfill(a, b, color=${color}, title="band"${extra})`,
        );
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'band').color).toEqual(Array(12).fill('#33669980'));
      }
    }
  });
});
