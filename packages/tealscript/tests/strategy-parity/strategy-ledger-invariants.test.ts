// @vitest-environment node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime';
import { validateStrategyLedgerInvariants } from '../../src/runtime/strategyInvariants';
import { loadCorpus } from './corpus-runner';

const CORPUS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'corpus');

describe('strategy ledger invariants across trusted parity fixtures', () => {
  const corpus = loadCorpus(CORPUS_DIR).filter((entry) => !entry.id.startsWith('pf-'));

  it('loads trusted fast strategy fixtures', () => {
    expect(corpus.length).toBeGreaterThanOrEqual(12);
  });

  for (const entry of corpus) {
    it(`${entry.id}: ledger is internally coherent`, () => {
      const ast = parse(entry.pineSource);
      const result = executeScript(ast, entry.bars, undefined, entry.engineOptions);

      expect(result.errors).toEqual([]);
      expect(validateStrategyLedgerInvariants(result.strategy)).toEqual([]);
    });
  }
});
