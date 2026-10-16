import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

export const plotstyleDirectory = 'v93/captures/v93/';
export const plotstyleSession = `${plotstyleDirectory}v93-plot-dash-v6/attempt-v1/session-mode0-v1/`;
const fixtureRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../oracle-probes');
export const plotstyleRead = (path: string) => readFileSync(resolve(fixtureRoot, path));
export const plotstyleJson = <T,>(path: string): T => JSON.parse(plotstyleRead(path).toString()) as T;
export const plotstyleSource = (version: 5 | 6) => plotstyleRead(`v93/sources/v93-plot-dash-v${version}.pine`).toString();
// These two retained tables have no quoted fields (blank-column lists are []).
export const plotstyleCsv = (path: string) => plotstyleRead(path).toString().trimEnd().split(/\r?\n/).map(line => line.split(','));
export function executePlotstyleV93() {
  const [, ...rows] = plotstyleCsv(`${plotstyleSession}chart-native-v1.csv`);
  const bars = rows.map(row => ({ time: Number(row[0]) * 1000, open: Number(row[1]), high: Number(row[2]),
    low: Number(row[3]), close: Number(row[4]), volume: Number.NaN }));
  // No fabricated prefix, volume, or historical replay identity. Only constant lanes
  // are compared; the native INPUT_INDEX starts at 23232, not our local zero.
  const compiled = tryCompile(parse(plotstyleSource(6)));
  if (!compiled.success) throw new Error(compiled.unsupported.join('\n'));
  const result = executeCompiled(compiled, bars);
  if (!result) throw new Error('Compiled plotstyle execution failed');
  return { result, bars, rows };
}
