import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

function errors(option: string) {
  return checkProgram(
    parse(
      `//@version=6\nindicator("Session options")\ninput bool enabled = input.bool(true)\nsimple bool simpleEnabled = syminfo.type == "stock"\nseries bool seriesEnabled = close > open\nx = input.session("0900-1700", ${option})\n`,
    ),
  ).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('input.session metadata qualifier boundaries', () => {
  it.each(['true', 'false'])('accepts const bool %s for confirm', (value) => {
    expect(errors(`confirm=${value}`)).toEqual([]);
  });

  it.each(['enabled', 'simpleEnabled', 'seriesEnabled'])('refuses confirm=%s', (value) => {
    expect(errors(`confirm=${value}`)).toContainEqual(expect.objectContaining({ code: 'qualifier-mismatch' }));
  });

  it.each(['true', 'enabled'])('accepts active=%s', (value) => {
    expect(errors(`active=${value}`)).toEqual([]);
  });

  it.each(['simpleEnabled', 'seriesEnabled'])('refuses active=%s', (value) => {
    expect(errors(`active=${value}`)).toContainEqual(expect.objectContaining({ code: 'qualifier-mismatch' }));
  });
});
