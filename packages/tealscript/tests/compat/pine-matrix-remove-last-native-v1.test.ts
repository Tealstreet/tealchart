import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot } from './fixtures';

// Distinct native v3 CSVs observed all 11 matrix outputs on 24,248 historical rows.
// Source and capture hashes bind these expected cells to CF019/CF020 attempt1.
const captures = [
  {
    id: 'CF019', axis: 'row',
    sourceSha256: 'aeff42d0b876f99f61cc2bd26f4c7d00cae21065b9b160e5fb292de9094d4e0b',
    csvSha256: 'ada91f439231d271350decbf1ff3e187d6f6dce0e8abf21b703ba77bc5716bc9',
    omitted: [301, 302, 303, 2, 3, 101, 102, 103, 201, 202, 203],
    first: [101, 102, 103, 2, 3, 201, 202, 203, 301, 302, 303],
  },
  {
    id: 'CF020', axis: 'col',
    sourceSha256: 'dbbb4312346b0be8321687269582ba2d2c68a896ea25e0d8956bd4dc4c4d33fd',
    csvSha256: '33f1eab11721fb7e7bac11df7ddb3bf972806719c45431d66abb8197b0fb7eda',
    omitted: [103, 203, 303, 3, 2, 101, 102, 201, 202, 301, 302],
    first: [101, 201, 301, 3, 2, 102, 103, 202, 203, 302, 303],
  },
] as const;

describe('native omitted matrix removal selects the last row or column', () => {
  for (const capture of captures) {
    for (const form of ['namespace', 'named', 'receiver']) {
      it(`${capture.id} ${form} removes the observed last ${capture.axis} and preserves explicit index zero`, () => {
        const filename = `conflicts-${capture.id}-default-${capture.axis}-v3.pine`;
        const source = readFileSync(new URL(`../../oracle-probes/v3/${filename}`, import.meta.url), 'utf8');
        expect(createHash('sha256').update(source).digest('hex')).toBe(capture.sourceSha256);
        const original = `matrix.remove_${capture.axis}(m)`;
        expect(source.split(original)).toHaveLength(2);
        const titles = [...source.matchAll(/plot\([^\n]+, "([^"]+)"/g)].map((match) => match[1]).filter((title) => title.startsWith(capture.id));
        expect(titles).toHaveLength(11);
        for (const [index, expected] of [[undefined, capture.omitted], [0, capture.first]] as const) {
          const suffix = index === undefined ? '' : `, ${index}`;
          const call = form === 'receiver' ? `m.remove_${capture.axis}(${index ?? ''})` : form === 'named' ? `matrix.remove_${capture.axis}(id=m${index === undefined ? '' : `, ${capture.axis === 'row' ? 'row' : 'column'}=${index}`})` : `matrix.remove_${capture.axis}(m${suffix})`;
          const ast = parse(source.replace(original, call));
          expect(checkProgram(ast).diagnostics, `${filename}; ${form}; ${index}`).toEqual([]);
          const result = executeScript(ast, compatibilityBars);
          expect(result.errors, `${filename}; native capture ${capture.csvSha256}`).toEqual([]);
          for (const [position, title] of titles.entries()) {
            expect(getPlot(result, title).values, `${filename}; ${form}; ${index}; ${title}`)
              .toEqual(compatibilityBars.map(() => expected[position]));
          }
        }
      });
    }
  }
});
