import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const reference = 'https://www.tradingview.com/pine-script-docs/language/objects/#copying-objects';
const bars = compatibilityBars.slice(0, 3);

function outputs(body: string): Array<Array<number | null>> {
  const result = runCompatScript(`//@version=6\nindicator("UDT copy reference fields")\n${body}`, { bars });
  expect(result.errors).toEqual([]);
  expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
  expect(result.profile?.swallowedErrors ?? []).toEqual([]);
  return ['Shared', 'Detached'].map((title) => {
    const values = getPlot(result, title).values;
    expect(values).toHaveLength(bars.length);
    return values;
  });
}

describe(`shallow UDT copies share referents and retain independent reference fields [${reference}]`, () => {
  it('reassigns the copied array field without replacing the original array field', () => {
    expect(
      outputs(`type Holder
    array<int> data
original = Holder.new(array.from(4))
copied = original.copy()
array.set(copied.data, 0, -7)
plot(array.get(original.data, 0) * 10 + array.get(copied.data, 0), "Shared")
copied.data := array.from(9)
array.set(original.data, 0, -3)
plot(array.get(original.data, 0) * 10 + array.get(copied.data, 0), "Detached")`),
    ).toEqual([
      [-77, -77, -77],
      [-21, -21, -21],
    ]);
  });

  it('reassigns the copied nested UDT field while retaining the original child', () => {
    expect(
      outputs(`type Child
    int value
type Holder
    Child child
original = Holder.new(Child.new(4))
copied = Holder.copy(original)
copied.child.value := -7
plot(original.child.value * 10 + copied.child.value, "Shared")
copied.child := Child.new(9)
original.child.value := -3
plot(original.child.value * 10 + copied.child.value, "Detached")`),
    ).toEqual([
      [-77, -77, -77],
      [-21, -21, -21],
    ]);
  });

  it('reassigns the copied label field without redirecting the original label field', () => {
    expect(
      outputs(`type Holder
    label drawing
original = Holder.new(label.new(bar_index, 4, "original"))
copied = original.copy()
label.set_y(copied.drawing, -7)
plot(label.get_y(original.drawing) * 10 + label.get_y(copied.drawing), "Shared")
copied.drawing := label.new(bar_index, 9, "replacement")
label.set_y(original.drawing, -3)
plot(label.get_y(original.drawing) * 10 + label.get_y(copied.drawing), "Detached")`),
    ).toEqual([
      [-77, -77, -77],
      [-21, -21, -21],
    ]);
  });
});
