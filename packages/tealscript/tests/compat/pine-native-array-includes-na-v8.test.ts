import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('Captured v8 array includes missing-value contracts', () => {
  it('matches authority-framework-na-search-v5-v1.pine (06c0bb9ec097)', () => {
    const result = runCompatScript(`//@version=5
indicator("NA search consistency v1")
a = array.new_float(2, na)
plot(array.includes(a, na) ? 1 : 0, "includes")
plot(array.indexof(a, na), "indexof")
`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'includes').values).toEqual(compatibilityBars.map(() => 0));
    expect(getPlot(result, 'indexof').values).toEqual(compatibilityBars.map(() => -1));
  });
  it('matches authority-framework-reference-na-factorization-v5-v1.pine (7ddee8d186ee)', () => {
    const result = runCompatScript(`//@version=5
indicator("Published framework NA factorization v1")
_private_factorize(id_1, id_2) =>
	size_1 = array.size(id_1)
	new_id_1 = array.new_int(array.size(id_1), 0)
	new_id_2 = array.new_int(array.size(id_2), 0)

	factors = array.new_int(0)
	elements = array.concat(array.copy(id_1), id_2)
	added_elements = array.copy(elements)
	array.clear(added_elements)
	size = array.size(elements)

	if size > 0
		for i = 0 to size - 1
			el = array.get(elements, i)
			int new_factor = na

			if array.includes(added_elements, el)
				index = array.indexof(added_elements, el)
				new_factor := array.get(factors, index)
			else
				array.push(added_elements, el)
				new_factor := array.size(factors) == 0 ? 0 : 1 + array.get(factors, array.size(factors) - 1)
				array.push(factors, new_factor)
				na

			if i < size_1
				array.set(new_id_1, i, new_factor)
			else
				array.set(new_id_2, i - size_1, new_factor)
	[new_id_1, new_id_2]
line missing = na
[a, b] = _private_factorize(array.from(missing, missing), array.from(missing, missing))
plot(array.size(a))
`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual(compatibilityBars.map(() => 2));
  });
});
