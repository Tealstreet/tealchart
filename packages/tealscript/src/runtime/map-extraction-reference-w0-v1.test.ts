import { expect, it } from 'vitest';

import { getArrayValue, getArraySize, popArrayValue, pushArrayValue, setArrayValue } from './arrays';
import { createPineMap, getMapSize, getMapValue, mapKeys, mapValues, putMapValue } from './maps';

for (const [name, keys, values] of [
  ['bool', [true, false], [false, true]],
  ['int', [7, -3], [19, -8]],
  ['float', [7.25, -3.5], [19.75, -8.25]],
  ['string', ['z', 'a'], ['first', 'second']],
] as const) {
  it(`${name} extracted slots and sizes remain independent of map pairs`, () => {
    const map = createPineMap();
    putMapValue(map, keys[0], values[0]);
    putMapValue(map, keys[1], values[1]);
    const extractedKeys = mapKeys(map);
    const extractedValues = mapValues(map);
    setArrayValue(extractedKeys, 0, keys[1]);
    popArrayValue(extractedKeys);
    setArrayValue(extractedValues, 0, values[1]);
    pushArrayValue(extractedValues, values[0]);
    expect(getMapSize(map)).toBe(2);
    expect(getMapValue(map, keys[0])).toBe(values[0]);
    expect(getMapValue(map, keys[1])).toBe(values[1]);
    expect(getArraySize(extractedKeys)).toBe(1);
    expect(getArraySize(extractedValues)).toBe(3);
    putMapValue(map, keys[1], values[0]);
    expect(getArrayValue(extractedValues, 1)).toBe(values[1]);
    expect(getArrayValue(mapKeys(map), 0)).toBe(keys[0]);
  });
}
