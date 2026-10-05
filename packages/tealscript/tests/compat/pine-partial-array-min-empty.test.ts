import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

describe('array.min empty-array reference remarks (ranks 805–808)', () => {
  for (const type of ['int', 'float']) {
    for (const method of [false, true]) {
      it(`${type} ${method ? 'method' : 'namespace'} publishes na after clearing and recovers after push`, () => {
        const call = method ? 'values.min()' : 'array.min(values)';
        const rankedCall = method ? 'values.min(bar_index + 1)' : 'array.min(values, bar_index + 1)';
        const populated = type === 'float' ? -2.25 : -2;
        const restored = type === 'float' ? 7.75 : 7;
        const result = runCompatScript(`//@version=6
indicator("Empty min")
values = array.new<${type}>()
${type} empty = ${call}
${type} emptyRanked = ${rankedCall}
array.push(values, ${populated})
${type} populated = ${call}
array.clear(values)
${type} cleared = ${call}
${type} clearedRanked = ${rankedCall}
array.push(values, ${restored})
${type} restored = ${call}
plot(na(empty) ? 1 : 0, title="Empty")
plot(na(emptyRanked) ? 1 : 0, title="Empty ranked")
plot(populated, title="Populated")
plot(na(cleared) ? 1 : 0, title="Cleared")
plot(na(clearedRanked) ? 1 : 0, title="Cleared ranked")
plot(restored, title="Restored")`);

        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'Empty').values).toEqual(Array(12).fill(1));
        expect(getPlot(result, 'Empty ranked').values).toEqual(Array(12).fill(1));
        expect(getPlot(result, 'Populated').values).toEqual(Array(12).fill(populated));
        expect(getPlot(result, 'Cleared').values).toEqual(Array(12).fill(1));
        expect(getPlot(result, 'Cleared ranked').values).toEqual(Array(12).fill(1));
        expect(getPlot(result, 'Restored').values).toEqual(Array(12).fill(restored));
      });
    }
  }
});
