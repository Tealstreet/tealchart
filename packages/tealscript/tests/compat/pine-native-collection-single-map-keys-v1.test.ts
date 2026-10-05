import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

const bars = Array.from({ length: 16 }, (_, i) => ({
  time: 1788134400000 + i * 120000,
  open: 100,
  high: 101,
  low: 99,
  close: 100,
  volume: 10,
}));
const sources: Record<string, string> = {
  'map-float-key-missing-v6-v1':
    '//@version=6\nindicator("V7 map-float-key-missing-v6-v1")\nvar m = map.new<float,int>()\nx = float(na)\nmap.put(m,x,7)\nplot(x,"KEY")\nplot(map.size(m),"SIZE")\nplot(map.get(m,x),"VALUE")\n',
  'map-float-key-overflow-v6-v1':
    '//@version=6\nindicator("V7 map-float-key-overflow-v6-v1")\nvar m = map.new<float,int>()\nx = math.exp(1000.0)\nmap.put(m,x,7)\nplot(x,"KEY")\nplot(map.size(m),"SIZE")\nplot(map.get(m,x),"VALUE")\n',
};
const run = (name: string) => executeScript(parse(sources[name]), bars);
// KEY blank does not certify NaN versus infinity representation; captured SIZE/VALUE do.
describe('native exact map key sources', () => {
  it.each(['map-float-key-missing-v6-v1', 'map-float-key-overflow-v6-v1'])('runs %s', (name) => {
    const r = run(name);
    expect(r.errors).toEqual([]);
    expect(r.plots.find((x) => x.title === 'SIZE')?.values).toEqual(Array(16).fill(1));
    expect(r.plots.find((x) => x.title === 'VALUE')?.values).toEqual(Array(16).fill(7));
  });
});
