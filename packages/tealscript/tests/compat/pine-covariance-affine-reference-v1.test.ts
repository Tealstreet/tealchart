import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Finite float population/sample covariance; missing pairs and integer return kinds are excluded.
describe('array covariance finite affine transformations', () => {
  for (const version of [5, 6]) {
    for (const method of [false, true]) {
      for (const biased of [true, false]) {
        it(`v${version} method=${method} biased=${biased} retains symmetry and signed centered products`, () => {
          const call = (left: string, right: string) =>
            method ? `${left}.covariance(${right}, ${biased})` : `array.covariance(${left}, ${right}, ${biased})`;
          const result = runCompatScript(`//@version=${version}
indicator("Finite covariance transforms")
left = array.from(-2.0, 0.0, 2.0)
right = array.from(9.0, -3.0, 6.0)
translatedLeft = array.from(3.0, 5.0, 7.0)
translatedRight = array.from(16.0, 4.0, 13.0)
scaledLeft = array.from(11.0, 5.0, -1.0)
plot(${call('left', 'right')}, "Original")
plot(${call('right', 'left')}, "Swapped")
plot(${call('translatedLeft', 'translatedRight')}, "Translated")
plot(${call('scaledLeft', 'translatedRight')}, "Scaled")`);
          expect(result.errors).toEqual([]);
          const covariance = biased ? -2 : -3;
          for (const title of ['Original', 'Swapped', 'Translated']) {
            expect(getPlot(result, title).values).toEqual(Array(compatibilityBars.length).fill(covariance));
          }
          expect(getPlot(result, 'Scaled').values).toEqual(Array(compatibilityBars.length).fill(covariance * -3));
        });
      }
    }
  }
});
