import { describe, expect, it } from 'vitest';

import { checkProgram } from '../../src/semantic/checker';
import { parse } from '../../src/parser';
import { getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#const_size.tiny
// https://www.tradingview.com/pine-script-reference/v6/#fun_input.string
const header = '//@version=6\nindicator("Size namespace")\n';

describe('size constants beside scalar declarations', () => {
  it.each([
    'size = input.string(size.tiny)\nplot(size == "tiny" ? 1 : 0, title="Witness")',
    'var size = input.string(size.tiny)\nplot(size == "tiny" ? 1 : 0, title="Witness")',
    'f() =>\n    size = size.normal\n    size == "normal" ? 1 : 0\nplot(f(), title="Witness")',
    'selected = size.normal\nsize = 7\nplot(selected == "normal" ? 1 : 0, title="Witness")',
  ])('lowers const-string members by semantic identity: %s', (body) => {
    const result = runCompatScript(header + body);
    expect(result.errors).toEqual([]);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
    expect(getPlot(result, 'Witness').values).toEqual(Array(12).fill(1));
  });

  it('retains UDT parameter member access', () => {
    const result = runCompatScript(header + 'type Font\n    float normal = 3\nf(Font size) => size.normal\nplot(f(Font.new()), title="Witness")');
    expect(result.errors).toEqual([]);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
    expect(getPlot(result, 'Witness').values).toEqual(Array(12).fill(3));
  });

  it('retains the documented namespace-obscuring UDT variable refusal', () => {
    const result = checkProgram(parse(header + 'type Font\n    float normal = 3\nsize = Font.new()\nplot(size.normal)'));
    expect(result.diagnostics.map(d => d.code)).toEqual(['namespace-obscuring']);
  });
});
