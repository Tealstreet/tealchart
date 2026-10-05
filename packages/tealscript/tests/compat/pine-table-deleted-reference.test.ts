import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('documented deleted table references', () => {
  for (const method of [false, true]) {
    const deletion = method ? 'dropped.delete()' : 'table.delete(dropped)';
    for (const reference of [
      { name: 'direct and scalar alias', setup: 'alias = dropped', reads: ['dropped', 'alias'] },
      {
        name: 'array and map references',
        setup: 'ids = array.from(dropped)\nrefs = map.new<string, table>()\nmap.put(refs, "drop", dropped)',
        reads: ['array.get(ids, 0)', 'map.get(refs, "drop")'],
      },
      {
        name: 'object field and function return',
        setup: 'holder = Holder.new(dropped)',
        reads: ['holder.value', 'identity(dropped)'],
      },
    ]) {
      it(`${method ? 'method' : 'namespace'} invalidates ${reference.name}`, () => {
        const result = runCompatScript(
          `//@version=6
indicator("Deleted table references")
type Holder
    table value
identity(table value) => value
var dropped = table.new(position.top_right, 1, 1)
var survivor = table.new(position.bottom_left, 1, 1)
${reference.setup}
plot(na(dropped) ? 1 : 0, title="before")
if bar_index == 1
    ${deletion}
${reference.reads.map((read, index) => `plot(na(${read}) ? 1 : 0, title="missing${index}")`).join('\n')}
plot(na(survivor) ? 1 : 0, title="survivor")
plot(na("table_not_allocated") ? 1 : 0, title="text")
plot(na(7) ? 1 : 0, title="number")
plot(array.size(table.all), title="count")`,
          { bars: compatibilityBars.slice(0, 3) },
        );
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'before').values).toEqual([0, 0, 1]);
        for (let index = 0; index < reference.reads.length; index++) {
          expect(getPlot(result, `missing${index}`).values).toEqual([0, 1, 1]);
        }
        for (const title of ['survivor', 'text', 'number']) {
          expect(getPlot(result, title).values).toEqual([0, 0, 0]);
        }
        expect(getPlot(result, 'count').values).toEqual([2, 1, 1]);
      });
    }
  }
});
