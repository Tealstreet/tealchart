import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

function values(body: string, version = 6) {
  const compiled = tryCompile(parse(`//@version=${version}\nindicator("Cast boundary")\n${body}`));
  expect(compiled.success, compiled.unsupported.join('\n')).toBe(true);
  const result = executeCompiled(compiled, [{ time: 1700000000000, open: 1, high: 2, low: 0, close: 1, volume: 1 }])!;
  expect(result.errors).toEqual([]);
  return result.plots.map((plot) => plot.values[0]);
}

describe('missing-color cast comparison proof boundaries', () => {
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
