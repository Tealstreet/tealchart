import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { generateDeterministicBars, SYNTHETIC_STRATEGY_BAR_COUNT } from './generate-bars';

const corpusDir = fileURLToPath(new URL('./corpus', import.meta.url));
const syntheticEntries = readdirSync(corpusDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d+-/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

describe('generated synthetic strategy input freshness', () => {
  it('discovers synthetic strategy inputs', () => {
    expect(syntheticEntries.length).toBeGreaterThan(0);
  });

  it.each(syntheticEntries)('%s uses the current deterministic bar generator', (name) => {
    const generated = `${JSON.stringify(generateDeterministicBars(SYNTHETIC_STRATEGY_BAR_COUNT), null, 2)}\n`;
    const committed = readFileSync(join(corpusDir, name, 'bars.json'), 'utf8');

    expect(
      committed === generated,
      `${name}/bars.json is stale. Review the input-domain change and regenerate bars.json with ` +
        'generateDeterministicBars(SYNTHETIC_STRATEGY_BAR_COUNT) from tests/strategy-parity/generate-bars.ts.',
    ).toBe(true);
  });
});
