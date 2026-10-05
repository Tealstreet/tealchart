import { expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

export type CollectionReferenceCase = {
  name: string;
  // Exact function entry in archived reference/pine-v6-reference-v1.json.
  reference: string;
  rejects: string;
  source: string;
} & ({ expressions: string[]; expected: Array<number | null>; error?: never } | { error: RegExp; expressions?: never; expected?: never });

export function registerCollectionReferenceCases(cases: CollectionReferenceCase[]): void {
  for (const testCase of cases) {
    if (testCase.expressions && testCase.expressions.length !== testCase.expected.length) {
      throw new Error(`${testCase.name}: every expression needs a documented expected value`);
    }
    it(testCase.name, () => {
      const plots = (testCase.expressions ?? []).map((expression, index) => `plot(${expression}, title="p${index}")`).join('\n');
      const result = runCompatScript(`//@version=6\nindicator("Collection reference contract")\n${testCase.source}\n${plots}`);
      if (testCase.error) {
        expect(result.errors.map((error) => error.message).join('\n'), testCase.reference).toMatch(testCase.error);
        return;
      }
      expect(result.errors, testCase.reference).toEqual([]);
      testCase.expected?.forEach((expected, index) => {
        // Full bar-count equality also rejects skipped execution and missing output.
        expect(getPlot(result, `p${index}`).values, `${testCase.reference}; rejects ${testCase.rejects}`)
          .toEqual(compatibilityBars.map(() => expected));
      });
    });
  }
}
