import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

describe('indicator declaration format and scale kinds', () => {
  it.each(['format', 'scale'])('refuses numeric %s', (option) => {
    const errors = checkProgram(parse(`//@version=6
indicator("Wrong kind", ${option}=7)
plot(close)`))
      .diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining(option) }),
    ]));
  });

  it.each(['format=format.volume', 'scale=scale.left'])('retains %s', (argument) => {
    const errors = checkProgram(parse(`//@version=6
indicator("Valid kind", ${argument})
plot(close)`))
      .diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    expect(errors).toEqual([]);
  });
});
