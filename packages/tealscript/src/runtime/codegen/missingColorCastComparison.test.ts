import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic';
import { executeCompiled, tryCompile } from './execute';

function values(body: string, version = 6, barIndex = 0) {
  const program = parse(`//@version=${version}\nindicator("Cast boundary")\n${body}`);
  expect(checkProgram(program).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const compiled = tryCompile(program);
  expect(compiled.success, compiled.unsupported.join('\n')).toBe(true);
  const result = executeCompiled(compiled, Array.from({ length: barIndex + 1 }, (_, index) => ({
    time: 1700000000000 + index * 60000, open: 1, high: 2, low: 0, close: 1, volume: 1,
  })))!;
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  return result.plots.map((plot) => plot.values[barIndex]);
}

describe('missing-color cast comparison proof boundaries', () => {
  it.each(['var', 'varip'])('keeps a root if-block %s color shadow out of stable-root folding', (kind) => {
    const body = `cast = color(na)
float shadowed = 7
plot(cast == cast ? 1 : 0)
if bar_index == 0
    ${kind} color cast = na
    shadowed := cast == cast ? 1 : 0
plot(shadowed)
plot(cast == cast ? 1 : 0)`;
    expect(checkProgram(parse(`//@version=6\nindicator("Cast shadow")\n${body}`)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(values(body)).toEqual([1, 0, 1]);
  });

  it.each([
    ['nested if', `if true
    if true
        var color cast = na
        shadowed := cast == cast ? 1 : 0`],
    ['else block', `if false
    shadowed := 7
else
    var color cast = na
    shadowed := cast == cast ? 1 : 0`],
    ['loop persistent local', `for step = 0 to 0
    var color cast = na
    shadowed := cast == cast ? 1 : 0`],
    ['collection loop value', `for cast in array.from(color(na))
    shadowed := cast == cast ? 1 : 0`],
    ['indexed collection loop value', `for [slot, cast] in array.from(color(na))
    shadowed := cast == cast ? 1 : 0`],
    ['switch local', `shadowed := switch 1
    1 =>
        color cast = na
        cast == cast ? 1 : 0
    => 7`],
    ['switch persistent local', `shadowed := switch 1
    1 =>
        var color cast = na
        cast == cast ? 1 : 0
    => 7`],
    ['switch varip local', `shadowed := switch 1
    1 =>
        varip color cast = na
        cast == cast ? 1 : 0
    => 7`],
    ['if expression local', `shadowed := if true
    color cast = na
    cast == cast ? 1 : 0
else
    7`],
    ['if expression persistent local', `shadowed := if true
    var color cast = na
    cast == cast ? 1 : 0
else
    7`],
  ])('uses runtime equality for %s shadows and restores the root proof afterward', (_name, block) => {
    expect(values(`cast = color(na)
float shadowed = 7
plot(cast == cast ? 1 : 0)
${block}
plot(shadowed)
plot(cast == cast ? 1 : 0)`)).toEqual([1, 0, 1]);
  });

  it('keeps numeric loop counters local while preserving their finite self equality', () => {
    expect(values(`cast = color(na)
float shadowed = 7
for cast = 0 to 0
    shadowed := cast == cast ? 1 : 0
plot(shadowed)
plot(cast == cast ? 1 : 0)`)).toEqual([1, 1]);
  });

  it('keeps parameter bindings and UDT fields named cast separate from the root proof', () => {
    expect(values(`type Holder
    color cast
cast = color(na)
same(color cast) => cast == cast
method sameField(Holder cast) => cast.cast == cast.cast
item = Holder.new(color(na))
plot(cast == cast ? 1 : 0)
plot(same(color(na)) ? 1 : 0)
plot(item.cast == item.cast ? 1 : 0)
plot(item.sameField() ? 1 : 0)
plot(cast == cast ? 1 : 0)`)).toEqual([1, 0, 0, 0, 1]);
  });

  it('retains independent persistent switch-arm shadows across bars without changing the root binding', () => {
    expect(values(`cast = color(na)
shadowed = switch bar_index % 2
    0 =>
        var color cast = bar_index == 0 ? na : color.red
        cast == cast ? 1 : 0
    =>
        var color cast = color.red
        cast == cast ? 1 : 0
plot(shadowed)
plot(cast == cast ? 1 : 0)`, 6, 2)).toEqual([0, 1]);
  });

  it('erases root initializer folding proof inside functions, including direct literal casts', () => {
    expect(values(`rootColor=color(na)
f()=>rootColor==rootColor
g()=>color(na)==color(na)
plot(rootColor==rootColor?1:0)
plot(f()?1:0)
plot(g()?1:0)`)).toEqual([1, 0, 0]);
  });

  it('folds pure direct casts and unchanged root aliases without changing numeric/typed missing equality', () => {
    expect(
      values(`cast = color(na)
alias = cast
var color retained = color(na)
color typedNa = na
missing = float(na)
plot(cast == alias ? 1 : 0)
plot(retained == cast ? 1 : 0)
plot(color(na) == color(x=na) ? 1 : 0)
plot(typedNa == typedNa ? 1 : 0)
plot(missing == missing ? 1 : 0)
plot(na(cast) ? 1 : 0)
plot(color.t(typedNa))`),
    ).toEqual([1, 1, 1, 0, 0, 1, 100]);
  });

  it('does not confuse stable globals with names shadowed by parameters or block locals', () => {
    expect(
      values(`cast = color(na)
f(color cast) => cast == cast
plot(cast == cast ? 1 : 0)
plot(f(color(na)) ? 1 : 0)
float shadowed = 0
if bar_index == 0
    color cast = na
    shadowed := cast == cast ? 1 : 0
plot(shadowed)
plot(cast == cast ? 1 : 0)`),
    ).toEqual([1, 0, 0, 1]);
  });

  it('invalidates the initializer proof on reassignment without dropping its source evaluation', () => {
    expect(
      values(`cast = color(na)
plot(cast == cast ? 1 : 0)
cast := color.red
plot(cast == cast ? 1 : 0)`),
    ).toEqual([0, 1]);
  });

  it('keeps the v5 cast and typed missing routes separate', () => {
    expect(
      values(
        `cast = color(na)
color typedNa = na
plot(na(cast) ? 1 : 0)
plot(cast == cast ? 1 : 0)
plot(color.r(typedNa))
plot(color.t(typedNa))`,
        5,
      ),
    ).toEqual([0, 1, null, null]);
  });
});
