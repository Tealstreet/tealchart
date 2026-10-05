// @vitest-environment node
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCorpusEntry } from './corpus-runner';

describe('corpus provenance', () => {
  it.each(['tv_trades.csv', 'tradingview_trades.csv'])('refuses engine output named %s even without bars', (filename) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'contradictory-engine-baseline-'));
    try {
      fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ source: 'engine-baseline' }));
      fs.writeFileSync(path.join(dir, filename), 'frozen engine output');
      expect(() => loadCorpusEntry(dir)).toThrow(
        `${path.basename(dir)}: ${filename} claims TradingView provenance but meta.json says source=engine-baseline`,
      );
      fs.renameSync(path.join(dir, filename), path.join(dir, 'engine_baseline_trades.csv'));
      expect(loadCorpusEntry(dir)).toBeNull();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
