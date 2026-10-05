import type { Bar, TealscriptExecutionOptions } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { checkProgram } from '../../src/semantic';
import { getPlot, runCompatScript } from './fixtures';

// Authority: archived Pine v6 reference; literal values follow its documented contracts.
// Native v3 scalar-07 supersedes the identical table-remerge refusal (originalaab159cc8e).
const bar: Bar = { time: Date.UTC(2026, 0, 1), open: 10, high: 13, low: 8, close: 11, volume: 100 };
function run(body: string, engineOptions?: TealscriptExecutionOptions) {
  return runCompatScript(`//@version=6\nindicator("Documented UI defects")\n${body}`, { bars: [bar], engineOptions });
}
function predicate(expression: string, engineOptions?: TealscriptExecutionOptions) {
  const result = run(`plot(${expression} ? 1 : 0, "spec")`, engineOptions);
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  expect(getPlot(result, 'spec').values).toHaveLength(1);
  return getPlot(result, 'spec').values;
}

describe('documented input, text and drawing defects', () => {
  // fun_str.tostring remarks distinguish optional # digits from mandatory 0
  // trailing digits. Include a negative value and mandatory-zero control so
  // stripping all zeros, returning raw numeric text, or dropping the sign fail.
  it('string-format-optional-zeros [str.tostring]', () => {
    expect.soft(predicate('str.tostring(1.2, "#.###") == "1.2"')).toEqual([1]);
    expect.soft(predicate('str.tostring(-1.2, "#.###") == "-1.2"')).toEqual([1]);
    expect.soft(predicate('str.tostring(1.2, "#.000") == "1.200"')).toEqual([1]);
  });

  // fun_str.tostring mintick remark requires trailing zeros after rounding to
  // a multiple of syminfo.mintick. Non-tie input rejects truncation; negative
  // control rejects absolute-value formatting. No tie-rounding convention pin.
  it('string-format-mintick-zeros [str.tostring]', () => {
    const options = { runtime: { syminfo: { mintick: 0.01 } } };
    expect.soft(predicate('str.tostring(1.2, format.mintick) == "1.20"', options)).toEqual([1]);
    expect.soft(predicate('str.tostring(1.236, format.mintick) == "1.24"', options)).toEqual([1]);
    expect.soft(predicate('str.tostring(-1.236, format.mintick) == "-1.24"', options)).toEqual([1]);
    expect
      .soft(predicate('str.tostring(1.36, format.mintick) == "1.25"', { runtime: { syminfo: { mintick: 0.25 } } }))
      .toEqual([1]);
    expect
      .soft(
        predicate('str.tostring(0.00000124, format.mintick) == "0.00000125"', {
          runtime: { syminfo: { mintick: 2.5e-7 } },
        }),
      )
      .toEqual([1]);
    expect
      .soft(
        predicate('str.tostring(0.000000000000249, format.mintick) == "0.000000000000250"', {
          runtime: { syminfo: { mintick: 2.5e-14 } },
        }),
      )
      .toEqual([1]);
  });

  // fun_str.format in the cited reference links the Strings manual:
  // https://www.tradingview.com/pine-script-docs/concepts/strings/#formatting-strings
  // Default #,###.### groups whole digits and allows three optional decimals.
  it('string-format-default-numeric-grouping [str.format]', () => {
    expect.soft(predicate('str.format("{0}", 78545.97) == "78,545.97"')).toEqual([1]);
    expect.soft(predicate('str.format("{0}", -12345.6789) == "-12,345.679"')).toEqual([1]);
    expect.soft(predicate('str.format("{0}", 1234567) == "1,234,567"')).toEqual([1]);
    expect.soft(predicate('str.format("{0}", 12.5) == "12.5"')).toEqual([1]);
    expect.soft(predicate('str.format("{0,number}", 78545.97) == "78,545.97"')).toEqual([1]);
    expect.soft(predicate('str.format("{0}", "12345.6") == "12345.6"')).toEqual([1]);
    expect.soft(predicate('str.format("{0}", true) == "true"')).toEqual([1]);
  });

  // fun_str.format remarks explicitly error on nonquoted imbalanced left
  // braces, while quoted braces and stray right braces are valid controls.
  it('string-format-unbalanced-brace [str.format]', () => {
    expect.soft(predicate('str.format("ab }{0} de", 7) == "ab }7 de"')).toEqual([1]);
    expect.soft(predicate('str.format("ab \'{\' de {0}", 7) == "ab { de 7"')).toEqual([1]);
    const result = run('text = str.format("ab {0", 7)\nplot(1, "after")');
    expect.soft(result.errors).toHaveLength(1);
    expect.soft(result.errors[0]?.message ?? '').toMatch(/brace|bracket/i);
    expect.soft(result.plots.flatMap((plot) => plot.values).filter((value) => value !== null)).toEqual([]);
  });

  // fun_input.text_area signature: no inline slot; group,confirm,display,active.
  // Distinct strings and opposing booleans reject slot shifting and defaults.
  it('input-textarea-positional-refusal [input.text_area]', () => {
    const body =
      'memo = input.text_area("x", "Memo", "Tip", "Group", true, display.all, false)\nplot(str.length(memo), "spec")';
    expect.soft(checkProgram(parse(`//@version=6\nindicator("Inputs")\n${body}`)).diagnostics).toEqual([]);
    const result = run(body);
    expect(result.errors).toEqual([]);
    expect.soft(result.inputs).toHaveLength(1);
    expect
      .soft(result.inputs[0])
      .toMatchObject({ title: 'Memo', tooltip: 'Tip', group: 'Group', confirm: true, display: 31, active: false });
    expect.soft(getPlot(result, 'spec').values).toEqual([1]);
  });

  // fun_input.source signature: display,active,confirm follow group. Close
  // remains a source; metadata must not shift across confirm/display/active.
  it('input-source-positional-tail [input.source]', () => {
    const result = run(
      'src = input.source(close, "Source", "Tip", "row", "Group", display.all, false, true)\nplot(src, "spec")',
    );
    expect(result.errors).toEqual([]);
    expect.soft(result.inputs).toHaveLength(1);
    expect
      .soft(result.inputs[0])
      .toMatchObject({
        title: 'Source',
        tooltip: 'Tip',
        inline: 'row',
        group: 'Group',
        display: 31,
        active: false,
        confirm: true,
      });
    expect.soft(getPlot(result, 'spec').values).toEqual([11]);
  });

  // Native v3 scalar-07 accepts identical remerges, overriding the reference remark.
  it('table-remerge-idempotent [table.merge_cells]', () => {
    const result = run(`t = table.new(position.top_right, 2, 1)
table.merge_cells(t, 0, 0, 1, 0)
plot(1, "before")
table.merge_cells(t, 0, 0, 1, 0)
plot(2, "after")`);
    expect.soft(getPlot(result, 'before').values).toEqual([1]);
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(getPlot(result, 'after').values).toEqual([2]);
    const table = result.drawings.find((drawing) => drawing.type === 'table');
    expect(table?.type === 'table' && table.mergedCells).toHaveLength(1);
  });

  // fun_request.security_lower_tf description and timeframe parameter allow
  // equality. Do not assert host-dependent data values, just lack of refusal
  // and continuation. No ignore_invalid_timeframe escape hatch supplied.
  it('lower-tf-equality-refusal [request.security_lower_tf]', () => {
    const result = run('values = request.security_lower_tf(syminfo.tickerid, "1", close)\nplot(1, "spec")', {
      runtime: { syminfo: { tickerid: 'TEST' }, timeframe: { period: '1' } },
      requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'TEST', timeframe: '1', bars: [bar] }]),
    });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'spec').values).toEqual([1]);
  });
});
