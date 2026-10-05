import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { runCompatScript } from './fixtures';

// Ledger rank234: the v6 migration guide changes the label.new text default.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#color-changes
describe('ledger gaps 6: versioned label text defaults', () => {
  for (const [version, expected] of [
    [5, '#000000'],
    [6, '#FFFFFF'],
  ] as const) {
    it.each(['bar_index, close', 'chart.point.from_index(bar_index, close)'])(
      'uses the v' + version + ' default for %s without replacing explicit colors',
      (coordinates) => {
        const source = `//@version=${version}
indicator("Label defaults")
if barstate.islast
    label.new(${coordinates}, "default")
    label.new(${coordinates}, "explicit", textcolor=#112233)
    label.new(${coordinates}, "missing", textcolor=na)`;
        expect(checkProgram(parse(source)).diagnostics).toEqual([]);
        const result = runCompatScript(source);
        expect(result.errors).toEqual([]);
        expect(result.drawings).toEqual([
          expect.objectContaining({ type: 'label', text: 'default', textColor: expected }),
          expect.objectContaining({ type: 'label', text: 'explicit', textColor: '#112233' }),
          expect.objectContaining({ type: 'label', text: 'missing', textColor: null }),
        ]);
      },
    );
  }
});
