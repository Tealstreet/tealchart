import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const fixture = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
const libraries = new Map([['sours-lat/R2Nsaa411cdaddab/1', parse(fixture('v58/root2-library-aa411cdaddab-v58-v1.pine'))]]);
const errors = (source: string) => checkProgram(parse(source), { libraries }).diagnostics.filter((d) => d.severity === 'error');
const privateSource = fixture('v60/private-method-private-receiver-v6-v2.pine');
const message = "Could not find method or method reference 'float.pick'";

describe('native v60 private import visibility', () => {
  it('matches the v6 compile refusal message and dot position', () => {
    const observation = JSON.parse(fixture('v60/captures/v60/private-method-private-receiver-v6-v2/attempt-v1/observation-v5.json'));
    expect(createHash('sha256').update(privateSource).digest('hex')).toBe('fc933d977a10d3548b96343dfe352a21c46676a16927097afe8fae7625002069');
    expect(observation.executedSource).toBe(privateSource);
    expect(observation.markers).toContainEqual(expect.objectContaining({ code: 'CE10271', message, startLineNumber: 4, startColumn: 11 }));
    expect(errors(privateSource)).toEqual([{ code: 'private-library-method', nativeCode: 'CE10271', severity: 'error', message, line: 4, column: 11 }]);
    const compiled = tryCompile(parse(privateSource), undefined, { libraries });
    expect(compiled.success).toBe(false);
    expect(compiled.unsupported).toEqual([message]);
  });

  it('preserves the exported forward values on all captured closed rows', () => {
    const source = fixture('v60/private-method-exported-forward-control-v6-v2.pine');
    const observation = JSON.parse(fixture('v60/captures/v60/private-method-exported-forward-control-v6-v2/attempt-v1/observation-v5.json'));
    const csv = fixture('v60/captures/v60/private-method-exported-forward-control-v6-v2/attempt-v1/native-v1.csv');
    expect(createHash('sha256').update(csv).digest('hex')).toBe('fb64c78b6a0f398386c1b5be2b037a76af1cb3dee01ddf62dcfd19a5d03fe787');
    expect(observation.executedSource).toBe(source);
    const [header, ...lines] = csv.trim().split(/\r?\n/);
    expect(header).toBe('time,open,high,low,close,Volume,RESULT');
    const closed = lines.map((line) => line.split(',')).filter((row) => Number(row[0]) <= Number(observation.closedBarCutoff));
    expect(closed).toHaveLength(971);
    const bars = closed.map(([time, open, high, low, close, volume]) => ({ time: Number(time) * 1000, open: Number(open), high: Number(high), low: Number(low), close: Number(close), volume: Number(volume) }));
    expect(errors(source)).toEqual([]);
    const compiled = tryCompile(parse(source), undefined, { libraries });
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, bars, undefined, { libraries });
    expect(result?.errors).toEqual([]);
    expect(result?.plots.map((plot) => plot.values)).toEqual([closed.map((row) => Number(row[6]))]);
    expect(closed.every((row) => row[6] === '13.5')).toBe(true);
  });

  for (const expression of ['value.pick()', '((value)).pick()', '((value))  .  pick()']) {
    it(`retains the dot position independently of receiver parentheses: ${expression}`, () => {
      const source = privateSource.replace('plot(', 'float value = 3.5\nplot(').replace('(3.5).pick()', expression);
      expect(source).not.toBe(privateSource);
      const line = source.split('\n')[4]!;
      expect(errors(source)).toEqual([{ code: 'private-library-method', severity: 'error', message, line: 5, column: line.indexOf('.', line.indexOf('value') + 5) + 1 }]);
      expect(JSON.stringify(parse(source))).not.toContain('accessLoc');
    });
  }

  it('matches the v5 import mask and secondary missing-method error from attempt-v1/observation-v5', () => {
    const source = fixture('v60/private-method-private-receiver-v5-v2.pine');
    expect(errors(source)).toEqual([
      { code: 'version-mismatch', severity: 'error', message: "Cannot import the 'lib' library into a script coded in Pine Script™ v5. Convert the script to Pine Script™ v6 to use this library.", line: 3, column: 8 },
      { code: 'private-library-method', severity: 'error', message: "Could not find method or method reference 'pick' for 'float'", line: 4, column: 11 },
    ]);
    const observation = JSON.parse(fixture('v60/captures/v60/private-method-private-receiver-v5-v2/attempt-v1/observation-v5.json'));
    expect(observation.visibilityQuestion).toMatch(/^UNOBSERVED:/);
  });
});
