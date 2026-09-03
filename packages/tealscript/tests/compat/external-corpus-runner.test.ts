import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import {
  EXTERNAL_PINE_CORPUS_REPORT_SCHEMA_VERSION,
  outputCounts,
  runExternalPineCorpus,
  visiblePlotsForCorpus,
} from '../../scripts/run-external-pine-corpus.ts';
import type { ExecutionResult } from '../../src';

describe('external Pine corpus runner', () => {
  it('counts only visible plot outputs while preserving sparse global plots', () => {
    const result = {
      plots: [
        { id: 'sparse', type: 'plotshape', title: 'Sparse', values: [null, null], color: '#2196F3' },
        { id: 'hidden', type: 'plot', title: 'Hidden', values: [1, 2], color: '#2196F3', display: 0 },
        { id: 'invisible-fill', type: 'fill', title: 'Invisible Fill', values: [null, null], color: [null, null] },
        { id: 'hidden-fill', type: 'fill', title: 'Hidden Fill', values: [1, 1], color: ['#f00', '#f00'], display: 0 },
        { id: 'visible-fill', type: 'fill', title: 'Visible Fill', values: [1, null], color: ['#f00', null] },
      ],
      drawings: [],
      alerts: [],
      logs: [],
      errors: [],
    } as unknown as ExecutionResult;

    expect(visiblePlotsForCorpus(result.plots).map((plot) => plot.id)).toEqual(['sparse', 'visible-fill']);
    expect(outputCounts(result)).toMatchObject({ produced: true, plots: 2 });
  });

  it('classifies parse, semantic, datafeed, and output outcomes without storing source in the report', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'tealscript-external-corpus-runner-'));
    try {
      await writeFile(
        join(dir, 'manifest.json'),
        JSON.stringify({
          scripts: [
            { localPath: 'compiled.pine', sourceRepoUrl: 'https://github.com/example/a', sourceFilePath: 'compiled.pine', commitSha: 'a'.repeat(40) },
            { localPath: 'semantic.pine', sourceRepoUrl: 'https://github.com/example/b', sourceFilePath: 'semantic.pine', commitSha: 'b'.repeat(40) },
            { localPath: 'parse.pine', sourceRepoUrl: 'https://github.com/example/c', sourceFilePath: 'parse.pine', commitSha: 'c'.repeat(40) },
            { localPath: 'fallback.pine', sourceRepoUrl: 'https://github.com/example/d', sourceFilePath: 'fallback.pine', commitSha: 'd'.repeat(40) },
            { localPath: 'invalid.pine', sourceRepoUrl: 'https://github.com/example/e', sourceFilePath: 'invalid.pine', commitSha: 'e'.repeat(40) },
            { localPath: 'no-output.pine', sourceRepoUrl: 'https://github.com/example/f', sourceFilePath: 'no-output.pine', commitSha: 'f'.repeat(40) },
            { localPath: 'strategy.pine', sourceRepoUrl: 'https://github.com/example/g', sourceFilePath: 'strategy.pine', commitSha: 'g'.repeat(40) },
          ],
        }),
        'utf8',
      );
      await writeFile(join(dir, 'compiled.pine'), '//@version=6\nindicator("Compiled")\nplot(close)\n', 'utf8');
      await writeFile(join(dir, 'semantic.pine'), '//@version=6\nindicator("Semantic")\nplot(not_a_builtin)\n', 'utf8');
      await writeFile(join(dir, 'parse.pine'), '//@version=6\nindicator("Parse"\nplot(close)\n', 'utf8');
      await writeFile(
        join(dir, 'fallback.pine'),
        '//@version=6\nindicator("Request Data")\nplot(request.security("EXT", "1", close))\n',
        'utf8',
      );
      await writeFile(join(dir, 'invalid.pine'), '//@version=6\nindicator("Invalid")\nplot(close, title="A", title="B")\n', 'utf8');
      await writeFile(join(dir, 'no-output.pine'), '//@version=6\nindicator("No Output")\nvalue = close + open\n', 'utf8');
      await writeFile(
        join(dir, 'strategy.pine'),
        '//@version=6\nstrategy("Strategy", process_orders_on_close=true)\nif bar_index == 0\n    strategy.entry("Long", strategy.long, qty=1)\nplot(strategy.position_size)\n',
        'utf8',
      );

      const report = await runExternalPineCorpus({ inputDir: dir });

      expect(report.schemaVersion).toBe(EXTERNAL_PINE_CORPUS_REPORT_SCHEMA_VERSION);
      expect(report.summary.total).toBe(7);
      expect(report.summary.funnel.parse.count).toBe(6);
      expect(report.summary.funnel.semantic.count).toBe(4);
      expect(report.summary.funnel.compile.count).toBe(4);
      expect(report.summary.achievableCeiling.denominator).toBe(6);
      expect(report.summary.achievableCeiling.excludedInvalidPine).toBe(1);
      expect(report.summary.achievableCeiling.excludedCorpusHygiene).toBe(0);
      expect(report.summary.validity).toEqual({
        'invalid-pine': 1,
        supported: 4,
        'tealscript-gap': 2,
      });
      expect(report.summary.outputSilence).toEqual({ 'correct-silence': 1 });
      expect(report.summary.outputParity).toEqual({ 'not-run': 7 });
      expect(report.summary.strategyLedgerParity).toEqual({
        strategies: 1,
        executableStrategies: 0,
        activeStrategies: 0,
        matched: 0,
        compiledLedger: { 'not-run': 1 },
        currentlyPassingRowsWithLedgerMismatch: 0,
        differenceKinds: {},
      });
      expect(report.summary.compiledBarErrors).toEqual({
        scripts: 0,
        totalErrors: 0,
        firstCauses: [],
      });
      expect(report.summary.swallowedErrors).toEqual({
        scripts: 0,
        totalErrors: 0,
        firstCauses: [],
      });
      expect(report.summary.executionModes.compiled).toBe(4);
      expect(report.rows.find((row) => row.localPath === 'strategy.pine')?.strategyLedgerParity.compiledLedger.status).toBe('not-run');
      expect(report.rows.find((row) => row.localPath === 'compiled.pine')?.outcome).toBe('produced-output-compiled');
      expect(report.rows.find((row) => row.localPath === 'compiled.pine')?.outputParity.status).toBe('not-run');
      expect(report.rows.find((row) => row.localPath === 'fallback.pine')?.outcome).toBe('produced-output-compiled');
      expect(report.rows.find((row) => row.localPath === 'fallback.pine')?.validity.bucket).toBe('supported');
      expect(report.rows.find((row) => row.localPath === 'fallback.pine')?.outputParity.status).toBe('not-run');
      expect(report.rows.find((row) => row.localPath === 'semantic.pine')?.firstFailedStage).toBe('semantic');
      expect(report.rows.find((row) => row.localPath === 'semantic.pine')?.validity.bucket).toBe('tealscript-gap');
      expect(report.rows.find((row) => row.localPath === 'parse.pine')?.firstFailedStage).toBe('parse');
      expect(report.rows.find((row) => row.localPath === 'parse.pine')?.validity.bucket).toBe('tealscript-gap');
      expect(report.rows.find((row) => row.localPath === 'invalid.pine')?.validity.bucket).toBe('invalid-pine');
      expect(report.rows.find((row) => row.localPath === 'no-output.pine')?.outputSilence?.bucket).toBe('correct-silence');
      expect(JSON.stringify(report)).not.toContain('not_a_builtin)');
    } finally {
      await rm(dir, { force: true, recursive: true });
    }
  });
});
