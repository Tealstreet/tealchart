import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Reference: https://www.tradingview.com/pine-script-reference/v6/, types8/9/13/14/18 and collection templates.
// https://www.tradingview.com/pine-script-docs/language/user-defined-functions/#type-keywords
// Corpus v56:1679: label[] cannot satisfy a declared line[] parameter; sibling collection templates share the rule.
const cases = [
  // Reference types13 (array),8 (line),9 (label).
  ['line[]', 'array.new_label()', 'array.new_line()', 'array.get(values, 0)', 'array<line>'],
  // Reference types14 (matrix),8 (line),9 (label).
  ['matrix<line>', 'matrix.new<label>(1, 1, na)', 'matrix.new<line>(1, 1, na)', 'matrix.get(values, 0, 0)', 'matrix<line>'],
  // Reference types18 (map),8 (line),9 (label).
  ['map<int, line>', 'map.new<int, label>()', 'map.new<int, line>()', 'map.get(values, 0)', 'map<int, line>'],
] as const;

const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

describe('corpus collection UDF parameter compatibility', () => {
  for (const binding of ['positional', 'named']) {
    it.each(cases)(`rejects foreign reference elements for %s with ${binding} binding`, (type, wrong, valid, read, expected) => {
      const argument = binding === 'named' ? 'values=labels' : 'labels';
      const source = `//@version=5\nindicator("Collection parameter")\nfirst_line_x(${type} values) => line.get_x1(${read})\nlabels = ${wrong}\nplot(first_line_x(${argument}))`;
      expect(errors(source.replace(wrong, valid))).toEqual([]);
      expect(errors(source)).toContainEqual(expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining(expected) }));
    });
  }
});
