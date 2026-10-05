import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { PercentileLinearInterpolation } from '../../src/runtime/codegen/ta-classes';
import { executeScript } from '../../src/runtime/compiledOnly';
import fixture from './fixtures/pine-native-linear-residual-v1.json';

describe('batch7 native linear percentile residuals and captured neighbor preservation', () => {
  for (const scenario of fixture.scenarios) {
    const source = readFileSync(new URL(`../../oracle-probes/v2/${scenario.probe}.pine`, import.meta.url), 'utf8');
    const result = executeScript(parse(source), scenario.bars);

    it.each(scenario.columns)(`${scenario.probe}: $title`, ({ title, values }) => {
      expect(createHash('sha256').update(source).digest('hex')).toBe(scenario.sourceSha256);
      expect(result.errors).toEqual([]);
      const plot = result.plots.find((candidate) => candidate.title === title);
      expect(plot).toBeDefined();
      expect(plot!.values).toHaveLength(scenario.bars.length);
      // Direct native exports, independent of the implementation's rank formula.
      values.forEach((native, index) => {
        const actual = plot!.values[index];
        if (native === null) expect(actual, `bar ${index}`).toBeNull();
        else {
          expect(actual, `bar ${index}`).not.toBeNull();
          expect(Math.abs(actual! - native), `bar ${index}`).toBeLessThanOrEqual(1e-10);
        }
      });
    });
  }

  it('preserves captured missing-window recovery across recompute and restore', () => {
    const scenario = fixture.scenarios[0];
    const hole = scenario.columns.find(({ title }) => title === 'linear_hole_builtin')!;
    const clean = scenario.columns.find(({ title }) => title === 'linear_clean_builtin')!;
    const { source, replacementIndex, replacementSource } = fixture.neighborStateControl;
    const linear = new PercentileLinearInterpolation(4, 75);
    const assertNative = (actual: number, expected: number | null) => {
      if (expected === null) expect(actual).toBeNaN();
      else expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1e-10);
    };
    for (let index = 0; index < replacementIndex; index++) {
      assertNative(linear.compute(source[index] ?? NaN), hole.values[index]);
    }
    const snapshot = linear.save();
    assertNative(linear.compute(source[replacementIndex] ?? NaN), hole.values[replacementIndex]);
    assertNative(linear.recompute(replacementSource), clean.values[replacementIndex]);
    assertNative(linear.recompute(source[replacementIndex] ?? NaN), hole.values[replacementIndex]);
    linear.restore(snapshot);
    assertNative(linear.compute(replacementSource), clean.values[replacementIndex]);
    linear.restore(snapshot);
    for (let index = replacementIndex; index < source.length; index++) {
      assertNative(linear.compute(source[index] ?? NaN), hole.values[index]);
    }
  });
});
