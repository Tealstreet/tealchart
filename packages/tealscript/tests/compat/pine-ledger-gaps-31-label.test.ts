import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

// reference/pine-v6-reference-v1.json methods[56], series-label receiver.
describe('ledger31 label font-family method', () => {
  for (const named of [false, true]) {
    it(`changes only the series label receiver with ${named ? 'named' : 'positional'} binding, ranks1206/1207`, () => {
      const source = `//@version=6
indicator("Label font-family receiver")
series label target = label.new(0, 10, text="target")
series label control = label.new(1, 20, text="control")
target.set_text_font_family(${named ? 'text_font_family=' : ''}font.family_monospace)`;
      expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(
        result.drawings.filter((d) => d.type === 'label').map((d) => ({ text: d.text, family: d.textFontFamily })),
      ).toEqual([
        { text: 'target', family: 'monospace' },
        { text: 'control', family: 'default' },
      ]);
    });
  }
});
