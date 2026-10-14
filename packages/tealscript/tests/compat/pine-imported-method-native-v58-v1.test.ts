import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const cases = [
  {
    "name": "local-precedence-natural-v5-v1.pine",
    "source": "v58/captures/v58/consumers/local-precedence-natural-v5-v1/binding-v1/attempt-v1/executed-v1.pine",
    "library": "v58/local-precedence-library-v5-v1.pine",
    "observation": "v58/captures/v58/consumers/local-precedence-natural-v5-v1/binding-v1/attempt-v1/observation-v3.json",
    "csv": "v58/captures/v58/consumers/local-precedence-natural-v5-v1/binding-v1/attempt-v1/native-v1.csv",
    "importPath": "sours-lat/IX5Precedence/1",
    "sourceSha256": "c9683fb34e98b558de788af5f85a999a5cc3662530959b9d6b0ba955fb685d9e",
    "closedBarCutoff": "1791638280"
  },
  {
    "name": "local-precedence-natural-v6-v1.pine",
    "source": "v58/captures/v58/consumers/local-precedence-natural-v6-v1/binding-v1/attempt-v1/executed-v1.pine",
    "library": "v58/local-precedence-library-v6-v1.pine",
    "observation": "v58/captures/v58/consumers/local-precedence-natural-v6-v1/binding-v1/attempt-v1/observation-v3.json",
    "csv": "v58/captures/v58/consumers/local-precedence-natural-v6-v1/binding-v1/attempt-v1/native-v1.csv",
    "importPath": "sours-lat/IX6Precedence/1",
    "sourceSha256": "3e9f914153172a2e585c74eaca47188a42eac1ea35fc7b2a516b204f7d446be0",
    "closedBarCutoff": "1791638280"
  },
  {
    "name": "root2-direct-5-false-namespace-v58-v1.pine",
    "source": "v58/captures/v58/consumers/root2-direct-5-false-namespace-v58-v1/direct-5-False/attempt-v1/executed-v1.pine",
    "library": "v58/root2-library-eb54acaa28f5-v58-v1.pine",
    "observation": "v58/captures/v58/consumers/root2-direct-5-false-namespace-v58-v1/direct-5-False/attempt-v1/observation-v3.json",
    "csv": "v58/captures/v58/consumers/root2-direct-5-false-namespace-v58-v1/direct-5-False/attempt-v1/native-v1.csv",
    "importPath": "sours-lat/R2Nseb54acaa28f5/1",
    "sourceSha256": "722b529664bd64a5539765497a82167b6a6abc9dc02ed448252b48e0fcd83293",
    "closedBarCutoff": "1791638400"
  },
  {
    "name": "root2-wrapper-5-false-namespace-v58-v1.pine",
    "source": "v58/captures/v58/consumers/root2-wrapper-5-false-namespace-v58-v1/wrapper-5-False/attempt-v1/executed-v1.pine",
    "library": "v58/root2-library-eb54acaa28f5-v58-v1.pine",
    "observation": "v58/captures/v58/consumers/root2-wrapper-5-false-namespace-v58-v1/wrapper-5-False/attempt-v1/observation-v3.json",
    "csv": "v58/captures/v58/consumers/root2-wrapper-5-false-namespace-v58-v1/wrapper-5-False/attempt-v1/native-v1.csv",
    "importPath": "sours-lat/R2Nseb54acaa28f5/1",
    "sourceSha256": "8892524e0aa001544bfd50db1114a9a3634590dd307d2f8a7ae992aa20984377",
    "closedBarCutoff": "1791638400"
  },
  {
    "name": "root2-direct-5-true-namespace-v58-v1.pine",
    "source": "v58/captures/v58/consumers/root2-direct-5-true-namespace-v58-v1/direct-5-True/attempt-v1/executed-v1.pine",
    "library": "v58/root2-library-9bbb31bfdca1-v58-v1.pine",
    "observation": "v58/captures/v58/consumers/root2-direct-5-true-namespace-v58-v1/direct-5-True/attempt-v1/observation-v3.json",
    "csv": "v58/captures/v58/consumers/root2-direct-5-true-namespace-v58-v1/direct-5-True/attempt-v1/native-v1.csv",
    "importPath": "sours-lat/R2Ns9bbb31bfdca1/1",
    "sourceSha256": "1f0a1f257fc31cc26e3054ba6da34c7bd84616ecabc5add993776c13064e1965",
    "closedBarCutoff": "1791638400"
  },
  {
    "name": "root2-wrapper-5-true-namespace-v58-v1.pine",
    "source": "v58/captures/v58/consumers/root2-wrapper-5-true-namespace-v58-v1/wrapper-5-True/attempt-v1/executed-v1.pine",
    "library": "v58/root2-library-9bbb31bfdca1-v58-v1.pine",
    "observation": "v58/captures/v58/consumers/root2-wrapper-5-true-namespace-v58-v1/wrapper-5-True/attempt-v1/observation-v3.json",
    "csv": "v58/captures/v58/consumers/root2-wrapper-5-true-namespace-v58-v1/wrapper-5-True/attempt-v1/native-v1.csv",
    "importPath": "sours-lat/R2Ns9bbb31bfdca1/1",
    "sourceSha256": "3538ae57f1bab210cd896e3ed9ea9a7bafba50e2cad934a313389ce54b19f656",
    "closedBarCutoff": "1791638400"
  },
  {
    "name": "root2-collection-5-namespace-v58-v1.pine",
    "source": "v58/captures/v58/consumers/root2-collection-5-namespace-v58-v1/collection-5/attempt-v1/executed-v1.pine",
    "library": "v58/root2-library-2da86fb61908-v58-v1.pine",
    "observation": "v58/captures/v58/consumers/root2-collection-5-namespace-v58-v1/collection-5/attempt-v1/observation-v3.json",
    "csv": "v58/captures/v58/consumers/root2-collection-5-namespace-v58-v1/collection-5/attempt-v1/native-v1.csv",
    "importPath": "sours-lat/R2Ns2da86fb61908/1",
    "sourceSha256": "6a5775aab9271edd7e01f2e324bbb453429ee39b6689c9a2b206fb3d12dd8e98",
    "closedBarCutoff": "1791638400"
  },
  {
    "name": "root2-widening-5-namespace-v58-v1.pine",
    "source": "v58/captures/v58/consumers/root2-widening-5-namespace-v58-v1/widening-5/attempt-v1/executed-v1.pine",
    "library": "v58/root2-library-7300f5f6f0f4-v58-v1.pine",
    "observation": "v58/captures/v58/consumers/root2-widening-5-namespace-v58-v1/widening-5/attempt-v1/observation-v3.json",
    "csv": "v58/captures/v58/consumers/root2-widening-5-namespace-v58-v1/widening-5/attempt-v1/native-v1.csv",
    "importPath": "sours-lat/R2Ns7300f5f6f0f4/1",
    "sourceSha256": "2c2c3573976ec3afe25273b160b419f9e193955eaffb80d35828c8011159af8c",
    "closedBarCutoff": "1791638400"
  },
  {
    "name": "root2-nested-5-namespace-v58-v1.pine",
    "source": "v58/captures/v58/consumers/root2-nested-5-namespace-v58-v1/nested-5/attempt-v1/executed-v1.pine",
    "library": "v58/root2-library-dba23857d1c2-v58-v1.pine",
    "observation": "v58/captures/v58/consumers/root2-nested-5-namespace-v58-v1/nested-5/attempt-v1/observation-v3.json",
    "csv": null,
    "importPath": "sours-lat/R2Nsdba23857d1c2/1",
    "sourceSha256": "3201f6716744568eca8778e3cff21a9a0ee3497fe3fa15b1e31d3963e11c2c64",
    "closedBarCutoff": "1791638400"
  },
  {
    "name": "root2-direct-6-false-namespace-v58-v1.pine",
    "source": "v58/captures/v58/consumers/root2-direct-6-false-namespace-v58-v1/direct-6-False/attempt-v1/executed-v1.pine",
    "library": "v58/root2-library-8ffdca5e384d-v58-v1.pine",
    "observation": "v58/captures/v58/consumers/root2-direct-6-false-namespace-v58-v1/direct-6-False/attempt-v1/observation-v3.json",
    "csv": "v58/captures/v58/consumers/root2-direct-6-false-namespace-v58-v1/direct-6-False/attempt-v1/native-v1.csv",
    "importPath": "sours-lat/R2Ns8ffdca5e384d/1",
    "sourceSha256": "43de1d11543492d94399b3366639ab0c9455b0eda3c616224b1493647362be52",
    "closedBarCutoff": "1791638400"
  },
  {
    "name": "root2-wrapper-6-false-namespace-v58-v1.pine",
    "source": "v58/captures/v58/consumers/root2-wrapper-6-false-namespace-v58-v1/wrapper-6-False/attempt-v1/executed-v1.pine",
    "library": "v58/root2-library-8ffdca5e384d-v58-v1.pine",
    "observation": "v58/captures/v58/consumers/root2-wrapper-6-false-namespace-v58-v1/wrapper-6-False/attempt-v1/observation-v3.json",
    "csv": "v58/captures/v58/consumers/root2-wrapper-6-false-namespace-v58-v1/wrapper-6-False/attempt-v1/native-v1.csv",
    "importPath": "sours-lat/R2Ns8ffdca5e384d/1",
    "sourceSha256": "967d78e6db5cd6ef2dd62370b887fe59812939ad0ffb615ff9be0f2b27b3ca5d",
    "closedBarCutoff": "1791638520"
  },
  {
    "name": "root2-direct-6-true-namespace-v58-v1.pine",
    "source": "v58/captures/v58/consumers/root2-direct-6-true-namespace-v58-v1/direct-6-True/attempt-v1/executed-v1.pine",
    "library": "v58/root2-library-dae0a2695e26-v58-v1.pine",
    "observation": "v58/captures/v58/consumers/root2-direct-6-true-namespace-v58-v1/direct-6-True/attempt-v1/observation-v3.json",
    "csv": "v58/captures/v58/consumers/root2-direct-6-true-namespace-v58-v1/direct-6-True/attempt-v1/native-v1.csv",
    "importPath": "sours-lat/R2Nsdae0a2695e26/1",
    "sourceSha256": "3774a52f62e7013ace8fce9704c7599da5204bc14b6ed4a3d2b2163117afb213",
    "closedBarCutoff": "1791638520"
  },
  {
    "name": "root2-wrapper-6-true-namespace-v58-v1.pine",
    "source": "v58/captures/v58/consumers/root2-wrapper-6-true-namespace-v58-v1/wrapper-6-True/attempt-v1/executed-v1.pine",
    "library": "v58/root2-library-dae0a2695e26-v58-v1.pine",
    "observation": "v58/captures/v58/consumers/root2-wrapper-6-true-namespace-v58-v1/wrapper-6-True/attempt-v1/observation-v3.json",
    "csv": "v58/captures/v58/consumers/root2-wrapper-6-true-namespace-v58-v1/wrapper-6-True/attempt-v1/native-v1.csv",
    "importPath": "sours-lat/R2Nsdae0a2695e26/1",
    "sourceSha256": "3079c2860a7126276f22ff828387898b4312b5a0d5640cf7331805b84756914a",
    "closedBarCutoff": "1791638520"
  },
  {
    "name": "root2-collection-6-namespace-v58-v1.pine",
    "source": "v58/captures/v58/consumers/root2-collection-6-namespace-v58-v1/collection-6/attempt-v1/executed-v1.pine",
    "library": "v58/root2-library-e97e9c211f29-v58-v1.pine",
    "observation": "v58/captures/v58/consumers/root2-collection-6-namespace-v58-v1/collection-6/attempt-v1/observation-v3.json",
    "csv": "v58/captures/v58/consumers/root2-collection-6-namespace-v58-v1/collection-6/attempt-v1/native-v1.csv",
    "importPath": "sours-lat/R2Nse97e9c211f29/1",
    "sourceSha256": "8f961163f4040aee598e138b69bdf87079f33823543b35567f74e9fb93b91ac2",
    "closedBarCutoff": "1791638520"
  },
  {
    "name": "root2-widening-6-namespace-v58-v1.pine",
    "source": "v58/captures/v58/consumers/root2-widening-6-namespace-v58-v1/widening-6/attempt-v1/executed-v1.pine",
    "library": "v58/root2-library-97602e8de8f2-v58-v1.pine",
    "observation": "v58/captures/v58/consumers/root2-widening-6-namespace-v58-v1/widening-6/attempt-v1/observation-v3.json",
    "csv": "v58/captures/v58/consumers/root2-widening-6-namespace-v58-v1/widening-6/attempt-v1/native-v1.csv",
    "importPath": "sours-lat/R2Ns97602e8de8f2/1",
    "sourceSha256": "cb231be684a6b1f0f07bbe7846264e8c187514e0682f28cb4040f6c03d6cb7fd",
    "closedBarCutoff": "1791638520"
  },
  {
    "name": "root2-nested-6-namespace-v58-v1.pine",
    "source": "v58/captures/v58/consumers/root2-nested-6-namespace-v58-v1/nested-6/attempt-v1/executed-v1.pine",
    "library": "v58/root2-library-ad4a19ecf824-v58-v1.pine",
    "observation": "v58/captures/v58/consumers/root2-nested-6-namespace-v58-v1/nested-6/attempt-v1/observation-v3.json",
    "csv": null,
    "importPath": "sours-lat/R2Nsad4a19ecf824/1",
    "sourceSha256": "ba47e1d4264c7ff00fd555125dddaa75c557db495e02388aad7beff8246dd008",
    "closedBarCutoff": "1791638520"
  }
] as const;
const fixture = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');

