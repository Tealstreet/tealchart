import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { compile } from '../../src/runtime/codegen/compile';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const refused = [
  ['conditional declaration escapes its block', 'if true\n    bar_index = 7\nplot(bar_index)'],
  ['conditional declaration escapes into else', 'if true\n    bar_index = 7\nelse\n    plot(bar_index)'],
  ['global declaration follows its read', 'plot(bar_index)\nbar_index = 7'],
  ['function declaration escapes its block', 'f() =>\n    if true\n        bar_index = 7\n    bar_index\nplot(f())'],
  ['function declaration follows its read', 'f() =>\n    value = bar_index\n    bar_index = 7\n    value\nplot(f())'],
  [
    'function declaration escapes into else',
    'f() =>\n    if true\n        bar_index = 7\n    else\n        value = bar_index\n    1\nplot(f())',
  ],
  ['loop iterator escapes its block', 'for bar_index = 0 to 1\n    value = bar_index\nplot(bar_index)'],
  ['reassignment cannot introduce a declaration', 'bar_index := 7\nplot(1)'],
] as const;

const admitted = [
  ['global declaration', 'bar_index = 7\nplot(bar_index, title="Value")', 7],
  ['global reassignment', 'bar_index = 7\nbar_index := 9\nplot(bar_index, title="Value")', 9],
  ['function parameter', 'f(bar_index) => bar_index + 1\nplot(f(7), title="Value")', 8],
  ['function local', 'f() =>\n    bar_index = 7\n    bar_index\nplot(f(), title="Value")', 7],
  [
    'conditional local',
    'value = if true\n    bar_index = 7\n    bar_index\nelse\n    0\nplot(value, title="Value")',
    7,
  ],
  ['loop iterator', 'value = 0\nfor bar_index = 0 to 2\n    value := value + bar_index\nplot(value, title="Value")', 3],
] as const;

// Native evidence settles v3 builtin unavailability; these additional sources
// check lexical user-binding exemptions, without claiming fresh TV captures.
describe('v3 unavailable builtin user-binding scope', () => {
  for (const [name, body] of refused) {
    it(`refuses when ${name}`, () => {
      const source = `//@version=3\nstudy("Scope")\n${body}`;
      const errors = checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
      const diagnostic =
        name === 'reassignment cannot introduce a declaration'
          ? { code: 'unknown-assignment-target', message: 'Cannot assign to undeclared identifier: bar_index' }
          : { code: 'unknown-identifier', message: 'Unknown identifier: bar_index' };
      expect(errors).toContainEqual(expect.objectContaining(diagnostic));
      const result = compile(parse(source));
      expect(result.success).toBe(false);
      expect(result.unsupported).toContain('Unknown identifier: bar_index');
    });
  }

  for (const [name, body, value] of admitted) {
    it(`retains the runtime value of a ${name}`, () => {
      const source = `//@version=3\nstudy("Scope")\n${body}`;
      expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(compile(parse(source)).success).toBe(true);
      const bars = compatibilityBars.slice(0, 3);
      const result = runCompatScript(source, { bars });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Value').values).toEqual(bars.map(() => value));
    });
  }
});
