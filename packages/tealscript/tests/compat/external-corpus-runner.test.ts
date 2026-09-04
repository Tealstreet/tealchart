import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import {
  EXTERNAL_PINE_CORPUS_REPORT_SCHEMA_VERSION,
  outputCounts,
  runExternalPineCorpus,
  visiblePlotsForCorpus,
} from '../../scripts/run-external-pine-corpus.ts';
import { normalizeHarvestedPineSource } from '../../scripts/refetch-external-pine-corpus.ts';
import type { ExecutionResult } from '../../src';

describe('external Pine corpus runner', () => {
  it('extracts Pine from TradingView copy-code dumps without changing normal source', () => {
    const raw = [
      'Script Name: Example Strategy',
      'Author: Example',
      'PineScript code:',
      '',
      'Pine Script strategy',
      'Example Strategy',
      'Copy code',
      '1',
      '2',
      '//@version=5',
      'strategy("Example", overlay=true)',
      'value\u00a0=\u00a0close',
      'plot(value)',
      'Expand (12 lines)',
    ].join('\n');

    const extracted = normalizeHarvestedPineSource(raw);

    expect(extracted.source).toBe('//@version=5\nstrategy("Example", overlay=true)\nvalue = close\nplot(value)\n');
    expect(extracted.transform).toEqual(expect.objectContaining({
      kind: 'tradingview-copy-code-body',
      startLine: 10,
      removedTrailingExpandMarker: true,
      normalizedCopiedCodeSpaces: true,
    }));

    const normal = '//@version=6\nindicator("Normal")\nplot(close)\n';
    expect(normalizeHarvestedPineSource(normal)).toEqual({ source: normal });
  });

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
      const noOutputRow = report.rows.find((row) => row.localPath === 'no-output.pine');
      expect(noOutputRow?.outputSilence?.bucket).toBe('correct-silence');
      expect(noOutputRow?.outputSilence?.cause).toBe('source-declares-no-chart-output');
      expect(noOutputRow?.stages.output.diagnostic).toContain('output-silence:source-declares-no-chart-output');
      expect(JSON.stringify(report)).not.toContain('not_a_builtin)');
    } finally {
      await rm(dir, { force: true, recursive: true });
    }
  });

  it('classifies Pine-compatible execute refusals separately from engine gaps', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'tealscript-external-corpus-execute-classifier-'));
    try {
      await mkdir(join(dir, 'sources'));
      await writeFile(
        join(dir, 'manifest.json'),
        JSON.stringify({
          scripts: [
            {
              localPath: 'sources/request-limit.pine',
              sourceRepoUrl: 'https://github.com/example/request',
              sourceFilePath: 'request-limit.pine',
              commitSha: 'a'.repeat(40),
            },
            {
              localPath: 'sources/timeframe-guard.pine',
              sourceRepoUrl: 'https://github.com/example/guard',
              sourceFilePath: 'timeframe-guard.pine',
              commitSha: 'b'.repeat(40),
            },
            {
              localPath: 'sources/0023-Erald12-PinescriptIndicator-order_block.txt',
              sourceRepoUrl: 'https://github.com/example/array',
              sourceFilePath: 'order block.txt',
              commitSha: 'c'.repeat(40),
            },
            {
              localPath: 'sources/unguarded-array.pine',
              sourceRepoUrl: 'https://github.com/example/gap',
              sourceFilePath: 'unguarded-array.pine',
              commitSha: 'd'.repeat(40),
            },
          ],
        }),
        'utf8',
      );
      await writeFile(
        join(dir, 'sources/request-limit.pine'),
        `//@version=6
indicator("Request Limit")
value = 0.0
for i = 1 to 41
    value += request.security("SYM", str.tostring(i), close)
plot(value)
`,
        'utf8',
      );
      await writeFile(
        join(dir, 'sources/timeframe-guard.pine'),
        `//@version=6
indicator("Guard")
runtime.error("Structure & Levels: chart timeframe is above the Long-Term S/R Timeframe (15). Raise that Timeframe or disable Long-Term S/R.")
plot(close)
`,
        'utf8',
      );
      const emptyArrayScript = `//@version=6
indicator("Empty Array")
var values = array.new<float>(0)
if barstate.islast
    plot(values.get(0))
`;
      await writeFile(join(dir, 'sources/0023-Erald12-PinescriptIndicator-order_block.txt'), emptyArrayScript, 'utf8');
      await writeFile(join(dir, 'sources/unguarded-array.pine'), emptyArrayScript, 'utf8');

      const report = await runExternalPineCorpus({ inputDir: dir });

      expect(report.summary.validity).toEqual({
        supported: 3,
        'tealscript-gap': 1,
      });
      expect(report.summary.failureCauses.map(({ stage, cause, count }) => ({ stage, cause, count }))).toEqual([
        { stage: 'execute', cause: 'array-bounds-runtime-error', count: 2 },
        { stage: 'execute', cause: 'request-context-limit', count: 1 },
        { stage: 'execute', cause: 'script-timeframe-runtime-guard', count: 1 },
      ]);
      expect(report.rows.find((row) => row.localPath === 'sources/request-limit.pine')?.validity.reason).toContain('40 unique request.* contexts');
      expect(report.rows.find((row) => row.localPath === 'sources/timeframe-guard.pine')?.validity.reason).toContain('intentionally calls runtime.error()');
      expect(report.rows.find((row) => row.localPath.includes('0023-Erald12'))?.validity.bucket).toBe('supported');
      expect(report.rows.find((row) => row.localPath === 'sources/unguarded-array.pine')?.validity.bucket).toBe('tealscript-gap');
    } finally {
      await rm(dir, { force: true, recursive: true });
    }
  });
});