describe('published imported method calls', () => {
  for (const entry of cases) {
    it(entry.name, () => {
      const source = fixture(entry.source);
      expect(createHash('sha256').update(source).digest('hex')).toBe(entry.sourceSha256);
      const program = parse(source);
      const libraries = new Map([[entry.importPath, parse(fixture(entry.library))]]);
      const observation = JSON.parse(fixture(entry.observation));
      expect(observation.executedSha256).toBe(entry.sourceSha256);
      expect(checkProgram(program, { libraries }).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      const compiled = tryCompile(program, undefined, { libraries });
      expect(compiled.success).toBe(true);
      if (!compiled.success) throw new Error('Published method failed compilation');
      if (!entry.csv) return;
      const [header, ...lines] = fixture(entry.csv).trim().split(/\r?\n/);
      const rows = lines.map((line) => line.split(','));
      const bars = rows.map((row) => ({
        time: Number(row[0]) * 1000, open: Number(row[1]), high: Number(row[2]),
        low: Number(row[3]), close: Number(row[4]), volume: row[5] === '' ? NaN : Number(row[5]),
      }));
      const result = executeCompiled(compiled, bars, undefined, { libraries, runtime: {
        timeframe: { period: observation.setup.timeframe },
        syminfo: { tickerid: observation.setup.symbol, timezone: observation.setup.timezone, mintick: 0.01 },
      } });
      if (!result) throw new Error('Published method execution was unavailable');
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.plots).toHaveLength(header.split(',').length - 6);
      for (let bar = 0; bar < rows.length; bar++) {
        if (Number(rows[bar][0]) > Number(entry.closedBarCutoff)) continue;
        for (let plot = 0; plot < result.plots.length; plot++) {
          const native = rows[bar][plot + 6];
          const actual = result.plots[plot].values[bar];
          if (native === '') expect(actual === null || Number.isNaN(actual)).toBe(true);
          else expect(actual).toBeCloseTo(Number(native), 9);
        }
      }
    });
  }
});
