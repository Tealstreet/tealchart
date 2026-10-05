import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

const bars = [1, 2].map((close, i) => ({
  time: (i + 1) * 60000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));
function values(body: string) {
  const result = executeScript(parse(`//@version=6\nindicator("array remarks")\n${body}`), bars);
  expect(result.errors).toEqual([]);
  expect(result.profile?.swallowedErrors ?? []).toEqual([]);
  return result.plots.map((plot) => plot.values);
}

describe('ledger762–763/778/782/787–794/799–800: narrow array remarks', () => {
  it('762–763: sized bool constructor defaults to false and begins at index zero', () => {
    expect(
      values(
        'a = array.new_bool(2)\nb = array.new_bool(2, true)\nplot(array.size(a))\nplot(array.get(a, 0) == false ? 1 : 0)\nplot(a.get(1) == false ? 1 : 0)\nplot(b.get(0) ? 1 : 0)\nplot(array.size(array.new_bool()))',
      ),
    ).toEqual([
      [2, 2],
      [1, 1],
      [1, 1],
      [1, 1],
      [0, 0],
    ]);
  });
  it('763: boolean slots have asymmetric zero-based positions', () => {
    expect(
      values(
        'a = array.new_bool(2, true)\narray.set(a, 0, false)\nplot(a.get(0) == false ? 1 : 0)\nplot(array.get(a, 1) ? 1 : 0)',
      ),
    ).toEqual([
      [1, 1],
      [1, 1],
    ]);
  });
  it('778: missing indexof is minus one, distinct from a found position', () => {
    expect(
      values(
        'a = array.from(17, -8, 43, -8, 5)\nplot(array.indexof(a, -8))\nplot(a.indexof(29))\nmissing = a.indexof(29)\nplot(missing == -1 ? 1 : 0)\nplot(a.get(-1))',
      ),
    ).toEqual([
      [1, 1],
      [-1, -1],
      [1, 1],
      [5, 5],
    ]);
  });
  it('782: missing values sort last ascending and first descending', () => {
    expect(
      values(
        'a = array.from(3.0, float(na), 1.0, 2.0)\narray.sort(a, order.ascending)\nplot(a.get(0))\nplot(na(a.get(3)) ? 1 : 0)\na.sort(order.descending)\nplot(na(a.get(0)) ? 1 : 0)\nplot(a.get(1))',
      ),
    ).toEqual([
      [1, 1],
      [1, 1],
      [1, 1],
      [3, 3],
    ]);
  });
  it.each(['int', 'float'])(
    '787/789/791/793: finite %s nearest-rank function/method share percentile result',
    (kind) => {
      const suffix = kind === 'float' ? '.5' : '';
      expect(
        values(
          `a = array.from(10${suffix}, 50${suffix}, 20${suffix}, 40${suffix}, 30${suffix})\nplot(array.percentile_nearest_rank(a, 50))\nplot(a.percentile_nearest_rank(percentage=61))\nplot(a.get(0))`,
        ),
      ).toEqual([
        [30 + Number(suffix || 0), 30 + Number(suffix || 0)],
        [40 + Number(suffix || 0), 40 + Number(suffix || 0)],
        [10 + Number(suffix || 0), 10 + Number(suffix || 0)],
      ]);
    },
  );
  it.each(['int', 'float'])(
    '788/790/792/794/799/800: empty %s nearest-rank and avg return NA, namespace and method',
    (kind) => {
      expect(
        values(
          `a = array.new<${kind}>()\nplot(na(array.percentile_nearest_rank(a, 50)) ? 1 : 0)\nplot(na(a.percentile_nearest_rank(50)) ? 1 : 0)\nplot(na(array.avg(a)) ? 1 : 0)\nplot(na(a.avg()) ? 1 : 0)`,
        ),
      ).toEqual([
        [1, 1],
        [1, 1],
        [1, 1],
        [1, 1],
      ]);
    },
  );
});
