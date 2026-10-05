import { describe, expect, it } from 'vitest';

import { runCompatScript } from './fixtures';

describe('input review explicit title controls', () => {
  it.each([
    ['input.bool', 'true'],
    ['input.float', '3.0'],
    ['input.string', '"A"'],
    ['input', 'color.red'],
  ])('%s preserves custom and empty titles in both bindings', (kind, value) => {
    for (const title of ['Custom', '']) {
      for (const argument of [JSON.stringify(title), `title=${JSON.stringify(title)}`]) {
        const result = runCompatScript(`//@version=6
indicator("Explicit title")
selected=${kind}(${value},${argument})
plot(close)`);
        expect(result.errors).toEqual([]);
        expect(result.inputs).toEqual([expect.objectContaining({ title })]);
      }
    }
  });
});
