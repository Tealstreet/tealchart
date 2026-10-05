import { describe, expect, it } from 'vitest';

import { runCompatScript } from './fixtures';

// Input reference: generic defaults select the widget by their Pine type.
describe('input review generic float widget inference', () => {
  it.each(['1.0', '1e0', '-1.0', 'float(1)', 'typed'])(
    'uses a float widget for integral-valued Pine float %s',
    (value) => {
      const result = runCompatScript(`//@version=6
indicator("Float widget")
const float typed=1
selected=input(${value})
plot(selected)`);
      expect(result.errors).toEqual([]);
      expect(result.inputs).toEqual([expect.objectContaining({ type: 'float', defval: value === '-1.0' ? -1 : 1 })]);
    },
  );
  it.each(['3', '-3', 'typed'])('keeps an int widget for Pine int %s', (value) => {
    const result = runCompatScript(`//@version=6
indicator("Int widget")
const int typed=3
selected=input(${value})
plot(selected)`);
    expect(result.errors).toEqual([]);
    expect(result.inputs).toEqual([expect.objectContaining({ type: 'int', defval: value === '-3' ? -3 : 3 })]);
  });
});
