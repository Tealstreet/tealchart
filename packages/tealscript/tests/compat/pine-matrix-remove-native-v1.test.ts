import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { checkProgram } from '../../src/semantic/checker';
import { executeScript } from '../../src/runtime/compiledOnly';

describe('Native CF019/CF020 omitted-index removal shape controls', () => {
  for (const [id, batch] of [['CF019', 18], ['CF020', 19]] as const) {
    it(`${id} replays native homogeneous removal shapes`, () => {
      const bundle = new URL('../../oracle-probes/v2/', import.meta.url);
      const filename = `conflicts-batch-${batch}-v1`;
      const source = readFileSync(new URL(`outcome-only/${filename}.pine`, bundle), 'utf8');
      const csvPath = new URL(`captures/v2/${filename}.csv`, bundle);
      const csv = readFileSync(csvPath, 'utf8');
      const manifest = JSON.parse(readFileSync(new URL('captures/v2/manifest-v2.json', bundle), 'utf8'));
      const entry = manifest.captures.find((capture: { probe: string }) => capture.probe === `${filename}.pine`);
      const digest = (text: string) => createHash('sha256').update(text).digest('hex');
      expect(digest(source)).toBe(entry.source_sha256);
      expect(digest(csv)).toBe(entry.export_sha256);
      expect(csv.includes('"')).toBe(false);
      const [headers, ...rows] = csv.trimEnd().split(/\r?\n/).map((line) => line.split(','));
      const cutoff = entry.historical_compare_before_unix_seconds;
      const historical = rows.filter((row) => Number(row[0]) < cutoff);
      expect(historical.length).toBe(entry.historical_rows);
      const witness = source.slice(source.indexOf(`// ${id}`));
      expect(witness).toContain(`matrix.remove_${id === 'CF019' ? 'row' : 'col'}`);
      const bars = rows.map((row) => ({ time: Number(row[0]) * 1000, open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: 0 }));
      const ast = parse(`//@version=6\nindicator("${id} native replay")\n${witness}`);
      expect(checkProgram(ast).diagnostics, csvPath.pathname).toEqual([]);
      const result = executeScript(ast, bars);
      expect(result.errors, csvPath.pathname).toEqual([]);
      const mismatches: unknown[] = [];
      for (const title of [`${id}_remaining_rows`, `${id}_remaining_columns`, `${id}_removed_size`]) {
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
  }
});
