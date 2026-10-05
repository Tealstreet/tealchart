import { expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

// Rank764 engine subclaim only: carrying pair metadata is not chart interaction.
it('ledger764: input.time/price retain matching pair metadata and independent values', () => {
  const bars = [1, 2].map((close, i) => ({
    time: (i + 1) * 60000,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
  }));
  const result = executeScript(
    parse(
      '//@version=6\nindicator("pair metadata")\nt = input.time(1, "Time", inline="Point", group="Pair", confirm=true)\np = input.price(23.0, "Price", inline="Point", group="Pair", confirm=true)\nplot(t)\nplot(p)',
    ),
    bars,
  );
  expect(result.errors).toEqual([]);
  expect(result.inputs).toMatchObject([
    { type: 'time', title: 'Time', inline: 'Point', group: 'Pair', confirm: true, defval: 1 },
    { type: 'price', title: 'Price', inline: 'Point', group: 'Pair', confirm: true, defval: 23 },
  ]);
  expect(result.plots.map((plot) => plot.values)).toEqual([
    [1, 1],
    [23, 23],
  ]);
});
