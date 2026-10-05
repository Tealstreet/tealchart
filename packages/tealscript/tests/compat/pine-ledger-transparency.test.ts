import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// version-rules-v1#69. The old transparency parameter has no effect when the
// supplied color already carries alpha, including explicit fully opaque alpha.
// https://www.tradingview.com/pine-script-docs/v4/essential/colors/
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#the-transp-parameter-is-removed
// The migration guide lists these six families; v5 barcolor has no transp slot.
// For a six-digit color, transparency25 -> round(255 * .75) = 191 = BF.
describe('ledger: v5 color alpha takes precedence over transp', () => {
  it.each([
    [
      'plot',
      'plot(close, color=shade, transp=25, title="Tinted")',
      'plot(close, color=#123456, transp=25, title="Plain")',
    ],
    [
      'plotshape',
      'plotshape(true, color=shade, transp=25, title="Tinted")',
      'plotshape(true, color=#123456, transp=25, title="Plain")',
    ],
    [
      'plotchar',
      'plotchar(true, color=shade, transp=25, title="Tinted")',
      'plotchar(true, color=#123456, transp=25, title="Plain")',
    ],
    [
      'plotarrow',
      'plotarrow(1, colorup=shade, colordown=shade, transp=25, title="Tinted")',
      'plotarrow(1, colorup=#123456, colordown=#123456, transp=25, title="Plain")',
    ],
    ['bgcolor', 'bgcolor(shade, transp=25, title="Tinted")', 'bgcolor(#123456, transp=25, title="Plain")'],
    [
      'fill',
      'upper = plot(3)\nlower = plot(-3)\nfill(upper, lower, color=shade, transp=25, title="Tinted")',
      'fill(upper, lower, color=#123456, transp=25, title="Plain")',
    ],
  ])('preserves partial, transparent, opaque and missing colors for %s', (_name, tinted, plain) => {
    const source = `//@version=5
indicator("Alpha precedence")
shade = bar_index == 0 ? #12345666 : bar_index == 1 ? #ABCDEF00 : bar_index == 2 ? #654321FF : na
${tinted}
${plain}
`;
    expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 4) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Tinted').color).toEqual(['#12345666', '#ABCDEF00', '#654321FF', null]);
    expect(getPlot(result, 'Plain').color).toEqual(['#123456BF', '#123456BF', '#123456BF', '#123456BF']);
  });

  it('preserves constructor-generated alpha when deprecated transp disagrees', () => {
    const result = runCompatScript(
      `//@version=5
indicator("Constructor alpha precedence")
plot(close, color=color.new(#123456, 60), transp=25, title="New")
plot(close, color=color.rgb(18, 52, 86, 60), transp=25, title="RGB")
`,
      { bars: compatibilityBars.slice(0, 2) },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'New').color).toEqual(['#12345666', '#12345666']);
    expect(getPlot(result, 'RGB').color).toEqual(['#12345666', '#12345666']);
  });
});
