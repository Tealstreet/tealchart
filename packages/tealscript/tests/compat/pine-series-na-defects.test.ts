import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { getPlot, runCompatScript } from './fixtures';

// Authority for every case:
// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json.
// Expected-red cases are retained only after an isolated documented patch makes

// the ordinary assertion green; inverse proof details accompany each case.

describe('documented series/na defects', () => {
  // Reference: if detailedDesc (omitted else returns a type-specific empty value),
  // bool type; supporting type-system/#bool and v6 migration boolean rules.
  // Inverse proof: isolated emitter initializes a typed v6 bool if-result to

  // false rather than NaN before executing its arms. Raw assertion GREEN;
  // isolated copy discarded. Baseline raw assertion RED on missing-arm bars.
  it('bool-if-missing-default: unselected v6 bool arm is false', () => {
    const result = runCompatScript(`//@version=6
indicator("Missing bool arm")
bool x = if bar_index == 1 or bar_index == 3
    true
plot(x == false ? 1 : 0, "value")`);
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(getPlot(result, 'value').values).toEqual([1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1]);
  });

  // Reference: []; supporting operators/#-history-referencing-operator explicitly
  // refuses close[1][2]. Pin a semantic error, not an incidental runtime crash.
  // Inverse proof: isolated checkIndexExpression rejects an IndexExpression

  // receiver. Raw assertion GREEN; copy discarded. Baseline has no diagnostic.
  it('chained-history-accepted: refuses chained history', () => {
    const checked = checkProgram(parse('//@version=6\nindicator("Chained history")\nplot(close[1][2])'));
    expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toContainEqual(
      expect.objectContaining({ code: 'type-mismatch', message: expect.stringMatching(/history|\[\]/i) }),
    );
  });

  // Authority: reference varip detailedDesc and manual variable-declarations/#varip.
  // Both refuse these four drawing types; conflicted types are deliberately unpinned.
  // Inverse proof EACH: isolated checker rejects varip declarations annotated

  // with special reference types. All four raw assertions GREEN; copy discarded.
  // Each baseline raw assertion RED because the forbidden declaration is accepted.
  it.each(['line', 'label', 'box', 'table'])('varip-special-type-accepted: refuses varip %s', (type) => {
    const checked = checkProgram(parse(`//@version=6\nindicator("Varip type")\nvarip ${type} x = na`));
    expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toContainEqual(
      expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('varip') }),
    );
  });

  // Reference: plot style parameter and plot.style_line; supporting v6 migration
  // #unique-parameters-cannot-be-na refuses na as a unique plot-style value.
  // Inverse proof: isolated namespaced unique-constant validation rejects literal

  // na in v6. Raw assertion GREEN; copy discarded. Baseline has no diagnostic.
  it('unique-style-na-accepted: refuses na plot style', () => {
    const checked = checkProgram(parse('//@version=6\nindicator("Unique style")\nplot(close, style=na)'));
    expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toContainEqual(
      expect.objectContaining({ code: 'type-mismatch', message: expect.stringMatching(/style|unique/i) }),
    );
  });
});
