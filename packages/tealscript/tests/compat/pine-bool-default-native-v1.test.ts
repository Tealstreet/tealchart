import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

it('replays CF006 typed/generic false defaults against every historical v2 CSV row', () => {
  const bundle = new URL('../../oracle-probes/v2/', import.meta.url);
  const source = readFileSync(new URL('conflicts-batch-1-v1.pine', bundle), 'utf8');
  const csvPath = new URL('captures/v2/conflicts-batch-1-v1.csv', bundle);
  const csv = readFileSync(csvPath, 'utf8');
  const manifest = JSON.parse(readFileSync(new URL('captures/v2/manifest-v2.json', bundle), 'utf8'));
  const entry = manifest.captures.find((capture: { probe: string }) => capture.probe === 'conflicts-batch-1-v1.pine');
  const digest = (text: string) => createHash('sha256').update(text).digest('hex');
  expect(digest(source)).toBe(entry.source_sha256);
  expect(digest(csv)).toBe(entry.export_sha256);
  expect(csv.includes('"')).toBe(false);
  const [headers, ...rows] = csv.trimEnd().split(/\r?\n/).map((line) => line.split(','));
  const cutoff = Date.parse(entry.observed_live_bar_open_utc) / 1000;
  const historical = rows.filter((row) => Number(row[0]) < cutoff);
  expect(historical.length).toBe(24_143);
  const witness = source.match(/\/\/ CF006[\s\S]*?(?=\n\/\/ CF007)/)?.[0];
  expect(witness).toBeDefined();
  const bars = rows.map((row) => ({ time: Number(row[0]) * 1000, open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: 0 }));
  const result = executeScript(parse(`//@version=6\nindicator("CF006 native replay")\n${witness}`), bars);
  expect(result.errors, csvPath.pathname).toEqual([]);
  const mismatches: unknown[] = [];
  for (const title of ['CF006_typed_false', 'CF006_generic_false', 'CF006_typed_truth']) {
    const index = headers.indexOf(title);
    expect(index).toBeGreaterThan(4);
    const plot = result.plots.find((candidate) => candidate.title === title);
    expect(plot?.values.length).toBe(rows.length);
    for (let row = 0; row < historical.length; row++) {
      if (plot?.values[row] !== Number(historical[row][index]) && mismatches.length < 5) {
        mismatches.push({ title, row, native: historical[row][index], engine: plot?.values[row] });
      }
    }
  }
  expect(mismatches, csvPath.pathname).toEqual([]);
});
