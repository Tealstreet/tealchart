import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const errors = (body: string) =>
  checkProgram(
    parse(`//@version=6
indicator("Prefix return contracts")
${body}
plot(1)`),
  ).diagnostics.filter((d) => d.severity === 'error');

describe('discarded function prefixes and consumed return arms', () => {
  it('permits differing discarded float/string arms before a numeric return', () => {
    expect(
      errors(`f() =>
    if close > open
        close
    else
        "open"
    1
value = f()`),
    ).toEqual([]);
  });
  it('permits differing discarded int/string arms before a numeric return', () => {
    expect(
      errors(`f(bool flag) =>
    if flag
        1
    else
        "x"
    2
value = f(close > open)`),
    ).toEqual([]);
  });
  it('retains the consumed if return incompatibility assertion', () => {
    expect(
      errors(`f(bool flag) =>
    if flag
        1
    else
        "x"
value = f(close > open)`),
    ).toContainEqual(expect.objectContaining({ code: 'inconsistent-branch-types' }));
  });
  it('retains the consumed switch return incompatibility assertion', () => {
    expect(
      errors(`f(bool flag) =>
    switch
        flag => 1
        => "x"
value = f(close > open)`),
    ).toContainEqual(expect.objectContaining({ code: 'inconsistent-branch-types' }));
  });
  it('retains prefix bindings for consumed return arms', () => {
    expect(
      errors(`f(bool flag) =>
    prefixValue = 1
    if flag
        prefixValue
    else
        "x"
value = f(close > open)`),
    ).toContainEqual(expect.objectContaining({ code: 'inconsistent-branch-types' }));
  });
});
