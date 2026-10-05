import { describe, expect, it } from 'vitest';

import { runCompatScript } from './fixtures';

const reference = 'https://www.tradingview.com/pine-script-docs/language/arrays/#sorting';
const header = '//@version=6\nindicator("All missing UDT sort IDs")\ntype Number\n    float value\n';

describe('UDT sorting retains element type when every object ID is missing', () => {
  for (const member of ['sort', 'sort_indices']) {
    for (const namespace of [true, false]) {
      it(`${member} ${namespace ? 'namespace' : 'receiver'} distinguishes missing IDs from numeric na`, () => {
        const call = namespace ? `array.${member}(a)` : `a.${member}()`;
        for (const size of [1, 2]) {
          expect(runCompatScript(`${header}a = array.new<float>(${size})\n${call}`).errors, reference).toEqual([]);
          expect(runCompatScript(`${header}a = array.new<Number>(0)\n${call}`).errors, reference).toEqual([]);
          expect(runCompatScript(`${header}m = matrix.new<float>(${size}, 1)\na = m.col(0)\n${call}`).errors, reference).toEqual([]);
          const numericShadow = 'Number missing = na\nmakeValues(float missing) =>\n    array.from(missing, missing)\na = makeValues(na)';
          expect(runCompatScript(`${header}${numericShadow}\n${call}`).errors, reference).toEqual([]);
          const sources = [
            `m = matrix.new<Number>(1, ${size})\na = m.row(0)`,
            `m = matrix.new<Number>(${size}, 1)\na = matrix.col(m, 0)`,
            'm = matrix.new<Number>(1, 1)\na = array.from(m.get(0, 0), m.get(0, 0))',
            `a = array.new<Number>(${size})`,
            `original = array.new<Number>(${size})\na = original.copy()`,
            `original = array.new<Number>(${size})\na = original.slice(0, ${size})`,
            'a = array.from(Number.new(43), Number.new(-8))\na.fill(na)',
            'Number missing = na\na = array.from(missing, missing)',
            'makeValues(Number missing) =>\n    array.from(missing, missing)\na = makeValues(na)',
            'makeMissing() =>\n    Number missing = na\n    missing\na = array.from(makeMissing(), makeMissing())',
            'type Holder\n    Number missing\nh = Holder.new(na)\na = array.from(h.missing, h.missing)',
            'array<Number> a = array.from(na, na)',
          ];
          for (const source of sources) {
            const result = runCompatScript(`${header}${source}\n${call}`);
            expect(result.errors.some((error) => /Array.*(na|user-defined type)/i.test(error.message)), `${reference}; ${source}`).toBe(true);
          }
        }
      });
    }
  }
});
